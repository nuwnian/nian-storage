import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for frontend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const hasSupabaseConfig = !!(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn('⚠️ Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
  console.warn('Session restoration from URL hash will not work');
}

const fallbackSupabaseClient = {
  auth: {
    onAuthStateChange: (callback) => {
      if (typeof callback === 'function') {
        // Mimic INITIAL_SESSION with no session so app can continue rendering.
        Promise.resolve().then(() => callback('INITIAL_SESSION', null));
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
    signOut: async () => ({ error: null }),
  },
};

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true, // Detects and processes URL hash on page load
      },
    })
  : fallbackSupabaseClient;
