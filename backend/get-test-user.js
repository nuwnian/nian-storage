import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

if (error) {
  console.log('Error:', error.message);
} else if (users?.users && users.users.length > 0) {
  const user = users.users[0];
  console.log('First user:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  
  // Get file for this user
  const { data: files } = await supabaseAdmin
    .from('files')
    .select('id, name, type')
    .eq('user_id', user.id)
    .limit(1);
  
  if (files?.length > 0) {
    console.log('  First file:', files[0].id, '-', files[0].name);
  }
} else {
  console.log('No users found');
}
