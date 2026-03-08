import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

let supabase, supabaseAdmin;
try {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
} catch (e) { console.error('Supabase init failed:', e); }

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', (process.env.CORS_ORIGIN || 'https://nian-storage.vercel.app').replace(/[\r\n]/g, '').trim());
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
} catch (e) { console.error('S3 init failed:', e); }

export default async function handler(req, res) {
  try {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { id } = req.query;
    const { data: file, error: fileError } = await supabaseAdmin
      .from('files').select('*').eq('id', id).eq('user_id', user.id).single();
    if (fileError || !file) return res.status(404).json({ error: 'File not found' });

    const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    const key = publicBase && file.url.startsWith(publicBase)
      ? file.url.slice(publicBase.length + 1)
      : file.url.includes('/users/')
        ? file.url.substring(file.url.indexOf('/users/') + 1)
        : `users/${user.id}/${file.url.split('/').pop()}`;

    const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
    const r2Response = await r2Client.send(command);

    const bodyBytes = await r2Response.Body.transformToByteArray();
    res.setHeader('Content-Type', r2Response.ContentType || 'application/octet-stream');
    res.setHeader('Content-Length', bodyBytes.length);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.end(Buffer.from(bodyBytes));
  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({ error: error.message });
  }
}
