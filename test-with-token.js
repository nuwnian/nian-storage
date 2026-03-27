#!/usr/bin/env node
/**
 * Test upload WITH valid JWT token from Supabase
 */

const API_URL = 'http://localhost:5000';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvenZ0bW10cWdyc2R5YXV0aXN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg0NzYwMywiZXhwIjoyMDg4NDIzNjAzfQ.QUUggwFr_uPm2ebI9DgI2pbQMg4D4AjHwdJ1U5u0PLQ';

async function testUploadWithToken() {
  console.log('='.repeat(60));
  console.log('UPLOAD TEST WITH SERVICE ROLE TOKEN');
  console.log('='.repeat(60));
  
  try {
    // Use service role key as token
    const token = SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('\n🔑 Using Service Role Key as Bearer token');
    console.log(`   Token: ${token.substring(0, 30)}...\n`);

    // Create test file
    console.log('📄 Creating test file...');
    const testFileContent = 'Test file upload with token - ' + new Date().toISOString();
    const testFileName = 'test-with-token-' + Date.now() + '.txt';
    const testFile = new File([testFileContent], testFileName, { type: 'text/plain' });
    console.log(`   Filename: ${testFileName}`);
    console.log(`   Size: ${testFile.size} bytes\n`);

    // Upload with token
    console.log('📤 Uploading with Authorization header...');
    const formData = new FormData();
    formData.append('file', testFile);

    const uploadRes = await fetch(`${API_URL}/api/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log(`   Response Status: ${uploadRes.status}`);
    const uploadText = await uploadRes.text();
    
    try {
      const uploadData = JSON.parse(uploadText);
      console.log(`   Response Body:`);
      console.log(JSON.stringify(uploadData, null, 3));
      
      if (uploadRes.status === 201) {
        console.log('\n✅✅✅ UPLOAD SUCCESSFUL WITH TOKEN!');
        console.log(`   File ID: ${uploadData.file?.id}`);
        console.log(`   File URL: ${uploadData.file?.url}`);
      } else if (uploadRes.status === 401) {
        console.log('\n⚠️  Upload returned 401 - Token verification failed');
        console.log('   Service role token may not work for user endpoints');
      } else {
        console.log('\n❌ Upload returned status ' + uploadRes.status);
      }
    } catch (e) {
      console.log(`   Raw Response: ${uploadText}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('FRONTEND TESTING INSTRUCTIONS:');
    console.log('='.repeat(60));
    console.log(`
1. Open http://localhost:3000 in your browser
2. Log in with email: yulfa.anni531@gmail.com
3. Open Developer Tools (F12)
4. Go to Console tab
5. Try uploading a file via:
   - Drag & drop into the zone
   - Click to browse and select
6. Watch the console for [UPLOAD DEBUG] and [UPLOAD XHR] messages
7. Check the backend terminal for upload logs

If upload fails, the browser console will show:
  - [UPLOAD DEBUG] Token status
  - [UPLOAD XHR] Request details and response
  - Network tab will show the POST request status
`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUploadWithToken();
