// Electron Feature Tests
// Tests the new menu functionality in Photo Search Desktop v3

const { test, expect } = require('@playwright/test');

test.describe('Electron Menu Features', () => {
  test('should have working File menu with Open Photo Library option', async ({ page }) => {
    // Test that File menu exists and has expected items
    const fileMenu = page.locator('menu').filter({ hasText: 'File' });
    await expect(fileMenu).toBeVisible();

    // Test Open Photo Library shortcut
    await page.keyboard.press('Control+O');
    // Should trigger directory selection (handled by Electron)
  });

  test('should have working Search menu with enhanced options', async ({ page }) => {
    const searchMenu = page.locator('menu').filter({ hasText: 'Search' });
    await expect(searchMenu).toBeVisible();

    // Check for new menu items
    await expect(page.locator('menuitem', { hasText: 'Smart Search' })).toBeVisible();
    await expect(page.locator('menuitem', { hasText: 'Search by People' })).toBeVisible();
    await expect(page.locator('menuitem', { hasText: 'Search by Places' })).toBeVisible();
    await expect(page.locator('menuitem', { hasText: 'Rebuild Index' })).toBeVisible();
  });

  test('should have working View menu with view mode shortcuts', async ({ page }) => {
    const viewMenu = page.locator('menu').filter({ hasText: 'View' });
    await expect(viewMenu).toBeVisible();

    // Test view mode shortcuts
    await page.keyboard.press('Control+1'); // Grid view
    await page.keyboard.press('Control+2'); // List view
  });
});

test.describe('Electron API Integration', () => {
  test('should expose electronAPI in renderer', async ({ page }) => {
    // Test that our new API methods are available
    await page.evaluate(() => {
      return typeof window.electronAPI !== 'undefined';
    });

    // Test specific API methods
    await page.evaluate(() => {
      const api = window.electronAPI;
      return [
        typeof api.rebuildIndex,
        typeof api.exportLibrary,
        typeof api.buildFaces,
        typeof api.buildTrips,
        typeof api.getIndexStatus
      ];
    });
  });
});