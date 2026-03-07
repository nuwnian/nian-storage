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
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
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
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: file, error: fileError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .single();

    if (fileError || !file) return res.status(404).json({ error: 'File not found' });

    const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    const key = publicBase && file.url.startsWith(publicBase)
      ? file.url.slice(publicBase.length + 1)
      : file.url.includes('/users/')
        ? file.url.substring(file.url.indexOf('/users/') + 1)
        : `users/${user.id}/${file.url.split('/').pop()}`;

    const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
    const r2Response = await r2Client.send(command);

    res.setHeader('Content-Type', r2Response.ContentType || 'application/octet-stream');
    if (r2Response.ContentLength) res.setHeader('Content-Length', r2Response.ContentLength);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    r2Response.Body.pipe(res);
  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({ error: error.message });
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

    const publicBase = process.env.R2_PUBLIC_URL.replace(/\/$/, '');
    const key = file.url.startsWith(publicBase)
      ? file.url.slice(publicBase.length + 1)
      : `users/${req.userId}/${file.url.split('/').pop()}`;

    const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
    const r2Response = await r2Client.send(command);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    r2Response.Body.pipe(res);
  } catch (error) {
    console.error('Content fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});
router.post('/upload', verifyUser, upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received from user:', req.userId);
    console.log('File info:', req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : 'No file');
    
    if (!req.file) {
      console.log('ERROR: No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, mimetype, size, buffer } = req.file;

    // Determine file type based on MIME type and extension
    let fileType = 'doc';
    let fileColor = '#5B8C7A'; // Default color for documents
    
    const extension = originalname.toLowerCase().split('.').pop();
    
    if (mimetype.startsWith('image/')) {
      fileType = 'image';
      fileColor = '#7BA05B'; // Green for images
    } else if (mimetype.startsWith('video/')) {
      fileType = 'video';
      fileColor = '#D97706'; // Orange for videos
    } else if (mimetype === 'application/pdf' || extension === 'pdf') {
      fileType = 'pdf';
      fileColor = '#DC2626'; // Red for PDFs
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword' ||
      extension === 'docx' ||
      extension === 'doc'
    ) {
      fileType = 'docx';
      fileColor = '#2563EB'; // Blue for Word docs
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimetype === 'application/vnd.ms-excel' ||
      extension === 'xlsx' ||
      extension === 'xls'
    ) {
      fileType = 'xlsx';
      fileColor = '#059669'; // Green for Excel
    } else if (mimetype === 'text/plain' || extension === 'txt') {
      fileType = 'txt';
      fileColor = '#6B7280'; // Gray for text files
    }

    // Check storage limit (use admin to bypass RLS)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('storage_used, storage_total')
      .eq('id', req.userId)
      .single();

    console.log('User storage data:', userData);

    if (userData && userData.storage_used + size > userData.storage_total) {
      return res.status(400).json({ error: 'Storage limit exceeded' });
    }

    // Upload to Cloudflare R2
    console.log('Uploading to R2...');
    const { key, url } = await uploadToR2(buffer, originalname, mimetype, req.userId);
    console.log('R2 upload successful:', { key, url });

    // Format file size for display
    const formatSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
      return (bytes / 1073741824).toFixed(1) + ' GB';
    };

    // Save file metadata to database (using admin client to bypass RLS)
    console.log('Saving to database...');
    const { data: newFile, error: fileError } = await supabaseAdmin
      .from('files')
      .insert([
        {
          user_id: req.userId,
          name: originalname,
          type: fileType,
          size: formatSize(size),
          size_bytes: size,
          url: url,
          color: fileColor,
        }
      ])
      .select()
      .single();

    if (fileError) {
      console.error('Database insert error:', fileError);
      return res.status(400).json({ error: fileError.message });
    }

    console.log('File saved to database:', newFile.id);

    // Update user's storage used (userData already fetched above)
    await supabaseAdmin
      .from('users')
      .update({ storage_used: (userData.storage_used || 0) + size })
      .eq('id', req.userId);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: newFile
    });
  } catch (error) {
    console.error('Upload error - Full details:', {
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
