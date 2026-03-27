import { supabaseAdmin } from './backend/config/supabase.js';

async function checkDB() {
  try {
    const { data: users, error } = await supabaseAdmin.from('users').select('id, email');
    console.log('Users:', users);
    console.log('Error:', error);
  } catch (e) {
    console.error('Exception:', e.message);
  }
}

checkDB();
