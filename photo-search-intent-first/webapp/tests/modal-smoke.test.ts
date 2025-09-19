import { expect, test } from "@playwright/test";

test.describe("Modal smoke check", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("hasSeenOnboarding", "true");
      } catch {}
    });

    await page.goto("http://localhost:5174");
    await page.waitForLoadState("networkidle");
  });

  test("folder modal opens without tearing down layout", async ({ page }) => {
    const debugButton = page.locator(".modal-debug button");
    await expect(debugButton).toBeVisible({ timeout: 15000 });

    const appHeader = page.locator("header").first();
    await expect(appHeader).toBeVisible();

    await debugButton.click();

    await page.waitForFunction(
      () => (window as unknown as { __modalState?: Record<string, boolean> }).__modalState?.folder === true,
      { timeout: 5000 }
    );

    const folderModal = page.locator('[role="dialog"]').filter({
      hasText: "Set Photo Folder",
    });
    await expect(folderModal).toBeVisible();

    // Verify main chrome stays rendered while modal is open.
    await expect(appHeader).toBeVisible();
    await expect(debugButton).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(folderModal).not.toBeVisible();

    await page.waitForFunction(
      () => !(window as unknown as { __modalState?: Record<string, boolean> }).__modalState?.folder,
      { timeout: 5000 }
    );
  });
});
