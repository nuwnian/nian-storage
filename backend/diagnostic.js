import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function runDiagnostics() {
  console.log('========== DIAGNOSTICS ==========\n');
  
  // Test 1: Database connection
  console.log('TEST 1: Database connection');
  try {
    const { data, error } = await supabaseAdmin.from('users').select('count').limit(1);
    if (error) {
      console.error('❌ Failed:', error.message);
    } else {
      console.log('✅ Database connected');
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }

  // Test 2: Check users table structure
  console.log('\nTEST 2: Users table schema');
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('✅ Users table exists (no rows yet)');
    } else if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Users table exists with', data.length, 'rows');
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }

  // Test 3: Check files table structure
  console.log('\nTEST 3: Files table schema');
  try {
    const { data, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('✅ Files table exists (no rows yet)');
    } else if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Files table exists with', data.length, 'rows');
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }

  // Test 4: R2 Connection
  console.log('\nTEST 4: R2 Configuration');
  try {
    const R2_ENDPOINT = process.env.R2_ENDPOINT;
    const R2_BUCKET = process.env.R2_BUCKET_NAME;
    const R2_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY;
    
    if (!R2_ENDPOINT || !R2_BUCKET || !R2_KEY_ID || !R2_SECRET) {
      console.error('❌ Missing R2 credentials');
      console.log('   R2_ENDPOINT:', R2_ENDPOINT ? '✅' : '❌');
      console.log('   R2_BUCKET_NAME:', R2_BUCKET ? '✅' : '❌');
      console.log('   R2_ACCESS_KEY_ID:', R2_KEY_ID ? '✅' : '❌');
      console.log('   R2_SECRET_ACCESS_KEY:', R2_SECRET ? '✅' : '❌');
    } else {
      console.log('✅ R2 credentials present');
      console.log('   Endpoint:', R2_ENDPOINT);
      console.log('   Bucket:', R2_BUCKET);
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }

  console.log('\n========== END DIAGNOSTICS ==========');
}

runDiagnostics();
