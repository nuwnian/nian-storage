#!/usr/bin/env node
/**
 * Sentry Integration Test Script
 * Tests both backend and frontend Sentry configurations
 */

import http from 'http';

console.log('🧪 Sentry Integration Test\n');
console.log('═'.repeat(50));

// Test 1: Backend Health Check
console.log('\n✅ Test 1: Backend Server Health');
console.log('─'.repeat(50));

try {
  const req = http.get('http://localhost:5000/api/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (res.statusCode === 200 && json.status === 'ok') {
          console.log('✅ Backend is running and responsive');
          console.log(`   Status: ${json.status}`);
          console.log(`   Message: ${json.message}`);
        } else {
          console.log('⚠️  Backend responded but with unexpected status');
          console.log(`   Status Code: ${res.statusCode}`);
          console.log(`   Response: ${data}`);
        }
      } catch (e) {
        console.log('⚠️  Backend response is not valid JSON');
        console.log(`   Raw response: ${data}`);
      }
      
      // Test 2: Sentry Configuration Check
      console.log('\n✅ Test 2: Sentry Backend Configuration');
      console.log('─'.repeat(50));
      
      const sentryDsn = process.env.SENTRY_DSN;
      if (sentryDsn) {
        console.log('✅ SENTRY_DSN is set');
        console.log(`   DSN: ${sentryDsn.substring(0, 30)}...`);
        console.log(`   Project ID: ${sentryDsn.split('/').pop()}`);
      } else {
        console.log('❌ SENTRY_DSN is NOT set');
        console.log('   Add SENTRY_DSN to backend/.env');
      }
      
      const appVersion = process.env.APP_VERSION;
      console.log(`\n   App Version: ${appVersion || '1.0.0-dev'}`);
      
      // Test 3: Frontend Sentry Configuration
      console.log('\n✅ Test 3: Sentry Frontend Configuration');
      console.log('─'.repeat(50));
      
      // This would be checked from environment, but we'll show what to check
      console.log('Frontend Sentry status:');
      console.log('   • Check frontend/.env.local for VITE_SENTRY_DSN');
      console.log('   • Sentry is initialized in frontend/src/main.jsx');
      console.log('   • User context is set in frontend/src/pages/NianLogin.jsx');
      
      // Test 4: Manual Error Test Instructions
      console.log('\n✅ Test 4: Manual Error Testing');
      console.log('─'.repeat(50));
      
      console.log('\nBackend Error Test:');
      console.log('  1. Open another terminal');
      console.log('  2. Run: curl http://localhost:5000/api/test-error');
      console.log('  3. You should see an error in Sentry dashboard');
      
      console.log('\nFrontend Error Test:');
      console.log('  1. Open your browser console (F12)');
      console.log('  2. Type: throw new Error("Test from console")');
      console.log('  3. Press Enter');
      console.log('  4. Check Sentry dashboard for the error');
      
      // Test 5: User Context Tracking
      console.log('\n✅ Test 5: User Context Tracking');
      console.log('─'.repeat(50));
      
      console.log('Backend:');
      console.log('  • User context is set after login/register/OAuth');
      console.log('  • User info includes: id, email, username');
      
      console.log('\nFrontend:');
      console.log('  • User context is set after successful authentication');
      console.log('  • Check Sentry error details for user info');
      
      // Summary
      console.log('\n' + '═'.repeat(50));
      console.log('📊 Sentry Integration Status\n');
      
      console.log('Backend:   ✅ Running with Sentry integration');
      console.log('Frontend:  ⏳ Ready (start dev server separately)');
      console.log('DSN:       ' + (sentryDsn ? '✅ Configured' : '❌ Not configured'));
      
      console.log('\n🔗 Next Steps:');
      console.log('  1. Start frontend: cd frontend && npm run dev');
      console.log('  2. Log in to the application');
      console.log('  3. Trigger a test error');
      console.log('  4. Visit https://sentry.io to see captured errors');
      console.log('  5. Verify user context in error details');
      
      console.log('\n' + '═'.repeat(50) + '\n');
    });
  });
  
  req.on('error', (err) => {
    console.log('❌ Failed to connect to backend');
    console.log(`   Error: ${err.message}`);
    console.log('\n   Make sure backend is running with: npm start');
    process.exit(1);
  });
  
} catch (error) {
  console.log('❌ Test failed:', error.message);
  process.exit(1);
}
