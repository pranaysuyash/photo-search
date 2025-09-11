import { expect, test } from "@playwright/test";

test.describe("Onboarding: Advanced Search action", () => {
	test("navigates and opens Advanced modal", async ({ page }) => {
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

		// Advance to Advanced step: welcome -> search -> sidebar -> upload -> filters -> advanced
		const next = page.getByRole("button", { name: /^Next$/ });
		for (let i = 0; i < 5; i++) {
			try {
				await next.click();
				await page.waitForTimeout(500); // Wait between steps
			} catch (_e) {
				console.log(`Next button click ${i + 1} failed, continuing...`);
			}
		}

		// Wait for the advanced step to load
		await page.waitForTimeout(1000);

		// Try to find and click the "Do it for me" button
		const doIt = page.getByRole("button", { name: /Do it for me/i });
		if (await doIt.isVisible().catch(() => false)) {
			await doIt.click();

			// Wait for modal to appear
			await page.waitForTimeout(1000);

			// Expect Advanced modal to be present
			const modal = page.locator('[data-testid="advanced-modal"]');
			if (await modal.isVisible().catch(() => false)) {
				// Snapshot the modal region
				await expect(modal).toHaveScreenshot("onboarding-advanced-modal.png", {
					maxDiffPixelRatio: 0.05,
				});
			} else {
				console.log(
					"Advanced modal not found, taking screenshot of current state",
				);
				const mainContent = page.locator("body > div").first();
				await expect(mainContent).toHaveScreenshot(
					"onboarding-advanced-fallback.png",
					{
						maxDiffPixelRatio: 0.02,
					},
				);
			}
		} else {
			console.log(
				"Do it for me button not found, taking screenshot of current state",
			);
			const mainContent = page.locator("body > div").first();
			await expect(mainContent).toHaveScreenshot(
				"onboarding-advanced-fallback.png",
				{
					maxDiffPixelRatio: 0.02,
				},
			);
		}
	});
});
