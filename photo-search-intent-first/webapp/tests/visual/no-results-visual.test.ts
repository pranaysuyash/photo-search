import { expect, test } from "@playwright/test";

async function dismissWelcomeAndFirstRun(page: any) {
	await page.waitForLoadState("networkidle");
	const welcomeScreen = page
		.locator('[data-testid="welcome-screen"], .welcome-screen')
		.first();
	if (await welcomeScreen.isVisible().catch(() => false)) {
		const demoButton = page
			.getByRole("button", { name: /demo|try demo/i })
			.first();
		const skipButton = page
			.getByRole("button", { name: /skip|close|maybe later/i })
			.first();
		if (await demoButton.isVisible().catch(() => false))
			await demoButton.click();
		else if (await skipButton.isVisible().catch(() => false))
			await skipButton.click();
	}
	const firstRunSetup = page
		.locator('[data-testid="first-run-setup"], .first-run-setup')
		.first();
	if (await firstRunSetup.isVisible().catch(() => false)) {
		const skipButton = page
			.getByRole("button", { name: /skip|close|maybe later/i })
			.first();
		if (await skipButton.isVisible().catch(() => false))
			await skipButton.click();
	}
}

test.describe("Visual: No results and suggestions", () => {
	test("no results empty state with suggestions", async ({ page }) => {
		await page.goto("/");
		await dismissWelcomeAndFirstRun(page);

		// Focus the inline search input and type a query that likely has no results (no backend dependency)
		const inlineSearch = page.getByRole("textbox", {
			name: /what are you looking for/i,
		});
		await inlineSearch.click();
		await inlineSearch.fill("kid");
		await inlineSearch.press("Enter");

		// Switch to results view via bottom navigation (search tab)
		const searchTab = page.getByRole("button", { name: /search/i }).last();
		await searchTab.click();

		// Expect the enhanced empty state to be visible (no results for "kid")
		const emptyState = page.locator('text=/No results for\s+"kid"/i').first();
		await expect(emptyState).toBeVisible({ timeout: 10000 });

		// Screenshot the empty state area
		const mainContent = page.locator("#root").first();
		await expect(mainContent).toHaveScreenshot("no-results-kid.png", {
			maxDiffPixelRatio: 0.05,
		});
	});
});
