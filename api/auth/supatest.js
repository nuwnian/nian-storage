import { createClient } from '@supabase/supabase-js';

// Test: module-level createClient with process.env values (same as real functions)
const envUrl = process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_ANON_KEY;

let client;
let initError;
try {
  client = createClient(envUrl, envKey);
} catch (err) {
  initError = err.message;
}

export default function handler(req, res) {
  res.json({ 
    ok: !initError,
    hasClient: !!client,
    initError,
    envUrl: envUrl ? envUrl.substring(0, 30) + '...' : null,
    envKeyLen: envKey ? envKey.length : 0
  });
}
