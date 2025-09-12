import { expect, test } from "@playwright/test";

test.describe("Visual: TopBar More Menu", () => {
  test("opens more menu and matches snapshot", async ({ page }) => {
    await page.goto("/");

    // Wait for app to settle
    await page.waitForLoadState("networkidle");

    // Dismiss Welcome screen if present
    const welcomeScreen = page
      .locator('div[class*="fixed inset-0"]')
      .filter({ hasText: "Find any photo instantly" });
    if (await welcomeScreen.isVisible().catch(() => false)) {
      const maybeLaterButton = page.getByRole("button", { name: "Maybe later" });
      if (await maybeLaterButton.isVisible().catch(() => false)) {
        await maybeLaterButton.click();
        await page.waitForTimeout(300);
      }
    }

    // Dismiss FirstRunSetup if present
    const firstRunSetup = page
      .locator('div[class*="fixed inset-0"]')
      .filter({ hasText: "Welcome — let’s find your photos" });
    if (await firstRunSetup.isVisible().catch(() => false)) {
      const skipButton = page.getByRole("button", { name: "Skip" });
      if (await skipButton.isVisible().catch(() => false)) {
        await skipButton.click();
        await page.waitForTimeout(300);
      }
    }

    // Ensure header/topbar visible
    await page
      .waitForSelector("header .top-bar, header[class*='bg-white'], [class*='top-bar']", {
        state: "visible",
        timeout: 30000,
      })
      .catch(() => null);

    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Open the More menu
    const moreButton = page.getByRole("button", { name: "More actions" });
    await moreButton.click();

    // Wait for at least one menu item to be visible
    const firstItem = page.locator(".menu-item").first();
    await expect(firstItem).toBeVisible();

    // Locate the menu container by one of its items
    const menu = firstItem.locator("..").first();

    // Ensure menu shows expected items
    await expect(page.getByRole("button", { name: /Theme/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Advanced Search/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Tag Selected/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Export/i })).toBeVisible();

    // Snapshot the menu only to reduce flakiness
    await expect(menu).toHaveScreenshot("topbar-more-menu.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
