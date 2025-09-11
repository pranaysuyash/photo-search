import { expect, test } from "@playwright/test";

test.describe("Onboarding: Add Your Photos action", () => {
	test("navigates to Library and triggers Select Folder", async ({ page }) => {
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

		// Open the onboarding tour via the header button (using aria-label)
		const helpBtn = page.getByRole("button", { name: /Help and onboarding/i });
		await expect(helpBtn).toBeVisible();
		await helpBtn.click();

		// Step through to the "Add Your Photos" step (welcome -> search -> sidebar -> upload)
		const nextButtons = page.getByRole("button", { name: /^Next$/ });
		const nextButton = nextButtons.first();
		await nextButton.click({ force: true }); // welcome -> search
		await page.waitForTimeout(500);
		await nextButton.click({ force: true }); // search -> sidebar
		await page.waitForTimeout(500);
		await nextButton.click({ force: true }); // sidebar -> upload

		// Ensure the target control is present and highlighted
		const target = page.locator('[data-tour="select-library"]').first();
		await expect(target).toBeVisible();

		// Click the helper to perform the action
		const doIt = page.getByRole("button", { name: /Do it for me/i });
		await doIt.click({ force: true });

		// Expect folder modal to be visible
		const dialog = page.getByRole("dialog", { name: /Set Photo Folder/i });
		await expect(dialog).toBeVisible();

		// Snapshot the tour + target vicinity for sanity (mask dynamic)
		await expect(dialog).toHaveScreenshot("onboarding-folder-modal.png", {
			maxDiffPixelRatio: 0.05,
		});
	});
});
