import { test, expect } from '@playwright/test';

test.describe('Sidebar Actions', () => {
  test('should clear chat when Clear Chat is clicked', async ({ page }) => {
    await page.goto('/');
    
    // Send a message first
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await input.fill('Test message for clearing');
    await page.getByText('Send').click();
    
    // Verify message is displayed
    await expect(page.getByText('Test message for clearing')).toBeVisible();
    
    // Handle confirmation dialog
    page.on('dialog', dialog => {
      expect(dialog.message()).toBe('Are you sure you want to clear the conversation?');
      dialog.accept();
    });
    
    // Click clear chat
    await page.getByText('Clear Chat').click();
    
    // Page should reload and message should be gone
    await expect(page.getByText('Welcome to Mindr')).toBeVisible();
    await expect(page.getByText('Test message for clearing')).not.toBeVisible();
  });

  test('should cancel clear chat when dialog is dismissed', async ({ page }) => {
    await page.goto('/');
    
    // Send a message first
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await input.fill('Test message to keep');
    await page.getByText('Send').click();
    
    // Verify message is displayed
    await expect(page.getByText('Test message to keep')).toBeVisible();
    
    // Handle confirmation dialog - dismiss it
    page.on('dialog', dialog => {
      dialog.dismiss();
    });
    
    // Click clear chat
    await page.getByText('Clear Chat').click();
    
    // Message should still be there
    await expect(page.getByText('Test message to keep')).toBeVisible();
  });

  test('should show reindex action in sidebar', async ({ page }) => {
    await page.goto('/');
    
    // Should show reindex button
    await expect(page.getByText('Reindex')).toBeVisible();
    await expect(page.getByText('🔄')).toBeVisible();
  });

  test('should handle reindex action click', async ({ page }) => {
    // Mock the reindex API endpoint
    await page.route('**/reindex', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });
    
    await page.goto('/');
    
    // Handle alert dialog
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Reindexing completed successfully!');
      dialog.accept();
    });
    
    // Click reindex
    await page.getByText('Reindex').click();
    
    // Should show processing state briefly
    await expect(page.getByText('Processing...')).toBeVisible();
  });

  test('should handle reindex failure gracefully', async ({ page }) => {
    // Mock the reindex API to fail
    await page.route('**/reindex', route => {
      route.fulfill({
        status: 500,
        body: 'Internal Server Error'
      });
    });
    
    await page.goto('/');
    
    // Handle error alert dialog
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Reindexing failed');
      dialog.accept();
    });
    
    // Click reindex
    await page.getByText('Reindex').click();
  });

  test('should show navigation section in sidebar', async ({ page }) => {
    await page.goto('/');
    
    // Should show navigation section
    await expect(page.getByText('NAVIGATION')).toBeVisible();
    await expect(page.getByText('💬')).toBeVisible(); // Chat icon
    await expect(page.getByText('⚡')).toBeVisible(); // Health icon
  });

  test('should show actions section in sidebar', async ({ page }) => {
    await page.goto('/');
    
    // Should show actions section
    await expect(page.getByText('ACTIONS')).toBeVisible();
    await expect(page.getByText('🗑️')).toBeVisible(); // Clear icon
    await expect(page.getByText('🔄')).toBeVisible(); // Reindex icon
  });

  test('should show footer disclaimers', async ({ page }) => {
    await page.goto('/');
    
    // Should show disclaimer text
    await expect(page.getByText('Educational purposes only')).toBeVisible();
    await expect(page.getByText('Not medical advice')).toBeVisible();
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.goto('/');
    
    // Chat should be active by default
    const chatButton = page.getByRole('button', { name: /Chat/ });
    await expect(chatButton).toHaveCSS('background-color', /rgba\(37, 99, 235, 0\.2\)/);
    
    // Click Health
    const healthButton = page.getByRole('button', { name: /Health/ });
    await healthButton.click();
    
    // Health should be highlighted
    await expect(healthButton).toHaveCSS('background-color', /rgba\(37, 99, 235, 0\.2\)/);
  });

  test('should handle hover states on sidebar items', async ({ page }) => {
    await page.goto('/');
    
    // Hover over Clear Chat button
    const clearButton = page.getByText('Clear Chat');
    await clearButton.hover();
    
    // Should show hover effect (background change)
    await expect(clearButton).toHaveCSS('background-color', /rgba\(255, 255, 255, 0\.05\)/);
  });

  test('should maintain sidebar position when scrolling', async ({ page }) => {
    await page.goto('/');
    
    // Send multiple messages to create scrollable content
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    
    for (let i = 0; i < 5; i++) {
      await input.fill(`Message ${i + 1}`);
      await page.getByText('Send').click();
      await page.waitForTimeout(1000);
    }
    
    // Scroll down in the chat area
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Sidebar should still be visible and fixed
    await expect(page.getByText('🧠 Mindr')).toBeVisible();
    await expect(page.getByText('Navigation')).toBeVisible();
  });

  test('should show consistent spacing and alignment', async ({ page }) => {
    await page.goto('/');
    
    // Check sidebar layout elements are properly spaced
    await expect(page.getByText('🧠 Mindr')).toBeVisible();
    await expect(page.getByText('AI Wellness Coach')).toBeVisible();
    await expect(page.getByText('Navigation')).toBeVisible();
    await expect(page.getByText('Actions')).toBeVisible();
    
    // All elements should be properly aligned
    const sidebar = page.locator('div').filter({ hasText: '🧠 Mindr' }).first();
    await expect(sidebar).toHaveCSS('display', 'flex');
  });

  test('should handle disabled state for reindex', async ({ page }) => {
    await page.goto('/');
    
    // Click reindex to trigger loading state
    await page.getByText('Reindex').click();
    
    // Should show disabled state during processing
    const reindexButton = page.getByText('Processing...');
    await expect(reindexButton).toBeVisible();
    
    // Button should be disabled
    await expect(reindexButton).toBeDisabled();
  });
});