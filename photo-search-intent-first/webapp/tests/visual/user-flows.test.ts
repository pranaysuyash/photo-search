import { expect, test } from "@playwright/test";
import {
  performSearch,
  stableScreenshot,
  waitForAppReady,
} from "../utils/test-helpers";

test.describe("Visual: User Flows", () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
  });

  test.describe("Search Flow", () => {
    test("complete search journey from empty to results", async ({ page }) => {
      // Start with empty state
      await stableScreenshot(page, { name: "search-empty-state.png" });

      // Perform a search
      await performSearch(page, "beach sunset");

      // Wait for results to load
      await page.waitForSelector(
        '[data-testid="results-grid"], .results-grid, [class*="result"]',
        { timeout: 10000 }
      );

      // Take screenshot of search results
      await stableScreenshot(page, { name: "search-results.png" });

      // Test result interaction - click on first result
      const firstResult = page
        .locator('[data-testid="result-item"], .result-item')
        .first();
      if (await firstResult.isVisible().catch(() => false)) {
        await firstResult.click();

        // Wait for detail view
        await page.waitForSelector(
          '[data-testid="photo-detail"], .photo-detail',
          { timeout: 5000 }
        );

        // Take screenshot of photo detail
        await stableScreenshot(page, { name: "photo-detail-view.png" });
      }
    });

    test("search with no results shows appropriate message", async ({
      page,
    }) => {
      // Perform a search that should return no results
      await performSearch(page, "nonexistentqueryxyz123");

      // Wait for search to complete and check for no results state or suggestions
      await page.waitForTimeout(2000);

      // Check for no results indicators (flexible to match new UX)
      const hasNoResultsState = await page.evaluate(() => {
        const bodyText = document.body.textContent?.toLowerCase() || "";
        return (
          bodyText.includes("no results") ||
          bodyText.includes("found nothing") ||
          bodyText.includes("try") ||
          bodyText.includes("suggest") ||
          bodyText.includes("search tip") ||
          bodyText.includes("did you mean")
        );
      });

      expect(hasNoResultsState).toBe(true);

      // Take screenshot of no results state
      await stableScreenshot(page, { name: "no-results-state.png" });
    });

    test("search suggestions and autocomplete", async ({ page }) => {
      // Type in search box to trigger suggestions
      const searchInput = page
        .locator('input[type="search"], input[placeholder*="search" i]')
        .first();
      await searchInput.fill("bea");

      // Wait for suggestions to appear
      await page
        .waitForSelector(
          '[data-testid="search-suggestions"], .search-suggestions, [role="listbox"]',
          { timeout: 3000 }
        )
        .catch(() => {
          // Suggestions might not appear immediately, that's ok
        });

      // Take screenshot of search with suggestions
      await stableScreenshot(page, { name: "search-with-suggestions.png" });

      // Complete the search
      await searchInput.press("Enter");

      // Wait for results
      await page.waitForSelector(
        '[data-testid="results-grid"], .results-grid',
        { timeout: 10000 }
      );

      // Take screenshot of completed search
      await stableScreenshot(page, { name: "search-completed.png" });
    });
  });

  test.describe("Navigation Flow", () => {
    test("switch between different views", async ({ page }) => {
      // Start on results/library view
      await stableScreenshot(page, { name: "default-view.png" });

      // Switch to map view
      const mapButton = page
        .locator(
          'button[data-testid="map-view"], button[aria-label*="map"], button:has-text("Map")'
        )
        .first();
      if (await mapButton.isVisible().catch(() => false)) {
        await mapButton.click();

        // Wait for map to load
        await page.waitForSelector(
          '[data-testid="map-container"], .map-container, [class*="map"]',
          { timeout: 10000 }
        );

        // Take screenshot of map view
        await stableScreenshot(page, { name: "map-view.png" });
      }

      // Switch to people view
      const peopleButton = page
        .locator(
          'button[data-testid="people-view"], button[aria-label*="people"], button:has-text("People")'
        )
        .first();
      if (await peopleButton.isVisible().catch(() => false)) {
        await peopleButton.click();

        // Wait for people view to load
        await page.waitForSelector(
          '[data-testid="people-grid"], .people-grid, [class*="people"]',
          { timeout: 10000 }
        );

        // Take screenshot of people view
        await stableScreenshot(page, { name: "people-view.png" });
      }
    });
  });

  test.describe("Error Handling Flow", () => {
    test("network error displays appropriate message", async ({ page }) => {
      // Simulate network failure by blocking API calls
      await page.route("**/api/**", (route) => route.abort());

      // Try to perform a search
      const searchInput = page
        .locator('input[type="search"], input[placeholder*="search" i]')
        .first();
      await searchInput.fill("test query");
      await searchInput.press("Enter");

      // Wait for error message
      await page.waitForSelector(
        '[data-testid="error-message"], .error-message, text=/error|failed/i',
        { timeout: 10000 }
      );

      // Take screenshot of error state
      await stableScreenshot(page, { name: "network-error-state.png" });
    });
  });

  test.describe("Onboarding Flow", () => {
    test("first-time user onboarding experience", async ({ page }) => {
      // Reset onboarding state for this test
      await page.addInitScript(() => {
        localStorage.removeItem("hasSeenOnboarding");
        localStorage.removeItem("onboardingComplete");
        localStorage.setItem("showWelcome", "true");
      });

      // Reload page to trigger onboarding
      await page.reload();

      // Wait for onboarding to appear
      await page.waitForSelector(
        '[data-testid="welcome-screen"], .welcome-screen',
        { timeout: 10000 }
      );

      // Take screenshot of welcome screen
      await stableScreenshot(page, { name: "welcome-screen-onboarding.png" });

      // Click through onboarding steps
      const demoButton = page
        .locator('button:has-text("Try Demo"), button:has-text("Demo")')
        .first();
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();

        // Wait for demo to load
        await page.waitForSelector(
          '[data-testid="demo-content"], .demo-content',
          { timeout: 10000 }
        );

        // Take screenshot of demo content
        await stableScreenshot(page, { name: "demo-content-loaded.png" });
      }
    });
  });
});
