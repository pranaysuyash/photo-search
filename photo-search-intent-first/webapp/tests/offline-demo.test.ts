import { expect, test } from "@playwright/test";
import { waitForAppReady } from "./utils/test-helpers";

const DEMO_OPTION_VALUE = "demo-browser";

test.describe("Browser Demo Library", () => {
  test("renders manifest photos without hitting API", async ({ page }) => {
    let trackApiRequests = false;
    const apiRequests: string[] = [];

    await page.route("**/api/**", (route) => {
      if (trackApiRequests) {
        apiRequests.push(route.request().url());
      }
      route.continue();
    });

    await waitForAppReady(page, { skipOnboarding: true });

    const librarySelect = page.locator("#library-select");
    await expect(librarySelect).toBeVisible();

    trackApiRequests = true;
    await librarySelect.selectOption(DEMO_OPTION_VALUE);

    const thumbnails = page.locator('img[alt^="Photo:"]');
    await expect(thumbnails.first()).toBeVisible();
    await expect(thumbnails).toHaveCountGreaterThan(5);

    const firstSrc = await thumbnails.first().getAttribute("src");
    expect(firstSrc?.startsWith("data:"), "thumbnail should be a data URI").toBeTruthy();

    const searchInput = page.locator('input[placeholder*="Search" i]');
    await searchInput.fill("beach");
    await searchInput.press("Enter");
    await expect(thumbnails.first()).toBeVisible();

    expect(apiRequests, "No backend API calls should be made in demo mode").toHaveLength(0);
  });
});
