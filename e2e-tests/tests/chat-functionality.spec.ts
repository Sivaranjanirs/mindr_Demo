import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test('should send a message and receive response', async ({ page }) => {
    await page.goto('/');
    
    // Type a message
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await input.fill('Tell me about sleep hygiene');
    
    // Send the message
    await page.getByText('Send').click();
    
    // Check that user message appears
    await expect(page.getByText('Tell me about sleep hygiene')).toBeVisible();
    
    // Check that AI response appears (wait for streaming)
    await expect(page.getByText('🤖')).toBeVisible();
    await expect(page.getByText('Mindr')).toBeVisible();
    
    // Wait for response content (timeout allows for API response)
    await page.waitForTimeout(5000);
    
    // Should show some response content
    await expect(page.locator('text=Based on your question')).toBeVisible({ timeout: 10000 });
  });

  test('should display suggestion chips and handle clicks', async ({ page }) => {
    await page.goto('/');
    
    // Check suggestion chips are visible
    await expect(page.getByText('Sleep tips')).toBeVisible();
    await expect(page.getByText('Healthy eating')).toBeVisible();
    await expect(page.getByText('Exercise routines')).toBeVisible();
    await expect(page.getByText('Stress relief')).toBeVisible();
    
    // Click a suggestion
    await page.getByText('Sleep tips').click();
    
    // Input should be filled
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await expect(input).toHaveValue('Sleep tips');
  });

  test('should show typing indicator during processing', async ({ page }) => {
    await page.goto('/');
    
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await input.fill('Quick test');
    await page.getByText('Send').click();
    
    // Should show typing indicator
    await expect(page.getByText('⏳ Thinking...')).toBeVisible();
    
    // Wait for response to complete
    await page.waitForTimeout(3000);
  });

  test('should handle Enter key for sending', async ({ page }) => {
    await page.goto('/');
    
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await input.fill('Test enter key');
    await input.press('Enter');
    
    // Should send the message
    await expect(page.getByText('Test enter key')).toBeVisible();
  });

  test('should prevent sending empty messages', async ({ page }) => {
    await page.goto('/');
    
    const sendButton = page.getByText('Send');
    
    // Send button should be disabled when input is empty
    await expect(sendButton).toBeDisabled();
    
    // Type something
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await input.fill('Test');
    
    // Send button should be enabled
    await expect(sendButton).toBeEnabled();
    
    // Clear input
    await input.clear();
    
    // Should be disabled again
    await expect(sendButton).toBeDisabled();
  });

  test('should clear input after sending', async ({ page }) => {
    await page.goto('/');
    
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await input.fill('Test message');
    await page.getByText('Send').click();
    
    // Input should be cleared
    await expect(input).toHaveValue('');
  });

  test('should display bullets and action button', async ({ page }) => {
    await page.goto('/');
    
    // Send a health-related query that should return bullets
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await input.fill('Give me nutrition tips');
    await page.getByText('Send').click();
    
    // Wait for response
    await page.waitForTimeout(8000);
    
    // Should show bullets (bullet points with • symbol)
    await expect(page.locator('text=•')).toBeVisible({ timeout: 15000 });
    
    // Should show "Try this week" button
    await expect(page.getByText('Try this week')).toBeVisible({ timeout: 15000 });
  });

  test('should display and interact with sources', async ({ page }) => {
    await page.goto('/');
    
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await input.fill('Tell me about exercise');
    await page.getByText('Send').click();
    
    // Wait for sources to load
    await page.waitForTimeout(8000);
    
    // Should show source buttons (📄 prefix)
    const sourceButtons = page.locator('button:has-text("📄")');
    await expect(sourceButtons.first()).toBeVisible({ timeout: 15000 });
    
    // Click a source button (if available)
    if (await sourceButtons.count() > 0) {
      // Mock alert dialog
      page.on('dialog', dialog => dialog.accept());
      await sourceButtons.first().click();
    }
  });

  test('should maintain message history', async ({ page }) => {
    await page.goto('/');
    
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    
    // Send first message
    await input.fill('First message');
    await page.getByText('Send').click();
    await expect(page.getByText('First message')).toBeVisible();
    
    // Wait a bit for response
    await page.waitForTimeout(3000);
    
    // Send second message
    await input.fill('Second message');
    await page.getByText('Send').click();
    await expect(page.getByText('Second message')).toBeVisible();
    
    // Both messages should be visible
    await expect(page.getByText('First message')).toBeVisible();
    await expect(page.getByText('Second message')).toBeVisible();
  });

  test('should handle long messages', async ({ page }) => {
    await page.goto('/');
    
    const longMessage = 'This is a very long message that tests how the application handles extensive user input with many words and characters. '.repeat(5);
    
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await input.fill(longMessage);
    await page.getByText('Send').click();
    
    // Should display the long message
    await expect(page.getByText(longMessage)).toBeVisible();
  });

  test('should handle special characters and emojis', async ({ page }) => {
    await page.goto('/');
    
    const specialMessage = 'Hello! 🧠 How about émojis & spéciàl chars?';
    
    const input = page.getByPlaceholder('Ask me anything about wellness and health...');
    await input.fill(specialMessage);
    await page.getByText('Send').click();
    
    // Should display the message with special characters
    await expect(page.getByText(specialMessage)).toBeVisible();
  });
});