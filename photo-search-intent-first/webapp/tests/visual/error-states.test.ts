import { expect, test } from "@playwright/test";
import {
	dismissOverlays,
	smartWait,
	stableScreenshot,
} from "../utils/test-helpers";

test.describe("Error State Testing", () => {
	test.describe("Network Error Handling", () => {
		test("displays offline mode gracefully", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Simulate going offline
			await page.context().setOffline(true);

			// Try to perform actions while offline
			await page.fill('input[type="search"]', "offline test");
			await page.press("Enter");

			await page.waitForTimeout(1000);

			// Should show appropriate offline messaging
			const offlineIndicator = await page
				.locator(
					'.offline-indicator, [aria-label*="offline"], .connection-error',
				)
				.first();
			const hasOfflineMessaging = await offlineIndicator
				.isVisible()
				.catch(() => false);

			if (hasOfflineMessaging) {
				console.log("Offline mode messaging is displayed");
			} else {
				// Check if app handles offline state gracefully
				const pageState = await page.evaluate(() => {
					return {
						hasContent: document.body.textContent?.length > 100,
						hasErrorStyles: document.querySelector(".error, .warning") !== null,
						hasUserFriendlyMessage:
							document.body.textContent?.toLowerCase().includes("offline") ||
							document.body.textContent?.toLowerCase().includes("connection") ||
							document.body.textContent?.toLowerCase().includes("network"),
					};
				});

				expect(pageState.hasContent).toBe(true);
				expect(pageState.hasUserFriendlyMessage || hasOfflineMessaging).toBe(
					true,
				);
			}

			await stableScreenshot(page, {
				name: "offline-state.png",
				maxDiffPixelRatio: 0.1, // Allow more tolerance for error states
			});
		});

		test("handles API timeouts gracefully", async ({ page }) => {
			await page.route("**/api/**", async (route) => {
				// Simulate API timeout
				await new Promise((resolve) => setTimeout(resolve, 10000));
				await route.abort("timedout");
			});

			await page.goto("/");
			await dismissOverlays(page);

			// Try to trigger API call
			await page.fill('input[type="search"]', "timeout test");
			await page.press("Enter");

			await page.waitForTimeout(2000);

			// Check for timeout handling
			const timeoutMessage = await page
				.locator("text=/timeout|took too long|please try again/i")
				.first();
			const hasTimeoutHandling = await timeoutMessage
				.isVisible()
				.catch(() => false);

			console.log(`Timeout handling displayed: ${hasTimeoutHandling}`);

			// App should remain functional
			const pageFunctional = await page.evaluate(() => {
				const searchInput = document.querySelector('input[type="search"]');
				return searchInput !== null && !searchInput.hasAttribute("disabled");
			});

			expect(pageFunctional).toBe(true);
		});
	});

	test.describe("File System Error Handling", () => {
		test("handles permission denied errors", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Mock file system permission error
			await page.addInitScript(() => {
				(window as any).showOpenFilePicker = () => {
					return Promise.reject(
						new DOMException("Permission denied", "NotAllowedError"),
					);
				};
			});

			// Try to trigger file access
			const fileButton = page
				.locator(
					'button:has-text("Select Folder"), button:has-text("Choose Files"), [aria-label*="folder"]',
				)
				.first();
			if (await fileButton.isVisible().catch(() => false)) {
				await fileButton.click();
				await page.waitForTimeout(1000);

				// Should show permission error message
				const permissionError = await page
					.locator("text=/permission|denied|access/i")
					.first();
				const hasPermissionError = await permissionError
					.isVisible()
					.catch(() => false);

				console.log(`Permission error displayed: ${hasPermissionError}`);

				if (hasPermissionError) {
					await stableScreenshot(page, {
						name: "permission-error.png",
						maxDiffPixelRatio: 0.1,
					});
				}
			}
		});

		test("handles missing or corrupted files", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Mock broken image responses
			await page.route("**/*.jpg", (route) => route.abort("failed"));
			await page.route("**/*.png", (route) => route.abort("failed"));
			await page.route("**/*.jpeg", (route) => route.abort("failed"));

			// Trigger search that would load images
			await page.fill('input[type="search"]', "corrupted test");
			await page.press("Enter");

			await page.waitForTimeout(2000);

			// Should handle broken images gracefully
			const brokenImageHandling = await page.evaluate(() => {
				const images = document.querySelectorAll("img");
				let hasFallbackContent = false;

				images.forEach((img) => {
					// Check if there's alt text or fallback content
					if (img.alt && img.alt.length > 0) {
						hasFallbackContent = true;
					}
				});

				return {
					hasFallbackContent,
					totalImages: images.length,
					hasErrorMessage:
						document.body.textContent?.toLowerCase().includes("error") ||
						document.body.textContent?.toLowerCase().includes("failed") ||
						document.body.textContent?.toLowerCase().includes("corrupted"),
				};
			});

			console.log("Broken image handling:", brokenImageHandling);

			// Should either have fallback content or error messaging
			expect(
				brokenImageHandling.hasFallbackContent ||
					brokenImageHandling.hasErrorMessage,
			).toBe(true);
		});
	});

	test.describe("Search Error States", () => {
		test("handles empty and invalid search queries", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			const testCases = [
				{ query: "", description: "empty search" },
				{ query: "   ", description: "whitespace only" },
				{ query: "??!!@#", description: "special characters" },
				{ query: "a".repeat(1000), description: "very long query" },
			];

			for (const testCase of testCases) {
				console.log(
					`Testing ${testCase.description}: "${testCase.query.substring(0, 20)}..."`,
				);

				await page.fill('input[type="search"]', testCase.query);
				await page.press("Enter");

				await page.waitForTimeout(1000);

				// Should handle gracefully without crashing
				const pageStable = await page.evaluate(() => {
					return {
						hasContent: document.body.textContent?.length > 50,
						hasErrorIndication:
							document.querySelector(".error, .warning, .invalid") !== null,
						searchInputEnabled: !document
							.querySelector('input[type="search"]')
							?.hasAttribute("disabled"),
					};
				});

				expect(pageStable.hasContent).toBe(true);
				expect(pageStable.searchInputEnabled).toBe(true);

				// Clear search for next test
				await page.fill('input[type="search"]', "");
				await page.waitForTimeout(500);
			}
		});

		test("handles no results scenarios helpfully", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Search for something unlikely to exist
			await page.fill('input[type="search"]', "xyzabc123nonexistent");
			await page.press("Enter");

			await page.waitForTimeout(1500);

			// Should show helpful no-results message
			const noResultsState = await page.evaluate(() => {
				const bodyText = document.body.textContent?.toLowerCase() || "";
				return {
					hasNoResultsText:
						bodyText.includes("no results") ||
						bodyText.includes("found nothing"),
					hasHelpfulSuggestions:
						bodyText.includes("try") ||
						bodyText.includes("suggest") ||
						bodyText.includes("check"),
					hasAlternativeActions:
						bodyText.includes("search again") ||
						bodyText.includes("different") ||
						bodyText.includes("browse"),
					hasSearchUI: document.querySelector('input[type="search"]') !== null,
				};
			});

			console.log("No results state:", noResultsState);

			expect(noResultsState.hasNoResultsText).toBe(true);
			expect(noResultsState.hasHelpfulSuggestions).toBe(true);
			expect(noResultsState.hasSearchUI).toBe(true);

			await stableScreenshot(page, {
				name: "helpful-no-results.png",
				maxDiffPixelRatio: 0.05,
			});
		});
	});

	test.describe("System Resource Errors", () => {
		test("handles memory pressure gracefully", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Simulate memory pressure by loading many images
			await page.route("**/*", async (route) => {
				if (
					route.request().url().includes("thumb") ||
					route.request().url().includes("image")
				) {
					// Return large images to simulate memory pressure
					await route.fulfill({
						status: 200,
						contentType: "image/jpeg",
						body: Buffer.alloc(1024 * 1024 * 2), // 2MB images
					});
				} else {
					await route.continue();
				}
			});

			// Trigger search that would load many images
			await page.fill('input[type="search"]', "memory test");
			await page.press("Enter");

			await page.waitForTimeout(3000);

			// Should handle memory pressure without crashing
			const appResponsive = await page.evaluate(() => {
				return {
					searchInputWorking:
						document.querySelector('input[type="search"]') !== null,
					interactiveElementsWorking:
						document.querySelectorAll("button, a").length > 0,
					bodyHasContent: document.body.textContent?.length > 100,
				};
			});

			console.log("Memory pressure handling:", appResponsive);
			expect(appResponsive.searchInputWorking).toBe(true);
			expect(appResponsive.interactiveElementsWorking).toBe(true);
		});

		test("handles large result sets efficiently", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Mock many search results
			await page.addInitScript(() => {
				(window as any).__TEST_LARGE_RESULTS = true;
			});

			await page.fill('input[type="search"]', "large results test");
			await page.press("Enter");

			await page.waitForTimeout(2000);

			// Should handle large results efficiently
			const largeResultHandling = await page.evaluate(() => {
				const resultItems = document.querySelectorAll(
					".result-item, .photo-grid > *, img",
				);
				return {
					resultCount: resultItems.length,
					hasVirtualization:
						document.querySelector(
							'[class*="virtual"], [class*="infinite"]',
						) !== null,
					hasPagination:
						document.querySelector('.pagination, [class*="page"]') !== null,
					hasLazyLoading: Array.from(resultItems).some(
						(img) =>
							img.hasAttribute("loading") || img.hasAttribute("data-src"),
					),
				};
			});

			console.log("Large result handling:", largeResultHandling);

			// Should have some form of performance optimization
			const hasOptimization =
				largeResultHandling.hasVirtualization ||
				largeResultHandling.hasPagination ||
				largeResultHandling.hasLazyLoading;

			expect(hasOptimization).toBe(true);
		});
	});

	test.describe("Error Recovery", () => {
		test("allows user to recover from errors", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Trigger an error state
			await page.route("**/api/**", (route) => route.abort("failed"));

			await page.fill('input[type="search"]', "error recovery test");
			await page.press("Enter");

			await page.waitForTimeout(1000);

			// Clear the route to simulate recovery
			await page.unroute("**/api/**");

			// Try searching again
			await page.fill('input[type="search"]', "recovery test");
			await page.press("Enter");

			await page.waitForTimeout(1000);

			// Should be able to recover and function normally
			const recoveryState = await page.evaluate(() => {
				return {
					hasContent: document.body.textContent?.length > 100,
					searchInputWorking:
						document.querySelector('input[type="search"]') !== null,
					noCrashIndicators:
						!document.body.textContent?.toLowerCase().includes("crash") &&
						!document.body.textContent?.toLowerCase().includes("fatal"),
				};
			});

			console.log("Recovery state:", recoveryState);
			expect(recoveryState.searchInputWorking).toBe(true);
			expect(recoveryState.noCrashIndicators).toBe(true);
		});
	});
});
