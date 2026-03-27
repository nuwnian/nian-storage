import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Get token from environment or command line
const token = process.argv[2];

if (!token) {
  console.error('Usage: node test-upload.js <your-auth-token>');
  process.exit(1);
}

async function testUpload() {
  try {
    // Create a test file
    const testFile = Buffer.from('Test image data');
    const form = new FormData();
    form.append('file', testFile, { filename: 'test.txt', contentType: 'text/plain' });

    console.log('Uploading test file...');
    console.log('Token:', token.substring(0, 20) + '...');
    console.log('API URL: http://localhost:5000/api/files');

    const response = await fetch('http://localhost:5000/api/files', {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      body: form
    });

    console.log('\n--- RESPONSE ---');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers));

    const body = await response.text();
    console.log('Body:', body);

    if (!response.ok) {
      console.error('\n❌ Upload FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ Upload SUCCESS');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testUpload();
