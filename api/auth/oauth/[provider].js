import { setCors } from '../../_helpers.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { provider } = req.query;

    if (!['google', 'github'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid OAuth provider' });
    }

    const redirectTo = req.headers.origin || 'https://nian-storage.vercel.app';
    const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const url = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;

    res.json({ url });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: error.message });
  }
}
