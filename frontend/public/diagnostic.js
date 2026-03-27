/**
 * BROWSER CONSOLE DIAGNOSTIC SCRIPT
 * 
 * HOW TO USE:
 * 1. Open http://localhost:3000 in your browser
 * 2. Open DevTools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste the entire code below and press Enter
 * 5. Follow the instructions printed in the console
 */

console.log('%c🔍 NIAN STORAGE UPLOAD DIAGNOSTIC', 'font-size: 16px; font-weight: bold; color: #4A7C3F;');
console.log('%c━'.repeat(40), 'color: #4A7C3F;');

// Check 1: Token in localStorage
console.log('\n%c1️⃣ Checking token in localStorage...', 'font-size: 14px; font-weight: bold;');
const token = localStorage.getItem('supabase.auth.token');
if (token) {
  console.log('%c✅ Token found!', 'color: green; font-weight: bold;');
  console.log('   Token (first 50 chars):', token.substring(0, 50) + '...');
  console.log('   Full token length:', token.length);
} else {
  console.log('%c❌ NO TOKEN FOUND', 'color: red; font-weight: bold;');
  console.log('   ⚠️ User is not logged in!');
}

// Check 2: Make test upload request
console.log('\n%c2️⃣ Testing upload request...', 'font-size: 14px; font-weight: bold;');
const API_URL = 'http://localhost:5000';

(async () => {
  try {
    const formData = new FormData();
    const testBlob = new Blob(['test content'], { type: 'text/plain' });
    formData.append('file', testBlob, 'diagnostic-test.txt');

    console.log(`   Sending to: ${API_URL}/api/files`);
    console.log('   Token sent:', token ? '✅ Yes' : '❌ No');

    const response = await fetch(`${API_URL}/api/files`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });

    console.log(`   Response status: ${response.status}`);
    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      console.log('   Response body:', data);
      
      if (response.status === 201) {
        console.log('%c✅ UPLOAD SUCCESSFUL!', 'color: green; font-weight: bold;');
      } else if (response.status === 401) {
        console.log('%c❌ Unauthorized - Check token!', 'color: red; font-weight: bold;');
      } else if (response.status === 400) {
        console.log('%c❌ Bad request - Check file data!', 'color: red; font-weight: bold;');
      } else {
        console.log('%c❌ Upload failed with status ' + response.status, 'color: red; font-weight: bold;');
      }
    } catch (e) {
      console.log('   Raw response:', responseText);
    }
  } catch (error) {
    console.log('%c❌ Request failed:', 'color: red; font-weight: bold;', error.message);
  }

  // Check 3: Local storage status
  console.log('\n%c3️⃣ Complete storage check:', 'font-size: 14px; font-weight: bold;');
  console.table({
    'Token stored': !!localStorage.getItem('supabase.auth.token'),
    'Token value exists': localStorage.getItem('supabase.auth.token') ? 'Yes' : 'No',
    'User session': sessionStorage.getItem('user') ? 'Yes' : 'No'
  });

  // Check 4: Instructions
  console.log('\n%c📝 NEXT STEPS:', 'font-size: 14px; font-weight: bold; color: #2563EB;');
  if (!token) {
    console.log('%c1. Log in to the application first', 'color: #E07A2F; font-weight: bold;');
    console.log('%c2. After logging in, refresh this console', 'color: #E07A2F; font-weight: bold;');
    console.log('%c3. Run this diagnostic again', 'color: #E07A2F; font-weight: bold;');
  } else {
    console.log('%c1. If upload shows 401 error:' , '');
    console.log('   - Token may be invalid or expired');
    console.log('   - Try logging out and logging back in');
    console.log('');
    console.log('%c2. If upload shows 200/201 success:', '');
    console.log('   - Upload is working! Check file list');
    console.log('');
    console.log('%c3. If upload shows 400/500 error:', '');
    console.log('   - Check backend terminal for detailed error');
  }

  console.log('\n%c━'.repeat(40), 'color: #4A7C3F;');
  console.log('%c🚀 Try uploading a file now!', 'font-size: 14px; font-weight: bold; color: #4A7C3F;');
})();
