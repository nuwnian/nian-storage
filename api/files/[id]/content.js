import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

let supabaseAdmin;
try {
  supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
} catch (e) { console.error('Supabase init failed:', e); }

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

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
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
} catch (e) { console.error('S3 init failed:', e); }

export default async function handler(req, res) {
  try {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { user, error: authError, status } = await verifyUser(req);
    if (authError) return res.status(status).json({ error: authError });

    const { id } = req.query;
    const { data: file, error } = await supabaseAdmin
      .from('files').select('*').eq('id', id).eq('user_id', user.id).single();
    if (error || !file) return res.status(404).json({ error: 'File not found' });
    if (file.type !== 'txt') return res.status(400).json({ error: 'Content preview only supported for txt files' });

    const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    const key = file.url.startsWith(publicBase)
      ? file.url.slice(publicBase.length + 1)
      : `users/${user.id}/${file.url.split('/').pop()}`;

    const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
    const r2Response = await r2Client.send(command);
    const text = await r2Response.Body.transformToString('utf-8');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(text);
  } catch (error) {
    console.error('Content fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}
