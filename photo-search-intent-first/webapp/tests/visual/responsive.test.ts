import { expect, test } from "@playwright/test";

test.describe("Visual: Responsive Design", () => {
	test.describe("Desktop Viewport", () => {
		test.use({ viewport: { width: 1920, height: 1080 } });

		test("desktop layout renders correctly", async ({ page }) => {
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

			await expect(page).toHaveScreenshot("desktop-layout.png", {
				fullPage: true,
				maxDiffPixelRatio: 0.02,
			});
		});
	});

	test.describe("Tablet Viewport", () => {
		test.use({ viewport: { width: 768, height: 1024 } });

		test("tablet layout renders correctly", async ({ page }) => {
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

			await expect(page).toHaveScreenshot("tablet-layout.png", {
				fullPage: true,
				maxDiffPixelRatio: 0.02,
			});
		});
	});

	test.describe("Mobile Viewport", () => {
		test.use({ viewport: { width: 375, height: 667 } });

		test("mobile layout renders correctly", async ({ page }) => {
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

			await expect(page).toHaveScreenshot("mobile-layout.png", {
				fullPage: true,
				maxDiffPixelRatio: 0.02,
			});
		});
	});
});
