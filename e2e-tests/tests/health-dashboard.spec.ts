import { test, expect } from '@playwright/test';

test.describe('Health Dashboard', () => {
  test('should display health metrics', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to health view
    await page.getByText('Health').click();
    
    // Should show health dashboard
    await expect(page.getByText('System Health')).toBeVisible();
    
    // Should show status indicator
    await expect(page.getByText('✅')).toBeVisible();
    await expect(page.getByText('OPERATIONAL')).toBeVisible();
    
    // Should show system info
    await expect(page.getByText('Snippets:')).toBeVisible();
    await expect(page.getByText('Files:')).toBeVisible();
    await expect(page.getByText('Version:')).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Health').click();
    
    // Should show loading message briefly
    await expect(page.getByText('Loading health metrics...')).toBeVisible();
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Should show actual metrics
    await expect(page.getByText('OPERATIONAL')).toBeVisible();
  });

  test('should display ops truth section', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Health').click();
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Should show ops truth section
    await expect(page.getByText('📊 Ops Truth')).toBeVisible();
    await expect(page.getByText('Health:')).toBeVisible();
  });

  test('should display latency report', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Health').click();
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Should show latency report section
    await expect(page.getByText('⚡ Latency Report')).toBeVisible();
    await expect(page.getByText('Based on')).toBeVisible();
    await expect(page.getByText('requests')).toBeVisible();
  });

  test('should auto-refresh every 5 seconds', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Health').click();
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Get initial timestamp
    const timestampElement = page.locator('text=/Timestamp:/');
    const initialTimestamp = await timestampElement.textContent();
    
    // Wait for auto-refresh (5+ seconds)
    await page.waitForTimeout(6000);
    
    // Check if timestamp updated (indicating refresh)
    const newTimestamp = await timestampElement.textContent();
    expect(newTimestamp).not.toBe(initialTimestamp);
  });

  test('should show system info grid', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Health').click();
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Should show system info section
    await expect(page.getByText('🔧 System Info')).toBeVisible();
    
    // Should show all system info fields
    await expect(page.getByText('Snippets:')).toBeVisible();
    await expect(page.getByText('Files:')).toBeVisible();
    await expect(page.getByText('Version:')).toBeVisible();
    await expect(page.getByText('Timestamp:')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept health API and make it fail
    await page.route('**/health', route => {
      route.abort();
    });
    
    await page.goto('/');
    await page.getByText('Health').click();
    
    // Should show error state
    await expect(page.getByText('Failed to fetch health data')).toBeVisible();
  });

  test('should maintain consistent width with chat view', async ({ page }) => {
    await page.goto('/');
    
    // Get chat view container width
    const chatContainer = page.locator('div').filter({ hasText: 'Welcome to Mindr' }).first();
    const chatBBox = await chatContainer.boundingBox();
    
    // Navigate to health view
    await page.getByText('Health').click();
    await page.waitForTimeout(1000);
    
    // Get health view container width
    const healthContainer = page.locator('div').filter({ hasText: 'System Health' }).first();
    const healthBBox = await healthContainer.boundingBox();
    
    // Widths should be similar (within reasonable tolerance)
    if (chatBBox && healthBBox) {
      const widthDifference = Math.abs(chatBBox.width - healthBBox.width);
      expect(widthDifference).toBeLessThan(50); // Allow small differences
    }
  });

  test('should show professional styling', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Health').click();
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Check professional color scheme (no bright/flashy colors)
    const healthHeader = page.getByText('System Health');
    await expect(healthHeader).toBeVisible();
    
    // Should have consistent professional styling
    await expect(page.locator('body')).toHaveCSS('font-family', /Inter/);
  });

  test('should show correct status for healthy system', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Health').click();
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Should show green checkmark and operational status
    await expect(page.getByText('✅')).toBeVisible();
    await expect(page.getByText('OPERATIONAL')).toBeVisible();
  });

  test('should clean up when navigating away', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Health').click();
    
    // Wait for health dashboard to load
    await page.waitForTimeout(2000);
    
    // Navigate back to chat
    await page.getByText('Chat').click();
    
    // Should show chat view
    await expect(page.getByText('Welcome to Mindr')).toBeVisible();
    
    // Navigate back to health
    await page.getByText('Health').click();
    
    // Should still work correctly
    await expect(page.getByText('System Health')).toBeVisible();
  });
});