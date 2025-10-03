import { expect, test } from "@playwright/test";
import {
  stableScreenshot,
  waitForAppReady,
  waitForSearchInput,
} from "../utils/test-helpers";

test.describe("Visual: No results and suggestions", () => {
  test("no results empty state with suggestions", async ({ page }) => {
    await waitForAppReady(page);

    // Focus the inline search input and type a query that likely has no results (no backend dependency)
    const inlineSearch = await waitForSearchInput(page);
    await inlineSearch.fill("kid");
    await inlineSearch.press("Enter");

    // Switch to results view via bottom navigation (search tab)
    const searchTab = page.getByRole("button", { name: /search/i }).last();
    await searchTab.click();

    // Wait for search to complete and check for empty state or suggestions
    await page.waitForTimeout(2000);

    // Check if we have either: explicit no results text OR helpful suggestions (new UX behavior)
    const hasEmptyStateOrSuggestions = await page.evaluate(() => {
      const bodyText = document.body.textContent?.toLowerCase() || "";
      const hasNoResultsText =
        bodyText.includes("no results") || bodyText.includes("found nothing");
      const hasSuggestions =
        bodyText.includes("try") ||
        bodyText.includes("suggest") ||
        bodyText.includes("search tip") ||
        bodyText.includes("did you mean");

      return hasNoResultsText || hasSuggestions;
    });

    // The new UX should show either no results text or helpful suggestions
    expect(hasEmptyStateOrSuggestions).toBe(true);

    // Screenshot the empty state area
    await stableScreenshot(page, {
      name: "no-results-kid.png",
      maxDiffPixelRatio: 0.05,
    });
  });
});
