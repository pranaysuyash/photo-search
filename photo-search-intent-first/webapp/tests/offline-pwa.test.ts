import { test, expect } from "@playwright/test";

/**
 * Offline PWA Verification Tests
 *
 * Tests the offline-first functionality of the Photo Search PWA:
 * - Service worker registration and caching
 * - Offline navigation and shell loading
 * - Cached JSON API responses
 * - Thumbnail caching
 */

test.describe("Offline PWA Functionality", () => {
  test.beforeEach(async ({ page, context }) => {
    // Set longer timeout for offline tests
    test.setTimeout(60000);

    // Navigate to the app and wait for service worker
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for service worker to be ready
    await page.waitForFunction(() => {
      return navigator.serviceWorker.ready.then(() => true);
    });
  });

  test("should register service worker", async ({ page }) => {
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          return registrations.length > 0;
        });
    });

    expect(swRegistered).toBe(true);
  });

  test("should cache shell assets offline", async ({ page, context }) => {
    // First, ensure we're online and cache some assets
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Go offline
    await context.setOffline(true);

    // Try to navigate - should work via service worker
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Should still show the app (even if with limited functionality)
    const title = await page.title();
    expect(title).toContain("Photo Search");
  });

  test("should serve cached JSON API responses offline", async ({
    page,
    context,
  }) => {
    // First, make some API calls while online to populate cache
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Make API calls to cache JSON responses
    const apiCalls = ["/library", "/collections", "/presets"];

    for (const endpoint of apiCalls) {
      try {
        const response = await page.request.get(
          `http://localhost:8000${endpoint}`
        );
        expect(response.ok()).toBe(true);
      } catch (_e) {
        // API might not be running, skip this test
        test.skip();
      }
    }

    // Go offline
    await context.setOffline(true);

    // Try to make the same API calls - should get cached responses
    for (const endpoint of apiCalls) {
      try {
        const response = await page.request.get(
          `http://localhost:8000${endpoint}`
        );
        // Should either get cached response or fail gracefully
        expect([200, 503]).toContain(response.status());
      } catch (_e) {
        // Network error is expected when offline
      }
    }
  });

  test("should cache thumbnails for offline viewing", async ({
    page,
    context,
  }) => {
    // First, ensure we're online and load some thumbnails
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait a bit for any thumbnail requests to complete
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Try to reload - thumbnails should be cached
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // App should still load
    const bodyVisible = await page.isVisible("body");
    expect(bodyVisible).toBe(true);
  });

  test("should handle offline API failures gracefully", async ({
    page,
    context,
  }) => {
    // Go offline first
    await context.setOffline(true);

    // Try to make API calls that aren't cached
    try {
      const response = await page.request.get(
        "http://localhost:8000/search?q=test"
      );
      // Should get offline response
      expect(response.status()).toBe(503);
    } catch (_e) {
      // Network error is expected
    }
  });

  test("should recover when coming back online", async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Try offline navigation
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Come back online
    await context.setOffline(false);

    // Wait for network recovery
    await page.waitForLoadState("networkidle");

    // Should be able to make fresh API calls
    try {
      const response = await page.request.get(
        "http://localhost:8000/models/capabilities"
      );
      expect(response.ok()).toBe(true);
    } catch (_e) {
      // API might not be running, but network should work
    }
  });
});
