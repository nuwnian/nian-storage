import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n=== IMAGE URL DIAGNOSTIC ===\n');
console.log('R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL || '❌ NOT SET');
console.log('R2_ENDPOINT:', process.env.R2_ENDPOINT || '❌ NOT SET');
console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME || '❌ NOT SET');

try {
  const { data: files, error } = await supabaseAdmin
    .from('files')
    .select('id, name, type, url, size, created_at')
    .eq('type', 'image');

  if (error) throw error;

  if (!files || files.length === 0) {
    console.log('\n⚠️  No image files found in database\n');
    process.exit(0);
  }

  console.log(`\n📸 Found ${files.length} image file(s):\n`);

  files.forEach((file, idx) => {
    console.log(`[${idx + 1}] ${file.name}`);
    console.log(`    ID: ${file.id}`);
    console.log(`    Type: ${file.type}`);
    console.log(`    Size: ${file.size}`);
    console.log(`    Created: ${new Date(file.created_at).toLocaleString()}`);
    console.log(`    URL stored: ${file.url ? '✅ ' + file.url : '❌ EMPTY'}`);
    
    if (file.url) {
      // Check if URL format is correct
      if (file.url.includes('r2.dev') || file.url.includes('.r2.')) {
        console.log(`    Domain check: ✅ R2 domain detected`);
      } else {
        console.log(`    Domain check: ⚠️  Unexpected domain in URL`);
      }
      
      // Extract the key
      if (process.env.R2_PUBLIC_URL) {
        if (file.url.startsWith(process.env.R2_PUBLIC_URL)) {
          const key = file.url.substring(process.env.R2_PUBLIC_URL.length + 1);
          console.log(`    R2 Key: ${key}`);
        } else {
          console.log(`    ⚠️  URL doesn't match R2_PUBLIC_URL`);
          console.log(`       Expected prefix: ${process.env.R2_PUBLIC_URL}`);
        }
      }
    }
    console.log();
  });

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
