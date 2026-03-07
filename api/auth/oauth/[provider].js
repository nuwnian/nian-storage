import { supabase } from '../../_supabase.js';
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

    const origin = req.headers.origin || 'http://localhost:3000';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: origin },
    });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ url: data.url });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: error.message });
  }
}
