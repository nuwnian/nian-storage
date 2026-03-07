import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { user, error: authError, status } = await verifyUser(req);
  if (authError) return res.status(status).json({ error: authError });

  const { id } = req.query;

  // GET /api/files/:id
  if (req.method === 'GET') {
    try {
      const { data: file, error } = await supabaseAdmin
        .from('files').select('*').eq('id', id).eq('user_id', user.id).single();
      if (error || !file) return res.status(404).json({ error: 'File not found' });
      return res.json(file);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // DELETE /api/files/:id
  if (req.method === 'DELETE') {
    try {
      const { data: file, error: getError } = await supabaseAdmin
        .from('files').select('*').eq('id', id).eq('user_id', user.id).single();
      if (getError || !file) return res.status(404).json({ error: 'File not found' });

      if (file.url) {
        try {
          const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
          const key = file.url.startsWith(publicBase)
            ? file.url.slice(publicBase.length + 1)
            : `users/${user.id}/${file.url.split('/').pop()}`;
          await r2Client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
        } catch (r2Error) {
          console.error('R2 delete error:', r2Error);
        }
      }

      const { error: deleteError } = await supabaseAdmin
        .from('files').delete().eq('id', id).eq('user_id', user.id);
      if (deleteError) return res.status(400).json({ error: deleteError.message });

      const { data: userData } = await supabaseAdmin
        .from('users').select('storage_used').eq('id', user.id).single();
      await supabaseAdmin
        .from('users')
        .update({ storage_used: Math.max(0, (userData.storage_used || 0) - file.size_bytes) })
        .eq('id', user.id);

      return res.json({ message: 'File deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
