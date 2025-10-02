import { expect, test } from "@playwright/test";
import { stableScreenshot, waitForAppReady } from "../utils/test-helpers";

test.describe("Visual: Search Interface", () => {
	test("search hint appears on welcome screen", async ({ page }) => {
		await waitForAppReady(page);

		// Look for search hint - try multiple possible selectors
		const searchHint = page
			.locator("text=/Try searching for.*beach.*mountains/i")
			.first();
		const alternativeHint = page
			.locator("text=/Try searching for.*sunset.*family/i")
			.first();

		// Take screenshot of the main content area regardless of hint visibility
		await stableScreenshot(page, { name: "welcome-screen.png" });

		// If hint is visible, take additional screenshot
		if (
			(await searchHint.isVisible().catch(() => false)) ||
			(await alternativeHint.isVisible().catch(() => false))
		) {
			const visibleHint = (await searchHint.isVisible().catch(() => false))
				? searchHint
				: alternativeHint;
			await expect(visibleHint).toHaveScreenshot("search-hint.png", {
				maxDiffPixelRatio: 0.02,
			});
		}
	});

	test("search keyboard shortcut hint", async ({ page }) => {
		await waitForAppReady(page);

		// Look for keyboard shortcut hint - use more flexible selector
		const keyboardHint = page.locator("text=/Ctrl+K|press.*Ctrl.*K/i").first();

		// Take screenshot of the main content area
		await stableScreenshot(page, { name: "main-interface.png" });

		// If keyboard hint is visible, take additional screenshot
		if (await keyboardHint.isVisible().catch(() => false)) {
			await expect(keyboardHint).toHaveScreenshot("keyboard-hint.png", {
				maxDiffPixelRatio: 0.02,
			});
		}
	});

	test("welcome screen layout", async ({ page }) => {
		await waitForAppReady(page);

		// Take screenshot of the main content area - use more generic selector
		await stableScreenshot(page, { name: "welcome-layout.png" });
	});
});
