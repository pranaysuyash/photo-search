import { expect, test } from "@playwright/test";

test.describe("Onboarding: Filters action", () => {
	test("navigates and opens Filters panel", async ({ page }) => {
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

		// Open onboarding via the header button
		const helpBtn = page.getByRole("button", { name: /Help and onboarding/i });
		await expect(helpBtn).toBeVisible();
		await helpBtn.click();

		// Advance to the Filters step: assume steps are welcome -> search -> sidebar -> upload -> filters
		const nextButtons = page.getByRole("button", { name: /^Next$/ });
		const nextButton = nextButtons.first();
		await nextButton.click({ force: true }); // welcome -> search
		await page.waitForTimeout(500);
		await nextButton.click({ force: true }); // search -> sidebar
		await page.waitForTimeout(500);
		await nextButton.click({ force: true }); // sidebar -> upload
		await page.waitForTimeout(500);
		await nextButton.click({ force: true }); // upload -> filters

		// Ensure target is visible and click helper
		const target = page.locator('[data-tour="filters-toggle"]').first();
		await expect(target).toBeVisible();

		const doIt = page.getByRole("button", { name: /Do it for me/i });
		await doIt.click({ force: true });

		// Expect the FilterPanel to be present
		const panel = page.locator('[data-testid="filter-panel"]');
		await expect(panel).toBeVisible();

		// Snapshot the panel region
		await expect(panel).toHaveScreenshot("onboarding-filter-panel.png", {
			maxDiffPixelRatio: 0.05,
		});
	});
});
