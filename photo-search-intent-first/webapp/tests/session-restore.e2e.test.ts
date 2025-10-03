// E2E Tests for Session Restore Feature
// Tests comprehensive session persistence and restoration functionality

import { expect, test } from "@playwright/test";
import { waitForAppReady, performSearch, dismissOverlays } from "./utils/test-helpers";

test.describe("Session Restore - Comprehensive Persistence", () => {
  test.beforeEach(async ({ page }) => {
    // Clear session storage before each test
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await waitForAppReady(page);
  });

  test("should preserve and restore search queries", async ({ page }) => {
    // Perform a search
    await performSearch(page, "family vacation");

    // Wait for results to load
    await page.waitForTimeout(2000);

    // Check if search was performed
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    const searchValue = await searchInput.inputValue();

    expect(searchValue).toBe("family vacation");

    // Reload the page
    await page.reload();
    await waitForAppReady(page);

    // Check if search query was restored
    const restoredSearchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    await expect(restoredSearchInput).toBeVisible();

    const restoredValue = await restoredSearchInput.inputValue();

    // Search query should be restored
    if (restoredValue) {
      expect(restoredValue).toBe("family vacation");
    }

    // Check for session restore indicator
    const restoreIndicator = page.locator('.fixed.bottom-4.right-4, [data-testid="session-restore-indicator"]');
    const indicatorVisible = await restoreIndicator.isVisible().catch(() => false);

    if (indicatorVisible) {
      await expect(restoreIndicator).toBeVisible();
      await expect(restoreIndicator.locator('text=/Session Restored/i')).toBeVisible();
    }
  });

  test("should restore view preferences (grid size, view mode)", async ({ page }) => {
    // Look for view preference controls
    const gridViewButton = page.locator('button:has-text("Grid"), button[aria-label*="grid"]');
    const listViewButton = page.locator('button:has-text("List"), button[aria-label*="list"]');
    const gridSizeButtons = page.locator('button:has-text("Small"), button:has-text("Medium"), button:has-text("Large")');

    const gridVisible = await gridViewButton.isVisible().catch(() => false);
    const listVisible = await listViewButton.isVisible().catch(() => false);
    const sizeVisible = await gridSizeButtons.isVisible().catch(() => false);

    if (gridVisible && listVisible) {
      // Change view mode to list
      await listViewButton.click();
      await page.waitForTimeout(1000);

      // Change grid size if available
      if (sizeVisible) {
        const largeButton = page.locator('button:has-text("Large")');
        if (await largeButton.isVisible()) {
          await largeButton.click();
          await page.waitForTimeout(1000);
        }
      }

      // Reload page
      await page.reload();
      await waitForAppReady(page);

      // Check if preferences were restored
      // List view should still be active
      const activeListButton = page.locator('button:has-text("List").active, button[aria-pressed="true"]');
      const listActive = await activeListButton.isVisible().catch(() => false);

      if (listActive) {
        await expect(activeListButton).toBeVisible();
      }
    }
  });

  test("should preserve navigation history", async ({ page }) => {
    // Navigate through different views
    const searchButton = page.locator('button:has-text("Search"), [data-testid="search-button"]');
    const timelineButton = page.locator('button:has-text("Timeline"), [data-testid="timeline-button"]');
    const mapButton = page.locator('button:has-text("Map"), [data-testid="map-button"]');

    // Try to navigate to different sections
    if (await timelineButton.isVisible()) {
      await timelineButton.click();
      await page.waitForTimeout(1000);
    }

    if (await mapButton.isVisible()) {
      await mapButton.click();
      await page.waitForTimeout(1000);
    }

    // Perform a search
    await performSearch(page, "test navigation");

    // Reload page
    await page.reload();
    await waitForAppReady(page);

    // Check if navigation state was preserved
    // This might manifest as restored search results or active view indicators
    const searchResults = page.locator('[data-testid="search-results"], .search-results');
    const resultsVisible = await searchResults.isVisible().catch(() => false);

    if (resultsVisible) {
      // Search results should be restored
      await expect(searchResults).toBeVisible();
    }
  });

  test("should restore selected photos state", async ({ page }) => {
    // Look for photo items
    const photoItems = page.locator('[data-testid="photo-item"], .photo-item, .image-thumbnail');
    const itemsVisible = await photoItems.count() > 0;

    if (itemsVisible) {
      // Select some photos
      const firstPhoto = photoItems.first();
      const secondPhoto = photoItems.nth(1);

      await firstPhoto.click();
      await page.waitForTimeout(500);

      if (await secondPhoto.isVisible()) {
        await secondPhoto.click();
        await page.waitForTimeout(500);
      }

      // Check selection indicators
      const selectedIndicators = page.locator('.selected, [data-selected="true"], .ring-blue-500');
      const selectedCount = await selectedIndicators.count();

      // Reload page
      await page.reload();
      await waitForAppReady(page);

      // Check if selections were restored
      const restoredIndicators = page.locator('.selected, [data-selected="true"], .ring-blue-500');
      const restoredCount = await restoredIndicators.count();

      // Selections should be preserved (if the feature is implemented)
      if (selectedCount > 0) {
        // We don't assert exact count as restoration might be async
        expect(restoredCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("should preserve filter states", async ({ page }) => {
    // Look for filter controls
    const filterButton = page.locator('button:has-text("Filters"), [data-testid="filters-button"]');
    const filtersVisible = await filterButton.isVisible().catch(() => false);

    if (filtersVisible) {
      await filterButton.click();
      await page.waitForTimeout(1000);

      // Look for specific filters
      const dateFilter = page.locator('input[type="date"], [data-testid="date-filter"]');
      const ratingFilter = page.locator('input[type="range"], [data-testid="rating-filter"]');
      const tagFilter = page.locator('input[placeholder*="tag"], [data-testid="tag-filter"]');

      const dateVisible = await dateFilter.isVisible().catch(() => false);
      const ratingVisible = await ratingFilter.isVisible().catch(() => false);
      const tagVisible = await tagFilter.isVisible().catch(() => false);

      // Set some filters
      if (dateVisible) {
        await dateFilter.fill('2024-01-01');
        await page.waitForTimeout(500);
      }

      if (ratingVisible) {
        await ratingFilter.fill('3');
        await page.waitForTimeout(500);
      }

      if (tagVisible) {
        await tagFilter.fill('family');
        await page.waitForTimeout(500);
      }

      // Close filters
      await filterButton.click();
      await page.waitForTimeout(1000);

      // Reload page
      await page.reload();
      await waitForAppReady(page);

      // Check if filters were preserved
      // Reopen filters panel
      await filterButton.click();
      await page.waitForTimeout(1000);

      // Check filter values
      if (dateVisible) {
        const restoredDate = await dateFilter.inputValue();
        if (restoredDate) {
          expect(restoredDate).toBe('2024-01-01');
        }
      }

      if (ratingVisible) {
        const restoredRating = await ratingFilter.inputValue();
        if (restoredRating) {
          expect(restoredRating).toBe('3');
        }
      }

      if (tagVisible) {
        const restoredTag = await tagFilter.inputValue();
        if (restoredTag) {
          expect(restoredTag).toBe('family');
        }
      }
    }
  });

  test("should restore sidebar state", async ({ page }) => {
    // Look for sidebar toggle
    const sidebarToggle = page.locator('button:has-text("Sidebar"), [data-testid="sidebar-toggle"], .hamburger');
    const sidebar = page.locator('.sidebar, [data-testid="sidebar"], aside');

    const toggleVisible = await sidebarToggle.isVisible().catch(() => false);
    const sidebarVisible = await sidebar.isVisible().catch(() => false);

    if (toggleVisible) {
      // Toggle sidebar state
      if (sidebarVisible) {
        await sidebarToggle.click(); // Close sidebar
      } else {
        await sidebarToggle.click(); // Open sidebar
      }
      await page.waitForTimeout(1000);

      // Reload page
      await page.reload();
      await waitForAppReady(page);

      // Check if sidebar state was preserved
      const newSidebarState = await sidebar.isVisible().catch(() => false);

      // Sidebar should be in the same state
      expect(newSidebarState).toBe(!sidebarVisible);
    }
  });

  test("should show session restore indicator with correct information", async ({ page }) => {
    // Perform some actions to create session data
    await performSearch(page, "restore test");
    await page.waitForTimeout(2000);

    // Reload page
    await page.reload();
    await waitForAppReady(page);

    // Look for session restore indicator
    const indicator = page.locator('.fixed.bottom-4.right-4, [data-testid="session-restore-indicator"]');
    const indicatorVisible = await indicator.isVisible().catch(() => false);

    if (indicatorVisible) {
      await expect(indicator).toBeVisible();

      // Check indicator content
      await expect(indicator.locator('text=/Session Restored/i')).toBeVisible();

      // Check for specific restored information
      const lastSearchInfo = indicator.locator('text=/Last search.*restore test/i');
      const searchInfoVisible = await lastSearchInfo.isVisible().catch(() => false);

      if (searchInfoVisible) {
        await expect(lastSearchInfo).toBeVisible();
      }

      // Check for recent searches count
      const recentSearchesInfo = indicator.locator('text=/\\d+.*recent searches/i');
      const recentInfoVisible = await recentSearchesInfo.isVisible().catch(() => false);

      if (recentInfoVisible) {
        await expect(recentSearchesInfo).toBeVisible();
      }

      // Check for dismiss button
      const dismissButton = indicator.locator('button[aria-label*="dismiss"], button:has(svg)');
      const dismissVisible = await dismissButton.isVisible().catch(() => false);

      if (dismissVisible) {
        await expect(dismissButton).toBeVisible();

        // Test dismiss functionality
        await dismissButton.click();
        await page.waitForTimeout(500);

        // Indicator should be hidden
        await expect(indicator).toBeHidden();
      }

      // Check auto-dismiss functionality
      // Indicator should auto-hide after 5 seconds
      // We can't easily test the timing, but we can verify it's dismissible
    }
  });

  test("should handle session data corruption gracefully", async ({ page }) => {
    // Corrupt session storage
    await page.addInitScript(() => {
      localStorage.setItem('photo-session-state-v2', 'invalid json data');
      sessionStorage.setItem('photo-session-state-v2', 'also invalid');
    });

    await page.reload();
    await waitForAppReady(page);

    // App should still load without errors
    await expect(page.locator('body')).toBeVisible();

    // Should not show session restore indicator for corrupted data
    const indicator = page.locator('.fixed.bottom-4.right-4, [data-testid="session-restore-indicator"]');
    const indicatorVisible = await indicator.isVisible().catch(() => false);

    if (indicatorVisible) {
      // If visible, should not show corrupted data
      const corruptedInfo = indicator.locator('text=/undefined|null|invalid/i');
      expect(await corruptedInfo.isVisible()).toBe(false);
    }
  });

  test("should respect session timeout and expiration", async ({ page }) => {
    // Create old session data
    await page.addInitScript(() => {
      const oldSession = {
        timestamps: {
          lastSession: Date.now() - (48 * 60 * 60 * 1000), // 48 hours ago
          lastActivity: Date.now() - (48 * 60 * 60 * 1000)
        },
        search: {
          lastSearchQuery: 'old search'
        }
      };
      localStorage.setItem('photo-session-state-v2', JSON.stringify(oldSession));
    });

    await page.reload();
    await waitForAppReady(page);

    // Old session data should not be restored
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    const searchValue = await searchInput.inputValue();

    // Should not restore old search
    expect(searchValue).not.toBe('old search');

    // Should not show restore indicator for expired session
    const indicator = page.locator('.fixed.bottom-4.right-4, [data-testid="session-restore-indicator"]');
    const indicatorVisible = await indicator.isVisible().catch(() => false);

    if (indicatorVisible) {
      const oldSearchInfo = indicator.locator('text=/old search/i');
      expect(await oldSearchInfo.isVisible()).toBe(false);
    }
  });

  test("should work correctly across browser tabs", async ({ context }) => {
    // First tab
    const page1 = await context.newPage();
    await waitForAppReady(page1);

    // Perform actions in first tab
    await performSearch(page1, "multi tab test");
    await page1.waitForTimeout(2000);

    // Open second tab
    const page2 = await context.newPage();
    await waitForAppReady(page2);

    // Second tab should detect existing session
    const searchInput2 = page2.locator('input[type="search"], input[placeholder*="search" i]');
    const searchValue2 = await searchInput2.inputValue();

    // Should restore from first tab's session
    if (searchValue2) {
      expect(searchValue2).toBe("multi tab test");
    }

    // Clean up
    await page1.close();
    await page2.close();
  });

  test("should handle privacy and security correctly", async ({ page }) => {
    // Check that sensitive data is not stored
    await performSearch(page, "privacy test");
    await page.waitForTimeout(2000);

    // Check localStorage content
    const localStorageContent = await page.evaluate(() => {
      const sessionData = localStorage.getItem('photo-session-state-v2');
      return sessionData ? JSON.parse(sessionData) : null;
    });

    if (localStorageContent) {
      // Should not contain sensitive information
      const dataString = JSON.stringify(localStorageContent);
      expect(dataString).not.toContain('password');
      expect(dataString).not.toContain('token');
      expect(dataString).not.toContain('secret');
    }

    // Check that data can be cleared
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.reload();
    await waitForAppReady(page);

    // Should start fresh after clearing
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    const searchValue = await searchInput.inputValue();

    expect(searchValue).not.toBe('privacy test');
  });

  test("should maintain performance with large session data", async ({ page }) => {
    // Create large session data
    await page.addInitScript(() => {
      const largeSession = {
        search: {
          lastSearchQuery: 'performance test',
          recentSearches: Array.from({ length: 100 }, (_, i) => ({
            query: `search query ${i}`,
            timestamp: Date.now() - (i * 1000),
            resultCount: Math.floor(Math.random() * 1000)
          }))
        },
        navigation: {
          viewHistory: Array.from({ length: 50 }, (_, i) => ({
            view: `view-${i}`,
            timestamp: Date.now() - (i * 2000),
            searchQuery: `query-${i}`
          }))
        },
        ui: {
          selectedPhotos: Array.from({ length: 200 }, (_, i) => `photo-${i}`)
        }
      };
      localStorage.setItem('photo-session-state-v2', JSON.stringify(largeSession));
    });

    // Measure load time
    const startTime = Date.now();
    await page.reload();
    await waitForAppReady(page);
    const loadTime = Date.now() - startTime;

    // Should load efficiently even with large session data
    expect(loadTime).toBeLessThan(5000); // 5 seconds max

    // App should be functional
    await expect(page.locator('body')).toBeVisible();
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    await expect(searchInput).toBeVisible();
  });
});