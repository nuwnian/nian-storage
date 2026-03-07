import { supabase, supabaseAdmin } from '../_supabase.js';
import { setCors } from '../_helpers.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) return res.status(400).json({ error: authError.message });

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert(
        { id: authData.user.id, email, name, storage_used: 0, storage_total: 10737418240 },
        { onConflict: 'id', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (userError) return res.status(400).json({ error: userError.message });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: userData.id, email: userData.email, name: userData.name },
      session: authData.session,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
}
