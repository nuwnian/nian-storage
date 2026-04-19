# Cypress E2E Test Suite - Documentation

This comprehensive test suite covers OAuth authentication, file operations, and session management for the Nian Storage application.

## Overview

- **Framework**: Cypress 13+
- **Test Runner**: Node.js
- **Environment**: React + Vite frontend, Express backend
- **Coverage**:
  - ✅ OAuth authentication (Google, GitHub)
  - ✅ File upload, download, preview, and deletion
  - ✅ Session management and token refresh
  - ✅ Error handling and recovery
  - ✅ Full user workflows

## Prerequisites

1. **Node.js** (v18+)
2. **npm** (v8+)
3. **Nian Storage** both frontend and backend running locally:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:5000`
4. **Supabase** credentials configured in `.env.local`

## Installation

### 1. Install Cypress

```bash
npm install --save-dev cypress
```

### 2. Verify Installation

```bash
npx cypress --version
```

### 3. Configuration

The `cypress.config.js` is already configured with:
- Base URL: `http://localhost:3000`
- Default timeout: 10000ms
- Viewport: 1280x720

## Running Tests

### Interactive Mode (Cypress UI)

Open the Cypress Test Runner with browser inspection tools:

```bash
npx cypress open
```

This opens:
- Cypress Test Runner UI
- Browser window
- Test explorer
- Error messages with detailed stack traces

### Headless Mode

Run all tests in background (CI/CD):

```bash
npx cypress run
```

### Run Specific Test File

```bash
# OAuth login tests
npx cypress run --spec "cypress/e2e/oauth-login.cy.js"

# File operations tests
npx cypress run --spec "cypress/e2e/file-operations.cy.js"

# Session management tests
npx cypress run --spec "cypress/e2e/session-management.cy.js"

# Full integration tests
npx cypress run --spec "cypress/e2e/full-integration.cy.js"
```

### Run Specific Test Suite

```bash
# Run only OAuth tests
npx cypress run --spec "**/oauth*.cy.js"

# Run all tests
npx cypress run
```

### Run with Chrome Browser

```bash
npx cypress run --browser chrome
```

### Run with Video Output

```bash
npx cypress run --record
```

## Test Files

### 1. **oauth-login.cy.js** (OAuth Authentication Tests)

**Purpose**: Verify OAuth login flow and token handling

**Test Cases**:
- OAuth button visibility
- OAuth URL generation
- OAuth callback processing
- Session restoration after OAuth
- Error handling and recovery
- CORS validation
- Parameter validation

**Key Tests**:
- ✅ Google OAuth login flow
- ✅ GitHub OAuth login flow
- ✅ Invalid token handling
- ✅ Rate limiting

**Expected**: 15 test cases covering OAuth flow edge cases

### 2. **file-operations.cy.js** (File Management Tests)

**Purpose**: Verify file upload, listing, search, and deletion

**Test Cases**:
- Basic file upload
- Multiple file uploads
- File display and listing
- File search and filtering
- File deletion with confirmation
- File viewer/preview
- Error handling

**Key Tests**:
- ✅ Upload single file
- ✅ Upload multiple files sequentially
- ✅ Display file list with metadata
- ✅ Search files by name
- ✅ Filter by file type
- ✅ Delete file with confirmation
- ✅ Preview image/document

**Expected**: 20+  test cases covering file operations

### 3. **session-management.cy.js** (Session Tests)

**Purpose**: Verify session persistence, token refresh, and timeout

**Test Cases**:
- Session restoration on page refresh
- Token refresh on expiration
- Logout functionality
- Concurrent session handling
- Session timeout warnings
- Auth state synchronization
- BroadcastChannel for multi-tab sync

**Key Tests**:
- ✅ Restore session after browser refresh
- ✅ Refresh token on expiration
- ✅ Clear auth on logout
- ✅ Sync logout across tabs
- ✅ Handle concurrent OAuth sessions

**Expected**: 18+ test cases for session management

### 4. **full-integration.cy.js** (End-to-End Workflows)

**Purpose**: Test complete user workflows and performance

**Test Cases**:
- OAuth login → upload → view → delete
- Series of file operations
- Error recovery workflows
- Performance with large file lists
- Cross-feature integration
- Accessibility during operations

**Key Workflows**:
- ✅ Login via OAuth → Upload file → View file → Delete file
- ✅ Multiple file operations in sequence
- ✅ Recover from network errors
- ✅ Handle 100+ file lists efficiently
- ✅ Maintain session across operations

**Expected**: 10+ complex workflow tests

## Custom Commands

### Authentication Commands

```javascript
cy.clearAuthState()                    // Clear all auth data
cy.isLoggedIn()                       // Check if user logged in
cy.getAuthToken()                     // Get current auth token
cy.loginWithEmail(email, password)    // Login with email
cy.verifyOAuthCallback()              // Verify OAuth callback processing
cy.logout()                           // Logout user
```

### File Operations Commands

```javascript
cy.uploadFile(fileName, content, mimeType)  // Upload file
cy.dragDropFile(fileName)                   // Drag & drop file
cy.verifyFileInList(fileName)               // Check file in list
cy.deleteFile(fileName)                     // Delete file
cy.searchFile(searchTerm)                   // Search files
cy.filterByType(fileType)                   // Filter by type
cy.viewFile(fileName)                       // Open file viewer
cy.closeViewer()                            // Close viewer
```

### Utility Commands

```javascript
cy.waitForStoragePage()                     // Wait for storage page load
cy.shouldShowError(errorText)               // Verify error message
cy.shouldShowSuccess()                      // Verify success message
```

