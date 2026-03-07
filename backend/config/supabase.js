import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️  Missing Supabase credentials in .env file');
  console.error('Please add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file');
}

if (!supabaseServiceKey) {
  console.warn('⚠️  Missing SUPABASE_SERVICE_ROLE_KEY - some admin operations may fail');
}

// Admin client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// Public client with anon key (for auth operations)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count');
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
};
