export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    res.status(200).json({ ok: true, supabase: 'loaded', env: { 
      hasUrl: !!process.env.SUPABASE_URL,
      hasAnon: !!process.env.SUPABASE_ANON_KEY
    }});
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.code, stack: err.stack?.split('\n').slice(0,5) });
  }
}
