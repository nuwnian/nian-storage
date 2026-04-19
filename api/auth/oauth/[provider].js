import { setCors } from '../../_helpers.js';

export default async function handler(req, res) {
  try {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { provider } = req.query;

    if (!['google', 'github'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid OAuth provider' });
    }

    const ALLOWED_REDIRECTS = ['https://nian-storage.vercel.app', 'http://localhost:3000'];
    const requestedOrigin = req.headers.origin || '';
    const redirectTo = ALLOWED_REDIRECTS.includes(requestedOrigin)
      ? requestedOrigin
      : ALLOWED_REDIRECTS[0];
    const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/[\r\n]/g, '').trim().replace(/\/$/, '');
    const url = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;

    res.json({ url });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: error.message });
  }
}
