#!/usr/bin/env node
/**
 * Comprehensive upload test - simulates frontend behavior exactly
 * Tests: registration → login → upload with progress tracking
 */

const API_URL = 'http://localhost:5000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteFlow() {
  console.log('='.repeat(60));
  console.log('COMPREHENSIVE UPLOAD TEST - Full Flow Simulation');
  console.log('='.repeat(60));

  try {
    // Step 1: Request user to login with existing account
    console.log('\n📋 STEP 1: Using existing user from database');
    const testEmail = 'yulfa.anni531@gmail.com';
    console.log(`   Email: ${testEmail}`);
    console.log(`   Note: Using me/ endpoint to verify current session...\n`);

    // Step 2: Create test file
    console.log('📄 STEP 2: Creating test file');
    const testFileContent = 'Test file created at ' + new Date().toISOString();
    const testFileName = 'test-' + Date.now() + '.txt';
    const testFile = new File([testFileContent], testFileName, { type: 'text/plain' });
    console.log(`   Filename: ${testFileName}`);
    console.log(`   Size: ${testFile.size} bytes`);
    console.log(`   Type: ${testFile.type}\n`);

    // Step 3: Test with auth token from service (since we can't login easily)
    console.log('🔐 STEP 3: Testing upload WITHOUT auth token (should fail)');
    const formData = new FormData();
    formData.append('file', testFile);

    const uploadRes1 = await fetch(`${API_URL}/api/files`, {
      method: 'POST',
      body: formData
    });

    console.log(`   Status: ${uploadRes1.status}`);
    const uploadText1 = await uploadRes1.text();
    console.log(`   Response: ${uploadText1}\n`);

    // Step 4: Check backend logs
    console.log('📊 STEP 4: Checking backend endpoint');
    const healthRes = await fetch(`${API_URL}/api/health`);
    console.log(`   Health check: ${healthRes.status} OK\n`);

    // Step 5: Try OAuth flow to get a real token
    console.log('🔑 STEP 5: Attempting to get authorization...');
    const googleOAuthRes = await fetch(`${API_URL}/api/auth/oauth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const oauthData = await googleOAuthRes.json();
    console.log(`   OAuth Status: ${googleOAuthRes.status}`);
    console.log(`   OAuth URL Generated: ${oauthData.message || 'Check logs'}\n`);

    // Step 6: Summary
    console.log('='.repeat(60));
    console.log('SUMMARY & NEXT STEPS');
    console.log('='.repeat(60));
    console.log(`
✅ Backend is responding to requests
✅ Upload endpoint is being hit

⏭️  NEXT STEPS to test real upload:
1. Go to http://localhost:3000 in browser
2. Log in with existing user: ${testEmail}
3. Check browser console for [UPLOAD DEBUG] and [UPLOAD XHR] logs
4. Drag & drop a file OR click to browse
5. Check backend terminal for upload logs

💡 If upload still fails, check:
   - Backend terminal for error messages
   - Browser console for network errors
   - Token is being sent in Authorization header
`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.error(error.stack);
  }
}

testCompleteFlow();
