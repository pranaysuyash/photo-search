import { expect, test } from "@playwright/test";
import {
	dismissOverlays,
	findBestMatch,
	safeClick,
	stableScreenshot,
} from "../utils/test-helpers";

test.describe("Visual: TopBar More Menu", () => {
	test("opens more menu and matches snapshot", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		// Dismiss overlays that can interfere with testing
		await dismissOverlays(page);

		// Ensure header/topbar visible
		await page
			.waitForSelector(
				"header .top-bar, header[class*='bg-white'], [class*='top-bar']",
				{
					state: "visible",
					timeout: 30000,
				},
			)
			.catch(() => null);

		const header = page.locator("header");
		await expect(header).toBeVisible();

		// Open the More menu using safe click
		const moreButton = page.getByRole("button", { name: "More actions" });
		await safeClick(page, moreButton);

		// Wait for at least one menu item to be visible
		const firstItem = await findBestMatch(page, ".menu-item");
		await expect(firstItem).toBeVisible();

		// Ensure menu shows expected items with better selectors
		await expect(
			page.getByRole("button", { name: /Theme/i }).first(),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: /Advanced Search/i }).first(),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: /Tag Selected/i }).first(),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: /Export/i }).first(),
		).toBeVisible();

		// Take stable screenshot of the menu
		await stableScreenshot(page, {
			name: "topbar-more-menu.png",
			maxDiffPixelRatio: 0.05,
			fullPage: false,
		});
	});
});
