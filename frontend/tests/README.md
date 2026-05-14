# Playwright E2E Tests Documentation

## Overview

This directory contains comprehensive end-to-end (E2E) tests for the Nian Storage application using Playwright. The tests cover authentication, file operations, API interactions, UI interactions, accessibility, and performance.

## Test Structure

### Test Files

1. **auth.spec.js** - Authentication Tests
   - Login/Register form display and validation
   - Form mode toggling (login vs register)
   - Email validation
   - Error handling for failed logins
   - Loading states
   - OAuth provider buttons
   - Password visibility toggle
   - Error message clearing on input

2. **files.spec.js** - File Operations Tests
   - Storage page loading and structure
   - Grid/list view switching
   - File filtering by type (images, videos, documents)
   - File search and filtering by name
   - File metadata display (name, size, date)
   - File download and delete operations
   - User profile information display
   - Logout functionality
   - Loading states
   - Network error handling
   - File type icons
   - Drag and drop upload
   - File upload progress

3. **api-interactions.spec.js** - API Interaction Tests
   - API calls to fetch file list
   - API response handling
   - 401 Unauthorized error handling
   - Failed request retry logic
   - Required headers verification
   - File metadata API responses
   - Concurrent API request handling
   - Request payload validation
   - Rate limiting (429) handling
   - File list caching

4. **ui-interactions.spec.js** - UI Interaction Tests
   - Keyboard navigation
   - Enter key form submission
   - Escape key modal closing
   - Focus management
   - Rapid clicking handling
   - Text selection
   - Right-click context menu
   - Mobile responsiveness (375x667)
   - Tablet responsiveness (768x1024)
   - Layout shift prevention
   - Window resize handling
   - Form autocomplete support
   - Dynamic content updates
   - Scroll performance
   - Long content handling
   - Browser back/forward navigation
   - Copy/paste actions
   - Error state display

5. **accessibility-performance.spec.js** - Accessibility & Performance Tests
   - **Accessibility:**
     - Heading hierarchy validation
     - Descriptive link text
     - Image alt text
     - Label associations
     - Color contrast
     - Keyboard-only navigation
     - Focus indicators
     - ARIA roles
     - Dynamic content announcements
     - Zoom level support
     - Reduced motion preferences
     - Text resizing support
     - Color-only information prevention

   - **Performance:**
     - Main content load time
     - First Contentful Paint (FCP)
     - Memory usage
     - Rapid interaction responsiveness
     - DOM node accumulation
     - Lazy loading images

## Configuration

### playwright.config.js

```javascript
- testDir: './tests/e2e'
- baseURL: 'http://localhost:3000'
- Browsers: Chromium, Firefox, WebKit
- Trace: 'on-first-retry' (captures traces for failed tests)
- Screenshot: 'only-on-failure'
- Video: 'retain-on-failure'
```

## Running Tests

### Prerequisites
```bash
# Install dependencies (if not already done)
npm install

# Ensure the dev server is running
npm run dev
```

### Run All Tests
```bash
npx playwright test
# or
npm test
```

### Run Specific Test File
```bash
# Authentication tests only
npx playwright test auth.spec.js

# File operations tests only
npx playwright test files.spec.js

# API interaction tests
npx playwright test api-interactions.spec.js

# UI interaction tests
npx playwright test ui-interactions.spec.js

# Accessibility and performance tests
npx playwright test accessibility-performance.spec.js
```

### Run Tests in Specific Browser
```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# WebKit only
npx playwright test --project=webkit
```

### Run Tests in UI Mode (Interactive)
```bash
npx playwright test --ui
# or
npm run test:ui
```

### Run Tests with Debug Mode
```bash
npx playwright test --debug
# or
npm run test:debug
```

### Run Single Test
```bash
npx playwright test -g "should load login page"
```

### Run Tests Matching Pattern
```bash
npx playwright test -g "login|register"
```

### Run Tests with Headed Browser
```bash
npx playwright test --headed
```

## Test Reports

After running tests, reports are generated:

### HTML Report
```bash
npx playwright show-report
```

This opens an interactive HTML report showing:
- Test results and execution time
- Screenshots for failed tests
- Video recordings (on failure)
- Detailed traces

## CI/CD Integration

Tests are configured for CI environments:
- **GitHub Actions** reporter enabled when `CI=true`
- Single worker mode in CI (sequential execution)
- 2 retries for flaky tests
- Artifacts captured on failure

### Running in CI
```bash
CI=true npx playwright test
```

## Test Strategy

### Coverage Areas

1. **Happy Path** - Normal user workflows
   - User logs in
   - Views files
   - Filters/searches files
   - Downloads/deletes files
   - Logs out

2. **Error Handling** - Graceful degradation
   - Failed authentication
   - Network timeouts
   - Invalid input
   - Missing data

3. **Edge Cases** - Boundary conditions
   - Empty file list
   - Very long file names
   - Rapid user interactions
   - Window resizing

4. **Accessibility** - WCAG compliance
   - Keyboard navigation
   - Screen reader compatibility
   - Color contrast
   - Focus management

5. **Performance** - User experience
   - Load time
   - Responsiveness
   - Memory usage
   - Smooth interactions

