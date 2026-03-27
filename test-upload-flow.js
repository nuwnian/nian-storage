import fs from 'fs';

const API_URL = 'http://localhost:5000';

async function testUploadFlow() {
  try {
    console.log('🔍 Starting upload flow test...\n');

    // Step 1: Login to get token
    console.log('📝 Step 1: Logging in...');
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    console.log(`Login response status: ${loginRes.status}`);
    const loginData = await loginRes.json();
    console.log(`Login response:`, loginData);

    if (!loginData.session?.access_token) {
      console.error('❌ Failed to get access token');
      if (loginData.error) {
        console.log('Error message:', loginData.error);
        
        // If login fails, try to register and then login
        console.log('\n📧 User not found, registering...');
        const registerRes = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
          })
        });
        
        const registerData = await registerRes.json();
        console.log('Register response:', registerData);
        
        if (!registerData.session?.access_token) {
          console.error('❌ Registration failed');
          return;
        }
        
        loginData.session = registerData.session;
      } else {
        return;
      }
    }

    const token = loginData.session.access_token;
    console.log(`✅ Token obtained: ${token.substring(0, 30)}...\n`);

    // Step 2: Create a test file with FormData using native Node API
    console.log('📄 Step 2: Creating test file...');
    const testFile = new File(['This is a test file for upload'], 'test-upload.txt', { type: 'text/plain' });
    console.log(`✅ Test file created\n`);

    // Step 3: Upload the file
    console.log('📤 Step 3: Uploading file...');
    const form = new FormData();
    form.append('file', testFile);

    const uploadRes = await fetch(`${API_URL}/api/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    });

    console.log(`Upload response status: ${uploadRes.status}`);
    const uploadData = await uploadRes.json();
    console.log(`Upload response:`, JSON.stringify(uploadData, null, 2));

    if (uploadRes.status === 201) {
      console.log('\n✅✅✅ UPLOAD SUCCESSFUL!');
      console.log(`File ID: ${uploadData.file.id}`);
      console.log(`File URL: ${uploadData.file.url}`);
    } else {
      console.log('\n❌ Upload failed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testUploadFlow();
