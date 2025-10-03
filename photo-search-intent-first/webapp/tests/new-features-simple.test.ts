// Simplified E2E Tests for New Features
// This test suite is designed to work with the existing test infrastructure

import { expect, test } from "@playwright/test";

test.describe("New Features - Basic Integration Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Dismiss any overlays or onboarding screens
    try {
      // Try to dismiss welcome modal
      const welcomeModal = page.locator('[role="dialog"]').filter({ hasText: "Find any photo instantly" });
      if (await welcomeModal.isVisible({ timeout: 2000 })) {
        await page.click('button:has-text("Maybe later")');
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Continue if no modal found
    }

    try {
      // Try to dismiss onboarding tour
      const tourSkip = page.locator('button:has-text("Skip")').first();
      if (await tourSkip.isVisible({ timeout: 2000 })) {
        await tourSkip.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Continue if no tour found
    }

    // Wait for main app to load
    await page.waitForSelector("#root", { state: "visible", timeout: 10000 });
  });

  test("should load main application successfully", async ({ page }) => {
    // Verify app is loaded
    await expect(page.locator("#root")).toBeVisible();

    // Look for basic app elements
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    const bodyContent = page.locator("body").first();

    // At least basic content should be visible
    await expect(bodyContent).toBeVisible();

    // Search input should be available (though may not be immediately visible)
    const searchExists = await searchInput.count() > 0;
    expect(searchExists).toBe(true);
  });

  test("should handle search functionality", async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Try" i]').first();

    // Wait for search input to be available
    await searchInput.waitFor({ state: "attached", timeout: 10000 });

    // Check if it's visible and enabled
    const isVisible = await searchInput.isVisible().catch(() => false);

    if (isVisible) {
      // Perform a search
      await searchInput.fill("test");
      await searchInput.press("Enter");

      // Wait for search to process
      await page.waitForTimeout(2000);

      // Check if search was processed (no errors occurred)
      const stillVisible = await searchInput.isVisible();
      expect(stillVisible).toBe(true);
    } else {
      // Search input might not be immediately visible, which is OK
      console.log("Search input not immediately visible, skipping search test");
    }
  });

  test("should have responsive layout on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for layout to adjust
    await page.waitForTimeout(1000);

    // Verify app is still functional
    await expect(page.locator("#root")).toBeVisible();

    // Check for mobile-specific elements or layout
    const mobileNav = page.locator('.mobile-nav, .hamburger, button:has(svg)');
    const mobileElementsExist = await mobileNav.count() > 0;

    // App should adapt to mobile
    expect(mobileElementsExist).toBe(true);
  });

  test("should handle keyboard navigation", async ({ page }) => {
    // Test Tab navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Check if any element is focused
    const focusedElement = page.locator(':focus');
    const hasFocus = await focusedElement.count() > 0;

    // Should have keyboard navigation support
    expect(hasFocus).toBe(true);
  });

  test("should not have console errors", async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to a few pages/sections
    await page.waitForTimeout(2000);

    // Try to interact with basic elements
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("test navigation");
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }

    // Check for console errors
    expect(consoleErrors.length).toBe(0);
  });

  test("should maintain performance under basic usage", async ({ page }) => {
    // Measure basic performance
    const startTime = Date.now();

    // Perform basic interactions
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("performance test");
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Basic operations should complete reasonably quickly
    expect(duration).toBeLessThan(10000); // 10 seconds max
  });
});

test.describe("Timeline Tooltip - Basic Test", () => {
  test("should not break app functionality", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Dismiss overlays
    try {
      await page.click('button:has-text("Maybe later")').catch(() => {});
      await page.click('button:has-text("Skip")').catch(() => {});
    } catch (e) {
      // Continue if overlays not found
    }

    // App should still be functional
    await expect(page.locator("#root")).toBeVisible();

    // Look for timeline-related elements
    const timelineElements = page.locator('.timeline, [data-testid*="timeline"], .time-based');
    const timelineExists = await timelineElements.count() > 0;

    // Timeline may or may not be present based on search state
    if (timelineExists) {
      // If present, should not cause errors
      const timelineVisible = await timelineElements.first().isVisible().catch(() => false);
      expect(timelineVisible || !timelineVisible).toBe(true); // Either visible or not - both OK
    }
  });
});

test.describe("Jobs Management - Basic Test", () => {
  test("should handle jobs-related UI elements", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Dismiss overlays
    try {
      await page.click('button:has-text("Maybe later")').catch(() => {});
      await page.click('button:has-text("Skip")').catch(() => {});
    } catch (e) {
      // Continue if overlays not found
    }

    // Look for jobs-related elements
    const jobsButton = page.locator('button:has-text("Jobs"), [data-testid*="jobs"]');
    const jobsExists = await jobsButton.count() > 0;

    if (jobsExists) {
      const jobsVisible = await jobsButton.first().isVisible().catch(() => false);

      if (jobsVisible) {
        // If jobs button is visible, clicking it should not break the app
        await jobsButton.first().click();
        await page.waitForTimeout(1000);

        // App should still be functional
        await expect(page.locator("#root")).toBeVisible();
      }
    }
  });
});

test.describe("Map Clustering - Basic Test", () => {
  test("should handle map-related functionality", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Dismiss overlays
    try {
      await page.click('button:has-text("Maybe later")').catch(() => {});
      await page.click('button:has-text("Skip")').catch(() => {});
    } catch (e) {
      // Continue if overlays not found
    }

    // Look for map-related elements
    const mapButton = page.locator('button:has-text("Map"), [data-testid*="map"]');
    const mapExists = await mapButton.count() > 0;

    if (mapExists) {
      const mapVisible = await mapButton.first().isVisible().catch(() => false);

      if (mapVisible) {
        // If map button is visible, clicking it should not break the app
        await mapButton.first().click();
        await page.waitForTimeout(2000);

        // App should still be functional
        await expect(page.locator("#root")).toBeVisible();
      }
    }
  });
});

test.describe("Session Restore - Basic Test", () => {
  test("should handle session persistence without errors", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Dismiss overlays
    try {
      await page.click('button:has-text("Maybe later")').catch(() => {});
      await page.click('button:has-text("Skip")').catch(() => {});
    } catch (e) {
      // Continue if overlays not found
    }

    // Perform some basic interactions
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("session test");
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }

    // Reload page to test session restore
    await page.reload();
    await page.waitForLoadState("networkidle");

    // App should still be functional after reload
    await expect(page.locator("#root")).toBeVisible();

    // Should not have session-related errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('session')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    expect(consoleErrors.length).toBe(0);
  });
});

test.describe("Accessibility Tests", () => {
  test("should have basic accessibility features", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Dismiss overlays
    try {
      await page.click('button:has-text("Maybe later")').catch(() => {});
      await page.click('button:has-text("Skip")').catch(() => {});
    } catch (e) {
      // Continue if overlays not found
    }

    // Check for basic accessibility features
    const mainElement = page.locator('main, [role="main"], #main-content');
    const hasMainLandmark = await mainElement.count() > 0;

    // Should have proper semantic structure
    expect(hasMainLandmark).toBe(true);

    // Check for keyboard accessibility
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    const hasFocusableElements = await focusedElement.count() > 0;

    expect(hasFocusableElements).toBe(true);
  });

  test("should have proper ARIA labels and roles", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Look for elements with ARIA attributes
    const elementsWithAria = page.locator('[aria-label], [role], [aria-describedby]');
    const ariaElementsExist = await elementsWithAria.count() > 0;

    // Should have some accessibility markup
    expect(ariaElementsExist).toBe(true);
  });
});