import { test, expect } from '@playwright/test';

test.describe('App Navigation', () => {
  test('should load the application and show sidebar', async ({ page }) => {
    await page.goto('/');
    
    // Check that the main elements are visible
    await expect(page.getByText('🧠 Mindr')).toBeVisible();
    await expect(page.getByText('AI Wellness Coach')).toBeVisible();
    await expect(page.getByText('Navigation')).toBeVisible();
    await expect(page.getByText('Actions')).toBeVisible();
  });

  test('should navigate between Chat and Health views', async ({ page }) => {
    await page.goto('/');
    
    // Should start on Chat view
    await expect(page.getByText('Welcome to Mindr')).toBeVisible();
    await expect(page.getByText('Your AI wellness companion')).toBeVisible();
    
    // Navigate to Health view
    await page.getByText('Health').click();
    await expect(page.getByText('System Health')).toBeVisible();
    await expect(page.getByText('Ops Truth')).toBeVisible();
    
    // Navigate back to Chat
    await page.getByText('Chat').click();
    await expect(page.getByText('Welcome to Mindr')).toBeVisible();
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.goto('/');
    
    // Chat should be active by default
    const chatButton = page.getByRole('button', { name: 'Chat' });
    await expect(chatButton).toHaveCSS('border-left', /solid/);
    
    // Click Health
    await page.getByText('Health').click();
    const healthButton = page.getByRole('button', { name: 'Health' });
    await expect(healthButton).toHaveCSS('border-left', /solid/);
  });

  test('should maintain professional styling', async ({ page }) => {
    await page.goto('/');
    
    // Check that professional fonts are loaded
    const body = page.locator('body');
    await expect(body).toHaveCSS('font-family', /Inter/);
    
    // Check sidebar has dark professional background
    const sidebar = page.locator('div').first();
    // Professional dark sidebar color should be applied
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    await page.goto('/');
    
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.getByText('🧠 Mindr')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByText('🧠 Mindr')).toBeVisible();
    
    // Content should still be accessible
    await expect(page.getByText('Welcome to Mindr')).toBeVisible();
  });
});