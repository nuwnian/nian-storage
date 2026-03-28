#!/usr/bin/env node
/**
 * Test upload with proper user token
 */

const API_URL = 'http://localhost:5000';
const SUPABASE_URL = 'https://zozvtmmtqgrsdy autisy.supabase.co'; // Fixed later if needed
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvenZ0bW10cWdyc2R5YXV0aXN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg0NzYwMywiZXhwIjoyMDg4NDIzNjAzfQ.QUUggwFr_uPm2ebI9DgI2pbQMg4D4AjHwdJ1U5u0PLQ';

async function testUpload() {
  try {
    console.log('\n===========================================');
    console.log('TEST UPLOAD - Get Token Then Upload');
    console.log('===========================================\n');

    // Step 1: Get a user token from backend auth endpoint
    console.log('🔐 Step 1: Getting user session from backend...\n');
    
    const meResponse = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'vuid': 'test'
      }
    });
    
    const meData = await meResponse.text();
    console.log(`   Me Response Status: ${meResponse.status}`);
    console.log(`   Me Response: ${meData}\n`);
    
    // Try to login first
    console.log('🔐 Step 2: Attempting to login or create session...\n');
    
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123!'
      })
    });
    
    const loginData = await loginResponse.text();
    console.log(`   Login Response Status: ${loginResponse.status}`);
    console.log(`   Login Response: ${loginData}\n`);
    
    let token = null;
    if (loginResponse.ok) {
      try {
        const loginJson = JSON.parse(loginData);
        token = loginJson.session?.access_token;
        console.log(`   ✅ Got token: ${token?.substring(0, 30)}...\n`);
      } catch (e) {
        console.log('   Could not parse login response as JSON\n');
      }
    }
    
    if (!token) {
      console.log('❌ Could not get valid user token\n');
      return;
    }
    
    // Step 2: Upload file with the token
    console.log('📤 Step 3: Uploading file...\n');
    
    const testContent = 'Test file ' + Date.now();
    const testFilename = `test-${Date.now()}.txt`;
    
    const boundary = '----FormBoundary' + Date.now();
    let body = '';
    
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="file"; filename="' + testFilename + '"\r\n';
    body += 'Content-Type: text/plain\r\n';
    body += '\r\n';
    body += testContent + '\r\n';
    body += `--${boundary}--\r\n`;
    
    const uploadResponse = await fetch(`${API_URL}/api/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: body
    });
    
    const uploadText = await uploadResponse.text();
    
    console.log(`   Response Status: ${uploadResponse.status}`);
    console.log(`   Response Body:\n${uploadText}\n`);
    
    if (uploadResponse.ok) {
      console.log('✨ UPLOAD SUCCESS!\n');
    } else {
      console.log('❌ UPLOAD FAILED\n');
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testUpload();
