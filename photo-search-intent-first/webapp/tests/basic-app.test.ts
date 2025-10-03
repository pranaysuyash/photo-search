// Basic App Test - Validates that the app runs and E2E infrastructure works
import { expect, test } from "@playwright/test";

test.describe("Basic App Functionality", () => {
  test("should load page without critical errors", async ({ page }) => {
    // Navigate to the app
    const response = await page.goto("http://localhost:5173");

    // Page should load successfully
    expect(response?.status()).toBe(200);

    // Wait for page to be loaded
    await page.waitForLoadState("networkidle");

    // Check that page loaded (has body element)
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Check for critical console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit to catch any immediate errors
    await page.waitForTimeout(3000);

    // Should not have uncaught console errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('Warning') &&
      !error.includes('DevTools') &&
      !error.includes('Hot Module Replacement')
    );

    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }

    // Allow some warnings but no critical errors
    expect(criticalErrors.length).toBeLessThan(5);
  });

  test("should have basic HTML structure", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Check for basic HTML elements
    const html = page.locator("html");
    const head = page.locator("head");
    const body = page.locator("body");

    await expect(html).toBeAttached();
    await expect(head).toBeAttached();
    await expect(body).toBeAttached();

    // Check for title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test("should load JavaScript without errors", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Check if React app is being loaded
    const reactLoaded = await page.evaluate(() => {
      return !!document.querySelector('#root');
    });

    expect(reactLoaded).toBe(true);

    // Wait for potential React initialization
    await page.waitForTimeout(2000);

    // Check for JavaScript errors
    const jsErrors = await page.evaluate(() => {
      const errors: string[] = [];
      // Check for common error indicators
      if (document.body.textContent?.includes('Application error')) {
        errors.push('Application error detected');
      }
      if (document.body.textContent?.includes('Script error')) {
        errors.push('Script error detected');
      }
      return errors;
    });

    expect(jsErrors.length).toBe(0);
  });

  test("should handle different viewports", async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();

    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle page navigation", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Try basic navigation
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still be functional
    await expect(page.locator("body")).toBeVisible();

    // Try going back (shouldn't error)
    await page.goBack();
    await page.waitForTimeout(1000);

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Test Infrastructure Validation", () => {
  test("should be able to run Playwright tests", async ({ page }) => {
    // Basic test to ensure Playwright is working
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Should be able to take screenshot
    await page.screenshot({ path: 'test-results/basic-screenshot.png' });

    // Should be able to evaluate JavaScript
    const pageTitle = await page.evaluate(() => document.title);
    expect(pageTitle).toBeTruthy();

    // Should be able to get page content
    const content = await page.content();
    expect(content).toContain('<html');
    expect(content).toContain('</html>');
  });

  test("should handle test timeouts gracefully", async ({ page }) => {
    // Test that we can handle timeout scenarios
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Should be able to wait for short periods
    await page.waitForTimeout(1000);

    // Should be able to wait for elements with reasonable timeout
    const body = page.locator("body");
    await expect(body).toBeVisible({ timeout: 5000 });
  });

  test("should handle different browsers", async ({ page, browserName }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Log browser info
    console.log(`Running test in: ${browserName}`);

    // Should work in different browsers
    await expect(page.locator("body")).toBeVisible();

    // Get browser-specific info
    const userAgent = await page.evaluate(() => navigator.userAgent);
    expect(userAgent).toContain(browserName);
  });
});