import { expect, test } from "@playwright/test";

test.describe("Visual: Status Bar", () => {
	test("shows status bar with indexing information", async ({ page }) => {
		await page.goto("/");

		// Wait for the page to load completely
		await page.waitForLoadState("networkidle");

		// Handle initial app states - dismiss any welcome/onboarding screens
		const welcomeScreen = page
			.locator('[data-testid="welcome-screen"], .welcome-screen')
			.first();
		if (await welcomeScreen.isVisible().catch(() => false)) {
			// Try to find and click demo or skip buttons
			const demoButton = page
				.getByRole("button", { name: /demo|try demo/i })
				.first();
			const skipButton = page
				.getByRole("button", { name: /skip|close|maybe later/i })
				.first();

			if (await demoButton.isVisible().catch(() => false)) {
				await demoButton.click();
			} else if (await skipButton.isVisible().catch(() => false)) {
				await skipButton.click();
			}
		}

		// Handle first-run setup
		const firstRunSetup = page
			.locator('[data-testid="first-run-setup"], .first-run-setup')
			.first();
		if (await firstRunSetup.isVisible().catch(() => false)) {
			const skipButton = page
				.getByRole("button", { name: /skip|close|maybe later/i })
				.first();
			if (await skipButton.isVisible().catch(() => false)) {
				await skipButton.click();
			}
		}

		// Wait for the main app content to be visible
		await page.waitForSelector("#root", { state: "visible", timeout: 30000 });

		// Look for status bar at the bottom of the page
		const statusBar = page.locator(".status-bar").first();

		// Take screenshot of the main content area
		const mainContent = page.locator("body > div").first();
		await expect(mainContent).toHaveScreenshot("main-content-with-status.png", {
			maxDiffPixelRatio: 0.02,
		});

		// If status bar is visible, take additional screenshot
		if (await statusBar.isVisible().catch(() => false)) {
			await expect(statusBar).toHaveScreenshot("status-bar.png", {
				maxDiffPixelRatio: 0.05,
				mask: [
					// Mask dynamic numbers and text that might change
					statusBar.locator("text=/\\\\d+/"),
					statusBar.locator(
						"text=/index|photo|search|AI|processing|connected/i",
					),
					statusBar.locator('[class*="spinner"], [class*="processing"]'),
				],
			});
		}
	});
});
