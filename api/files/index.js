import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { setCors } from '../_helpers.js';

let supabaseAdmin;
try {
  supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
} catch (e) { console.error('Supabase init failed:', e); }

async function verifyUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return { error: 'No token provided', status: 401 };
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { error: 'Invalid token', status: 401 };
  return { user };
}

let r2Client;
try {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
} catch (e) { console.error('R2 init failed:', e); }

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
  'video/mp4','video/webm','video/ogg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

async function parseMultipart(req) {
  const boundary = req.headers['content-type']?.split('boundary=')[1];
  if (!boundary) throw new Error('No boundary found');

  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;
    req.on('data', chunk => {
      totalSize += chunk.length;
      if (totalSize > MAX_FILE_SIZE) {
        return reject(new Error('File too large (max 50 MB)'));
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const parts = [];
      let start = 0;

      while (start < body.length) {
        const boundaryIndex = body.indexOf(boundaryBuffer, start);
        if (boundaryIndex === -1) break;
        const partStart = boundaryIndex + boundaryBuffer.length + 2;
        const nextBoundary = body.indexOf(boundaryBuffer, partStart);
        if (nextBoundary === -1) break;
        const partEnd = nextBoundary - 2;
        const part = body.slice(partStart, partEnd);
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) { start = nextBoundary; continue; }
        const headerStr = part.slice(0, headerEnd).toString();
        const fileData = part.slice(headerEnd + 4);
        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);
        const contentTypeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/);
        parts.push({
          name: nameMatch?.[1],
          filename: filenameMatch?.[1],
          contentType: contentTypeMatch?.[1]?.trim(),
          data: fileData,
        });
        start = nextBoundary;
      }
      resolve(parts);
    });
    req.on('error', reject);
  });
}

function getFileType(mimetype, filename) {
  const ext = filename.toLowerCase().split('.').pop();
  if (mimetype.startsWith('image/')) return { type: 'image', color: '#7BA05B' };
  if (mimetype.startsWith('video/')) return { type: 'video', color: '#D97706' };
  // DB CHECK constraint only allows 'image', 'video', 'doc' — map everything else to 'doc'
  if (mimetype === 'application/pdf' || ext === 'pdf') return { type: 'doc', color: '#DC2626' };
  if (['docx', 'doc'].includes(ext) || mimetype.includes('wordprocessingml') || mimetype.includes('msword')) return { type: 'doc', color: '#2563EB' };
  if (['xlsx', 'xls'].includes(ext) || mimetype.includes('spreadsheetml') || mimetype.includes('ms-excel')) return { type: 'doc', color: '#059669' };
  if (mimetype === 'text/plain' || ext === 'txt') return { type: 'doc', color: '#6B7280' };
  return { type: 'doc', color: '#5B8C7A' };
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

export default async function handler(req, res) {
  try {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { user, error: authError, status } = await verifyUser(req);
  if (authError) return res.status(status).json({ error: authError });

  // GET /api/files
  if (req.method === 'GET') {
    try {
      const { type, search } = req.query;
      let query = supabaseAdmin
        .from('files').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (type && type !== 'all') query = query.eq('type', type);
      if (search) query = query.ilike('name', `%${search}%`);

      const { data: files, error } = await query;
      if (error) return res.status(400).json({ error: error.message });

      const { data: userData } = await supabaseAdmin
        .from('users').select('storage_used, storage_total').eq('id', user.id).single();

      return res.json({
        files: files || [],
        total: files?.length || 0,
        storageUsed: userData?.storage_used || 0,
        storageTotal: userData?.storage_total || 10737418240,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/files  (upload)
  if (req.method === 'POST') {
    try {
      console.log('=== UPLOAD REQUEST START ===');
      console.log('Headers:', Object.keys(req.headers).join(', '));
      
      const parts = await parseMultipart(req);
      console.log('Parsed parts:', parts.length);
      
      const filePart = parts.find(p => p.filename);
      if (!filePart) {
        console.log('ERROR: No file part found');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { filename, contentType: rawContentType, data: buffer } = filePart;
      const contentType = (rawContentType || '').split(';')[0].trim().toLowerCase();
      const size = buffer.length;
      
      console.log('File info:', { filename, contentType, size });

      if (size > MAX_FILE_SIZE) {
        console.log('ERROR: File too large');
        return res.status(413).json({ error: 'File too large (max 50 MB)' });
      }
      if (!ALLOWED_MIME_TYPES.has(contentType)) {
        console.log('ERROR: MIME type not allowed:', contentType);
        return res.status(415).json({ error: 'File type not allowed' });
      }

      if (!supabaseAdmin) {
        console.log('ERROR: supabaseAdmin not initialized');
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!r2Client) {
        console.log('ERROR: r2Client not initialized');
        return res.status(500).json({ error: 'Storage service unavailable' });
      }

      console.log('Getting user storage data...');
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users').select('storage_used, storage_total').eq('id', user.id).single();
      
      if (userError) {
        console.log('ERROR getting user data:', userError);
        return res.status(500).json({ error: 'Failed to get user storage info' });
      }

      if (userData && userData.storage_used + size > userData.storage_total) {
        console.log('ERROR: Storage limit exceeded');
        return res.status(400).json({ error: 'Storage limit exceeded' });
      }

      const { type: fileType, color: fileColor } = getFileType(contentType || '', filename);
      const ext = (filename.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '');
      const { randomUUID } = await import('crypto');
      const key = `users/${user.id}/${randomUUID()}.${ext}`;

      console.log('Uploading to R2...', { key, contentType, size });
      await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }));
      console.log('R2 upload successful');

      const url = `${(process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')}/${key}`;

      console.log('Inserting into database...');
      const { data: newFile, error: fileError } = await supabaseAdmin
        .from('files')
        .insert([{
          user_id: user.id,
          name: filename,
          type: fileType,
          size: formatSize(size),
          size_bytes: size,
          url,
          color: fileColor,
        }])
        .select().single();

      if (fileError) {
        console.log('ERROR inserting file record:', fileError);
        return res.status(400).json({ error: 'Upload recorded failed' });
      }

      if (userData) {
        console.log('Updating user storage usage...');
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ storage_used: (userData.storage_used || 0) + size })
          .eq('id', user.id);
        if (updateError) {
          console.log('WARNING: Failed to update storage usage:', updateError);
        }
      }

      console.log('=== UPLOAD REQUEST SUCCESS ===');
      return res.status(201).json({ message: 'File uploaded successfully', file: newFile });
    } catch (error) {
      console.error('=== UPLOAD ERROR ===', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Files handler error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
}
