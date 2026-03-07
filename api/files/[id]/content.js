import { supabaseAdmin } from '../../_supabase.js';
import { verifyUser, setCors } from '../../_helpers.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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

  try {
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
