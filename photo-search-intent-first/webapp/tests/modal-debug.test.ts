// Simple test to verify ModalDebug component works
import { expect, test } from "@playwright/test";

test("ModalDebug component should work", async ({ page }) => {
  // Navigate to app
  await page.goto("http://localhost:5174");

  // Wait for page to load
  await page.waitForLoadState("networkidle");

  // Check if ModalDebug component is visible
  const modalDebugBtn = page
    .locator("button:has-text(\"Test actions.open('folder')\")")
    .first();

  // If ModalDebug is not visible, the component wasn't added properly
  const isVisible = await modalDebugBtn.isVisible().catch(() => false);

  if (!isVisible) {
    console.log("ModalDebug component not found on page");
    // Take screenshot for debugging
    await page.screenshot({ path: "test-results/modal-debug-missing.png" });
    throw new Error("ModalDebug component not visible");
  }

  console.log("ModalDebug component found, clicking test button...");

  // Click the test button
  await modalDebugBtn.click();

  // Wait for modal to appear
  await page.waitForTimeout(1000);

  // Check if folder modal opened
  const folderModal = page.locator('[role="dialog"]').filter({
    hasText: "Set Photo Folder",
  });

  const modalOpened = await folderModal.isVisible().catch(() => false);

  if (modalOpened) {
    console.log(
      "SUCCESS: Modal system works! Modal opened after clicking ModalDebug button."
    );
  } else {
    console.log("FAILURE: Modal system not working. Modal did not open.");
    // Take screenshot for debugging
    await page.screenshot({ path: "test-results/modal-debug-failed.png" });
    throw new Error("Modal did not open from ModalDebug component");
  }
});
