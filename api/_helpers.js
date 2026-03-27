import { supabase } from './_supabase.js';

export async function verifyUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return { error: 'No token provided', status: 401 };

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { error: 'Invalid token', status: 401 };

  return { user };
}

function getAllowedOrigins() {
  return (process.env.CORS_ORIGIN || 'https://nian-storage.vercel.app,http://localhost:3000')
    .replace(/[\r\n]/g, '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function setCors(reqOrRes, resMaybe) {
  const req = resMaybe ? reqOrRes : null;
  const res = resMaybe || reqOrRes;
  const requestOrigin = (req?.headers?.origin || '').replace(/[\r\n]/g, '').trim();
  const allowedOrigins = getAllowedOrigins();

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  } else if (!requestOrigin && allowedOrigins.length > 0) {
    // Non-browser requests may not include Origin.
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
}
