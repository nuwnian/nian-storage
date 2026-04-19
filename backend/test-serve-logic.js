import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

dotenv.config();

// Get first image
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: users } = await supabaseAdmin
  .from('users')
  .select('id')
  .limit(1);

console.log('Users found:', users?.length);

const user = users?.[0];
if (!user) {
  console.log('❌ No user found');
  process.exit(1);
}

console.log('User ID:', user.id);

const { data: files, error: fileError } = await supabaseAdmin
  .from('files')
  .select('*')
  .eq('type', 'image')
  .eq('user_id', user.id)
  .limit(1);

console.log('Files found for user:', files?.length);
if (fileError) console.log('File error:', fileError.message);

let file = files?.[0];
if (!file) {
  console.log('⚠️  No image file found for this user, trying any image...');
  
  // Try to find any image
  const { data: anyImages } = await supabaseAdmin
    .from('files')
    .select('*')
    .eq('type', 'image')
    .limit(1);
  
  file = anyImages?.[0];
  if (!file) {
    console.log('❌ No image files found at all');
    process.exit(1);
  }
}

console.log('\n=== TESTING SERVE ENDPOINT LOGIC ===\n');
console.log('File:', file.name);
console.log('URL in DB:', file.url);

try {
  // This mimics what serve.js does
  const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  console.log('\nPublic Base:', publicBase);

  let key;
  if (publicBase && file.url.startsWith(publicBase)) {
    key = file.url.slice(publicBase.length + 1);
    console.log('Key (method 1 - from publicBase):', key);
  } else if (file.url.includes('/users/')) {
    key = file.url.substring(file.url.indexOf('/users/') + 1);
    console.log('Key (method 2 - from /users/):', key);
  } else {
    key = `users/${user.id}/${file.url.split('/').pop()}`;
    console.log('Key (method 3 - fallback):', key);
  }

  // Try to fetch from R2
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key
  });

  console.log('\nAttempting to fetch from R2...');
  const response = await r2Client.send(command);

  if (response.Body) {
    const bodyBytes = await response.Body.transformToByteArray();
    console.log('\n✅ SUCCESS! Retrieved file from R2');
    console.log(`   Bytes: ${bodyBytes.length}`);
    console.log(`   Content-Type: ${response.ContentType}`);
  } else {
    console.log('\n⚠️  File retrieved but no Body');
  }
  
} catch (error) {
  console.error('\n❌ ERROR fetching from R2:');
  console.error(`   Code: ${error.Code || error.name}`);
  console.error(`   Message: ${error.message}`);
  
  if (error.Code === 'NoSuchKey') {
    console.log('\n🔍 The file key doesn\'t exist in R2.');
    console.log('   This could mean:');
    console.log('   1. File was deleted from R2');
    console.log('   2. The R2 key format changed');
    console.log('   3. URL stored in DB is incorrect');
  }
}
