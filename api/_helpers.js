import { supabase } from './_supabase.js';

export async function verifyUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return { error: 'No token provided', status: 401 };

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { error: 'Invalid token', status: 401 };

  return { user };
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', (process.env.CORS_ORIGIN || 'https://nian-storage.vercel.app').replace(/[\r\n]/g, '').trim());
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}
