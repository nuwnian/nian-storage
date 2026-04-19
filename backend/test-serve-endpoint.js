import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get first user
const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
if (usersError || !users?.users?.length) {
  console.log('Error or no users:', usersError?.message || 'No users');
  process.exit(1);
}

const user = users.users[0];
console.log('User ID:', user.id);

// Get first image for this user
const { data: files } = await supabaseAdmin
  .from('files')
  .select('id, name')
  .eq('type', 'image')
  .eq('user_id', user.id)
  .limit(1);

if (!files?.length) {
  console.log('No images for this user');
  process.exit(1);
}

const file = files[0];
console.log('File:', file.id, file.name);

// Now try to fetch it like the frontend would
const token = user.user_metadata?.firebase_sign_in_provider ? 'test' : null;
if (!token) {
  console.log('---');
  console.log('Test the serve endpoint with:');
  console.log(`curl -H "Authorization: Bearer <valid_token>" http://localhost:5000/api/files/${file.id}/serve`);
}
