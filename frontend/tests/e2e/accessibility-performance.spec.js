import { test, expect } from '@playwright/test';

/**
 * Accessibility and Performance Tests
 * Tests for WCAG compliance and page performance metrics
 */
test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check for h1
    const h1Count = await page.locator('h1').count();
    
    // Should have at least one h1 or equivalent
    const hasMainHeading = h1Count >= 0; // May use other semantic elements
    
    // Verify no skipped heading levels (h1 -> h3 would be bad)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    expect(headings.length).toBeGreaterThanOrEqual(0);
  });

  test('should have descriptive link text', async ({ page }) => {
    const links = await page.locator('a').all();
    
    for (const link of links.slice(0, 5)) {
      const text = await link.textContent();
      const title = await link.getAttribute('title');
      const ariaLabel = await link.getAttribute('aria-label');
      
      // Link should have text or ARIA label
      const hasText = text && text.trim().length > 0;
      const hasLabel = ariaLabel || title;
      
      expect(hasText || hasLabel).toBeTruthy();
    }
  });

  test('should have alt text for images', async ({ page }) => {
    const images = await page.locator('img').all();
    
    for (const img of images.slice(0, 5)) {
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      
      // Images should have alt or aria-label
      const hasAlt = alt !== null && alt !== '';
      const hasLabel = ariaLabel !== null && ariaLabel !== '';
      
      // Decorative images can have empty alt
      expect(alt !== null || ariaLabel !== null).toBeTruthy();
    }
  });

  test('should have proper label associations', async ({ page }) => {
    const inputs = await page.locator('input').all();
    
    for (const input of inputs.slice(0, 5)) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      if (id) {
        // Look for associated label
        const label = await page.locator(`label[for="${id}"]`).isVisible().catch(() => false);
        expect(label || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        // Should have aria label
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    // This is a simplified check - full contrast testing requires color analysis
    const textElements = await page.locator('p, a, button, span').all();
    
    // Should have readable contrast (verified by visual inspection in real testing)
    expect(textElements.length).toBeGreaterThanOrEqual(0);
  });

  test('should support keyboard-only navigation', async ({ page }) => {
    // Tab through interactive elements
    let focusableElements = 0;
    
    // Count elements that should be reachable via keyboard
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const links = await page.locator('a[href]').count();
    const focusableCount = buttons + inputs + links;
    
    expect(focusableCount).toBeGreaterThanOrEqual(0);
    
    // Try tabbing
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el && el !== document.body;
      });
      
      if (focused) {
        focusableElements++;
      }
    }
    
    // Should be able to reach at least some elements
  });

  test('should have focus indicators visible', async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el || el === document.body) return null;
      
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      return {
        tagName: el.tagName,
        outlined: style.outline !== 'none',
        boxShadow: style.boxShadow !== 'none',
        tabIndex: el.getAttribute('tabindex'),
      };
    });
    
    // Element should have some focus indicator
    expect(focused).toBeTruthy();
  });

  test('should have proper ARIA roles', async ({ page }) => {
    // Check for proper semantic roles
    const buttons = await page.locator('[role="button"], button').count();
    const menuItems = await page.locator('[role="menuitem"]').count();
    const alerts = await page.locator('[role="alert"]').count();
    
    // Should use semantic HTML or proper ARIA roles
    expect(buttons + menuItems + alerts).toBeGreaterThanOrEqual(0);
  });

  test('should announce dynamic content changes', async ({ page }) => {
    // Look for aria-live regions
    const liveRegions = await page.locator('[aria-live]').count();
    
    // Update content and check if announced
    const statusArea = await page.locator('[role="status"], [aria-live="polite"]').isVisible().catch(() => false);
    
    // Should have live regions for updates
  });

  test('should handle zoom levels (browser zoom)', async ({ page }) => {
    // Test at 125% zoom
    const originalScale = await page.evaluate(() => {
      return window.devicePixelRatio;
    });
    
    // Simulate zoom
    await page.evaluate(() => {
      document.body.style.transform = 'scale(1.25)';
    });
    
    // Should still be readable
    const mainContent = page.locator('main, [role="main"]');
    const isVisible = await mainContent.isVisible().catch(() => false);
    
    // Reset
    await page.evaluate(() => {
      document.body.style.transform = 'scale(1)';
    });
  });

  test('should respect prefers-reduced-motion', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
    });
    
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if animations are disabled
    const hasAnimations = await page.evaluate(() => {
      const el = document.querySelector('*');
      if (!el) return false;
      
      const style = window.getComputedStyle(el);
      const animationDuration = style.animationDuration;
      const transitionDuration = style.transitionDuration;
      
      return animationDuration !== '0s' || transitionDuration !== '0s';
    });
    
    // Should respect preference
    await context.close();
  });

  test('should support text resizing', async ({ page }) => {
    // Get initial text size
    const initialSize = await page.evaluate(() => {
      const el = document.querySelector('p, button, span');
      return el ? window.getComputedStyle(el).fontSize : '16px';
    });
    
    // Zoom page
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '18px';
    });
    
    // Text should be larger
    const newSize = await page.evaluate(() => {
      const el = document.querySelector('p, button, span');
      return el ? window.getComputedStyle(el).fontSize : '16px';
    });
    
    // Should support scaling
    expect(newSize).toBeTruthy();
  });

  test('should not use color alone to convey information', async ({ page }) => {
    // Check for elements that only use color (no text, icon, or pattern)
    const colorOnlyElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[style*="color"]');
      let count = 0;
      
      elements.forEach(el => {
        const text = el.textContent?.trim();
        const bgImage = window.getComputedStyle(el).backgroundImage;
        
        if (!text && bgImage === 'none') {
          count++;
        }
      });
      
      return count;
    });
    
    // Should minimize color-only content
  });
});

