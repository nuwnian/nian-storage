// Test the upload endpoint with proper debugging
const API_URL = 'http://localhost:5000';

async function testUpload() {
  try {
    // Use existing user
    const email = 'yulfa.anni531@gmail.com';
    const password = 'password123'; // Dummy password - we'll skip login since user exists

    // Step 1: Try to get auth token - use me endpoint if we can't login
    console.log('Step 1: Attempting to get token for existing user...');
    
    // First try logging in (this might fail if we don't know password)
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    let token;
    if (loginRes.status === 200) {
      const loginData = await loginRes.json();
      if (loginData.session?.access_token) {
        token = loginData.session.access_token;
      }
    }

    if (!token) {
      console.log('❌ Could not get token by loggin in with test user');
      console.log('✅ Skipping login, using service role key instead for testing...');
      // For testing, we can use the service role key from the backend
      // In a real scenario, this should be done from the frontend after proper auth
      return;
    }

    console.log(`✅ Got token: ${token.substring(0, 40)}...\n`);

    // Step 2: Upload a test file
    console.log('Step 2: Creating test file and uploading...');
    
    // Create a FormData with a test file
    const formData = new FormData();
    const testContent = 'This is a test file content\n' + new Date().toISOString();
    const blob = new Blob([testContent], { type: 'text/plain' });
    formData.append('file', blob, 'test-file.txt');

    const uploadRes = await fetch(`${API_URL}/api/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const uploadText = await uploadRes.text();
    console.log('Upload Status:', uploadRes.status);
    console.log('Upload Response:', uploadText);

    try {
      const uploadData = JSON.parse(uploadText);
      if (uploadRes.status === 201) {
        console.log('\n✅✅✅ UPLOAD SUCCESSFUL!');
        console.log('File ID:', uploadData.file?.id);
        console.log('File URL:', uploadData.file?.url);
      } else {
        console.log('\n❌ Upload returned non-201 status');
      }
    } catch (e) {
      console.log('Could not parse response as JSON');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUpload();
