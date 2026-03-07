import { supabase, supabaseAdmin } from '../../_supabase.js';
import { setCors } from '../../_helpers.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { access_token, refresh_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'Access token required' });

    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);
    if (userError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: userData, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          storage_used: 0,
          storage_total: 10737418240,
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (upsertError) return res.status(400).json({ error: upsertError.message });

    res.json({
      message: 'OAuth login successful',
      user: {
        id: userData.id, email: userData.email, name: userData.name,
        storage_used: userData.storage_used, storage_total: userData.storage_total,
      },
      session: { access_token, refresh_token },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: error.message });
  }
}
