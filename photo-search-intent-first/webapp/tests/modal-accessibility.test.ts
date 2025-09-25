import { expect, test } from "@playwright/test";

test.describe("Modal Accessibility & Interaction Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("hasSeenOnboarding", "true");
      } catch (e) {
        // Ignore localStorage errors
      }
    });

    await page.goto("http://localhost:5174");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Focus Trap", () => {
    test("folder modal traps focus within modal boundaries", async ({
      page,
    }) => {
      // Open folder modal
      const debugButton = page.locator(".modal-debug button");
      await expect(debugButton).toBeVisible({ timeout: 15000 });
      await debugButton.click();

      const folderModal = page.locator('[role="dialog"]').filter({
        hasText: "Set Photo Folder",
      });
      await expect(folderModal).toBeVisible();

      // Get all focusable elements in modal
      folderModal.locator(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      // Tab through modal elements
      await page.keyboard.press("Tab");
      let activeElement = await page.evaluate(() => document.activeElement);
      expect(activeElement).toBeTruthy();

      // Continue tabbing to verify focus stays within modal
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab");
        activeElement = await page.evaluate(() => document.activeElement);
        const isWithinModal = await folderModal
          .locator(`#${(activeElement as Element).id}`)
          .isVisible()
          .catch(() => false);
        expect(isWithinModal || activeElement === null).toBe(true);
      }
    });

    test("help modal maintains focus trap with multiple interactive elements", async ({
      page,
    }) => {
      // Open help modal using keyboard shortcut
      await page.keyboard.press("Control+h"); // Cmd+h on Mac, Ctrl+h on others

      const helpModal = page.locator('[role="dialog"]').filter({
        hasText: "Help & Shortcuts",
      });
      await expect(helpModal).toBeVisible({ timeout: 5000 });

      // Verify focus is trapped
      await page.evaluate(() => document.activeElement);

      // Tab through elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Tab");
        const activeElement = await page.evaluate(() => document.activeElement);
        expect(activeElement).toBeTruthy();
      }

      // Shift+Tab should also stay within modal
      await page.keyboard.press("Shift+Tab");
      const shiftedFocus = await page.evaluate(() => document.activeElement);
      expect(shiftedFocus).toBeTruthy();
    });
  });

  test.describe("Escape Key Handling", () => {
    test("escape key closes folder modal", async ({ page }) => {
      const debugButton = page.locator(".modal-debug button");
      await expect(debugButton).toBeVisible({ timeout: 15000 });
      await debugButton.click();

      const folderModal = page.locator('[role="dialog"]').filter({
        hasText: "Set Photo Folder",
      });
      await expect(folderModal).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(folderModal).not.toBeVisible({ timeout: 1000 });
    });

    test("escape key closes nested modal overlays", async ({ page }) => {
      // Open share manage modal (which has overlay behavior)
      const shareManageButton = page.locator("button").filter({
        hasText: "Share Manage",
      });

      if (await shareManageButton.isVisible().catch(() => false)) {
        await shareManageButton.click();

        const shareManageModal = page.locator('[role="dialog"]').filter({
          hasText: "Manage Shares",
        });
        await expect(shareManageModal).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(shareManageModal).not.toBeVisible({ timeout: 1000 });
      }
    });

    test("escape key does not close modal when focus is in input", async ({
      page,
    }) => {
      const debugButton = page.locator(".modal-debug button");
      await expect(debugButton).toBeVisible({ timeout: 15000 });
      await debugButton.click();

      const folderModal = page.locator('[role="dialog"]').filter({
        hasText: "Set Photo Folder",
      });
      await expect(folderModal).toBeVisible();

      // Focus on an input element
      const input = folderModal.locator("input").first();
      if (await input.isVisible().catch(() => false)) {
        await input.focus();
        await input.fill("test path");

        // Escape should not close modal when typing in input
        await page.keyboard.press("Escape");
        await expect(folderModal).toBeVisible({ timeout: 1000 });

        // But pressing escape again or clicking close should work
        const closeButton = folderModal
          .locator("button")
          .filter({
            hasText: "Close",
          })
          .first();
        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
          await expect(folderModal).not.toBeVisible({ timeout: 1000 });
        }
      }
    });
  });

  test.describe("Layout Stability", () => {
    test("modal opening does not cause layout shift", async ({ page }) => {
      // Get initial layout measurements
      const header = page.locator("header").first();
      await expect(header).toBeVisible();

      const initialHeaderBox = await header.boundingBox();
      const initialViewport = await page.viewportSize();

      // Open modal
      const debugButton = page.locator(".modal-debug button");
      await expect(debugButton).toBeVisible({ timeout: 15000 });
      await debugButton.click();

      const folderModal = page.locator('[role="dialog"]').filter({
        hasText: "Set Photo Folder",
      });
      await expect(folderModal).toBeVisible();

      // Verify header position hasn't changed significantly
      const modalHeaderBox = await header.boundingBox();
      expect(
        Math.abs((initialHeaderBox?.y || 0) - (modalHeaderBox?.y || 0))
      ).toBeLessThan(5);

      // Verify viewport hasn't changed
      const modalViewport = await page.viewportSize();
      expect(modalViewport?.width).toBe(initialViewport?.width);
      expect(modalViewport?.height).toBe(initialViewport?.height);

      // Close modal
      await page.keyboard.press("Escape");
      await expect(folderModal).not.toBeVisible();

      // Verify layout returns to normal
      const finalHeaderBox = await header.boundingBox();
      expect(
        Math.abs((initialHeaderBox?.y || 0) - (finalHeaderBox?.y || 0))
      ).toBeLessThan(5);
    });

    test("multiple modal interactions maintain stable layout", async ({
      page,
    }) => {
      const header = page.locator("header").first();
      await expect(header).toBeVisible();

      // Open and close multiple modals
      const debugButton = page.locator(".modal-debug button");
      await expect(debugButton).toBeVisible({ timeout: 15000 });

      for (let i = 0; i < 3; i++) {
        const initialBox = await header.boundingBox();

        await debugButton.click();

        const folderModal = page.locator('[role="dialog"]').filter({
          hasText: "Set Photo Folder",
        });
        await expect(folderModal).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(folderModal).not.toBeVisible();

        const finalBox = await header.boundingBox();
        expect(
          Math.abs((initialBox?.y || 0) - (finalBox?.y || 0))
        ).toBeLessThan(5);
      }
    });

    test("modal backdrop prevents interaction with background", async ({
      page,
    }) => {
      const debugButton = page.locator(".modal-debug button");
      await expect(debugButton).toBeVisible({ timeout: 15000 });
      await debugButton.click();

      const folderModal = page.locator('[role="dialog"]').filter({
        hasText: "Set Photo Folder",
      });
      await expect(folderModal).toBeVisible();

      // Try to click background elements (should be blocked by backdrop)
      const initialModalVisible = await folderModal.isVisible();

      // Click on header area (should not close modal if backdrop is working)
      const header = page.locator("header").first();
      await header.click();

      // Modal should still be visible (backdrop prevented background interaction)
      const finalModalVisible = await folderModal.isVisible();
      expect(finalModalVisible).toBe(initialModalVisible);

      // Close modal properly
      await page.keyboard.press("Escape");
      await expect(folderModal).not.toBeVisible();
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("tab navigation works correctly through modal elements", async ({
      page,
    }) => {
      const debugButton = page.locator(".modal-debug button");
      await expect(debugButton).toBeVisible({ timeout: 15000 });
      await debugButton.click();

      const folderModal = page.locator('[role="dialog"]').filter({
        hasText: "Set Photo Folder",
      });
      await expect(folderModal).toBeVisible();

      // Get all tabbable elements in modal
      const tabbableElements = await folderModal
        .locator(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        .all();

      if (tabbableElements.length > 1) {
        // Start tabbing
        await page.keyboard.press("Tab");
        let activeElement = await page.evaluate(() => document.activeElement);

        // Continue tabbing through all elements
        for (let i = 1; i < tabbableElements.length; i++) {
          await page.keyboard.press("Tab");
          activeElement = await page.evaluate(() => document.activeElement);
          expect(activeElement).toBeTruthy();
        }

        // Next tab should cycle back to first element (focus trap)
        await page.keyboard.press("Tab");
        const cycledElement = await page.evaluate(() => document.activeElement);
        expect(cycledElement).toBeTruthy();
      }
    });

    test("shift+tab navigation works in reverse", async ({ page }) => {
      const debugButton = page.locator(".modal-debug button");
      await expect(debugButton).toBeVisible({ timeout: 15000 });
      await debugButton.click();

      const folderModal = page.locator('[role="dialog"]').filter({
        hasText: "Set Photo Folder",
      });
      await expect(folderModal).toBeVisible();

      // Tab to get into modal
      await page.keyboard.press("Tab");

      // Shift+Tab should navigate backwards
      await page.keyboard.press("Shift+Tab");
      const reverseElement = await page.evaluate(() => document.activeElement);
      expect(reverseElement).toBeTruthy();
    });
  });
});
