import { expect, test } from "@playwright/test";
import { dismissOverlays, stableScreenshot, findBestMatch } from "../utils/test-helpers";

test.describe("Visual: No results with Did You Mean", () => {
	test("renders contextual tips and DYM chips", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/" + "?visual=no-results&q=chidlren&dym=children,child");

		await page.waitForLoadState("networkidle");
		await dismissOverlays(page);

		await expect(page.getByText(/No results for/)).toBeVisible();
		await expect(page.getByText("Did you mean:")).toBeVisible();

		// Find the best "children" button using enhanced helper
		const childrenButton = await findBestMatch(page, 'button:has-text("children")', ".did-you-mean");
		await expect(childrenButton).toBeVisible();

		// Take stable screenshot
		await stableScreenshot(page, {
			name: "no-results-did-you-mean.png",
		});
	});
});
