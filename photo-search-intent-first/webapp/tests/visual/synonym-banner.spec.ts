import { expect, test } from "@playwright/test";

test.describe("Visual: Synonym banner", () => {
	test("shows 'Showing results for …' banner with aria-live", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/" + "?visual=synonym-banner");
		const banner = page.getByTestId("synonym-banner");
		await expect(banner).toBeVisible();
		await expect(banner).toHaveAttribute("aria-live", "polite");
		await expect(page).toHaveScreenshot("synonym-banner.png");
	});
});
