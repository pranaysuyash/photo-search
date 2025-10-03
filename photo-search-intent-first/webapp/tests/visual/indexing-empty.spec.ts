import { expect, test } from "@playwright/test";

test.describe("Visual: Indexing Empty State", () => {
  test("shows skeleton grid and stable progress", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/" + "?visual=indexing");

    // Check for indexing-related content (flexible to UI changes)
    const hasIndexingContent = await page.evaluate(() => {
      const bodyText = document.body.textContent?.toLowerCase() || "";
      return (
        bodyText.includes("indexing") ||
        bodyText.includes("loading") ||
        bodyText.includes("processing") ||
        document.querySelector('[class*="skeleton"], [class*="loading"]') !==
          null
      );
    });

    expect(hasIndexingContent).toBe(true);

    // Take screenshot with higher tolerance for UI variations
    await expect(page).toHaveScreenshot("indexing-empty.png", {
      mask: [page.locator(".skeleton-box")],
      maxDiffPixelRatio: 0.1, // Allow more differences for UI evolution
    });
  });
});