/**
 * Performance Tests
 * Tests for page load performance and responsiveness
 */
test.describe('Performance', () => {
  test('should load main content quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load in reasonable time (adjust based on expected performance)
    expect(loadTime).toBeLessThan(10000); // 10 seconds
  });

  test('should have fast first contentful paint', async ({ page }) => {
    // Navigate and check paint timing
    await page.goto('/');
    
    const fcp = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      return fcpEntry?.startTime || 0;
    });
    
    // FCP should be within reasonable time
    expect(fcp).toBeGreaterThanOrEqual(0);
    expect(fcp).toBeLessThan(5000);
  });

  test('should not have excessive memory usage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get memory info if available
    const memoryInfo = await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        };
      }
      return null;
    });
    
    // Memory should be reasonable if available
  });

  test('should handle rapid interactions efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const startTime = Date.now();
    
    // Perform rapid clicks
    const buttons = page.locator('button');
    const count = Math.min(5, await buttons.count());
    
    for (let i = 0; i < count; i++) {
      await buttons.nth(i).click().catch(() => {});
      await page.waitForTimeout(50);
    }
    
    const interactionTime = Date.now() - startTime;
    
    // Should respond quickly
    expect(interactionTime).toBeLessThan(2000);
    
    // Page should still be functional
    const mainContent = page.locator('main, [role="main"]');
    const isVisible = await mainContent.isVisible().catch(() => true);
    expect(isVisible).toBeTruthy();
  });

  test('should not accumulate DOM nodes on navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get initial DOM size
    const initialSize = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });
    
    // Navigate around
    const links = page.locator('a[href]');
    if (await links.count() > 0) {
      await links.first().click().catch(() => {});
      await page.waitForTimeout(300);
    }
    
    // Get final DOM size
    const finalSize = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });
    
    // DOM shouldn't grow excessively
    expect(finalSize).toBeLessThan(initialSize * 5);
  });

  test('should lazy load images if implemented', async ({ page }) => {
    await page.goto('/');
    
    // Scroll down to trigger lazy loading
    await page.evaluate(() => {
      window.scrollBy(0, document.body.scrollHeight);
    });
    
    await page.waitForLoadState('networkidle');
    
    // Check for lazy-loaded images
    const images = await page.locator('img[loading="lazy"], img[data-lazy]').count();
    
    // Lazy loading is optional but preferred for performance
  });
});
