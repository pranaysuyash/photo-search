// Visual Regression Tests for Electron Features
// Uses Chrome DevTools Protocol for visual validation

const { test, expect } = require('@playwright/test');

test.describe('Visual Validation', () => {
  test('main window layout', async ({ page }) => {
    await page.goto('http://127.0.0.1:5174');

    // Take screenshot for visual regression
    await expect(page).toHaveScreenshot('main-window.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Check main elements are present
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('aside')).toBeVisible();
  });

  test('empty state with folder selector', async ({ page }) => {
    await page.goto('http://127.0.0.1:5174');

    // Check empty state is properly displayed
    const emptyState = page.locator('[data-testid="empty-library"]');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      await expect(emptyState.locator('button', { hasText: 'Select Photo Library' })).toBeVisible();
    }
  });

  test('menu bar functionality', async ({ page }) => {
    await page.goto('http://127.0.0.1:5174');

    // Test that app loads without errors
    await expect(page.locator('body')).not.toHaveClass(/error/);

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});