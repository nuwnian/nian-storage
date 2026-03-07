import { createClient } from '@supabase/supabase-js';

export default function handler(req, res) {
  try {
    const client = createClient('https://test.supabase.co', 'test-key');
    res.json({ ok: true, imported: true, hasClient: !!client });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
}
