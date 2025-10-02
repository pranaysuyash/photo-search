import { expect, test } from "@playwright/test";

test.describe("Visual: SmartAlbumSuggestions Responsive", () => {
	test.describe("Desktop Viewport (1920x1080)", () => {
		test.use({ viewport: { width: 1920, height: 1080 } });

		test("smart album suggestions desktop layout", async ({ page }) => {
			await page.goto("/smart-album-test.html");

			// Wait for the component to load
			await page.waitForSelector(
				'[aria-labelledby="smart-album-suggestions-heading"]',
				{ timeout: 30000 },
			);

			// Get the SmartAlbumSuggestions component
			const smartAlbumSuggestions = page
				.locator('[aria-labelledby="smart-album-suggestions-heading"]')
				.first();

			// Take screenshot of the component in expanded state (default)
			await expect(smartAlbumSuggestions).toHaveScreenshot(
				"smart-album-suggestions-desktop-expanded.png",
				{
					maxDiffPixelRatio: 0.02,
				},
			);

			// Test collapsed sections by clicking section headers
			const sectionButtons = smartAlbumSuggestions.locator(
				'button[aria-expanded="true"]',
			);
			const sectionCount = await sectionButtons.count();

			// Collapse all sections
			for (let i = 0; i < sectionCount; i++) {
				await sectionButtons.nth(i).click();
			}

			// Take screenshot with all sections collapsed
			await expect(smartAlbumSuggestions).toHaveScreenshot(
				"smart-album-suggestions-desktop-collapsed.png",
				{
					maxDiffPixelRatio: 0.02,
				},
			);

			// Expand one section for partial state test
			const firstSectionButton = smartAlbumSuggestions
				.locator('button[aria-expanded="false"]')
				.first();
			if (await firstSectionButton.isVisible().catch(() => false)) {
				await firstSectionButton.click();

				await expect(smartAlbumSuggestions).toHaveScreenshot(
					"smart-album-suggestions-desktop-partial.png",
					{
						maxDiffPixelRatio: 0.02,
					},
				);
			}
		});
	});

	test.describe("Tablet Viewport (768x1024)", () => {
		test.use({ viewport: { width: 768, height: 1024 } });

		test("smart album suggestions tablet layout", async ({ page }) => {
			await page.goto("/smart-album-test.html");

			// Wait for the component to load
			await page.waitForSelector(
				'[aria-labelledby="smart-album-suggestions-heading"]',
				{ timeout: 30000 },
			);

			// Get the SmartAlbumSuggestions component
			const smartAlbumSuggestions = page
				.locator('[aria-labelledby="smart-album-suggestions-heading"]')
				.first();

			// Take screenshot of the component in expanded state (default)
			await expect(smartAlbumSuggestions).toHaveScreenshot(
				"smart-album-suggestions-tablet-expanded.png",
				{
					maxDiffPixelRatio: 0.02,
				},
			);

			// Test collapsed sections by clicking section headers
			const sectionButtons = smartAlbumSuggestions.locator(
				'button[aria-expanded="true"]',
			);
			const sectionCount = await sectionButtons.count();

			// Collapse all sections
			for (let i = 0; i < sectionCount; i++) {
				await sectionButtons.nth(i).click();
			}

			// Take screenshot with all sections collapsed
			await expect(smartAlbumSuggestions).toHaveScreenshot(
				"smart-album-suggestions-tablet-collapsed.png",
				{
					maxDiffPixelRatio: 0.02,
				},
			);
		});
	});

	test.describe("Mobile Viewport (375x667)", () => {
		test.use({ viewport: { width: 375, height: 667 } });

		test("smart album suggestions mobile layout", async ({ page }) => {
			await page.goto("/smart-album-test.html");

			// Wait for the component to load
			await page.waitForSelector(
				'[aria-labelledby="smart-album-suggestions-heading"]',
				{ timeout: 30000 },
			);

			// Get the SmartAlbumSuggestions component
			const smartAlbumSuggestions = page
				.locator('[aria-labelledby="smart-album-suggestions-heading"]')
				.first();

			// Take screenshot of the component in expanded state (default)
			await expect(smartAlbumSuggestions).toHaveScreenshot(
				"smart-album-suggestions-mobile-expanded.png",
				{
					maxDiffPixelRatio: 0.02,
				},
			);

			// Test collapsed sections by clicking section headers
			const sectionButtons = smartAlbumSuggestions.locator(
				'button[aria-expanded="true"]',
			);
			const sectionCount = await sectionButtons.count();

			// Collapse all sections
			for (let i = 0; i < sectionCount; i++) {
				await sectionButtons.nth(i).click();
			}

			// Take screenshot with all sections collapsed
			await expect(smartAlbumSuggestions).toHaveScreenshot(
				"smart-album-suggestions-mobile-collapsed.png",
				{
					maxDiffPixelRatio: 0.02,
				},
			);
		});
	});
});
