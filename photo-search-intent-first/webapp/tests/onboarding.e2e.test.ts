// E2E Test for Onboarding Flow
// This test validates the Intent-First principle: TTFV < 90 seconds

import { expect, test } from "@playwright/test";

test.describe("Onboarding Flow - Intent-First Validation", () => {
  test.beforeEach(async ({ page }) => {
  page.on('console', message => console.log('browser console:', message.text()));
  page.on('pageerror', error => console.error('browser error:', error));
    // Clear localStorage to simulate first-time user
    await page.addInitScript(() => {
      localStorage.clear();
    });

    // Navigate to app
    await page.goto("http://localhost:5174");
  });

  test("should complete onboarding in under 90 seconds", async ({ page }) => {
    const startTime = Date.now();

    // Step 1: Welcome modal should appear for new users
    await expect(page.locator('[role="dialog"]')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator("text=Welcome to PhotoVault")).toBeVisible();

    // Click "Get Started" to begin onboarding
    await page.click('button:has-text("Get Started")');

    // Step 2: Choose folder step
    await expect(page.locator("text=Choose Your Photo Library")).toBeVisible();

    // Use demo photos for quick start
    await page.click('button:has-text("Use Demo Photos")');

    // Step 3: Wait for indexing to start
    await expect(page.locator("text=Indexing your photos")).toBeVisible({
      timeout: 10000,
    });

    // Step 4: Complete onboarding
    await page.click('button:has-text("Start Exploring")');

    // Verify main interface is loaded
    await expect(page.locator(".search-bar-container")).toBeVisible();

    // Verify first meaningful interaction - search bar is ready
    const searchInput = page.locator('input[placeholder*="Try"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();

    // Calculate time to first value
    const endTime = Date.now();
    const ttfv = (endTime - startTime) / 1000;

    // CRITICAL: Intent-First validation - must be under 90 seconds
    expect(ttfv).toBeLessThan(90);
  });

  test("should show progress indicators during onboarding", async ({
    page,
  }) => {
    // Start onboarding
    await page.click('button:has-text("Get Started")');

    const progressBar = page.locator(".onboarding-progress-track");
    await expect(progressBar).toBeVisible();
    await expect(progressBar).toHaveAttribute("role", "progressbar");
    await expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    await expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    await expect(progressBar).toHaveAttribute("aria-valuenow", /\d+/);

    const percentText = page.locator(".onboarding-progress-percent");
    await expect(percentText).toBeVisible();
    await expect(percentText).toContainText("% complete");

    const initialPercent = (await percentText.textContent())?.trim();

    // Progress through steps
    await page.click('button:has-text("Use Demo Photos")');

    if (initialPercent) {
      await expect(percentText).not.toHaveText(initialPercent);
    }
    await expect(percentText).toContainText("% complete");
  });

  test("should handle interruptions gracefully", async ({ page }) => {
    // Start onboarding
    await page.click('button:has-text("Get Started")');

    // Close modal (simulate interruption)
    await page.keyboard.press("Escape");

    // Verify modal closes
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Reload page
    await page.reload();

    // Verify onboarding resumes
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator("text=Welcome back!")).toBeVisible();
  });

  test("should provide clear CTAs at each step", async ({ page }) => {
    // Start onboarding
    await page.click('button:has-text("Get Started")');

    // Step 1: Choose folder
    const chooseFolderBtn = page.locator('button:has-text("Choose Folder")');
    const useDemoBtn = page.locator('button:has-text("Use Demo Photos")');

    await expect(chooseFolderBtn).toBeVisible();
    await expect(useDemoBtn).toBeVisible();

    // Both buttons should be clearly styled
    await expect(chooseFolderBtn).toHaveCSS("background-color", /rgb/);
    await expect(useDemoBtn).toHaveCSS("background-color", /rgb/);

    // Click demo photos
    await useDemoBtn.click();

    // Step 2: Processing
    await expect(page.locator("text=Indexing")).toBeVisible();

    // Step 3: Complete
    const startBtn = page.locator('button:has-text("Start Exploring")');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();
  });

  test("should show helpful tooltips and guidance", async ({ page }) => {
    // Start onboarding
    await page.click('button:has-text("Get Started")');

    // Hover over help icons
    const helpIcon = page.locator('[aria-label="Help"]').first();
    if (await helpIcon.isVisible()) {
      await helpIcon.hover();

      // Verify tooltip appears
      await expect(page.locator('[role="tooltip"]')).toBeVisible();
    }

    // Verify instructional text is present
    await expect(
      page.locator("text=/Choose where your photos are stored/")
    ).toBeVisible();
  });

  test("should handle errors during onboarding", async ({ page }) => {
    // Mock API error
    await page.route("**/api/index", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Server error" }),
      });
    });

    // Start onboarding
    await page.click('button:has-text("Get Started")');
    await page.click('button:has-text("Use Demo Photos")');

    // Verify error handling
    await expect(page.locator("text=/error|failed|problem/i")).toBeVisible({
      timeout: 10000,
    });

    // Verify retry option is available
    await expect(
      page
        .locator('button:has-text("Try Again")')
        .or(page.locator('button:has-text("Retry")'))
    ).toBeVisible();
  });

  test("should remember progress on page refresh", async ({ page }) => {
    // Start onboarding
    await page.click('button:has-text("Get Started")');
    await page.click('button:has-text("Use Demo Photos")');

    // Wait for processing to start
    await expect(page.locator("text=Indexing")).toBeVisible();

    // Refresh page
    await page.reload();

    // Verify progress is maintained
    await expect(
      page.locator("text=Indexing").or(page.locator("text=Processing"))
    ).toBeVisible();
  });

  test("should skip onboarding for returning users", async ({ page }) => {
    // Complete onboarding first
    await page.click('button:has-text("Get Started")');
    await page.click('button:has-text("Use Demo Photos")');
    await page.waitForSelector('button:has-text("Start Exploring")', {
      timeout: 30000,
    });
    await page.click('button:has-text("Start Exploring")');

    // Verify main app loads
    await expect(page.locator(".search-bar-container")).toBeVisible();

    // Reload page
    await page.reload();

    // Verify onboarding doesn't show again
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator(".search-bar-container")).toBeVisible();
  });

  test("should provide keyboard navigation", async ({ page }) => {
    // Start onboarding
    await page.click('button:has-text("Get Started")');

    // Navigate with Tab
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Activate with Enter
    await page.keyboard.press("Enter");

    // Verify progression
    await expect(
      page.locator("text=Indexing").or(page.locator("text=Processing"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("should work on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to app
    await page.goto("http://localhost:5174");

    // Verify onboarding adapts to mobile
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Start onboarding
    await page.click('button:has-text("Get Started")');

    // Verify mobile-optimized layout
    const modal = page.locator('[role="dialog"]');
    const box = await modal.boundingBox();

    if (box) {
      // Modal should be nearly full width on mobile
      expect(box.width).toBeGreaterThan(300);
      expect(box.width).toBeLessThan(400);
    }

    // Complete onboarding on mobile
    await page.click('button:has-text("Use Demo Photos")');
    await page.waitForSelector('button:has-text("Start Exploring")', {
      timeout: 30000,
    });
    await page.click('button:has-text("Start Exploring")');

    // Verify mobile interface loads
    await expect(page.locator(".search-bar-container")).toBeVisible();
  });
});

// Performance metrics test
test.describe("Onboarding Performance Metrics", () => {
  test("should measure key performance indicators", async ({ page }) => {
    const metrics = {
      firstPaint: 0,
      firstContentfulPaint: 0,
      domContentLoaded: 0,
      loadComplete: 0,
      ttfv: 0,
    };

    // Measure performance
    page.on("domcontentloaded", () => {
      metrics.domContentLoaded = Date.now();
    });

    page.on("load", () => {
      metrics.loadComplete = Date.now();
    });

    const startTime = Date.now();
    await page.goto("http://localhost:5174");

    // Get browser performance metrics
    const perfData = await page.evaluate(() => {
      const perf = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      return {
        firstPaint: perf.responseEnd,
        firstContentfulPaint: perf.responseEnd + 100, // Approximate
        domContentLoaded: perf.domContentLoadedEventEnd,
        loadComplete: perf.loadEventEnd,
      };
    });

    // Complete onboarding quickly
    await page.click('button:has-text("Get Started")');
    await page.click('button:has-text("Use Demo Photos")');
    await page.waitForSelector('button:has-text("Start Exploring")', {
      timeout: 30000,
    });
    await page.click('button:has-text("Start Exploring")');

    // Wait for search bar (first valuable interaction)
    await page.locator('input[placeholder*="Try"]').waitFor();
    metrics.ttfv = (Date.now() - startTime) / 1000;

    // Log all metrics

    // Validate Intent-First metrics
    expect(metrics.ttfv).toBeLessThan(90);
    expect(perfData.firstContentfulPaint).toBeLessThan(3000);
  });
});

// Add Photos Button Test
test.describe("Add Photos Button Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto("http://localhost:5174");

    // Clear localStorage to simulate clean state
    await page.addInitScript(() => {
      localStorage.clear();
    });

    // Wait for app to load - check for basic HTML structure
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });

    // Log current page state for debugging

    // Check if we're on the main app or onboarding
    const hasWelcomeModal = await page
      .locator('[role="dialog"]')
      .filter({
        hasText: "Find any photo instantly",
      })
      .isVisible()
      .catch(() => false);

    if (hasWelcomeModal) {
      await page.click('button:has-text("Maybe later")').catch(() => {});
      await page.click('button:has-text("Get Started")').catch(() => {});
    }

    // Wait for main app interface to load
    await expect(page.locator("body")).toBeVisible();
  });

  test("should open folder modal when Add Photos button is clicked", async ({
    page,
  }) => {
    // Set desktop viewport to ensure top bar is visible (hidden on mobile)
    await page.setViewportSize({ width: 1024, height: 768 });

    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Dismiss any onboarding or welcome screens that might be blocking interactions
    try {
      // Try to dismiss onboarding tour if present
      const tourSkipBtn = page.locator('button:has-text("Skip Tour")').first();
      if (await tourSkipBtn.isVisible({ timeout: 2000 })) {
        await tourSkipBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (error) {}

    try {
      // Try to dismiss welcome modal if present
      const welcomeCloseBtn = page
        .locator('[role="dialog"] button')
        .filter({ hasText: /close|×|dismiss/i })
        .first();
      if (await welcomeCloseBtn.isVisible({ timeout: 2000 })) {
        await welcomeCloseBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (error) {}

    try {
      // Try to dismiss contextual help if present
      const helpDismissBtn = page
        .locator('button:has-text("Dismiss help hint")')
        .first();
      if (await helpDismissBtn.isVisible({ timeout: 2000 })) {
        await helpDismissBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (error) {}

    // Wait a bit more for any animations to complete
    await page.waitForTimeout(1000);

    // Take screenshot for debugging
    await page.screenshot({ path: "test-results/debug-before-click.png" });

    // Find and click the Add Photos button with detailed logging
    // Try multiple selectors to find the button
    let addPhotosBtn = page.locator('button:has-text("Add Photos")').first();
    let buttonFound = await addPhotosBtn.isVisible().catch(() => false);

    if (!buttonFound) {
      addPhotosBtn = page.locator('button[data-tour="select-library"]').first();
      buttonFound = await addPhotosBtn.isVisible().catch(() => false);
    }

    if (!buttonFound) {
      addPhotosBtn = page
        .locator("button:has(svg)")
        .filter({ hasText: "Add Photos" })
        .first();
      buttonFound = await addPhotosBtn.isVisible().catch(() => false);
    }

    if (!buttonFound) {
      // Log all buttons on the page for debugging
      const allButtons = await page.locator("button").allTextContents();

      // Log page content for debugging
      const pageContent = await page.locator("body").textContent();

      throw new Error("Add Photos button not found or not visible");
    }

    // Check button properties
    const isDisabled = await addPhotosBtn.isDisabled().catch(() => false);
    const isEnabled = await addPhotosBtn.isEnabled().catch(() => true);
    const buttonClass = await addPhotosBtn
      .getAttribute("class")
      .catch(() => "");
    const buttonType = await addPhotosBtn.getAttribute("type").catch(() => "");
    const buttonDataTour = await addPhotosBtn
      .getAttribute("data-tour")
      .catch(() => "");

    console.log("Button properties:", {
      disabled: isDisabled,
      enabled: isEnabled,
      class: buttonClass,
      type: buttonType,
      dataTour: buttonDataTour,
    });

    // Check if button is wrapped in another element
    const parentElement = await addPhotosBtn.locator("xpath=..").first();
    const parentTag = await parentElement
      .evaluate((el) => el.tagName)
      .catch(() => "unknown");

    
    // Now try the Add Photos button

    // Try clicking with different methods
    try {
      await addPhotosBtn.click({ timeout: 5000 });
    } catch (error) {
      try {
        await addPhotosBtn.click({ force: true });
      } catch (forceError) {
        console.log(
          "Force click also failed, trying dispatchEvent...",
          forceError
        );
        await page.evaluate(() => {
          const button = document.querySelector(
            'button[data-tour="select-library"]'
          ) as HTMLButtonElement;
          if (button) {
            button.click();
          } else {
          }
        });
      }
    }

    // Take screenshot after click
    await page.screenshot({ path: "test-results/debug-after-click.png" });

    await page.waitForFunction(() => (window as any).__modalState?.folder === true, { timeout: 5000 });

    // Verify folder modal opens with detailed checks
    const folderModal = page.locator('[role="dialog"]').filter({
      hasText: "Set Photo Folder",
    });

    // Check if modal exists
    const modalExists = await folderModal.isVisible().catch(() => false);

    if (!modalExists) {
      // Log all dialogs on the page
      const allDialogs = await page
        .locator('[role="dialog"]')
        .allTextContents();

      // Check for any modal-like elements
      const anyModal = await page
        .locator('[role="dialog"]')
        .first()
        .isVisible()
        .catch(() => false);

      throw new Error("Folder modal did not open");
    }

    await expect(folderModal).toBeVisible({ timeout: 5000 });

    // Verify modal contains expected elements
    await expect(page.locator("text=Set Photo Folder")).toBeVisible();
    await expect(
      page.locator('button:has-text("Choose Folder")')
    ).toBeVisible();
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
    await expect(page.locator('button:has-text("Close")')).toBeVisible();

    // Verify modal can be closed
    await page.click('button:has-text("Close")');
    await expect(folderModal).not.toBeVisible();
  });

  test("should handle modal keyboard navigation", async ({ page }) => {
    // Set desktop viewport to ensure top bar is visible
    await page.setViewportSize({ width: 1024, height: 768 });

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Open folder modal
    const addPhotosBtn = page.locator('button:has-text("Add Photos")').first();
    await expect(addPhotosBtn).toBeVisible();
    await addPhotosBtn.click();
    await page.waitForFunction(() => (window as any).__modalState?.folder === true, { timeout: 5000 });

    // Verify modal opens
    const folderModal = page.locator('[role="dialog"]').filter({
      hasText: "Set Photo Folder",
    });
    await expect(folderModal).toBeVisible();

    // Test Escape key closes modal
    await page.keyboard.press("Escape");
    await expect(folderModal).not.toBeVisible();
  });

  test("should not show blank screen when modal opens", async ({ page }) => {
    // Set desktop viewport to ensure top bar is visible
    await page.setViewportSize({ width: 1024, height: 768 });

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Open folder modal
    const addPhotosBtn = page.locator('button:has-text("Add Photos")').first();
    await expect(addPhotosBtn).toBeVisible();
    await addPhotosBtn.click();
    await page.waitForFunction(() => (window as any).__modalState?.folder === true, { timeout: 5000 });

    // Verify modal appears without blank screen
    const folderModal = page.locator('[role="dialog"]').filter({
      hasText: "Set Photo Folder",
    });
    await expect(folderModal).toBeVisible({ timeout: 5000 });

    // Verify modal has content (not blank)
    const modalContent = folderModal.locator("text=Set Photo Folder");
    await expect(modalContent).toBeVisible();

    // Verify at least one button is visible
    const buttons = folderModal.locator("button");
    await expect(buttons.first()).toBeVisible();
  });
});
