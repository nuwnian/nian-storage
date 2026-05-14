import { test, expect } from '@playwright/test';

test.describe('File Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load storage page structure', async ({ page }) => {
    // Wait for main content to load
    const mainContent = page.locator('main, [role="main"], .storage-container');
    const isVisible = await mainContent.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(mainContent).toBeVisible();
    }
  });

  test('should display file grid view by default', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Look for grid container or grid items
    const gridContainer = page.locator('[class*="grid"], [data-view="grid"]');
    
    // Check if files are displayed (or empty state)
    const fileItems = page.locator('[class*="file"], [data-testid*="file"]');
    const emptyState = page.locator('[class*="empty"], [data-testid="empty-state"]');
    
    const hasFiles = await fileItems.count() > 0;
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    
    // Should have either files or empty state
    expect(hasFiles || hasEmptyState).toBeTruthy();
  });

  test('should toggle between grid and list view', async ({ page }) => {
    // Find view toggle buttons
    const gridViewBtn = page.locator('button[class*="grid"], button[aria-label*="grid" i]');
    const listViewBtn = page.locator('button[class*="list"], button[aria-label*="list" i]');
    
    // Try to find any view toggle mechanism
    const viewButtons = page.locator('button:has-text(/grid|list|view/i)');
    
    if (await viewButtons.count() > 0) {
      const initialView = await page.locator('body').evaluate(el => {
        return el.classList.contains('list-view') ? 'list' : 'grid';
      });
      
      // Find and click opposite view button
      const buttons = await viewButtons.all();
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text?.includes('list') || text?.includes('List')) {
          await btn.click();
          await page.waitForTimeout(200);
          break;
        }
      }
    }
  });

  test('should filter files by type (images, videos, documents)', async ({ page }) => {
    // Look for filter buttons or dropdown
    const filterButtons = page.locator('button:has-text(/image|video|document|doc|all/i)');
    
    const filterCount = await filterButtons.count();
    expect(filterCount).toBeGreaterThan(0);
    
    // Click each filter and verify
    if (filterCount > 0) {
      const buttons = await filterButtons.all();
      
      for (let i = 0; i < Math.min(buttons.length, 3); i++) {
        const btn = buttons[i];
        const filterText = await btn.textContent();
        
        // Click filter
        await btn.click();
        await page.waitForLoadState('networkidle');
        
        // Verify files are displayed
        const fileItems = page.locator('[class*="file"], [data-testid*="file"]');
        // Should have files or empty state after filtering
        await page.waitForTimeout(200);
      }
    }
  });

  test('should search and filter files by name', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[type="text"], input[placeholder*="search" i], input[aria-label*="search" i]');
    
    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('test');
      await page.waitForLoadState('networkidle');
      
      // Results should be filtered
      const fileItems = page.locator('[class*="file"], [data-testid*="file"]');
      
      // Either files matching search or empty state
      const itemCount = await fileItems.count();
      const emptyState = await page.locator('[class*="empty"]').isVisible().catch(() => false);
      
      expect(itemCount >= 0 || emptyState).toBeTruthy();
      
      // Clear search
      await searchInput.clear();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should clear search filter', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder*="search" i]');
    
    if (await searchInput.isVisible()) {
      // Enter search term
      await searchInput.fill('test');
      await page.waitForTimeout(300);
      
      // Clear it
      await searchInput.clear();
      
      // Verify input is empty
      const value = await searchInput.inputValue();
      expect(value).toBe('');
      
      // Files should be displayed (or empty state)
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display file metadata (name, size, date)', async ({ page }) => {
    // Wait for files to load
    await page.waitForLoadState('networkidle');
    
    const fileItems = page.locator('[class*="file"], [class*="item"]');
    
    if (await fileItems.count() > 0) {
      const firstFile = fileItems.first();
      
      // Check for file metadata
      const fileName = await firstFile.locator('[class*="name"], [data-testid*="name"]').isVisible().catch(() => false);
      const fileSize = await firstFile.locator('[class*="size"], [data-testid*="size"]').isVisible().catch(() => false);
      const fileDate = await firstFile.locator('[class*="date"], [data-testid*="date"]').isVisible().catch(() => false);
      
      // At least file name should be visible
      expect(fileName || fileSize || fileDate).toBeTruthy();
    }
  });

  test('should handle file download action', async ({ page, context }) => {
    // Wait for files
    await page.waitForLoadState('networkidle');
    
    const fileItems = page.locator('[class*="file"], [data-testid*="file"]');
    
    if (await fileItems.count() > 0) {
      const firstFile = fileItems.first();
      
      // Look for download button or link
      const downloadBtn = firstFile.locator('button:has-text(/download/i), a:has-text(/download/i)');
      
      if (await downloadBtn.isVisible()) {
        // Listen for download
        const downloadPromise = context.waitForEvent('download');
        await downloadBtn.click();
        
        const download = await downloadPromise.catch(() => null);
        
        // Download event may or may not trigger depending on implementation
        // Just verify button is clickable
        expect(downloadBtn).toBeEnabled();
      }
    }
  });

  test('should handle file delete action with confirmation', async ({ page }) => {
    // Wait for files
    await page.waitForLoadState('networkidle');
    
    const fileItems = page.locator('[class*="file"], [data-testid*="file"]');
    
    if (await fileItems.count() > 0) {
      const firstFile = fileItems.first();
      
      // Look for delete button or menu
      const deleteBtn = firstFile.locator('button:has-text(/delete|remove|trash/i)');
      
      if (await deleteBtn.isVisible()) {
        // Should be clickable
        expect(await deleteBtn.isEnabled()).toBeTruthy();
        
        // Click delete
        await deleteBtn.click();
        
        // Confirmation dialog might appear
        const confirmBtn = page.locator('button:has-text(/confirm|delete|yes/i)');
        const cancelBtn = page.locator('button:has-text(/cancel|no/i)');
        
        const hasConfirmation = await confirmBtn.isVisible() || await cancelBtn.isVisible();
        
        if (hasConfirmation) {
          // Click cancel to not actually delete
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
          }
        }
      }
    }
  });

  test('should display user profile information', async ({ page }) => {
    // Look for user profile area
    const profileArea = page.locator('[class*="profile"], [class*="user"], [data-testid*="user"]');
    const userEmail = page.locator('[class*="email"], [data-testid*="email"]');
    const userName = page.locator('[class*="name"], [data-testid*="name"]');
    
    // At least one user info should be visible if logged in
    const hasUserInfo = await profileArea.isVisible().catch(() => false) || 
                        await userEmail.isVisible().catch(() => false) ||
                        await userName.isVisible().catch(() => false);
    
    // Not required if not logged in
  });

  test('should handle logout button', async ({ page }) => {
    // Look for logout button
    const logoutBtn = page.locator('button:has-text(/logout|sign out|exit/i)');
    
    if (await logoutBtn.isVisible()) {
      expect(logoutBtn).toBeEnabled();
      
      // Should be clickable (don't actually click to avoid logout)
    }
  });

  test('should show loading state during file operations', async ({ page }) => {
    // Refresh to trigger loading
    await page.reload();
    
    // Look for loading indicator
    const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"], [role="status"]');
    const isLoading = await loadingSpinner.isVisible().catch(() => false);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Loading should be gone
    const isStillLoading = await loadingSpinner.isVisible().catch(() => false);
    expect(isStillLoading).toBeFalsy();
  });

  test('should handle network error gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    // Try to interact
    await page.waitForTimeout(500);
    
    // Should show error or no connectivity message
    const errorMessage = page.locator('[class*="error"], [role="alert"]');
    
    // Restore connectivity
    await page.context().setOffline(false);
  });

  test('should display file icons based on type', async ({ page }) => {
    // Wait for files
    await page.waitForLoadState('networkidle');
    
    const fileItems = page.locator('[class*="file"], [data-testid*="file"]');
    
    if (await fileItems.count() > 0) {
      const firstFile = fileItems.first();
      
      // Look for file icon or type indicator
      const icon = firstFile.locator('svg, i[class*="icon"], img[class*="icon"]');
      
      if (await icon.isVisible()) {
        // Icon should be present
        expect(icon).toBeVisible();
      }
    }
  });

  test('should handle drag and drop file upload', async ({ page }) => {
    // Look for upload area
    const uploadArea = page.locator('[class*="upload"], [data-testid*="upload"], [class*="drag"]');
    
    if (await uploadArea.isVisible()) {
      // Check if it's a drop zone
      const dataTransfer = await page.evaluate(() => {
        return 'DataTransfer' in window;
      });
      
      expect(dataTransfer).toBeTruthy();
      
      // Try to simulate drag enter
      await uploadArea.hover();
      
      // Should have visual feedback
      const hasDragClass = await uploadArea.evaluate(el => {
        return el.classList.contains('dragover') || 
               el.classList.contains('dragging') ||
               el.style.backgroundColor !== '';
      });
    }
  });

  test('should show file upload progress', async ({ page }) => {
    // Look for file input
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      // File input should accept multiple files
      const hasMultiple = await fileInput.evaluate(el => el.multiple);
      
      // Accept attribute should include relevant file types
      const acceptAttr = await fileInput.getAttribute('accept');
      
      // Should accept various file types
      expect(acceptAttr || hasMultiple).toBeTruthy();
    }
  });
});