## Best Practices

### Writing New Tests

1. **Descriptive Names**
   ```javascript
   test('should display error message when login fails', async ({ page }) => {
   ```

2. **Arrange-Act-Assert Pattern**
   ```javascript
   // Arrange
   await page.goto('/');
   
   // Act
   await emailInput.fill('test@example.com');
   await submitButton.click();
   
   // Assert
   await expect(errorMessage).toBeVisible();
   ```

3. **Use test.beforeEach for Setup**
   ```javascript
   test.beforeEach(async ({ page }) => {
     await page.goto('/');
     await page.waitForLoadState('networkidle');
   });
   ```

4. **Handle Missing Elements**
   ```javascript
   // Good - checks visibility before asserting
   if (await element.isVisible()) {
     await expect(element).toBeVisible();
   }
   
   // Or use catch for optional elements
   const optional = await element.isVisible().catch(() => false);
   ```

5. **Wait for Network Activity**
   ```javascript
   await page.waitForLoadState('networkidle');
   // or
   await page.waitForLoadState('load');
   ```

### Debugging Failed Tests

1. **Use Trace Files**
   - Traces are automatically captured on first retry
   - View with: `npx playwright show-trace trace.zip`

2. **Use Debug Mode**
   ```bash
   npx playwright test --debug
   ```

3. **Print Debug Info**
   ```javascript
   console.log('Current URL:', page.url());
   console.log('Page title:', await page.title());
   ```

4. **Take Screenshots**
   ```javascript
   await page.screenshot({ path: 'debug.png' });
   ```

## Common Issues & Solutions

### Tests Timing Out
- Increase timeout: `test.setTimeout(60000)`
- Check if server is running
- Verify baseURL is correct

### Selectors Not Found
- Use more specific selectors
- Check element hierarchy with `page.locator().all()`
- Use `page.waitForSelector()` if element loads dynamically

### Flaky Tests
- Use `waitForLoadState('networkidle')`
- Add explicit waits for dynamic content
- Avoid relying on timings, use events instead

### Network Issues in Tests
- Mock API responses: `await page.route()`
- Use `page.context().setOffline(true)` for offline testing

## Continuous Improvement

### TODO for Enhanced Testing
- [ ] Add visual regression tests
- [ ] Add authentication state management (fixtures)
- [ ] Add database seeding for consistent test data
- [ ] Add performance budgets
- [ ] Add accessibility automated testing (axe)
- [ ] Add cross-browser screenshot comparisons

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Web Testing Best Practices](https://playwright.dev/docs/test-webserver-auth)

## Support

For issues or questions about tests:
1. Check Playwright documentation
2. Review existing test patterns
3. Run test in UI/debug mode for troubleshooting
4. Check test reports for detailed failure info

- **`tests/e2e/`** - End-to-end tests organized by feature
  - `auth.spec.js` - Authentication tests
  - `files.spec.js` - File operations tests

## Configuration

Playwright configuration is defined in `playwright.config.js` at the root of the frontend directory. Key settings:

- **baseURL**: `http://localhost:3000` (your app's local URL)
- **browsers**: Chromium, Firefox, and WebKit
- **webServer**: Automatically starts your dev server for tests
- **reporters**: HTML reports and terminal output
- **artifacts**: Screenshots and videos on failure

## CI/CD Integration

Tests run automatically in GitHub Actions on push to `main` and `develop` branches.

The CI pipeline:
1. Installs Playwright browsers
2. Runs all e2e tests
3. Generates HTML report on failure
4. Blocks deployment if tests fail

## Viewing Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Writing Tests

### Basic test example
```javascript
import { test, expect } from '@playwright/test';

test('should load the page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Storage/);
});
```

### Common actions
```javascript
// Navigation
await page.goto('/login');

// Interaction
await page.fill('input[name="email"]', 'test@example.com');
await page.click('button[type="submit"]');

// Waiting
await page.waitForLoadState('networkidle');
await page.waitForSelector('.success-message');

// Assertions
await expect(page.locator('.error')).toBeVisible();
await expect(page.locator('input')).toHaveValue('test');
```

## Best Practices

1. **Use test isolation** - Each test should be independent
2. **Use page objects** - Create helper functions for common actions
3. **Use meaningful names** - Test names should describe what's being tested
4. **Use selectors wisely** - Prefer data-testid attributes over CSS selectors
5. **Don't hardcode waits** - Use Playwright's automatic waiting features

## Debugging

### View test execution step-by-step
```bash
npm run test:debug
```

### Use Playwright Inspector
Pause test execution and inspect elements in the Playwright Inspector.

### Check test reports
HTML reports are generated in `playwright-report/` after test runs.

## Troubleshooting

### Tests are flaky
- Ensure your dev server is running: `npm run dev`
- Check that your application is stable
- Use explicit waits instead of fixed timeouts

### Browser won't launch
- Run: `npx playwright install --with-deps`
- Check that ports aren't in use

### Tests timeout
- Increase timeout in `playwright.config.js`
- Check network requests
- Verify your application is responsive

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Inspector](https://playwright.dev/docs/inspector)
