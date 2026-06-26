import { test, expect } from '@playwright/test';

test.describe('Authentication & Upload Limits - Demo Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the root URL first to ensure we are on the correct origin
    await page.goto('/');
    
    // Clear localStorage before each test using the exact required method
    await page.evaluate(() => localStorage.clear());
    
    // Reload the page to ensure the application state starts completely fresh
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Dynamically detect if Full Auth Mode is active
    const isFullAuth = await page.locator('input[type="email"]').isVisible();
    test.skip(isFullAuth, 'App is in Full Auth Mode. Skipping demo authentication tests.');
  });

  test('should render DemoLogin page correctly', async ({ page }) => {
    // Requirement 1: DemoLogin page renders correctly
    const heading = page.getByRole('heading', { name: /Shared Demo/i });
    await expect(heading, 'Shared Demo heading should be prominently visible on the demo login page').toBeVisible();

    const description = page.getByText(/Click below to access the shared demo environment/i);
    await expect(description, 'Demo login description text should be visible').toBeVisible();
  });

  test('should display a clickable "Enter Demo Account" button', async ({ page }) => {
    // Requirement 2: "Login as Demo" button is visible and clickable
    const loginBtn = page.getByRole('button', { name: /Enter Demo Account|Login as Demo/i });
    
    await expect(loginBtn, 'Demo login button should be visible to the user').toBeVisible();
    await expect(loginBtn, 'Demo login button should be enabled and clickable').toBeEnabled();
  });

  test('should redirect to dashboard and populate localStorage upon login', async ({ page }) => {
    const loginBtn = page.getByRole('button', { name: /Enter Demo Account|Login as Demo/i });
    
    // Listen for the login API response to ensure backend authentication completes
    const loginResponse = page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() === 200);
    
    await loginBtn.click();
    await loginResponse;
    await page.waitForLoadState('networkidle');

    // Requirement 3: After clicking, user redirects to /dashboard (storage dashboard)
    // Finding the file input indicates the main storage component successfully loaded
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput, 'File input should be attached to the DOM on the storage dashboard').toBeAttached();
    
    // Confirm we left the login view
    await expect(loginBtn, 'Login button should disappear after successful redirect').toBeHidden();

    // Requirement 4: localStorage contains "nian.demo.session" after login
    const sessionData = await page.evaluate(() => localStorage.getItem('nian.demo.session'));
    expect(sessionData, 'localStorage must contain the "nian.demo.session" key').not.toBeNull();
    
    const parsedSession = JSON.parse(sessionData);
    expect(parsedSession.token, 'Demo session data must contain an access token').toBeDefined();
    expect(parsedSession.user, 'Demo session data must contain user info').toBeDefined();
  });

  test('should permit up to 3 file uploads and block the 4th attempt with an error message', async ({ page }) => {
    // Intercept network requests to simulate file storage backend limits reliably
    let uploadedFiles = [];
    
    await page.route('**/api/files', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ files: uploadedFiles, total: uploadedFiles.length, storageUsed: 0, storageTotal: 10737418240 })
        });
      } else if (route.request().method() === 'POST') {
        // Enforce the mocked API limit
        if (uploadedFiles.length >= 3) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Demo mode allows up to 3 uploaded files. Delete one to upload another.' })
          });
        } else {
          const newFile = { id: `mock-file-${Date.now()}`, name: 'test.txt', type: 'txt' };
          uploadedFiles.push(newFile);
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'File uploaded successfully', file: newFile })
          });
        }
      } else {
        await route.continue();
      }
    });

    // Proceed to login
    await page.getByRole('button', { name: /Enter Demo Account|Login as Demo/i }).click();
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]');
    
    // Requirement 5: User can upload up to 3 files successfully
    for (let i = 1; i <= 3; i++) {
      await fileInput.setInputFiles({
        name: `demo-file-${i}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from(`This is demo file ${i}`)
      });
      // Allow UI time to process mock upload and update local state
      await page.waitForTimeout(500);
    }

    expect(uploadedFiles.length, 'User should have successfully uploaded exactly 3 files').toBe(3);

    // Requirement 6: 4th upload attempt is blocked with an error message
    // We use force: true here to attempt bypass in case the UI disabled the input element after the 3rd upload
    await fileInput.setInputFiles({
      name: `demo-file-4.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from(`This is demo file 4`)
    }, { force: true }).catch(() => {
      // Playwright throws if the input is strictly disabled by React.
      // We safely catch it, as disabling the input is a valid block.
    });

    // Requirement 7: Upload limit message is visible after 3rd file / 4th attempt
    const expectedErrorMessage = /Demo mode allows up to 3 uploaded files/i;
    const limitMessage = page.getByText(expectedErrorMessage);
    
    await expect(limitMessage, 'Upload limit error message must be visible to the user').toBeVisible();
  });
});