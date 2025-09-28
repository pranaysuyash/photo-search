import { test, expect } from "@playwright/test";
import { waitForAppReady, dismissOverlays } from "../utils/test-helpers";

test("Debug: Test More button behavior", async ({ page }) => {
  await waitForAppReady(page);
  await dismissOverlays(page);

  // Click the More button
  await page.click('button[aria-label="More actions"]');

  // Wait a bit and see what happens
  await page.waitForTimeout(1000);

  // Take screenshot to see if anything opened
  await page.screenshot({ path: "debug-more-clicked.png", fullPage: true });

  // Check for any menus or dropdowns
  const menus = await page
    .locator('[role="menu"], .menu, .dropdown, [role="dialog"]')
    .all();
  console.log(`Found ${menus.length} potential menus after clicking More`);

  for (let i = 0; i < menus.length; i++) {
    const menu = menus[i];
    const isVisible = await menu.isVisible();
    const text = await menu.textContent();
    console.log(
      `Menu ${i + 1}: visible=${isVisible}, text="${text?.substring(
        0,
        100
      )}..."`
    );
  }
});
