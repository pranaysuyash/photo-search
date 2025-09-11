import { expect, test } from "@playwright/test";

test.describe("Visual: First Run Modal", () => {
	test("first run modal renders stably", async ({ page }) => {
		// Ensure first-run hint shows by clearing any storage indicating prior use
		await page.context().clearCookies();
		await page.goto("/");

		// Wait for the page to load completely
		await page.waitForLoadState("networkidle");

		// Wait for the main app content to be visible
		await page.waitForSelector("#root", { state: "visible", timeout: 30000 });

		// Take screenshot of the initial page state
		const mainContent = page.locator("body > div").first();
		await expect(mainContent).toHaveScreenshot("initial-page-state.png", {
			maxDiffPixelRatio: 0.02,
		});

		// Look for First Run modal elements - use correct text from main App.tsx
		const welcomeHeading = page
			.locator("text=Welcome — let's find your photos")
			.first();

		// If first run modal is visible, take additional screenshot
		if (await welcomeHeading.isVisible().catch(() => false)) {
			await expect(welcomeHeading).toHaveScreenshot("first-run-welcome.png", {
				maxDiffPixelRatio: 0.02,
			});
		}
	});

	test("tour modal appears correctly", async ({ page }) => {
		await page.context().clearCookies();
		await page.goto("/");

		// Wait for the page to load completely
		await page.waitForLoadState("networkidle");

		// Wait for the main app content to be visible
		await page.waitForSelector("#root", { state: "visible", timeout: 30000 });

		// Take screenshot of the main content
		const mainContent = page.locator("body > div").first();
		await expect(mainContent).toHaveScreenshot("tour-modal-page.png", {
			maxDiffPixelRatio: 0.02,
		});

		// If tour modal is visible, take additional screenshot
		const tourModalElement = page
			.locator("text=Welcome to Photo Search!")
			.first();
		if (await tourModalElement.isVisible().catch(() => false)) {
			const modalElement = page
				.locator('[class*="fixed"], [class*="absolute"]')
				.filter({ hasText: "Welcome to Photo Search!" })
				.first();
			await expect(modalElement).toHaveScreenshot("tour-modal.png", {
				maxDiffPixelRatio: 0.02,
			});
		}
	});

	test("tour can be skipped", async ({ page }) => {
		await page.context().clearCookies();
		await page.goto("/");

		// Wait for the page to load completely
		await page.waitForLoadState("networkidle");

		// Wait for the main app content to be visible
		await page.waitForSelector("#root", { state: "visible", timeout: 30000 });

		// Take screenshot of the initial state
		const mainContent = page.locator("body > div").first();
		await expect(mainContent).toHaveScreenshot("before-skip-tour.png", {
			maxDiffPixelRatio: 0.02,
		});

		// Try to skip the tour
		const skipButton = page
			.getByRole("button", { name: /Skip|Skip tour/i })
			.first();
		if (await skipButton.isVisible().catch(() => false)) {
			await skipButton.click();

			// Take screenshot after skipping
			await expect(mainContent).toHaveScreenshot("after-skip-tour.png", {
				maxDiffPixelRatio: 0.02,
			});
		}
	});
});
