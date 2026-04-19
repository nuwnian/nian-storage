import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env vars from .env file if it exists
function loadEnv() {
  const envFiles = ['.env', '.env.local'];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && !process.env[key]) {
          process.env[key] = valueParts.join('=').trim();
        }
      });
    }
  }
}
loadEnv();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== NIAN STORAGE IMAGE DIAGNOSTICS ===\n');

// Check environment variables
console.log('📁 Environment Variables:');
console.log('  R2_ENDPOINT:', process.env.R2_ENDPOINT ? '✅ Set' : '❌ Missing');
console.log('  R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME ? `✅ ${process.env.R2_BUCKET_NAME}` : '❌ Missing');
console.log('  R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL ? `✅ ${process.env.R2_PUBLIC_URL}` : '❌ Missing');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');

// Query database for files
const { data: files, error } = await supabaseAdmin
  .from('files')
  .select('id, name, type, url, created_at')
  .eq('type', 'image')
  .limit(5);

if (error) {
  console.log('\n❌ Database Error:', error.message);
  process.exit(1);
}

if (!files || files.length === 0) {
  console.log('\n⚠️  No image files found in database');
  process.exit(0);
}

console.log(`\n📸 Found ${files.length} image file(s):\n`);

files.forEach((file, i) => {
  console.log(`${i + 1}. ${file.name}`);
  console.log(`   ID: ${file.id}`);
  console.log(`   URL in DB: ${file.url || '(empty)'}`);
  
  // Check if URL format is correct
  if (file.url) {
    try {
      const url = new URL(file.url);
      console.log(`   ✅ Valid URL format`);
      console.log(`   Domain: ${url.hostname}`);
      console.log(`   Path: ${url.pathname}`);
      
      // Check if it matches R2_PUBLIC_URL
      if (process.env.R2_PUBLIC_URL && file.url.startsWith(process.env.R2_PUBLIC_URL)) {
        console.log(`   ✅ Matches R2_PUBLIC_URL`);
      } else {
        console.log(`   ⚠️  Does NOT match R2_PUBLIC_URL`);
        console.log(`      Expected prefix: ${process.env.R2_PUBLIC_URL}`);
      }
    } catch (e) {
      console.log(`   ❌ Invalid URL: ${e.message}`);
    }
  } else {
    console.log(`   ⚠️  URL is empty in database`);
  }
  console.log();
});

console.log('=== DEBUGGING STEPS ===');
console.log('1. Check your browser DevTools Network tab:');
console.log('   - Look for requests to /api/files/[fileId]/serve');
console.log('   - Check the response status (4xx = client error, 5xx = server error)');
console.log('2. Check your server logs for error messages');
console.log('3. Verify R2_PUBLIC_URL matches your actual Cloudflare R2 public domain');
