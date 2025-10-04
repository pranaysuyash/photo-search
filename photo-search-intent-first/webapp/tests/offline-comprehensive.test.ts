import { expect, test } from "@playwright/test";
import {
	dismissOverlays,
	safeClick,
	waitForAppReady,
} from "./utils/test-helpers";

/**
 * Comprehensive No-Internet End-to-End Test Suite
 *
 * Tests the complete offline functionality of the Photo Search application:
 * - Offline detection readiness (UI indicators deferred)
 * - Action queuing when offline
 * - Sync functionality when connection is restored
 * - Connectivity history logging
 * - Model status monitoring in offline scenarios
 * - Error handling and recovery mechanisms
 * - PWA service worker behavior
 * - Diagnostics panel connectivity features
 */

test.describe("Comprehensive Offline Functionality", () => {
	test.beforeEach(async ({ page, context }) => {
		// Set longer timeout for offline tests
		test.setTimeout(120000);

		// Set up localStorage to skip onboarding
		await page.addInitScript(() => {
			try {
				localStorage.setItem("hasSeenOnboarding", "true");
				localStorage.setItem("onboardingComplete", "true");
				localStorage.setItem("showWelcome", "false");
				localStorage.setItem("showOnboardingTour", "false");
				localStorage.setItem("showOnboardingChecklist", "false");
				sessionStorage.setItem("hasSeenOnboarding", "true");
				sessionStorage.setItem("onboardingComplete", "true");
				sessionStorage.setItem("showWelcome", "false");
			} catch (e) {
				console.warn("Failed to set localStorage:", e);
			}
		});

		// Navigate to the app and wait for it to be ready
		await waitForAppReady(page, { skipOnboarding: true });

		// Wait for service worker to be ready
		await page
			.waitForFunction(() => {
				return navigator.serviceWorker.ready.then(() => true);
			})
			.catch(() => {
				// Service worker might not be available, continue with tests
				console.log(
					"Service worker not available, continuing with offline tests",
				);
			});
	});

	test.describe("Model Status Monitoring", () => {
		test("should display model status indicator in offline mode", async ({
			page,
			context,
		}) => {
			// Model status indicator should be visible
			const modelStatus = page.locator(
				'[data-testid="model-status"], .model-status, [class*="model-status"]',
			);
			await expect(modelStatus).toBeVisible();

			// Should show offline mode badge
			const offlineBadge = modelStatus.locator(
				'[class*="offline"], .offline-badge',
			);
			await expect(offlineBadge).toBeVisible();

			// Should contain model information
			await expect(modelStatus).toContainText(/model|loading|ready|offline/i);
		});

		test("should handle model status updates when going offline", async ({
			page,
			context,
		}) => {
			const modelStatus = page.locator(
				'[data-testid="model-status"], .model-status, [class*="model-status"]',
			);

			// Get initial status
			const initialStatus = await modelStatus.textContent();

			// Go offline
			await context.setOffline(true);
			await page.waitForTimeout(2000);

			// Status should update to reflect offline mode
			const offlineStatus = await modelStatus.textContent();
			expect(offlineStatus).toContain("Offline");

			// Come back online
			await context.setOffline(false);
			await page.waitForTimeout(2000);

			// Status should update back
			const onlineStatus = await modelStatus.textContent();
			expect(onlineStatus).not.toContain("Offline");
		});

		test("should display model capabilities correctly", async ({
			page,
			context,
		}) => {
			const modelStatus = page.locator(
				'[data-testid="model-status"], .model-status, [class*="model-status"]',
			);

			// Should show capabilities section
			await expect(modelStatus).toContainText(
				/capabilities|gpu|cuda|mps|clip/i,
			);

			// Should show model count if available
			const modelInfo = await modelStatus
				.locator('[class*="model"], [data-testid*="model"]')
				.textContent();
			if (modelInfo) {
				expect(modelInfo).toMatch(/\d+ model/);
			}
		});
	});

	test.describe("Action Queuing and Sync", () => {
		test.beforeEach(async ({ page }) => {
			// Set up some test data for queuing tests
			await page.addInitScript(() => {
				// Set up test collections for offline operations
				localStorage.setItem(
					"testCollections",
					JSON.stringify([
						{ id: "test-col-1", name: "Test Collection 1" },
						{ id: "test-col-2", name: "Test Collection 2" },
					]),
				);
			});
		});

		test("should queue actions when offline", async ({ page, context }) => {
			// Go offline
			await context.setOffline(true);
			await page.waitForTimeout(1000);

			// Try to perform an action that would normally require network
			// For example: save to collection

			// Look for collection functionality
			const collectionButton = page
				.locator(
					'[data-testid="save-to-collection"], button:has-text("Save"), button:has-text("Collection")',
				)
				.first();

			if (await collectionButton.isVisible()) {
				await safeClick(page, collectionButton);

				// Should show offline notification or queue indication
				const queueIndicator = page.locator(
					'[data-testid="queue-indicator"], [class*="queue"], [class*="pending"]',
				);
				await expect(queueIndicator).toBeVisible({ timeout: 3000 });
			}
		});

		test("should sync queued actions when coming back online", async ({
			page,
			context,
		}) => {
			// Go offline first
			await context.setOffline(true);
			await page.waitForTimeout(1000);

			// Simulate some offline actions
			await page.evaluate(() => {
				// Simulate adding items to offline queue
				const mockQueue = [
					{ id: "action-1", type: "save", timestamp: Date.now() },
					{ id: "action-2", type: "delete", timestamp: Date.now() + 1000 },
				];
				localStorage.setItem("offlineQueue", JSON.stringify(mockQueue));
			});

			// Come back online
			await context.setOffline(false);
			await page.waitForTimeout(3000);

			// Check if sync indicators show progress
			const syncIndicator = page.locator(
				'[data-testid="sync-indicator"], [class*="sync"], [class*="syncing"]',
			);
			await expect(syncIndicator).toBeVisible({ timeout: 5000 });

			// Should eventually complete
			await page.waitForFunction(
				() => {
					const syncIndicator = document.querySelector(
						'[data-testid="sync-indicator"], [class*="sync"], [class*="syncing"]',
					);
					return (
						!syncIndicator ||
						syncIndicator.getAttribute("class")?.includes("completed")
					);
				},
				{ timeout: 10000 },
			);
		});

		test("should handle sync errors gracefully", async ({ page, context }) => {
			// Go offline
			await context.setOffline(true);
			await page.waitForTimeout(1000);

			// Set up a mock queue that will fail sync
			await page.evaluate(() => {
				const failingQueue = [
					{ id: "failing-action", type: "invalid", timestamp: Date.now() },
				];
				localStorage.setItem("offlineQueue", JSON.stringify(failingQueue));
			});

			// Come back online
			await context.setOffline(false);
			await page.waitForTimeout(2000);

			// Should show error indication
			const errorIndicator = page.locator(
				'[data-testid="sync-error"], [class*="error"], [class*="failed"]',
			);
			await expect(errorIndicator).toBeVisible({ timeout: 5000 });
		});
	});

	test.describe("Connectivity History Logging", () => {
		test("should log connectivity events in diagnostics", async ({
			page,
			context,
		}) => {
			// Open diagnostics drawer
			const diagnosticsButton = page.locator(
				'[data-testid="diagnostics-button"], button:has-text("Diagnostics")',
			);
			if (await diagnosticsButton.isVisible()) {
				await safeClick(page, diagnosticsButton);

				// Wait for diagnostics to open
				await page.waitForTimeout(1000);

				// Should show connectivity history section
				const connectivityHistory = page.locator(
					'[data-testid="connectivity-history"], [class*="connectivity-history"]',
				);
				await expect(connectivityHistory).toBeVisible();

				// Should have event log
				const eventLog = connectivityHistory.locator(
					'[data-testid="event-log"], [class*="event"]',
				);
				await expect(eventLog).toBeVisible();
			}
		});

		test("should record offline/online transitions", async ({
			page,
			context,
		}) => {
			// Go offline
			await context.setOffline(true);
			await page.waitForTimeout(1000);

			// Come back online
			await context.setOffline(false);
			await page.waitForTimeout(1000);

			// Open diagnostics to check history
			const diagnosticsButton = page.locator(
				'[data-testid="diagnostics-button"], button:has-text("Diagnostics")',
			);
			if (await diagnosticsButton.isVisible()) {
				await safeClick(page, diagnosticsButton);
				await page.waitForTimeout(1000);

				// Should show connectivity events
				const events = page.locator(
					'[data-testid="connectivity-event"], [class*="connectivity-event"]',
				);
				const eventCount = await events.count();

				// Should have at least 2 events (offline and online)
				expect(eventCount).toBeGreaterThanOrEqual(2);

				// Check event types
				const firstEvent = await events.first().textContent();
				expect(firstEvent).toMatch(/offline|online/i);
			}
		});

		test("should display connectivity statistics", async ({
			page,
			context,
		}) => {
			// Simulate some connectivity changes
			for (let i = 0; i < 3; i++) {
				await context.setOffline(true);
				await page.waitForTimeout(500);
				await context.setOffline(false);
				await page.waitForTimeout(500);
			}

			// Open diagnostics
			const diagnosticsButton = page.locator(
				'[data-testid="diagnostics-button"], button:has-text("Diagnostics")',
			);
			if (await diagnosticsButton.isVisible()) {
				await safeClick(page, diagnosticsButton);
				await page.waitForTimeout(1000);

				// Should show statistics
				const stats = page.locator(
					'[data-testid="connectivity-stats"], [class*="stats"]',
				);
				await expect(stats).toBeVisible();

				// Should show total events, uptime, etc.
				await expect(stats).toContainText(/events|uptime|downtime/i);
			}
		});

		test("should allow exporting connectivity history", async ({
			page,
			context,
		}) => {
			// Open diagnostics
			const diagnosticsButton = page.locator(
				'[data-testid="diagnostics-button"], button:has-text("Diagnostics")',
			);
			if (await diagnosticsButton.isVisible()) {
				await safeClick(page, diagnosticsButton);
				await page.waitForTimeout(1000);

				// Look for export button
				const exportButton = page.locator(
					'[data-testid="export-history"], button:has-text("Export")',
				);

				if (await exportButton.isVisible()) {
					// Click export (this might trigger download)
					const downloadPromise = page.waitForEvent("download");
					await safeClick(page, exportButton);

					// Should trigger download
					const download = await downloadPromise;
					expect(download.suggestedFilename()).toMatch(
						/connectivity.*history/i,
					);
				}
			}
		});
	});

	test.describe("Diagnostics Panel Features", () => {
		test("should show system diagnostics in offline mode", async ({
			page,
			context,
		}) => {
			// Go offline
			await context.setOffline(true);
			await page.waitForTimeout(1000);

			// Open diagnostics
			const diagnosticsButton = page.locator(
				'[data-testid="diagnostics-button"], button:has-text("Diagnostics")',
			);
			if (await diagnosticsButton.isVisible()) {
				await safeClick(page, diagnosticsButton);
				await page.waitForTimeout(1000);

				// Should show system information
				const systemInfo = page.locator(
					'[data-testid="system-info"], [class*="environment"], [class*="system"]',
				);
				await expect(systemInfo).toBeVisible();

				// Should show offline status
				await expect(systemInfo).toContainText(/offline|disconnected/i);
			}
		});

		test("should maintain diagnostics data across connectivity changes", async ({
			page,
			context,
		}) => {
			// Go offline
			await context.setOffline(true);
			await page.waitForTimeout(1000);

			// Open diagnostics
			const diagnosticsButton = page.locator(
				'[data-testid="diagnostics-button"], button:has-text("Diagnostics")',
			);
			if (await diagnosticsButton.isVisible()) {
				await safeClick(page, diagnosticsButton);
				await page.waitForTimeout(1000);

				// Get initial diagnostics data
				const initialContent = await page
					.locator('[data-testid="diagnostics-content"]')
					.textContent();

				// Come back online
				await context.setOffline(false);
				await page.waitForTimeout(2000);

				// Diagnostics should still be visible and updated
				const updatedContent = await page
					.locator('[data-testid="diagnostics-content"]')
					.textContent();
				expect(updatedContent).not.toBe("");

				// Should reflect online status
				expect(updatedContent).not.toContain(/offline/i);
			}
		});
	});

	test.describe("PWA Service Worker Behavior", () => {
		test("should register service worker successfully", async ({ page }) => {
			const swRegistered = await page.evaluate(() => {
				return navigator.serviceWorker
					.getRegistrations()
					.then((registrations) => {
						return registrations.length > 0;
					});
			});

			expect(swRegistered).toBe(true);
		});

		test("should cache app shell for offline access", async ({
			page,
			context,
		}) => {
			// Ensure service worker is ready
			await page.waitForFunction(() => {
				return navigator.serviceWorker.ready.then(() => true);
			});

			// Go offline
			await context.setOffline(true);

			// Try to reload
			await page.reload();
			await page.waitForLoadState("domcontentloaded");

			// App should still load
			const appLoaded = await page.isVisible(
				'#root, [data-testid="app"], main',
			);
			expect(appLoaded).toBe(true);
		});

		test("should handle network failures gracefully", async ({
			page,
			context,
		}) => {
			// Go offline
			await context.setOffline(true);

			// Try to make API requests
			const apiResponse = await page.request
				.get("http://localhost:8000/api/health")
				.catch(() => null);

			// Should handle gracefully without crashing
			expect(page.url()).not.toContain("about:blank");

			// App should remain functional
			const appContent = await page.isVisible(
				'#root, [data-testid="app"], main',
			);
			expect(appContent).toBe(true);
		});
	});

	test.describe("Error Handling and Recovery", () => {
		test("should handle network interruptions gracefully", async ({
			page,
			context,
		}) => {
			// Start with some operation
			const searchInput = page
				.locator('input[type="search"], input[placeholder*="search" i]')
				.first();
			if (await searchInput.isVisible()) {
				await searchInput.fill("test search");

				// Go offline during operation
				await context.setOffline(true);
				await page.waitForTimeout(1000);

				// Should show error or retry mechanism
				const errorMessage = page.locator(
					'[data-testid="error-message"], [class*="error"], [class*="retry"]',
				);
				const errorVisible = await errorMessage.isVisible();

				if (errorVisible) {
					await expect(errorMessage).toContainText(
						/offline|network|connection/i,
					);
				}
			}
		});

			test("should recover from temporary network issues without UI indicator", async ({
				page,
				context,
			}) => {
				// Go offline
				await context.setOffline(true);
				await page.waitForTimeout(1000);

				// Offline indicator intentionally absent in offline-first mode
				const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
				await expect(offlineIndicator).toHaveCount(0);

				// Come back online
				await context.setOffline(false);
				await page.waitForTimeout(2000);

				// UI should remain indicator-free after recovery
				await expect(offlineIndicator).toHaveCount(0);

			// Should be able to perform operations
			const appContent = await page.isVisible(
				'#root, [data-testid="app"], main',
			);
			expect(appContent).toBe(true);
		});

		test("should preserve user data during connectivity changes", async ({
			page,
			context,
		}) => {
			// Set up some user data
			await page.evaluate(() => {
				localStorage.setItem(
					"userPreferences",
					JSON.stringify({
						theme: "dark",
						language: "en",
						lastSearch: "test query",
					}),
				);
			});

			// Go offline
			await context.setOffline(true);
			await page.waitForTimeout(1000);

			// Data should still be accessible
			const userData = await page.evaluate(() => {
				return JSON.parse(localStorage.getItem("userPreferences") || "{}");
			});

			expect(userData.lastSearch).toBe("test query");

			// Come back online
			await context.setOffline(false);
			await page.waitForTimeout(2000);

			// Data should still be preserved
			const userDataAfter = await page.evaluate(() => {
				return JSON.parse(localStorage.getItem("userPreferences") || "{}");
			});

			expect(userDataAfter.lastSearch).toBe("test query");
		});
	});

	test.describe("Performance Under Offline Conditions", () => {
		test("should maintain acceptable performance offline", async ({
			page,
			context,
		}) => {
			// Go offline
			await context.setOffline(true);
			await page.waitForTimeout(1000);

			// Measure response time for local operations
			const startTime = Date.now();

			// Try to open a modal or perform a local operation
			const settingsButton = page.locator(
				'[data-testid="settings-button"], button:has-text("Settings")',
			);
			if (await settingsButton.isVisible()) {
				await safeClick(page, settingsButton);

				// Modal should open quickly
				await page.waitForTimeout(500);
				const modal = page
					.locator('[data-testid="settings-modal"], [class*="modal"]')
					.first();
				await expect(modal).toBeVisible();

				const endTime = Date.now();
				const responseTime = endTime - startTime;

				// Should respond within reasonable time (< 3 seconds)
				expect(responseTime).toBeLessThan(3000);
			}
		});

		test("should handle large offline action queues efficiently", async ({
			page,
			context,
		}) => {
			// Go offline
			await context.setOffline(true);
			await page.waitForTimeout(1000);

			// Create a large queue of actions
			await page.evaluate(() => {
				const largeQueue = Array.from({ length: 50 }, (_, i) => ({
					id: `action-${i}`,
					type: "save",
					timestamp: Date.now() + i * 100,
					data: { test: `data-${i}` },
				}));
				localStorage.setItem("offlineQueue", JSON.stringify(largeQueue));
			});

			// Should handle without crashing
			const appResponsive = await page.isVisible(
				'#root, [data-testid="app"], main',
			);
			expect(appResponsive).toBe(true);

			// Come back online
			await context.setOffline(false);
			await page.waitForTimeout(3000);

			// Should process queue without major issues
			const syncIndicator = page.locator(
				'[data-testid="sync-indicator"], [class*="sync"]',
			);
			const syncStarted = await syncIndicator.isVisible();

			if (syncStarted) {
				// Wait for sync to complete or timeout
				await page.waitForFunction(
					() => {
						const indicator = document.querySelector(
							'[data-testid="sync-indicator"], [class*="sync"]',
						);
						return (
							!indicator ||
							indicator.getAttribute("class")?.includes("completed")
						);
					},
					{ timeout: 15000 },
				);
			}
		});
	});

	test.describe("Cross-Browser Offline Compatibility", () => {
		test("should work consistently across different browsers", async ({
			page,
			context,
		}) => {
			// Go offline
			await context.setOffline(true);
			await page.waitForTimeout(1000);

				// Ensure offline indicator remains hidden by design
				const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
				await expect(offlineIndicator).toHaveCount(0);

			// Test that app remains functional
			const appContent = page.locator('#root, [data-testid="app"], main');
			await expect(appContent).toBeVisible();

			// Test that core interactions work
			const searchInput = page
				.locator('input[type="search"], input[placeholder*="search" i]')
				.first();
			if (await searchInput.isVisible()) {
				await searchInput.fill("offline test");
				const searchValue = await searchInput.inputValue();
				expect(searchValue).toBe("offline test");
			}
		});
	});
});
