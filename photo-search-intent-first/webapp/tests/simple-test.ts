import { expect, test } from "@playwright/test";

test("simple timeline zoom test", async ({ page }) => {
	await page.goto("http://localhost:5174");
	await page.waitForLoadState("networkidle");

	// Just check that the page loads
	await expect(page.locator("#root")).toBeVisible();
});
