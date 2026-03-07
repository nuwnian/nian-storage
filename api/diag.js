export default async function handler(req, res) {
  try {
    const mod = await import('./_supabase.js');
    res.status(200).json({ ok: true, supabase: 'relative import ok', keys: Object.keys(mod) });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.code, stack: err.stack?.split('\n').slice(0,5) });
  }
}
