import { supabase, supabaseAdmin } from '../_supabase.js';
import { setCors } from '../_helpers.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users').select('*').eq('id', user.id).single();
    if (userError) return res.status(400).json({ error: userError.message });

    res.json({
      user: {
        id: userData.id, email: userData.email, name: userData.name,
        storage_used: userData.storage_used, storage_total: userData.storage_total,
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
}
