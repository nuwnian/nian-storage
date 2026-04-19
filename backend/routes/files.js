import express from 'express';
import multer from 'multer';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { uploadToR2, deleteFromR2, getPresignedUrl } from '../services/storage.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '../config/r2.js';

const router = express.Router();

// Configure multer for memory storage (files will be uploaded to R2)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max for videos
  },
});

// Middleware to verify user (simple version)
const verifyUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('[AUTH] No token provided in request');
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase - getUser() verifies the JWT token and returns the user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('[AUTH] Token verification failed:', error?.message || 'No user data');
      return res.status(401).json({ error: 'Invalid token: ' + (error?.message || 'User not found') });
    }

    req.userId = user.id;
    req.userEmail = user.email;
    console.log('[AUTH] ✅ Authenticated user:', req.userId);
    next();
  } catch (error) {
    console.error('[AUTH] Middleware exception:', error.message);
    res.status(401).json({ error: 'Authentication failed: ' + error.message });
  }
};

// Get all files for user
router.get('/', verifyUser, async (req, res) => {
  try {
    const { type, search } = req.query;
    let query = supabaseAdmin
      .from('files')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    // Filter by type
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    // Filter by search
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: files, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get user's storage info (use admin to bypass RLS)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('storage_used, storage_total')
      .eq('id', req.userId)
      .single();

    res.json({
      files: files || [],
      total: files?.length || 0,
      storageUsed: userData?.storage_used || 0,
      storageTotal: userData?.storage_total || 10737418240, // 10 GB
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single file
router.get('/:id', verifyUser, async (req, res) => {
  try {
    const { data: file, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(file);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy-stream any file from R2 (auth via Bearer header or ?token= query param)
// This avoids requiring the browser to reach R2 directly
router.get('/:id/serve', async (req, res) => {
  try {
    console.log('[SERVE] Request for file:', req.params.id);
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    console.log('[SERVE] Token present:', !!token);
    if (!token) {
      console.log('[SERVE] ❌ No token');
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('[SERVE] Auth result - user:', user?.id, 'error:', authError?.message);
    if (authError || !user) {
      console.log('[SERVE] ❌ Auth failed');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: file, error: fileError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .single();

    console.log('[SERVE] File query - found:', !!file, 'error:', fileError?.message);
    if (fileError || !file) {
      console.log('[SERVE] ❌ File not found');
      return res.status(404).json({ error: 'File not found' });
    }

    console.log('[SERVE] File:', { fileId: req.params.id, fileName: file.name, fileUrl: file.url });

    // Reconstruct R2 key from stored URL
    const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    let key;
    
    if (!file.url) {
      console.error('[SERVE] ❌ File has no URL stored');
      return res.status(400).json({ error: 'File URL not found' });
    }

    // Extract key from URL
    if (publicBase && file.url.startsWith(publicBase)) {
      key = file.url.slice(publicBase.length + 1);
      console.log('[SERVE] Key extracted from publicBase');
    } else if (file.url.includes('/users/')) {
      key = file.url.substring(file.url.indexOf('/users/'));
      console.log('[SERVE] Key extracted from /users/');
    } else {
      // Fallback: assume file.url is already just the key
      key = file.url;
      console.log('[SERVE] Using file.url as key (fallback)');
    }

    console.log('[SERVE] Fetching from R2:', { bucket: process.env.R2_BUCKET_NAME, key, r2Endpoint: process.env.R2_ENDPOINT ? 'set' : 'missing' });

    const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
    const r2Response = await r2Client.send(command);
    console.log('[SERVE] ✅ Got R2 response');

    const bodyBytes = await r2Response.Body.transformToByteArray();
    console.log('[SERVE] ✅ Read R2 body:', bodyBytes.length, 'bytes');
    
    res.setHeader('Content-Type', r2Response.ContentType || 'application/octet-stream');
    res.setHeader('Content-Length', bodyBytes.length);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.end(Buffer.from(bodyBytes));
    console.log('[SERVE] ✅ Response sent');
  } catch (error) {
    console.error('[SERVE] ❌ Exception:', { 
      message: error.message, 
      code: error.code,
      name: error.name,
      stack: error.stack.split('\n').slice(0, 3).join(' | ')
    });
    res.status(500).json({ error: 'Failed to retrieve file: ' + error.message });
  }
});

// Stream text file content from R2 (for in-app txt preview)
router.get('/:id/content', verifyUser, async (req, res) => {
  try {
    const { data: file, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.type !== 'txt') {
      return res.status(400).json({ error: 'Content preview only supported for txt files' });
    }

    console.log('Content request:', { fileId: req.params.id, fileName: file.name, fileUrl: file.url });

    const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    let key;

    if (!file.url) {
      console.error('File has no URL stored');
      return res.status(400).json({ error: 'File URL not found' });
    }

    // Extract key from URL
    if (publicBase && file.url.startsWith(publicBase)) {
      key = file.url.slice(publicBase.length + 1);
    } else if (file.url.includes('/users/')) {
      key = file.url.substring(file.url.indexOf('/users/'));
    } else {
      key = file.url;
    }

    console.log('Fetching text from R2:', { bucket: process.env.R2_BUCKET_NAME, key });

    const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
    const r2Response = await r2Client.send(command);

    const text = await r2Response.Body.transformToString('utf-8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(text);
  } catch (error) {
    console.error('Content fetch error:', { message: error.message, stack: error.stack, code: error.code });
    res.status(500).json({ error: 'Failed to retrieve file content: ' + error.message });
  }
});

router.post('/', verifyUser, upload.single('file'), async (req, res) => {
  try {
    console.log('\n========== UPLOAD REQUEST ==========');
    console.log('[UPLOAD] User ID:', req.userId);
    console.log('[UPLOAD] Email:', req.userEmail);
    console.log('[UPLOAD] Request headers:', {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization']?.substring(0, 20) + '...'
    });
    
    if (!req.file) {
      console.log('[UPLOAD] ❌ ERROR: No file received by multer');
      console.log('[UPLOAD] req.file:', req.file);
      console.log('[UPLOAD] req.files:', req.files);
      console.log('[UPLOAD] req.body:', req.body);
      return res.status(400).json({ error: 'No file uploaded - ensure file field is named "file"' });
    }

    console.log('[UPLOAD] ✅ File received:', {
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Determine file type based on MIME type and extension
    let fileType = 'doc';
    let fileColor = '#5B8C7A'; // Default color for documents
    
    const extension = req.file.originalname.toLowerCase().split('.').pop();
    
    if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
      fileColor = '#7BA05B'; // Green for images
    } else if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
      fileColor = '#D97706'; // Orange for videos
    } else if (req.file.mimetype === 'application/pdf' || extension === 'pdf') {
      fileType = 'pdf';
      fileColor = '#DC2626'; // Red for PDFs
    } else if (
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      req.file.mimetype === 'application/msword' ||
      extension === 'docx' ||
      extension === 'doc'
    ) {
      fileType = 'docx';
      fileColor = '#2563EB'; // Blue for Word docs
    } else if (
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      req.file.mimetype === 'application/vnd.ms-excel' ||
      extension === 'xlsx' ||
      extension === 'xls'
    ) {
      fileType = 'xlsx';
      fileColor = '#059669'; // Green for Excel
    } else if (req.file.mimetype === 'text/plain' || extension === 'txt') {
      fileType = 'txt';
      fileColor = '#6B7280'; // Gray for text files
    }

    // Check storage limit (use admin to bypass RLS)
    let { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('storage_used, storage_total')
      .eq('id', req.userId)
      .single();

    console.log('[UPLOAD] User storage data:', userData);
    console.log('[UPLOAD] User storage error:', userError);
    
    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine - we'll create the user
      console.error('[UPLOAD] ❌ User lookup error:', userError);
      return res.status(400).json({ error: 'Unable to check storage: ' + userError.message });
    }

    // If user doesn't exist, create their record (handles OAuth users and race conditions)
    if (!userData) {
      console.log('User record not found, creating one...');
      const { data: authUser, error: authError } = await supabase.auth.getUser(
        req.headers.authorization?.replace('Bearer ', '')
      );
      
      if (!authUser?.user?.email) {
        return res.status(400).json({ error: 'Unable to retrieve user information' });
      }

      const { data: newUserData, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: req.userId,
          email: authUser.user.email,
          name: authUser.user.user_metadata?.name || authUser.user.email.split('@')[0],
          storage_used: 0,
          storage_total: 10737418240, // 10 GB
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create user record:', createError);
        return res.status(400).json({ error: 'Failed to initialize user account' });
      }

      userData = newUserData;
      console.log('User record created:', userData.id);
    }

    if (userData.storage_used + req.file.size > userData.storage_total) {
      return res.status(400).json({ error: 'Storage limit exceeded' });
    }

    // Upload to Cloudflare R2
    console.log('[UPLOAD] Uploading to R2...');
    let uploadResult;
    try {
      uploadResult = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, req.userId);
      console.log('[UPLOAD] ✅ R2 upload successful:', { key: uploadResult.key, url: uploadResult.url });
    } catch (r2Error) {
      console.error('[UPLOAD] ❌ R2 upload FAILED:', {
        message: r2Error.message,
        name: r2Error.name,
        code: r2Error.code,
        statusCode: r2Error.$metadata?.httpStatusCode
      });
      return res.status(500).json({ error: 'Failed to upload file to storage: ' + r2Error.message });
    }
    
    const { key, url } = uploadResult;

    // Format file size for display
    const formatSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
      return (bytes / 1073741824).toFixed(1) + ' GB';
    };

    // Save file metadata to database (using admin client to bypass RLS)
    console.log('[UPLOAD] Saving metadata to database...');
    const { data: newFile, error: fileError } = await supabaseAdmin
      .from('files')
      .insert([
        {
          user_id: req.userId,
          name: req.file.originalname,
          type: fileType,
          size: formatSize(req.file.size),
          size_bytes: req.file.size,
          url: url,
          color: fileColor,
        }
      ])
      .select()
      .single();

    if (fileError) {
      console.error('[UPLOAD] ❌ Database insert FAILED:', fileError);
      return res.status(400).json({ error: 'Failed to save file metadata: ' + fileError.message });
    }

    console.log('[UPLOAD] ✅ File saved to database:', newFile.id);

    // Update user's storage used
    console.log('[UPLOAD] Updating user storage...');
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ storage_used: (userData.storage_used || 0) + req.file.size })
      .eq('id', req.userId);
    
    if (updateError) {
      console.error('[UPLOAD] ⚠️  Storage update error:', updateError);
      console.warn('[UPLOAD] File saved but storage_used not updated - user may need refresh');
    } else {
      console.log('[UPLOAD] ✅ User storage updated');
    }

    console.log('[UPLOAD] ✅✅✅ UPLOAD COMPLETE - SUCCESS');
    res.status(201).json({
      message: 'File uploaded successfully',
      file: newFile
    });
  } catch (error) {
    console.error('[UPLOAD] ❌❌❌ UPLOAD FAILED - Exception:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: error.message || 'Something went wrong during upload' });
  }
});

// Delete file
router.delete('/:id', verifyUser, async (req, res) => {
  try {
    // Get file info first
    const { data: file, error: getError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (getError || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from R2 if URL exists
    if (file.url) {
      try {
        // Extract R2 key from URL
        const urlParts = file.url.split('/');
        const key = `users/${req.userId}/${urlParts[urlParts.length - 1]}`;
        await deleteFromR2(key);
      } catch (r2Error) {
        console.error('R2 delete error:', r2Error);
        // Continue even if R2 delete fails
      }
    }

    // Delete file record from database
    const { error: deleteError } = await supabaseAdmin
      .from('files')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    // Update user's storage used
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('storage_used')
      .eq('id', req.userId)
      .single();

    await supabaseAdmin
      .from('users')
      .update({ 
        storage_used: Math.max(0, (userData.storage_used || 0) - file.size_bytes) 
      })
      .eq('id', req.userId);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handler for multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Maximum size is 500 MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  next(err);
});

export default router;
