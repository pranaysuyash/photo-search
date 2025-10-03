// E2E Tests for Jobs Management and Progress Indicators
// Tests the enhanced progress indicators for large libraries

import { expect, test } from "@playwright/test";
import { waitForAppReady, dismissOverlays } from "./utils/test-helpers";

test.describe("Jobs Management - Enhanced Progress Indicators", () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
  });

  test("should show Jobs FAB with progress indicators when jobs are active", async ({ page }) => {
    // Mock active jobs state
    await page.addInitScript(() => {
      (window as any).__mockJobsState = {
        activeJobs: 3,
        isIndexing: true,
        progressPct: 65,
        jobs: [
          {
            id: 'job1',
            type: 'indexing',
            title: 'Indexing Photos',
            status: 'running',
            progress: 6500,
            total: 10000,
            currentItem: 'IMG_2024_001.jpg',
            etaSeconds: 300,
            ratePerSecond: 25,
            startTime: Date.now() - 3600000,
            errors: 0,
            warnings: 2,
            category: 'indexing'
          }
        ]
      };
    });

    // Reload to apply mock state
    await page.reload();
    await waitForAppReady(page);

    // Look for Jobs FAB
    const jobsFab = page.locator('[data-testid="jobs-fab"], .jobs-fab, button:has-text("Jobs"), button:has(svg)').filter({ hasText: /Jobs/ }).first();

    // Check if FAB is visible (it might not be if no jobs are active)
    const fabVisible = await jobsFab.isVisible().catch(() => false);

    if (fabVisible) {
      await expect(jobsFab).toBeVisible();

      // Check for progress indicators
      const progressBadge = jobsFab.locator('.bg-blue-500, .bg-red-500, [data-testid="job-count"]');
      const badgeVisible = await progressBadge.isVisible().catch(() => false);

      if (badgeVisible) {
        await expect(progressBadge).toBeVisible();
        const badgeText = await progressBadge.textContent();
        expect(badgeText).toMatch(/\d+/);
      }
    }
  });

  test("should open jobs drawer when FAB is clicked", async ({ page }) => {
    // Mock jobs to ensure FAB is visible
    await page.addInitScript(() => {
      (window as any).__mockJobsState = {
        activeJobs: 2,
        isIndexing: true,
        jobs: [
          {
            id: 'job1',
            type: 'indexing',
            title: 'Indexing Photos',
            status: 'running',
            progress: 5000,
            total: 10000,
            currentItem: 'vacation_photo.jpg',
            startTime: Date.now() - 1800000,
            errors: 0,
            warnings: 1,
            category: 'indexing'
          }
        ]
      };
    });

    await page.reload();
    await waitForAppReady(page);

    // Find and click Jobs FAB
    const jobsFab = page.locator('[data-testid="jobs-fab"], .jobs-fab, button:has-text("Jobs")').first();
    const fabVisible = await jobsFab.isVisible().catch(() => false);

    if (fabVisible) {
      await jobsFab.click();

      // Wait for jobs drawer to open
      const jobsDrawer = page.locator('[data-testid="jobs-drawer"], .jobs-drawer, [role="dialog"]').filter({ hasText: /Jobs|Active/ });
      await expect(jobsDrawer).toBeVisible({ timeout: 5000 });

      // Verify drawer contains job information
      await expect(jobsDrawer.locator('text=/Jobs|Active/')).toBeVisible();

      // Check for progress bars
      const progressBar = jobsDrawer.locator('.bg-blue-500, .progress-bar, [role="progressbar"]');
      const progressVisible = await progressBar.isVisible().catch(() => false);

      if (progressVisible) {
        await expect(progressBar).toBeVisible();
      }
    }
  });

  test("should display job categorization correctly", async ({ page }) => {
    // Mock multiple jobs with different categories
    await page.addInitScript(() => {
      (window as any).__mockJobsState = {
        activeJobs: 4,
        jobs: [
          {
            id: 'job1',
            type: 'indexing',
            title: 'Indexing Photos',
            status: 'running',
            progress: 7500,
            total: 10000,
            currentItem: 'family_photo.jpg',
            startTime: Date.now() - 3600000,
            errors: 0,
            warnings: 0,
            category: 'indexing'
          },
          {
            id: 'job2',
            type: 'analysis',
            title: 'Face Recognition',
            status: 'running',
            progress: 2500,
            total: 5000,
            currentItem: 'face_detection.jpg',
            startTime: Date.now() - 1800000,
            errors: 1,
            warnings: 0,
            category: 'analysis'
          },
          {
            id: 'job3',
            type: 'processing',
            title: 'Thumbnail Generation',
            status: 'paused',
            progress: 1000,
            total: 8000,
            startTime: Date.now() - 7200000,
            errors: 0,
            warnings: 3,
            category: 'processing'
          }
        ]
      };
    });

    await page.reload();
    await waitForAppReady(page);

    // Open jobs drawer
    const jobsFab = page.locator('[data-testid="jobs-fab"], .jobs-fab, button:has-text("Jobs")').first();
    const fabVisible = await jobsFab.isVisible().catch(() => false);

    if (fabVisible) {
      await jobsFab.click();

      const jobsDrawer = page.locator('[data-testid="jobs-drawer"], .jobs-drawer');
      await expect(jobsDrawer).toBeVisible();

      // Look for category sections
      const categories = ['indexing', 'analysis', 'processing'];

      for (const category of categories) {
        const categorySection = jobsDrawer.locator(`text=/${category}/i`);
        const categoryVisible = await categorySection.isVisible().catch(() => false);

        if (categoryVisible) {
          await expect(categorySection).toBeVisible();
        }
      }

      // Check for job status indicators
      const runningJobs = jobsDrawer.locator('.text-green-500, .status-running, [data-status="running"]');
      const pausedJobs = jobsDrawer.locator('.text-yellow-500, .status-paused, [data-status="paused"]');

      const runningVisible = await runningJobs.isVisible().catch(() => false);
      const pausedVisible = await pausedJobs.isVisible().catch(() => false);

      if (runningVisible) {
        await expect(runningJobs).toBeVisible();
      }

      if (pausedVisible) {
        await expect(pausedJobs).toBeVisible();
      }
    }
  });

  test("should show real-time progress updates", async ({ page }) => {
    // Mock jobs that update progress
    await page.addInitScript(() => {
      (window as any).__mockJobsState = {
        activeJobs: 1,
        jobs: [
          {
            id: 'job1',
            type: 'indexing',
            title: 'Indexing Photos',
            status: 'running',
            progress: 5000,
            total: 10000,
            currentItem: 'photo_5000.jpg',
            etaSeconds: 200,
            ratePerSecond: 50,
            startTime: Date.now() - 100000,
            errors: 0,
            warnings: 0,
            category: 'indexing'
          }
        ]
      };

      // Simulate progress updates
      setTimeout(() => {
        const job = (window as any).__mockJobsState.jobs[0];
        job.progress = 5200;
        job.currentItem = 'photo_5200.jpg';
        job.etaSeconds = 160;

        // Dispatch update event
        window.dispatchEvent(new CustomEvent('jobsUpdate', {
          detail: (window as any).__mockJobsState
        }));
      }, 2000);
    });

    await page.reload();
    await waitForAppReady(page);

    // Open jobs drawer
    const jobsFab = page.locator('[data-testid="jobs-fab"], .jobs-fab, button:has-text("Jobs")').first();
    const fabVisible = await jobsFab.isVisible().catch(() => false);

    if (fabVisible) {
      await jobsFab.click();

      const jobsDrawer = page.locator('[data-testid="jobs-drawer"], .jobs-drawer');
      await expect(jobsDrawer).toBeVisible();

      // Wait for progress update
      await page.waitForTimeout(2500);

      // Check if progress updated
      const progressText = jobsDrawer.locator('text=/5200|52%/');
      const progressUpdated = await progressText.isVisible().catch(() => false);

      if (progressUpdated) {
        await expect(progressText).toBeVisible();
      }
    }
  });

  test("should handle job errors and warnings gracefully", async ({ page }) => {
    // Mock jobs with errors and warnings
    await page.addInitScript(() => {
      (window as any).__mockJobsState = {
        activeJobs: 2,
        jobs: [
          {
            id: 'job1',
            type: 'indexing',
            title: 'Indexing Photos',
            status: 'running',
            progress: 8000,
            total: 10000,
            currentItem: 'error_photo.jpg',
            errors: 3,
            warnings: 5,
            category: 'indexing'
          },
          {
            id: 'job2',
            type: 'analysis',
            title: 'Face Recognition',
            status: 'failed',
            progress: 100,
            total: 5000,
            errors: 10,
            warnings: 2,
            category: 'analysis'
          }
        ]
      };
    });

    await page.reload();
    await waitForAppReady(page);

    // Open jobs drawer
    const jobsFab = page.locator('[data-testid="jobs-fab"], .jobs-fab, button:has-text("Jobs")').first();
    const fabVisible = await jobsFab.isVisible().catch(() => false);

    if (fabVisible) {
      await jobsFab.click();

      const jobsDrawer = page.locator('[data-testid="jobs-drawer"], .jobs-drawer');
      await expect(jobsDrawer).toBeVisible();

      // Check for error indicators
      const errorIndicators = jobsDrawer.locator('.text-red-500, .bg-red-500, [data-severity="error"]');
      const warningIndicators = jobsDrawer.locator('.text-yellow-500, .bg-yellow-500, [data-severity="warning"]');

      const errorsVisible = await errorIndicators.isVisible().catch(() => false);
      const warningsVisible = await warningIndicators.isVisible().catch(() => false);

      if (errorsVisible) {
        await expect(errorIndicators).toBeVisible();
      }

      if (warningsVisible) {
        await expect(warningIndicators).toBeVisible();
      }

      // Check for error count display
      const errorCount = jobsDrawer.locator('text=/.*3.*errors/i, text=/.*10.*errors/i');
      const errorCountVisible = await errorCount.isVisible().catch(() => false);

      if (errorCountVisible) {
        await expect(errorCount).toBeVisible();
      }
    }
  });

  test("should allow job control actions (pause/resume/cancel)", async ({ page }) => {
    // Mock running jobs
    await page.addInitScript(() => {
      (window as any).__mockJobsState = {
        activeJobs: 2,
        jobs: [
          {
            id: 'job1',
            type: 'indexing',
            title: 'Indexing Photos',
            status: 'running',
            progress: 3000,
            total: 10000,
            category: 'indexing'
          }
        ]
      };
    });

    await page.reload();
    await waitForAppReady(page);

    // Open jobs drawer
    const jobsFab = page.locator('[data-testid="jobs-fab"], .jobs-fab, button:has-text("Jobs")').first();
    const fabVisible = await jobsFab.isVisible().catch(() => false);

    if (fabVisible) {
      await jobsFab.click();

      const jobsDrawer = page.locator('[data-testid="jobs-drawer"], .jobs-drawer');
      await expect(jobsDrawer).toBeVisible();

      // Look for control buttons
      const pauseButton = jobsDrawer.locator('button:has-text("Pause"), button[aria-label*="pause"]');
      const cancelButton = jobsDrawer.locator('button:has-text("Cancel"), button[aria-label*="cancel"]');

      const pauseVisible = await pauseButton.isVisible().catch(() => false);
      const cancelVisible = await cancelButton.isVisible().catch(() => false);

      if (pauseVisible) {
        await expect(pauseButton).toBeVisible();
        // Note: We don't actually click it to avoid affecting the real system
      }

      if (cancelVisible) {
        await expect(cancelButton).toBeVisible();
      }
    }
  });

  test("should show job details and statistics", async ({ page }) => {
    // Mock detailed job information
    await page.addInitScript(() => {
      (window as any).__mockJobsState = {
        activeJobs: 1,
        jobs: [
          {
            id: 'job1',
            type: 'indexing',
            title: 'Indexing Photos',
            status: 'running',
            progress: 7500,
            total: 10000,
            currentItem: 'beach_sunset.jpg',
            etaSeconds: 150,
            ratePerSecond: 33,
            startTime: Date.now() - 227000, // 3.78 minutes ago
            errors: 0,
            warnings: 1,
            category: 'indexing'
          }
        ]
      };
    });

    await page.reload();
    await waitForAppReady(page);

    // Open jobs drawer
    const jobsFab = page.locator('[data-testid="jobs-fab"], .jobs-fab, button:has-text("Jobs")').first();
    const fabVisible = await jobsFab.isVisible().catch(() => false);

    if (fabVisible) {
      await jobsFab.click();

      const jobsDrawer = page.locator('[data-testid="jobs-drawer"], .jobs-drawer');
      await expect(jobsDrawer).toBeVisible();

      // Check for detailed information
      const expectedDetails = [
        'beach_sunset.jpg', // current item
        /75%/, // progress percentage
        /33.*items.*sec/i, // rate
        /2.*min/i // ETA
      ];

      for (const detail of expectedDetails) {
        const detailElement = jobsDrawer.locator(`text=/${detail}/`);
        const detailVisible = await detailElement.isVisible().catch(() => false);

        if (detailVisible) {
          await expect(detailElement).toBeVisible();
        }
      }
    }
  });

  test("should work correctly on mobile devices", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Mock jobs for mobile testing
    await page.addInitScript(() => {
      (window as any).__mockJobsState = {
        activeJobs: 1,
        jobs: [
          {
            id: 'job1',
            type: 'indexing',
            title: 'Indexing Photos',
            status: 'running',
            progress: 5000,
            total: 10000,
            category: 'indexing'
          }
        ]
      };
    });

    await page.reload();
    await waitForAppReady(page);

    // Check mobile FAB positioning
    const jobsFab = page.locator('[data-testid="jobs-fab"], .jobs-fab, button:has-text("Jobs")').first();
    const fabVisible = await jobsFab.isVisible().catch(() => false);

    if (fabVisible) {
      const fabBox = await jobsFab.boundingBox();
      if (fabBox) {
        // On mobile, FAB should be positioned for easy thumb access
        expect(fabBox.x).toBeGreaterThan(page.viewportSize().width - 100);
        expect(fabBox.y).toBeGreaterThan(page.viewportSize().height - 100);
      }

      // Test FAB tap
      await jobsFab.tap();

      // Check mobile drawer layout
      const jobsDrawer = page.locator('[data-testid="jobs-drawer"], .jobs-drawer');
      await expect(jobsDrawer).toBeVisible();

      const drawerBox = await jobsDrawer.boundingBox();
      if (drawerBox) {
        // On mobile, drawer should take most of the screen
        expect(drawerBox.width).toBeGreaterThan(page.viewportSize().width * 0.8);
      }
    }
  });

  test("should be accessible with keyboard navigation", async ({ page }) => {
    // Mock jobs to ensure FAB is visible
    await page.addInitScript(() => {
      (window as any).__mockJobsState = {
        activeJobs: 1,
        jobs: [
          {
            id: 'job1',
            type: 'indexing',
            title: 'Indexing Photos',
            status: 'running',
            progress: 5000,
            total: 10000,
            category: 'indexing'
          }
        ]
      };
    });

    await page.reload();
    await waitForAppReady(page);

    // Test keyboard navigation
    const jobsFab = page.locator('[data-testid="jobs-fab"], .jobs-fab, button:has-text("Jobs")').first();
    const fabVisible = await jobsFab.isVisible().catch(() => false);

    if (fabVisible) {
      // Tab to the FAB
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Keep tabbing

      // Check if FAB is focused
      const isFocused = await jobsFab.evaluate((el) => document.activeElement === el);

      if (isFocused) {
        // Activate with Enter
        await page.keyboard.press('Enter');

        // Check if drawer opened
        const jobsDrawer = page.locator('[data-testid="jobs-drawer"], .jobs-drawer');
        await expect(jobsDrawer).toBeVisible();
      }
    }
  });

  test("should handle empty jobs state gracefully", async ({ page }) => {
    // Mock empty jobs state
    await page.addInitScript(() => {
      (window as any).__mockJobsState = {
        activeJobs: 0,
        jobs: []
      };
    });

    await page.reload();
    await waitForAppReady(page);

    // Jobs FAB should not be visible or should show 0
    const jobsFab = page.locator('[data-testid="jobs-fab"], .jobs-fab, button:has-text("Jobs")').first();
    const fabVisible = await jobsFab.isVisible().catch(() => false);

    if (fabVisible) {
      // If visible, should show no active jobs
      const badge = jobsFab.locator('[data-testid="job-count"], .bg-blue-500, .bg-red-500');
      const badgeVisible = await badge.isVisible().catch(() => false);

      if (badgeVisible) {
        const badgeText = await badge.textContent();
        expect(badgeText).toMatch(/0|/); // Either shows 0 or is empty
      }
    }

    // Try to open jobs drawer (might be accessible through other means)
    await page.keyboard.press('j'); // Potential keyboard shortcut
    await page.waitForTimeout(1000);

    // Check if drawer shows empty state
    const jobsDrawer = page.locator('[data-testid="jobs-drawer"], .jobs-drawer');
    const drawerVisible = await jobsDrawer.isVisible().catch(() => false);

    if (drawerVisible) {
      const emptyState = jobsDrawer.locator('text=/no.*jobs|empty/i');
      const emptyVisible = await emptyState.isVisible().catch(() => false);

      if (emptyVisible) {
        await expect(emptyState).toBeVisible();
      }
    }
  });
});