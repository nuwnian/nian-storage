import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { setCors } from '../../_helpers.js';

let supabase, supabaseAdmin;
try {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
} catch (e) { console.error('Supabase init failed:', e); }

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
} catch (e) { console.error('S3 init failed:', e); }

export default async function handler(req, res) {
  try {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const token = req.headers.authorization?.replace('Bearer ', '');
    console.log('[SERVE] Token present:', !!token);
    if (!token) {
      console.log('[SERVE] ❌ No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    if (!supabase || !supabaseAdmin) {
      console.error('[SERVE] ❌ Supabase clients not initialized');
      console.error('[SERVE] supabase:', !!supabase, 'supabaseAdmin:', !!supabaseAdmin);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!r2Client) {
      console.error('[SERVE] ❌ R2 client not initialized — check R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY env vars');
      return res.status(500).json({ error: 'Internal server error' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('[SERVE] Auth check - user:', user?.id || 'null', 'error:', authError?.message || 'none');
    if (authError || !user) {
      console.log('[SERVE] ❌ Invalid token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { id } = req.query;
    console.log('[SERVE] Fetching file:', id);
    const { data: file, error: fileError } = await supabaseAdmin
      .from('files').select('*').eq('id', id).eq('user_id', user.id).single();
    if (fileError) console.log('[SERVE] File query error:', fileError.message);
    if (!file) {
      console.log('[SERVE] ❌ File not found or access denied');
      return res.status(404).json({ error: 'File not found' });
    }

    const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    const key = publicBase && file.url.startsWith(publicBase)
      ? file.url.slice(publicBase.length + 1)
      : file.url.includes('/users/')
        ? file.url.substring(file.url.indexOf('/users/') + 1)
        : `users/${user.id}/${file.url.split('/').pop()}`;

    console.log('[SERVE] R2 Key:', key);
    const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
    console.log('[SERVE] Fetching from R2...');
    const r2Response = await r2Client.send(command);
    console.log('[SERVE] ✅ R2 response OK, ContentType:', r2Response.ContentType);

    const bodyBytes = await r2Response.Body.transformToByteArray();
    res.setHeader('Content-Type', r2Response.ContentType || 'application/octet-stream');
    res.setHeader('Content-Length', bodyBytes.length);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    // Removed Cross-Origin-Resource-Policy to avoid CORS conflicts
    res.end(Buffer.from(bodyBytes));
    console.log('[SERVE] ✅ File served successfully');
  } catch (error) {
    console.error('[SERVE] ❌ Error:', error.name, '-', error.message, '| Code:', error.Code || error.$metadata?.httpStatusCode);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
}
