# Quick Start Guide for Playwright Tests

## 🚀 5-Minute Setup

### 1. Ensure Dependencies Are Installed
```bash
cd frontend
npm install
npx playwright install --with-deps
```

### 2. Start Dev Server
```bash
npm run dev
# Server runs on http://localhost:3000
```

### 3. Run Tests
```bash
# In a new terminal (leave dev server running)
npm test
# or
npx playwright test
```

✅ **Done!** Tests will run on all 3 browsers automatically.

---

## 📊 View Test Results

After tests complete:
```bash
npx playwright show-report
```
This opens an interactive HTML report with:
- ✅ Passed/failed tests
- 📸 Screenshots of failures
- 🎬 Video recordings
- 📍 Detailed traces

---

## 🎯 Common Commands

### Run Specific Tests
```bash
# Only authentication tests
npm test -- auth.spec.js

# Only file operations
npm test -- files.spec.js

# Only one specific test
npm test -- -g "should load login page"

# Tests matching pattern
npm test -- -g "login|register"
```

### Run in Specific Browser
```bash
# Chromium only
npm test -- --project=chromium

# Firefox only
npm test -- --project=firefox

# Safari/WebKit only
npm test -- --project=webkit
```

### Interactive Testing
```bash
# UI Mode - watch tests run, step through, debug
npm run test:ui
# or
npm test -- --ui

# Debug Mode - step through each action
npm run test:debug
# or
npm test -- --debug

# Headed Browser - watch in real browser
npm test -- --headed
```

---

## 🔍 Debugging Failed Tests

### Step 1: Identify Failure
```bash
npm test
# Look for red ❌ in output
```

### Step 2: View Report
```bash
npx playwright show-report
```
Click on failed test to see:
- Screenshot at failure point
- Video of entire test
- Full error message

### Step 3: Investigate
```bash
# Run just that test with debug
npm test -- -g "test name" --debug

# Or run with headed browser to watch
npm test -- -g "test name" --headed
```

### Step 4: Check Traces
```bash
# After first retry failure, trace is captured
# Find trace.zip in test output
npx playwright show-trace trace.zip
```

---

## 📁 Test File Organization

```
frontend/tests/
├── e2e/
│   ├── auth.spec.js                    # Login, register, OAuth
│   ├── files.spec.js                   # File upload, download, delete
│   ├── api-interactions.spec.js        # API calls, errors, retries
│   ├── ui-interactions.spec.js         # Keyboard, mobile, responsiveness
│   └── accessibility-performance.spec.js  # WCAG, Core Web Vitals
├── README.md                            # Full documentation
├── PLAYWRIGHT-ANALYSIS.md              # Test coverage analysis
└── QUICK-START.md                      # This file
```

---

## 🏗️ Test Structure Pattern

All tests follow this pattern:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Category', () => {
  test.beforeEach(async ({ page }) => {
    // Setup (runs before each test)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should do something specific', async ({ page }) => {
    // Arrange - set up state
    const button = page.locator('button[type="submit"]');
    
    // Act - perform action
    await button.click();
    
    // Assert - verify result
    await expect(page).toHaveTitle(/Success/);
  });
});
```

---

## 🔧 Configuration Tips

### Increase Test Timeout
For slow operations:
```javascript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

### Disable Retry for Specific Test
```javascript
test.describe.configure({ retries: 0 });

test('should not retry', async ({ page }) => {
  // ...
});
```

### Focus on One Test File
```javascript
// Only run auth tests
test.describe.only('Authentication', () => {
  // Tests here run in isolation
});
```

### Skip a Test
```javascript
test.skip('skip this test', async ({ page }) => {
  // Skipped
});
```

---

## ✅ Best Practices

### DO ✅
- Wait for page stability: `await page.waitForLoadState('networkidle')`
- Use semantic selectors: `button:has-text(/Submit/i)`
- Handle optional elements: `await element.isVisible().catch(() => false)`
- Test happy path + error cases
- Use descriptive test names

### DON'T ❌
- Use fragile CSS selectors (by index): `div > div > button`
- Hard-code timeouts: `await page.waitForTimeout(5000)`
- Assume elements exist: always check visibility first
- Test multiple scenarios in one test
- Skip accessibility tests

---

## 🐛 Common Issues & Fixes

### "Connection refused"
**Problem:** Server not running
**Fix:** Start dev server: `npm run dev`

### "Timeout waiting for page"
**Problem:** Page load taking too long
**Fix:** Increase timeout or check server logs

### "Element not found"
**Problem:** Selector too specific or element loads late
**Fix:** Use `page.waitForSelector()` or more generic selector

### "Test passes locally but fails in CI"
**Problem:** Flaky test or environment differences
**Fix:** Add waits, avoid timeouts, use `waitForLoadState()`

### "Video/Trace not captured"
**Problem:** Test didn't fail
**Fix:** Artifacts only captured on failure by default

---

## 📈 Test Coverage

Current test suite covers:

| Area | Coverage |
|------|----------|
| Authentication | ✅ Comprehensive |
| File Management | ✅ Comprehensive |
| API Integration | ✅ Good |
| UI/UX | ✅ Comprehensive |
| Accessibility | ✅ Good |
| Performance | ✅ Basic |

**Overall: 78% coverage** (estimated)

---

## 🚢 Running Tests in CI/CD

Tests automatically run in CI with:
```bash
CI=true npm test
```

Features in CI:
- Single worker (sequential)
- 2 retries per test
- GitHub Actions reporter
- Artifacts saved automatically

---

## 📚 Learn More

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debug Guide](https://playwright.dev/docs/debug)
- [Reporters](https://playwright.dev/docs/test-reporters)
- [GitHub Actions](https://playwright.dev/docs/ci-github)

---

## 💡 Quick Troubleshooting

```bash
# Clear Playwright cache
rm -rf ~/.cache/ms-playwright

# Reinstall browsers
npx playwright install --with-deps

# Verify setup
npx playwright --version

# Check which tests would run
npm test -- --list

# Run with verbose output
npm test -- --verbose

# Run single file
npm test -- tests/e2e/auth.spec.js

# Update snapshots (if using)
npm test -- --update-snapshots
```

---

## 🎬 Example Workflow

**Day 1: Add Feature**
1. `npm run dev` - Start server
2. Manually test feature
3. Write test for feature

**Day 2: Run Tests**
1. `npm test` - Run all tests
2. `npx playwright show-report` - Check results
3. Fix any failures

**Day 3: CI/CD**
1. Push to GitHub
2. Tests run automatically
3. Check status

**When Test Fails**
1. `npm test -- --headed` - See what happened
2. `npm test -- --debug` - Step through
3. `npx playwright show-report` - View details
4. Fix code and rerun

---

## ✨ Pro Tips

**Tip 1: Record Tests**
```bash
npx playwright codegen http://localhost:3000
# Playwright records your actions as test code
```

**Tip 2: Parallel vs Sequential**
```bash
# Parallel (default, faster)
npm test

# Sequential (helpful for debugging)
npm test -- --workers=1
```

**Tip 3: Filter by Name**
```bash
# Very powerful for targeted testing
npm test -- -g "login" --headed
```

**Tip 4: Slow Motion**
```bash
# Slow down test execution to see what's happening
npm test -- --slow-mo=1000
```

---

## 📞 Support

If tests fail:
1. Check if server is running: `http://localhost:3000`
2. Read error message carefully
3. View test report: `npx playwright show-report`
4. Run test with `--headed` to watch
5. Check PLAYWRIGHT-ANALYSIS.md for coverage info

**Happy Testing! 🎉**
