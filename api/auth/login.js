import { createClient } from '@supabase/supabase-js';

let supabase;
try {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
} catch (e) {
  console.error('Supabase init failed:', e);
}

export default async function handler(req, res) {
  res.status(200).json({ ok: true, hasSupabase: !!supabase, method: req.method });
}
