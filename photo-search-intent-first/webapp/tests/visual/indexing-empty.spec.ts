import { expect, test } from "@playwright/test";

test.describe("Visual: Indexing Empty State", () => {
	test("shows skeleton grid and stable progress", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/" + "?visual=indexing");
		await expect(page.getByText("Indexing Your Photos")).toBeVisible();
		await expect(page.getByText(/42% complete/)).toBeVisible();

		await expect(page).toHaveScreenshot("indexing-empty.png", {
			mask: [page.locator(".skeleton-box")],
		});
	});
});
