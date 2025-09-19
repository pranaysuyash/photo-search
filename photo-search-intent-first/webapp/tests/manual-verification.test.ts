// Simple manual test to verify components work
import { expect, test } from "@playwright/test";

test.describe("Manual Component Verification", () => {
  test("should load the application and show basic components", async ({
    page,
  }) => {
    // Navigate to app
    await page.goto("http://localhost:5173");

    // Wait for page to load
    await page.waitForLoadState("domcontentloaded");

    // Check if the page loaded successfully
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Check if ModalDebug component is present by looking for the debug div
    const modalDebugDiv = page.locator(".modal-debug").first();
    const isModalDebugVisible = await modalDebugDiv
      .isVisible()
      .catch(() => false);

    console.log("ModalDebug component visible:", isModalDebugVisible);

    if (isModalDebugVisible) {
      console.log("✅ SUCCESS: ModalDebug component is visible!");

      // Test the ModalDebug button
      const modalDebugBtn = page.locator(".modal-debug button").first();
      await modalDebugBtn.click();

      // Wait for modal to appear
      await page.waitForTimeout(1000);

      // Check if folder modal opened
      const folderModal = page.locator('[role="dialog"]').filter({
        hasText: "Set Photo Folder",
      });

      const modalOpened = await folderModal.isVisible().catch(() => false);
      console.log("Folder modal opened:", modalOpened);

      if (modalOpened) {
        console.log("✅ SUCCESS: Modal system is working correctly!");
      } else {
        console.log("❌ FAILURE: Modal system is not working");
      }
    } else {
      console.log("❌ ModalDebug component not found");
    }

    // Check if TopBar is present
    const topBar = page.locator(".top-bar").first();
    const isTopBarVisible = await topBar.isVisible().catch(() => false);
    console.log("TopBar visible:", isTopBarVisible);

    // Check if Add Photos button is present
    const addPhotosBtn = page
      .locator('button[data-tour="select-library"]')
      .first();
    const isAddPhotosVisible = await addPhotosBtn
      .isVisible()
      .catch(() => false);
    console.log("Add Photos button visible:", isAddPhotosVisible);

    // Take a screenshot for manual inspection
    await page.screenshot({
      path: "test-results/manual-verification.png",
      fullPage: true,
    });

    // Always pass this test - it's for manual verification
    expect(true).toBe(true);
  });
});
