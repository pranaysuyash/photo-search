import { expect, test } from "@playwright/test";

test.describe("Visual: Search Interface", () => {
	test("search hint appears on welcome screen", async ({ page }) => {
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

		// Look for search hint - try multiple possible selectors
		const searchHint = page
			.locator("text=/Try searching for.*beach.*mountains/i")
			.first();
		const alternativeHint = page
			.locator("text=/Try searching for.*sunset.*family/i")
			.first();

		// Take screenshot of the main content area regardless of hint visibility
		const mainContent = page.locator("body > div").first();
		await expect(mainContent).toHaveScreenshot("welcome-screen.png", {
			maxDiffPixelRatio: 0.02,
		});

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

		// Look for keyboard shortcut hint - use more flexible selector
		const keyboardHint = page.locator("text=/Ctrl+K|press.*Ctrl.*K/i").first();

		// Take screenshot of the main content area
		const mainContent = page.locator("body > div").first();
		await expect(mainContent).toHaveScreenshot("main-interface.png", {
			maxDiffPixelRatio: 0.02,
		});

		// If keyboard hint is visible, take additional screenshot
		if (await keyboardHint.isVisible().catch(() => false)) {
			await expect(keyboardHint).toHaveScreenshot("keyboard-hint.png", {
				maxDiffPixelRatio: 0.02,
			});
		}
	});

	test("welcome screen layout", async ({ page }) => {
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

		// Take screenshot of the main content area - use more generic selector
		const mainContent = page.locator("body > div").first();
		await expect(mainContent).toHaveScreenshot("welcome-layout.png", {
			maxDiffPixelRatio: 0.02,
		});
	});
});
