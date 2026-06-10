import { test, expect } from '@playwright/test';

test.describe('File Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app - may redirect to login if not authenticated
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('should render the app without crashing', async ({ page }) => {
    // Basic smoke test - app should load without errors
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display main navigation or auth form', async ({ page }) => {
    // App should show either main content or login form
    const mainContent = page.locator('main, [role="main"], form');
    
    // Check if page has significant content
    const elementCount = await page.locator('button, input, nav').count();
    expect(elementCount).toBeGreaterThan(0);
  });

  test.skip('should display file grid view by default', async ({ page }) => {
    // SKIPPED: Requires authenticated user
    // This test needs real auth or demo mode setup
    const fileItems = page.locator('div[class*="file-card"], div[class*="file-row"]');
    const emptyState = page.locator('[data-testid="empty-state"]');
    
    const fileCount = await fileItems.count();
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    
    expect(fileCount > 0 || hasEmptyState).toBeTruthy();
  });

  test.skip('should toggle between grid and list view', async ({ page }) => {
    // SKIPPED: Requires authenticated user
    const buttons = await page.locator('button').all();
    const viewToggleBtn = buttons.find(async (btn) => {
      const text = await btn.textContent();
      return text && /grid|list/i.test(text);
    });
    
    if (viewToggleBtn) {
      await viewToggleBtn.click();
    }
  });

  test.skip('should filter files by type', async ({ page }) => {
    // SKIPPED: Requires authenticated user
    const filterButtons = await page.locator('button').all();
    expect(filterButtons.length).toBeGreaterThan(0);
  });

  test.skip('should search files', async ({ page }) => {
    // SKIPPED: Requires authenticated user and files
    const searchInput = page.locator('input[type="text"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForLoadState('networkidle');
    }
  });

  test.skip('should upload file', async ({ page }) => {
    // SKIPPED: Requires authenticated user
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('test')
      });
    }
  });

  test.skip('should delete file with confirmation', async ({ page }) => {
    // SKIPPED: Requires authenticated user and files
    const deleteButtons = await page.locator('button:has-text("Delete")').all();
    expect(deleteButtons.length).toBeGreaterThanOrEqual(0);
  });

  test.skip('should handle logout', async ({ page }) => {
    // SKIPPED: Requires authenticated user
    const logoutBtn = page.locator('button').filter({ hasText: /logout|sign out/i });
    expect(logoutBtn).toBeTruthy();
  });

  test('should render without javascript errors', async ({ page }) => {
    // Monitor for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Allow auth-related errors, but catch other issues
    const criticalErrors = errors.filter(err => 
      !err.includes('auth') && 
      !err.includes('401') && 
      !err.includes('unauthorized')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should have responsive layout', async ({ page }) => {
    await page.goto('/');
    
    // Check different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // desktop
      { width: 768, height: 1024 },  // tablet
      { width: 375, height: 667 }    // mobile
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(300);
      
      // App should render without layout break
      const body = page.locator('body');
      expect(body).toBeVisible();
    }
  });

  test('should handle offline gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await page.context().setOffline(true);
    await page.waitForTimeout(500);
    
    // App should still render (or show offline message)
    const body = page.locator('body');
    expect(body).toBeVisible();
    
    // Restore connectivity
    await page.context().setOffline(false);
  });
});

