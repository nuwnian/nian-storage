// Test the backend serve endpoint to capture the error
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Get first user
const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
if (usersError || !users?.users?.length) {
  console.log('Error:', usersError?.message || 'No users');
  process.exit(1);
}

const user = users.users[0];
console.log('User:', user.email);

// Get auth token for this user
const demoPassword = 'temp123456'; // You may need to set a known password

// Get first image
const { data: files } = await supabaseAdmin
  .from('files')
  .select('id, name')
  .eq('type', 'image')
  .limit(1);

if (!files?.length) {
  console.log('No images found');
  process.exit(1);
}

const fileId = files[0].id;
console.log('Testing file:', fileId, '-', files[0].name);

// Try with a service role JWT token (for testing only)
const serviceToken = (await supabase.auth.getSession()).data.session?.access_token;

// Actually, let's just try to fetch without auth to see the error
console.log('\nTesting serve endpoint...');
try {
  const response = await fetch(`http://localhost:5000/api/files/${fileId}/serve`, {
    headers: {
      'Authorization': 'Bearer invalid_token'
    }
  });
  
  console.log('Status:', response.status);
  if (!response.ok) {
    const text = await response.text();
    console.log('Response:', text);
  }
} catch (err) {
  console.log('Error:', err.message);
}

process.exit(0);
