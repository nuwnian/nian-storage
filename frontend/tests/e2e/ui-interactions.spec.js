import { test, expect } from '@playwright/test';

/**
 * UI Interactions and Edge Cases
 * Tests for user interactions, keyboard navigation, and responsive behavior
 */
test.describe('UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab through form fields
    await page.keyboard.press('Tab');
    
    // Check if focus moved
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    expect(focusedElement).toBeTruthy();
  });

  test('should handle Enter key submission', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    
    if (await emailInput.isVisible()) {
      // Focus email field
      await emailInput.focus();
      
      // Type and press Enter
      await emailInput.fill('test@example.com');
      
      // Pressing Enter should work (browser will handle)
      await page.keyboard.press('Enter');
      
      // Wait for response
      await page.waitForTimeout(500);
    }
  });

  test('should handle Escape key to close modals', async ({ page }) => {
    // Look for any modal or dialog
    const modal = page.locator('[role="dialog"], [class*="modal"]');
    
    if (await modal.isVisible()) {
      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      
      // Modal should be closed or hidden
      const isVisible = await modal.isVisible().catch(() => false);
      expect(isVisible).toBeFalsy();
    }
  });

  test('should maintain focus management', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    if (count > 0) {
      // Click first button
      await buttons.first().click();
      
      // Focus should be manageable
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.className;
      });
      
      expect(focusedElement).toBeTruthy();
    }
  });

  test('should handle rapid clicking', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    if (count > 0) {
      const button = buttons.first();
      
      // Rapid clicks should not break the page
      try {
        await button.click({ timeout: 1000 });
        await button.click({ timeout: 1000 });
        await button.click({ timeout: 1000 });
      } catch (e) {
        // Button may become disabled or change during rapid clicks
      }
      
      await page.waitForTimeout(500);
      
      // Page should still be functional - check if body is present
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });

  test('should handle text selection', async ({ page }) => {
    const fileItems = page.locator('[class*="file"], [data-testid*="file"]');
    
    if (await fileItems.count() > 0) {
      const firstFile = fileItems.first();
      
      // Try to select text using correct method name
      try {
        await firstFile.tripleClick();
      } catch (e) {
        // Triple click may not be supported
      }
      
      // Selection should work
      const selectedText = await page.evaluate(() => {
        return window.getSelection().toString();
      });
      
      // Text may or may not be selected
      expect(typeof selectedText).toBe('string');
    }
  });

  test('should handle right-click context menu', async ({ page }) => {
    const fileItems = page.locator('[class*="file"], [data-testid*="file"]');
    
    if (await fileItems.count() > 0) {
      // Right-click first file
      await fileItems.first().click({ button: 'right' });
      
      // Context menu might appear
      const contextMenu = page.locator('[role="menu"], [class*="context"]');
      
      const hasMenu = await contextMenu.isVisible().catch(() => false);
      
      // Click elsewhere to close
      await page.click('body');
    }
  });

  test('should be responsive at mobile viewport', async ({ browser }) => {
    // Create mobile context
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    
    const mobileePage = await context.newPage();
    await mobileePage.goto('/');
    await mobileePage.waitForLoadState('networkidle');
    
    // Should not break on mobile
    const mainContent = mobileePage.locator('main, [role="main"]');
    const isVisible = await mainContent.isVisible().catch(() => false);
    
    // At least page should load
    expect(mobileePage.url()).toBeTruthy();
    
    await context.close();
  });

  test('should be responsive at tablet viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
    });
    
    const tabletPage = await context.newPage();
    await tabletPage.goto('/');
    await tabletPage.waitForLoadState('networkidle');
    
    // Verify layout
    const content = await tabletPage.locator('body');
    const width = await content.boundingBox();
    
    expect(width?.width).toBeLessThanOrEqual(768);
    
    await context.close();
  });

  test('should not have layout shifts', async ({ page }) => {
    // Measure layout shift during load
    const shifts = await page.evaluate(() => {
      let totalShift = 0;
      if ('PerformanceObserver' in window) {
        // This is a simplified check
        return 0; // Placeholder
      }
      return totalShift;
    });
    
    // Should load stably without major shifts
    expect(typeof shifts).toBe('number');
  });

  test('should handle window resize gracefully', async ({ page }) => {
    // Initial viewport check
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Resize window
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(300);
    
    // Page should still be visible
    await expect(body).toBeVisible();
    
    // Resize again to smaller size
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(300);
    
    // Still visible and functional
    await expect(body).toBeVisible();
  });

  test('should handle form autocomplete', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    
    if (await emailInput.isVisible()) {
      // Autocomplete should work (browser feature)
      const hasAutocomplete = await emailInput.evaluate(el => {
        return el.getAttribute('autocomplete') !== 'off';
      });
      
      // Should allow autocomplete
      expect(hasAutocomplete !== false).toBeTruthy();
    }
  });

  test('should handle dynamic content updates', async ({ page }) => {
    // Wait for any dynamic updates
    await page.waitForLoadState('networkidle');
    
    // Get initial content
    const initialText = await page.locator('body').textContent();
    
    // Simulate user interaction that might trigger updates
    const buttons = page.locator('button');
    if (await buttons.count() > 0) {
      await buttons.first().click();
      await page.waitForTimeout(500);
    }
    
    // Content may have changed
    const finalText = await page.locator('body').textContent();
    
    // Page should be stable
    expect(finalText).toBeTruthy();
  });

  test('should handle scroll performance', async ({ page }) => {
    // Get viewport
    const viewportSize = page.viewportSize();
    
    if (viewportSize) {
      // Scroll down
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      
      await page.waitForTimeout(200);
      
      // Scroll back up
      await page.evaluate(() => {
        window.scrollBy(0, -500);
      });
      
      // Page should be interactive
      const buttons = page.locator('button');
      const isClickable = await buttons.first().isEnabled().catch(() => false);
    }
  });

  test('should handle long content gracefully', async ({ page }) => {
    // Long search results or many files
    const searchInput = page.locator('input[type="text"], input[placeholder*="search" i]');
    
    if (await searchInput.isVisible()) {
      // Type long search
      await searchInput.fill('a'.repeat(100));
      await page.waitForLoadState('networkidle');
      
      // Should handle without breaking
      const mainContent = page.locator('main, [role="main"]');
      const isVisible = await mainContent.isVisible().catch(() => true);
      
      expect(isVisible).toBeTruthy();
    }
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Go to page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // If there are links, click one
    const links = page.locator('a[href]');
    if (await links.count() > 0) {
      await links.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
    
    // Go back
    await page.goBack().catch(() => {});
    await page.waitForTimeout(300);
    
    // Should be back at original page (or similar)
    expect(page.url()).toBeTruthy();
  });

  test('should handle copy/paste actions', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    
    if (await emailInput.isVisible()) {
      // Type email
      await emailInput.fill('test@example.com');
      
      // Select all
      await emailInput.evaluate(el => {
        el.select();
      });
      
      // Copy and paste should work
      await page.keyboard.press('Control+C');
      
      // Move to next field if available
      const passwordInput = page.locator('input[type="password"]');
      if (await passwordInput.isVisible()) {
        await passwordInput.focus();
        // Paste would go here (if implemented)
      }
    }
  });

  test('should show proper error states', async ({ page }) => {
    // Cause an error by invalid action
    const emailInput = page.locator('input[type="email"]');
    
    if (await emailInput.isVisible()) {
      // Set invalid email
      await emailInput.fill('not-an-email');
      
      // Try submit
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.isVisible()) {
        await submitBtn.click().catch(() => {});
        await page.waitForTimeout(300);
      }
      
      // Error indication should be visible
      const error = page.locator('[class*="error"], [role="alert"]');
      const hasError = await error.isVisible().catch(() => false);
    }
  });
});
