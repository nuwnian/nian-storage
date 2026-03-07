import { supabase, supabaseAdmin } from '../_supabase.js';
import { setCors } from '../_helpers.js';

export default async function handler(req, res) {
  setCors(res);
  try {
    res.status(200).json({ 
      ok: true, 
      hasSupabase: !!supabase,
      hasAdmin: !!supabaseAdmin,
      env: {
        hasUrl: !!process.env.SUPABASE_URL,
        hasAnon: !!process.env.SUPABASE_ANON_KEY,
        hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0,5) });
  }
}
