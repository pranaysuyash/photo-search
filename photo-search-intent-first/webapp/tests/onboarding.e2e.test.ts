// E2E Test for Onboarding Flow
// This test validates the Intent-First principle: TTFV < 90 seconds

import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow - Intent-First Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate first-time user
    await page.addInitScript(() => {
      localStorage.clear();
    });
    
    // Navigate to app
    await page.goto('http://localhost:5173');
  });

  test('should complete onboarding in under 90 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    // Step 1: Welcome modal should appear for new users
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Welcome to PhotoVault')).toBeVisible();
    
    // Click "Get Started" to begin onboarding
    await page.click('button:has-text("Get Started")');
    
    // Step 2: Choose folder step
    await expect(page.locator('text=Choose Your Photo Library')).toBeVisible();
    
    // Use demo photos for quick start
    await page.click('button:has-text("Use Demo Photos")');
    
    // Step 3: Wait for indexing to start
    await expect(page.locator('text=Indexing your photos')).toBeVisible({ timeout: 10000 });
    
    // Step 4: Complete onboarding
    await page.click('button:has-text("Start Exploring")');
    
    // Verify main interface is loaded
    await expect(page.locator('.search-bar-container')).toBeVisible();
    
    // Verify first meaningful interaction - search bar is ready
    const searchInput = page.locator('input[placeholder*="Try"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();
    
    // Calculate time to first value
    const endTime = Date.now();
    const ttfv = (endTime - startTime) / 1000;
    
    console.log(`TTFV: ${ttfv} seconds`);
    
    // CRITICAL: Intent-First validation - must be under 90 seconds
    expect(ttfv).toBeLessThan(90);
  });

  test('should show progress indicators during onboarding', async ({ page }) => {
    // Start onboarding
    await page.click('button:has-text("Get Started")');
    
    // Verify step indicators are visible
    await expect(page.locator('.onboarding-steps')).toBeVisible();
    
    // Verify current step is highlighted
    const activeStep = page.locator('.step-active');
    await expect(activeStep).toHaveCount(1);
    
    // Progress through steps
    await page.click('button:has-text("Use Demo Photos")');
    
    // Verify progress updates
    await expect(page.locator('.step-completed')).toHaveCount(1);
  });

  test('should handle interruptions gracefully', async ({ page }) => {
    // Start onboarding
    await page.click('button:has-text("Get Started")');
    
    // Close modal (simulate interruption)
    await page.keyboard.press('Escape');
    
    // Verify modal closes
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Verify onboarding resumes
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Welcome back!')).toBeVisible();
  });

  test('should provide clear CTAs at each step', async ({ page }) => {
    // Start onboarding
    await page.click('button:has-text("Get Started")');
    
    // Step 1: Choose folder
    const chooseFolderBtn = page.locator('button:has-text("Choose Folder")');
    const useDemoBtn = page.locator('button:has-text("Use Demo Photos")');
    
    await expect(chooseFolderBtn).toBeVisible();
    await expect(useDemoBtn).toBeVisible();
    
    // Both buttons should be clearly styled
    await expect(chooseFolderBtn).toHaveCSS('background-color', /rgb/);
    await expect(useDemoBtn).toHaveCSS('background-color', /rgb/);
    
    // Click demo photos
    await useDemoBtn.click();
    
    // Step 2: Processing
    await expect(page.locator('text=Indexing')).toBeVisible();
    
    // Step 3: Complete
    const startBtn = page.locator('button:has-text("Start Exploring")');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();
  });

  test('should show helpful tooltips and guidance', async ({ page }) => {
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
    await expect(page.locator('text=/Choose where your photos are stored/')).toBeVisible();
  });

  test('should handle errors during onboarding', async ({ page }) => {
    // Mock API error
    await page.route('**/api/index', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    // Start onboarding
    await page.click('button:has-text("Get Started")');
    await page.click('button:has-text("Use Demo Photos")');
    
    // Verify error handling
    await expect(page.locator('text=/error|failed|problem/i')).toBeVisible({ timeout: 10000 });
    
    // Verify retry option is available
    await expect(page.locator('button:has-text("Try Again")').or(page.locator('button:has-text("Retry")'))).toBeVisible();
  });

  test('should remember progress on page refresh', async ({ page }) => {
    // Start onboarding
    await page.click('button:has-text("Get Started")');
    await page.click('button:has-text("Use Demo Photos")');
    
    // Wait for processing to start
    await expect(page.locator('text=Indexing')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Verify progress is maintained
    await expect(page.locator('text=Indexing').or(page.locator('text=Processing'))).toBeVisible();
  });

  test('should skip onboarding for returning users', async ({ page }) => {
    // Complete onboarding first
    await page.click('button:has-text("Get Started")');
    await page.click('button:has-text("Use Demo Photos")');
    await page.waitForSelector('button:has-text("Start Exploring")', { timeout: 30000 });
    await page.click('button:has-text("Start Exploring")');
    
    // Verify main app loads
    await expect(page.locator('.search-bar-container')).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Verify onboarding doesn't show again
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator('.search-bar-container')).toBeVisible();
  });

  test('should provide keyboard navigation', async ({ page }) => {
    // Start onboarding
    await page.click('button:has-text("Get Started")');
    
    // Navigate with Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Activate with Enter
    await page.keyboard.press('Enter');
    
    // Verify progression
    await expect(page.locator('text=Indexing').or(page.locator('text=Processing'))).toBeVisible({ timeout: 10000 });
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to app
    await page.goto('http://localhost:5173');
    
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
    await page.waitForSelector('button:has-text("Start Exploring")', { timeout: 30000 });
    await page.click('button:has-text("Start Exploring")');
    
    // Verify mobile interface loads
    await expect(page.locator('.search-bar-container')).toBeVisible();
  });
});