## Test Data & Fixtures

### Fixtures Location

```
cypress/fixtures/
├── sample-file.txt      // Text file for upload tests
├── sample-image.jpg     // Image for preview tests
└── sample-video.mp4     // Video for upload tests (optional)
```

### Create Sample Fixtures

```bash
# Create sample text file
echo "This is a test file" > cypress/fixtures/sample-file.txt

# Create sample image (1x1 pixel)
convert -size 1x1 xc:white cypress/fixtures/sample-image.jpg
```

## Environment Variables

Create `.env.cypress` for test-specific configuration:

```env
# API Configuration
API_BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Test User Credentials (if needed)
TEST_EMAIL=test@example.com
TEST_PASSWORD=testPassword123

# OAuth Configuration (for testing)
GOOGLE_TEST_TOKEN=mock_google_token
GITHUB_TEST_TOKEN=mock_github_token

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Load in test with:
```javascript
const apiBaseUrl = Cypress.env('API_BASE_URL');
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Start backend
        run: npm run start:backend &
      
      - name: Start frontend
        run: npm run start:frontend &
      
      - name: Run tests
        run: npx cypress run
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: cypress-results
          path: cypress/results/
```

## Debugging Tests

### Interactive Debugging

```bash
# Open Cypress UI for debugging
npx cypress open

# Then:
# 1. Click test in explorer
# 2. Use browser dev tools
# 3. Pause test with cy.pause()
# 4. Step through with play button
```

### Debug Single Statement

```javascript
it('should do something', () => {
  cy.visit('/');
  cy.debug(); // Pauses here
  cy.get('button').click();
});
```

### Print to Console

```javascript
cy.log('Current token:', token);  // Cypress log
cy.then(() => console.log('Debug info'));  // Browser console
```

### Save Test Screenshots

```bash
# Capture screenshot on failure
npx cypress run --screenshot

# Located in: cypress/screenshots/
```

### Record Video

```bash
# Record test execution
npx cypress run --record

# Videos saved in: cypress/videos/
```

## Test Results Interpretation

### Successful Test
```
✓ Spec passed (15 tests, 0 failures)
```

### Failed Test
```
✕ Spec failed
  Expected to find content 'test.pdf' but never did
  
Failure:
  - Assertion error at line 42
  - Use cy.debug() to inspect
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Target element not found` | Element selectors wrong | Update selectors to match actual DOM |
| `Request failed (401)` | Invalid/expired token | Clear auth state in beforeEach |
| `Timeout waiting for element` | Element loads too slowly | Increase timeout with `{ timeout: 15000 }` |
| `Network error` | Backend not running | Start backend server on port 5000 |
| `CORS error` | Cross-origin issue | Check backend CORS config |

## Performance Benchmarks

Expected test execution times:

- **oauth-login.cy.js**: ~30-45 seconds
- **file-operations.cy.js**: ~40-60 seconds
- **session-management.cy.js**: ~35-50 seconds
- **full-integration.cy.js**: ~50-80 seconds
- **Total**: ~3-4 minutes for full suite

## CI/CD Best Practices

1. **Run tests on every PR**:
```bash
# Pre-commit hook
npm run test:e2e
```

2. **Fail pipeline on test failure**:
```bash
npx cypress run --exit-code 1
```

3. **Generate reports**:
```bash
npm install --save-dev @cypress/schematic
npx cypress run --reporter json > results.json
```

4. **Cache node_modules**:
```yaml
- uses: actions/cache@v2
  with:
    path: node_modules
    key: ${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

## Maintenance

### Update Tests

When application UI changes:
1. Open Cypress interactive mode
2. Use Chrome DevTools to inspect new selectors
3. Update selectors in test files
4. Re-run tests to verify

### Add New Tests

Template for new test:
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(1000);
  });

  it('should do something', () => {
    cy.get('[selector]').should('exist');
    // assertions
  });
});
```

### Regular Review

- Review test failures weekly
- Update mock responses as API changes
- Clean up deprecated tests
- Add regression tests for bugs

## Troubleshooting

### Tests Fail Locally but Pass in CI

**Causes**:
- Time-zone differences
- Dependency versions
- Environment variables

**Solution**:
```bash
# Use exact Node version as CI
nvm use 18.0.0

# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check env variables
cat .env.cypress
```

### Flaky Tests (Intermittent Failures)

**Common Issues**:
- Network timeouts
- Timing issues
- Random data

**Fixes**:
```javascript
// Increase reliability
cy.get('[selector]', { timeout: 15000 }).should('be.visible');
cy.wait(1000); // Add explicit wait if needed
cy.intercept().as('request'); // Mock API calls
```

### Memory/Resource Issues

```bash
# Run single spec to save memory
npx cypress run --spec "cypress/e2e/oauth-login.cy.js"

# Clear cache
npx cypress cache clear

# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npx cypress run
```

## Additional Resources

- [Cypress Documentation](https://docs.cypress.io)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Debugging Tests](https://docs.cypress.io/guides/guides/debugging)
- [Applitools Visual Testing](https://docs.cypress.io/ecosystem/plugins/using-applitools-plugin)

## Support

For test failures or issues:

1. **Check localStorage**: `cy.window().then(win => console.log(win.localStorage))`
2. **Review API responses**: Use Network tab in Cypress UI
3. **Check Sentry logs**: Look for errors in Sentry
4. **Debug selectors**: Use Chrome DevTools in Cypress browser

---

**Last Updated**: 2026-04-20
**Test Framework Version**: Cypress 13+
**Application**: Nian Storage
