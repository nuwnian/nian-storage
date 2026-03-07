import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

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
