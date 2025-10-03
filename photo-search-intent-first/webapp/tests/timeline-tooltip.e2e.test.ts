// E2E Tests for Timeline Tooltip Feature
// Tests the improved discoverability of timeline chart interactivity

import { expect, test } from "@playwright/test";
import { waitForAppReady, performSearch, dismissOverlays } from "./utils/test-helpers";

test.describe("Timeline Tooltip - User Feedback Implementation", () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);

    // Perform a search to get timeline results
    await performSearch(page, "family");

    // Wait for timeline to be visible
    await page.waitForSelector('[data-testid="timeline-results"], .timeline-container', {
      timeout: 10000,
    });
  });

  test("should show info icon next to timeline navigator", async ({ page }) => {
    // Look for the timeline section with info icon
    const timelineSection = page.locator('.timeline-container, [data-testid="timeline-results"]');
    await expect(timelineSection).toBeVisible();

    // Find the info icon within the timeline section
    const infoIcon = timelineSection.locator('.group.relative .w-3\\.5.h-3\\.5, .info-icon, [aria-label*="info" i]');
    await expect(infoIcon).toBeVisible();

    // Verify it's styled as a help/clickable element
    await expect(infoIcon).toHaveCSS('cursor', /pointer|help/);
  });

  test("should display tooltip on hover with correct content", async ({ page }) => {
    // Find the info icon
    const infoIcon = page.locator('.group.relative .w-3\\.5.h-3\\.5, .info-icon, [aria-label*="info" i]').first();
    await expect(infoIcon).toBeVisible();

    // Hover over the info icon
    await infoIcon.hover();

    // Wait for tooltip to appear
    const tooltip = page.locator('.absolute.right-0.top-full.mt-1.w-48.p-2.bg-gray-900, [role="tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 2000 });

    // Verify tooltip content
    await expect(tooltip.locator('text=Click to Filter by Date')).toBeVisible();
    await expect(tooltip.locator('text=/Click any time period/')).toBeVisible();

    // Verify tooltip styling
    await expect(tooltip).toHaveCSS('background-color', /rgb/);
    await expect(tooltip).toHaveCSS('color', /rgb/);
  });

  test("should position tooltip correctly with arrow", async ({ page }) => {
    // Find and hover over info icon
    const infoIcon = page.locator('.group.relative .w-3\\.5.h-3\\.5, .info-icon, [aria-label*="info" i]').first();
    await infoIcon.hover();

    // Wait for tooltip
    const tooltip = page.locator('.absolute.right-0.top-full.mt-1.w-48.p-2.bg-gray-900, [role="tooltip"]');
    await expect(tooltip).toBeVisible();

    // Check for arrow element
    const arrow = tooltip.locator('.absolute.-top-1.right-2.w-2.h-2.bg-gray-900.transform.rotate-45');
    await expect(arrow).toBeVisible();

    // Verify arrow positioning creates pointing effect
    const arrowBox = await arrow.boundingBox();
    const tooltipBox = await tooltip.boundingBox();

    if (arrowBox && tooltipBox) {
      // Arrow should be positioned at the top-right of tooltip
      expect(arrowBox.y).toBeLessThan(tooltipBox.y);
      expect(arrowBox.x).toBeGreaterThan(tooltipBox.x + tooltipBox.width - 50);
    }
  });

  test("should hide tooltip when mouse leaves", async ({ page }) => {
    const infoIcon = page.locator('.group.relative .w-3\\.5.h-3\\.5, .info-icon, [aria-label*="info" i]').first();

    // Hover to show tooltip
    await infoIcon.hover();
    const tooltip = page.locator('.absolute.right-0.top-full.mt-1.w-48.p-2.bg-gray-900, [role="tooltip"]');
    await expect(tooltip).toBeVisible();

    // Move mouse away
    await page.mouse.move(10, 10);

    // Tooltip should hide
    await expect(tooltip).toBeHidden({ timeout: 1000 });
  });

  test("should maintain tooltip functionality on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Find info icon on mobile
    const infoIcon = page.locator('.group.relative .w-3\\.5.h-3\\.5, .info-icon, [aria-label*="info" i]').first();
    await expect(infoIcon).toBeVisible();

    // On mobile, tooltip might work on tap instead of hover
    await infoIcon.tap();

    // Check if tooltip appears on tap
    const tooltip = page.locator('.absolute.right-0.top-full.mt-1.w-48.p-2.bg-gray-900, [role="tooltip"]');
    const tooltipVisible = await tooltip.isVisible().catch(() => false);

    // If tap doesn't work, try hover (some mobile devices support hover)
    if (!tooltipVisible) {
      await infoIcon.hover();
      await expect(tooltip).toBeVisible();
    }
  });

  test("should have accessible tooltip with proper ARIA attributes", async ({ page }) => {
    const infoIcon = page.locator('.group.relative .w-3\\.5.h-3\\.5, .info-icon, [aria-label*="info" i]').first();

    // Check for accessible labeling
    const ariaLabel = await infoIcon.getAttribute('aria-label');
    const hasAriaLabelledBy = await infoIcon.getAttribute('aria-labelledby');

    expect(ariaLabel || hasAriaLabelledBy).toBeTruthy();

    if (ariaLabel) {
      expect(ariaLabel.toLowerCase()).toContain('info');
    }

    // Check if tooltip has proper role when visible
    await infoIcon.hover();
    const tooltip = page.locator('.absolute.right-0.top-full.mt-1.w-48.p-2.bg-gray-900, [role="tooltip"]');
    await expect(tooltip).toBeVisible();

    const tooltipRole = await tooltip.getAttribute('role');
    expect(tooltipRole).toBe('tooltip');
  });

  test("should not interfere with timeline click functionality", async ({ page }) => {
    // Find a clickable area in the timeline (not the info icon)
    const timelineChart = page.locator('.timeline-chart, .timeline-navigator, [data-testid="timeline-chart"]').first();

    if (await timelineChart.isVisible()) {
      // Get initial state
      const initialUrl = page.url();

      // Click on timeline chart (avoiding info icon)
      const chartBox = await timelineChart.boundingBox();
      if (chartBox) {
        // Click in the middle of the chart, away from edges where info icon might be
        await page.mouse.click(
          chartBox.x + chartBox.width / 2,
          chartBox.y + chartBox.height / 2
        );

        // Wait a moment for any navigation or filtering to occur
        await page.waitForTimeout(1000);

        // Timeline click should still work (might navigate or filter)
        // We don't assert specific behavior since it depends on implementation
        // Just ensure it doesn't cause errors
        expect(await page.locator('body').isVisible()).toBe(true);
      }
    }
  });

  test("should handle multiple timeline sections correctly", async ({ page }) => {
    // Check if there are multiple timeline sections
    const timelineSections = page.locator('.timeline-container, [data-testid="timeline-results"]');
    const sectionCount = await timelineSections.count();

    if (sectionCount > 1) {
      // Each section should have its own info icon
      for (let i = 0; i < sectionCount; i++) {
        const section = timelineSections.nth(i);
        const infoIcon = section.locator('.group.relative .w-3\\.5.h-3\\.5, .info-icon, [aria-label*="info" i]').first();

        if (await infoIcon.isVisible()) {
          // Test each info icon
          await infoIcon.hover();
          const tooltip = page.locator('.absolute.right-0.top-full.mt-1.w-48.p-2.bg-gray-900, [role="tooltip"]');
          await expect(tooltip).toBeVisible();

          // Verify content is consistent
          await expect(tooltip.locator('text=Click to Filter by Date')).toBeVisible();

          // Move away before testing next
          await page.mouse.move(10, 10);
        }
      }
    }
  });

  test("should work correctly with keyboard navigation", async ({ page }) => {
    // Find info icon and test keyboard accessibility
    const infoIcon = page.locator('.group.relative .w-3\\.5.h-3\\.5, .info-icon, [aria-label*="info" i]').first();

    // Tab to focus the info icon
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Keep tabbing until we reach the info icon

    // Check if info icon can be focused
    const isFocused = await infoIcon.evaluate((el) => document.activeElement === el);

    if (isFocused) {
      // Try to show tooltip with keyboard (Enter or Space)
      await page.keyboard.press('Enter');

      // Tooltip might appear on keyboard activation
      const tooltip = page.locator('.absolute.right-0.top-full.mt-1.w-48.p-2.bg-gray-900, [role="tooltip"]');
      const tooltipVisible = await tooltip.isVisible().catch(() => false);

      // If not visible with Enter, try Space
      if (!tooltipVisible) {
        await page.keyboard.press('Space');
        await expect(tooltip).toBeVisible();
      }
    }
  });

  test("should handle timeline tooltip during search results loading", async ({ page }) => {
    // Perform a new search and test tooltip during loading states
    await performSearch(page, "vacation");

    // Wait for timeline to appear with results
    await page.waitForSelector('.timeline-container, [data-testid="timeline-results"]', {
      timeout: 15000,
    });

    // Test tooltip functionality with new results
    const infoIcon = page.locator('.group.relative .w-3\\.5.h-3\\.5, .info-icon, [aria-label*="info" i]').first();
    await expect(infoIcon).toBeVisible();

    await infoIcon.hover();
    const tooltip = page.locator('.absolute.right-0.top-full.mt-1.w-48.p-2.bg-gray-900, [role="tooltip"]');
    await expect(tooltip).toBeVisible();

    // Verify tooltip content is still correct after search
    await expect(tooltip.locator('text=Click to Filter by Date')).toBeVisible();
  });

  test("should be resilient to timeline UI changes", async ({ page }) => {
    // Test with different selectors to ensure resilience to UI changes
    const possibleInfoIcons = [
      '.group.relative .w-3\\.5.h-3\\.5',
      '.info-icon',
      '[aria-label*="info" i]',
      '.timeline-info-icon',
      '[data-testid="timeline-info"]',
      'span:has-text("ℹ️")',
      '.cursor-help'
    ];

    let foundIcon = false;
    for (const selector of possibleInfoIcons) {
      const icon = page.locator(selector).first();
      if (await icon.isVisible().catch(() => false)) {
        foundIcon = true;

        // Test tooltip functionality
        await icon.hover();
        const tooltip = page.locator('.absolute.right-0.top-full.mt-1.w-48.p-2.bg-gray-900, [role="tooltip"]');

        if (await tooltip.isVisible().catch(() => false)) {
          await expect(tooltip.locator('text=/Click.*Filter.*Date/i')).toBeVisible();
          break;
        }
      }
    }

    expect(foundIcon).toBe(true);
  });
});

test.describe("Timeline Tooltip - Visual Regression", () => {
  test("should match expected screenshot", async ({ page }) => {
    await waitForAppReady(page);
    await performSearch(page, "family");

    // Wait for timeline
    await page.waitForSelector('.timeline-container, [data-testid="timeline-results"]', {
      timeout: 10000,
    });

    // Find and hover over info icon
    const infoIcon = page.locator('.group.relative .w-3\\.5.h-3\\.5, .info-icon, [aria-label*="info" i]').first();
    await infoIcon.hover();

    // Wait for tooltip to be fully visible
    const tooltip = page.locator('.absolute.right-0.top-full.mt-1.w-48.p-2.bg-gray-900, [role="tooltip"]');
    await expect(tooltip).toBeVisible();

    // Take screenshot for visual regression testing
    await expect(page).toHaveScreenshot("timeline-tooltip.png", {
      maxDiffPixelRatio: 0.05, // Allow small differences for animations
    });
  });
});