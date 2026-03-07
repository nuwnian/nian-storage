import { supabase } from '../_supabase.js';
import { setCors } from '../_helpers.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return res.status(401).json({ error: 'Invalid credentials' });

    const { data: userData, error: userError } = await supabase
      .from('users').select('*').eq('id', authData.user.id).single();
    if (userError) return res.status(400).json({ error: userError.message });

    res.json({
      message: 'Login successful',
      user: {
        id: userData.id, email: userData.email, name: userData.name,
        storage_used: userData.storage_used, storage_total: userData.storage_total,
      },
      session: authData.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
}