// Performance metrics test
test.describe('Onboarding Performance Metrics', () => {
  test('should measure key performance indicators', async ({ page }) => {
    const metrics = {
      firstPaint: 0,
      firstContentfulPaint: 0,
      domContentLoaded: 0,
      loadComplete: 0,
      ttfv: 0
    };
    
    // Measure performance
    page.on('domcontentloaded', () => {
      metrics.domContentLoaded = Date.now();
    });
    
    page.on('load', () => {
      metrics.loadComplete = Date.now();
    });
    
    const startTime = Date.now();
    await page.goto('http://localhost:5173');
    
    // Get browser performance metrics
    const perfData = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        firstPaint: perf.responseEnd,
        firstContentfulPaint: perf.responseEnd + 100, // Approximate
        domContentLoaded: perf.domContentLoadedEventEnd,
        loadComplete: perf.loadEventEnd
      };
    });
    
    // Complete onboarding quickly
    await page.click('button:has-text("Get Started")');
    await page.click('button:has-text("Use Demo Photos")');
    await page.waitForSelector('button:has-text("Start Exploring")', { timeout: 30000 });
    await page.click('button:has-text("Start Exploring")');
    
    // Wait for search bar (first valuable interaction)
    await page.locator('input[placeholder*="Try"]').waitFor();
    metrics.ttfv = (Date.now() - startTime) / 1000;
    
    // Log all metrics
    console.log('Performance Metrics:');
    console.log(`- First Paint: ${perfData.firstPaint}ms`);
    console.log(`- First Contentful Paint: ${perfData.firstContentfulPaint}ms`);
    console.log(`- DOM Content Loaded: ${perfData.domContentLoaded}ms`);
    console.log(`- Load Complete: ${perfData.loadComplete}ms`);
    console.log(`- Time to First Value: ${metrics.ttfv}s`);
    
    // Validate Intent-First metrics
    expect(metrics.ttfv).toBeLessThan(90);
    expect(perfData.firstContentfulPaint).toBeLessThan(3000);
  });
});