#!/usr/bin/env node
/**
 * Test upload to debug backend logs
 */
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5000';
const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvenZ0bW10cWdyc2R5YXV0aXN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg0NzYwMywiZXhwIjoyMDg4NDIzNjAzfQ.QUUggwFr_uPm2ebI9DgI2pbQMg4D4AjHwdJ1U5u0PLQ';

async function testUpload() {
  try {
    console.log('\n===========================================');
    console.log('TEST UPLOAD WITH SERVICE ROLE TOKEN');
    console.log('===========================================\n');

    // Create a small test content
    const testContent = 'Test file ' + Date.now();
    const testFilename = `test-${Date.now()}.txt`;
    
    console.log(`📝 Test content: "${testContent}"`);
    console.log(`📄 Filename: ${testFilename}`);
    console.log(`🔑 Token: ${BEARER_TOKEN.substring(0, 30)}...`);
    
    // Create FormData manually
    const boundary = '----FormBoundary' + Date.now();
    let body = '';
    
    // Add file field
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="file"; filename="' + testFilename + '"\r\n';
    body += 'Content-Type: text/plain\r\n';
    body += '\r\n';
    body += testContent + '\r\n';
    body += `--${boundary}--\r\n`;
    
    console.log(`\n📤 Sending POST request to ${API_URL}/api/files\n`);
    
    const response = await fetch(`${API_URL}/api/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: body
    });
    
    const responseText = await response.text();
    
    console.log(`✅ Response Status: ${response.status}`);
    console.log(`📦 Response Body:\n${responseText}\n`);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✨ UPLOAD SUCCESS!');
        console.log(JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('Response is not JSON:', responseText);
      }
    } else {
      console.log('❌ UPLOAD FAILED');
      try {
        const error = JSON.parse(responseText);
        console.log('Error:', error);
      } catch (e) {
        console.log('Response:', responseText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testUpload();
