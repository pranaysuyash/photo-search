import { expect, test } from "@playwright/test";

test.describe("Visual: No results with Did You Mean", () => {
	test("renders contextual tips and DYM chips", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/" + "?visual=no-results&q=chidlren&dym=children,child");

		await expect(page.getByText(/No results for/)).toBeVisible();
		await expect(page.getByText("Did you mean:")).toBeVisible();
		await expect(page.getByRole("button", { name: "children" })).toBeVisible();

		await expect(page).toHaveScreenshot("no-results-did-you-mean.png", {
			mask: [],
		});
	});
});
