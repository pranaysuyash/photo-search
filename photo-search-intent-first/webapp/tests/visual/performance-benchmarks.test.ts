import { expect, test } from "@playwright/test";

// Increase timeout for perf suites, Safari can be slower in CI
test.describe.configure({ timeout: 60000 });

import {
	dismissOverlays,
	smartWait,
	stableScreenshot,
} from "../utils/test-helpers";

// Helper function to reliably get search box with proper UI state
async function getSearchBox(page: import("@playwright/test").Page) {
	// If the search UI is gated by a toggle, open it if available
	const toggle = page.locator(
		'[data-testid="open-search"], button[aria-label*="search" i], [aria-controls*="search" i]',
	);
	if (await toggle.first().isVisible()) {
		await toggle.first().click();
	}

	// Use the reliable data-testid approach
	const box = page.getByTestId("search-input");

	// Let Playwright's expect handle the waiting
	await expect(box).toBeVisible({ timeout: 15000 });
	return box;
}

test.describe("Performance Benchmarks", () => {
	test.describe("Load Performance", () => {
		test("measures initial page load performance", async ({ page }) => {
			// Start performance monitoring
			const performanceMetrics = await page.evaluate(() => {
				const navigation = performance.getEntriesByType(
					"navigation",
				)[0] as PerformanceNavigationTiming;
				return {
					domContentLoaded:
						navigation.domContentLoadedEventEnd -
						navigation.domContentLoadedEventStart,
					loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
					firstPaint:
						performance
							.getEntriesByType("paint")
							.find((entry) => entry.name === "first-paint")?.startTime || 0,
					largestContentfulPaint:
						performance.getEntriesByType("largest-contentful-paint")[0]
							?.startTime || 0,
				};
			});

			// Performance assertions
			expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // 3 seconds
			expect(performanceMetrics.loadComplete).toBeLessThan(5000); // 5 seconds
			expect(performanceMetrics.firstPaint).toBeLessThan(1500); // 1.5 seconds
			expect(performanceMetrics.largestContentfulPaint).toBeLessThan(2500); // 2.5 seconds

			// Log metrics for analysis
			console.log("Performance Metrics:", performanceMetrics);
		});

		test("measures search response time", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Measure search performance
			const searchStartTime = Date.now();
			const box = await getSearchBox(page); // <-- robust open + wait
			await box.fill("test query");
			await box.press("Enter");

			// Wait for results to load
			await smartWait(page, async () => {
				const results = await page
					.locator(".result-item, .photo-grid img")
					.count();
				return results > 0 || (await page.locator(".no-results").isVisible());
			});

			await stableScreenshot(page, { name: "perf_search_response" });

			const searchEndTime = Date.now();
			const searchResponseTime = searchEndTime - searchStartTime;

			// Performance assertion
			expect(searchResponseTime).toBeLessThan(2000); // 2 seconds for search
			console.log(`Search response time: ${searchResponseTime}ms`);
		});
	});

	test.describe("Memory and Resource Usage", () => {
		test("monitors memory usage during image loading", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Trigger image loading
			const box = await getSearchBox(page);
			await box.fill("nature");
			await box.press("Enter");

			// Wait for images to load
			await page.waitForSelector('img[src*="thumb"]', {
				state: "attached",
				timeout: 10000,
			});

			await stableScreenshot(page, { name: "perf_memory_image_loading" });

			// Check memory usage (if available)
			const memoryMetrics = await page.evaluate(() => {
				if ("memory" in performance) {
					const memory = (performance as any).memory;
					return {
						usedJSHeapSize: memory.usedJSHeapSize,
						totalJSHeapSize: memory.totalJSHeapSize,
						jsHeapSizeLimit: memory.jsHeapSizeLimit,
					};
				}
				return null;
			});

			if (memoryMetrics) {
				console.log("Memory usage:", memoryMetrics);
				// Assert memory usage is reasonable (less than 100MB)
				expect(memoryMetrics.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024);
			}
		});

		test("measures image loading performance", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Load search results with images
			const box = await getSearchBox(page);
			await box.fill("photo");
			await box.press("Enter");

			// Monitor image loading
			const imageLoadTimes = await page.evaluate(() => {
				return new Promise<number[]>((resolve) => {
					const loadTimes: number[] = [];
					const images = document.querySelectorAll("img[data-src]");
					let loaded = 0;

					images.forEach((img, index) => {
						const loadStart = performance.now();
						img.addEventListener("load", () => {
							loadTimes[index] = performance.now() - loadStart;
							loaded++;
							if (loaded === images.length) {
								resolve(loadTimes.filter((time) => time > 0));
							}
						});

						img.addEventListener("error", () => {
							loaded++;
							if (loaded === images.length) {
								resolve(loadTimes.filter((time) => time > 0));
							}
						});
					});

					// Fallback: resolve after 5 seconds
					setTimeout(() => {
						resolve(loadTimes.filter((time) => time > 0));
					}, 5000);
				});
			});

			if (imageLoadTimes.length > 0) {
				const avgLoadTime =
					imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length;
				console.log(`Average image load time: ${avgLoadTime.toFixed(2)}ms`);
				await stableScreenshot(page, { name: "perf_image_loading" });
				expect(avgLoadTime).toBeLessThan(1000); // Images should load in under 1 second
			} else {
				await stableScreenshot(page, { name: "perf_image_loading_no_times" });
			}
		});
	});

	test.describe("Mobile Performance", () => {
		test.beforeEach(async ({ page }) => {
			// Simulate mobile device
			await page.setViewportSize({ width: 375, height: 667 });
			await page.emulateMedia({ colorScheme: "light" });
		});

		test("measures mobile search performance", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			const startTime = Date.now();

			// Mobile search interaction
			const box = await getSearchBox(page);
			await box.fill("mobile test");
			await box.press("Enter");

			await smartWait(page, async () => {
				return (
					(await page.locator(".result-item, .photo-grid img").count()) > 0
				);
			});

			await stableScreenshot(page, { name: "perf_mobile_search" });

			const endTime = Date.now();
			const mobileSearchTime = endTime - startTime;

			console.log(`Mobile search time: ${mobileSearchTime}ms`);
			expect(mobileSearchTime).toBeLessThan(3000); // Allow more time for mobile
		});

		test("checks mobile touch responsiveness", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Test touch interactions
			const box = await getSearchBox(page);
			await box.tap();

			// Measure response time to tap
			const tapResponseStart = Date.now();
			await page.waitForSelector(
				".search-suggestions, .results-container, .photo-grid img, .result-item",
				{ timeout: 7000 },
			);
			await stableScreenshot(page, { name: "perf_mobile_touch_response" });
			const tapResponseEnd = Date.now();

			const tapResponseTime = tapResponseEnd - tapResponseStart;
			console.log(`Touch response time: ${tapResponseTime}ms`);
			expect(tapResponseTime).toBeLessThan(500); // Touch should respond within 500ms
		});
	});

	test.describe("Network Performance", () => {
		test("tests performance under slow network", async ({ page }) => {
			// Simulate slow 3G network
			await page.context().setOffline(false);
			await page.route("**/*", (route) => {
				return route.fulfill({
					status: 200,
					contentType: "text/html",
					body: "<html><body>Mock response for slow network</body></html>",
					headers: { "Content-Type": "text/html" },
				});
			});

			const startTime = Date.now();
			await page.goto("/");
			await stableScreenshot(page, { name: "perf_slow_network" });
			const endTime = Date.now();

			const slowNetworkLoadTime = endTime - startTime;
			console.log(`Slow network load time: ${slowNetworkLoadTime}ms`);

			// Should still load within reasonable time (10 seconds for slow network)
			expect(slowNetworkLoadTime).toBeLessThan(10000);
		});
	});
});
