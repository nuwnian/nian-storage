import { createClient } from '@supabase/supabase-js';

// Test: module-level createClient with hardcoded values
const client = createClient('https://test.supabase.co', 'test-key-1234567890abcdef1234567890abcdef');

export default function handler(req, res) {
  res.json({ ok: true, hasModuleLevelClient: !!client, envUrl: !!process.env.SUPABASE_URL });
}
