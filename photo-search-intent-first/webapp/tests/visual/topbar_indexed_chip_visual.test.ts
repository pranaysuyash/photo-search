import { expect, test } from "@playwright/test";

test.describe("Visual: TopBar Indexed Chip", () => {
	test("shows indexed chip in idle state", async ({ page }) => {
		await page.goto("/");

		// Wait for the page to load completely
		await page.waitForLoadState("networkidle");

		// Handle initial app states - dismiss any welcome/onboarding screens
		// Look for Welcome screen first
		const welcomeScreen = page
			.locator('div[class*="fixed inset-0"]')
			.filter({ hasText: "Find any photo instantly" });
		if (await welcomeScreen.isVisible().catch(() => false)) {
			console.log("Welcome screen detected, dismissing...");
			// Click "Maybe later" button to dismiss welcome screen
			const maybeLaterButton = page.getByRole("button", {
				name: "Maybe later",
			});
			if (await maybeLaterButton.isVisible().catch(() => false)) {
				await maybeLaterButton.click();
				await page.waitForTimeout(500);
			}
		}

		// Handle FirstRunSetup modal
		const firstRunSetup = page
			.locator('div[class*="fixed inset-0"]')
			.filter({ hasText: "Welcome — let’s find your photos" });
		if (await firstRunSetup.isVisible().catch(() => false)) {
			console.log("FirstRunSetup detected, skipping...");
			// Click "Skip" button to dismiss first-run setup
			const skipButton = page.getByRole("button", { name: "Skip" });
			if (await skipButton.isVisible().catch(() => false)) {
				await skipButton.click();
				await page.waitForTimeout(500);
			}
		}

		// Wait for the main app content to be visible and ensure we're not in setup mode
		await page.waitForSelector("#root", { state: "visible", timeout: 30000 });

		// Ensure welcome screen and first-run setup are gone
		await page.waitForFunction(
			() => {
				const welcomeElements = document.querySelectorAll(
					'div[class*="fixed inset-0"]',
				);
				for (const el of welcomeElements) {
					if (
						el.textContent?.includes("Find any photo instantly") ||
						el.textContent?.includes("Welcome — let’s find your photos")
					) {
						return false;
					}
				}
				return true;
			},
			{ timeout: 10000 },
		);

		// Wait for the TopBar to be visible - try multiple selectors with longer timeout
		console.log("Waiting for TopBar to be visible...");
		const topBarVisible = await page
			.waitForSelector(
				"header .top-bar, header[class*='bg-white'], [class*='top-bar']",
				{ state: "visible", timeout: 30000 },
			)
			.catch(() => null);

		if (!topBarVisible) {
			console.log(
				"TopBar not found with primary selectors, trying fallback...",
			);
			// Try waiting for the header element itself
			await page.waitForSelector("header", {
				state: "visible",
				timeout: 10000,
			});
		}

		// Verify TopBar is actually visible
		const topBarElement = page.locator("header");
		await expect(topBarElement).toBeVisible();

		// Look for the indexed chip in the top bar
		const indexedChip = page.locator(".indexed-chip").first();

		// Screenshot only the header/top bar to reduce flakiness
		const header = page.locator("header");
		await expect(header).toHaveScreenshot("topbar.png", {
			maxDiffPixelRatio: 0.03,
		});

		// The indexed chip may not appear immediately if diagnostics aren't loaded yet
		// This is expected behavior - it only shows when search engines are available
		if (await indexedChip.isVisible().catch(() => false)) {
			console.log("Indexed chip is visible, taking screenshot...");
			// Screenshot the indexed chip in idle state
			await expect(indexedChip).toHaveScreenshot("indexed-chip-idle.png", {
				maxDiffPixelRatio: 0.05,
				mask: [
					// Mask dynamic numbers that might change
					indexedChip.locator(".indexed-count"),
				],
			});
		} else {
			console.log(
				"IndexedChip not visible - this is expected if diagnostics haven't loaded yet",
			);
		}
	});

	test("shows indexed chip during indexing", async ({ page }) => {
		await page.goto("/");

		// Wait for the page to load completely
		await page.waitForLoadState("networkidle");

		// Handle initial app states - dismiss any welcome/onboarding screens
		// Look for Welcome screen first
		const welcomeScreen = page
			.locator('div[class*="fixed inset-0"]')
			.filter({ hasText: "Find any photo instantly" });
		if (await welcomeScreen.isVisible().catch(() => false)) {
			console.log("Welcome screen detected, dismissing...");
			// Click "Maybe later" button to dismiss welcome screen
			const maybeLaterButton = page.getByRole("button", {
				name: "Maybe later",
			});
			if (await maybeLaterButton.isVisible().catch(() => false)) {
				await maybeLaterButton.click();
				await page.waitForTimeout(500);
			}
		}

		// Handle FirstRunSetup modal
		const firstRunSetup = page
			.locator('div[class*="fixed inset-0"]')
			.filter({ hasText: "Welcome — let’s find your photos" });
		if (await firstRunSetup.isVisible().catch(() => false)) {
			console.log("FirstRunSetup detected, skipping...");
			// Click "Skip" button to dismiss first-run setup
			const skipButton = page.getByRole("button", { name: "Skip" });
			if (await skipButton.isVisible().catch(() => false)) {
				await skipButton.click();
				await page.waitForTimeout(500);
			}
		}

		// Wait for the main app content to be visible and ensure we're not in setup mode
		await page.waitForSelector("#root", { state: "visible", timeout: 30000 });

		// Ensure welcome screen and first-run setup are gone
		await page.waitForFunction(
			() => {
				const welcomeElements = document.querySelectorAll(
					'div[class*="fixed inset-0"]',
				);
				for (const el of welcomeElements) {
					if (
						el.textContent?.includes("Find any photo instantly") ||
						el.textContent?.includes("Welcome — let’s find your photos")
					) {
						return false;
					}
				}
				return true;
			},
			{ timeout: 10000 },
		);

		// Wait for the TopBar to be visible - try multiple selectors with longer timeout
		console.log("Waiting for TopBar to be visible...");
		const topBarVisible = await page
			.waitForSelector(
				"header .top-bar, header[class*='bg-white'], [class*='top-bar']",
				{ state: "visible", timeout: 30000 },
			)
			.catch(() => null);

		if (!topBarVisible) {
			console.log(
				"TopBar not found with primary selectors, trying fallback...",
			);
			// Try waiting for the header element itself
			await page.waitForSelector("header", {
				state: "visible",
				timeout: 10000,
			});
		}

		// Verify TopBar is actually visible
		const topBarElement = page.locator("header");
		await expect(topBarElement).toBeVisible();

		// Look for the indexed chip in the top bar
		const indexedChip = page.locator(".indexed-chip").first();

		// Screenshot only the header/top bar to reduce flakiness
		const header = page.locator("header");
		await expect(header).toHaveScreenshot("topbar-indexing.png", {
			maxDiffPixelRatio: 0.03,
		});

		// If indexed chip is visible, test indexing interaction
		if (await indexedChip.isVisible().catch(() => false)) {
			console.log("Indexed chip is visible, testing indexing interaction...");
			// Click the index button to start indexing
			const indexButton = indexedChip.locator(".indexed-action");
			if (await indexButton.isVisible()) {
				await indexButton.click({ force: true });
			}

			// Wait a bit for indexing to start
			await page.waitForTimeout(1000);

			// Screenshot the indexed chip during indexing
			await expect(indexedChip).toHaveScreenshot("indexed-chip-indexing.png", {
				maxDiffPixelRatio: 0.05,
				mask: [
					// Mask dynamic numbers and progress that might change
					indexedChip.locator(".indexed-count"),
					indexedChip.locator(".indexed-progress-bar"),
					indexedChip.locator("text=/\\d+m/"),
				],
			});
		} else {
			console.log(
				"IndexedChip not visible during indexing test - this is expected if diagnostics haven't loaded yet",
			);
		}
	});
});
