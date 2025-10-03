// Debug test to understand the current app structure
import { expect, test } from "@playwright/test";

test.describe("Debug App Structure", () => {
  test("should analyze current page structure", async ({ page }) => {
    // Navigate to app
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Take screenshot for visual reference
    await page.screenshot({ path: "debug-app-structure.png", fullPage: true });

    // Analyze page content
    const content = await page.content();
    console.log("Page content length:", content.length);

    // Look for any input elements
    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    console.log("Number of input elements:", inputCount);

    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute("type");
      const placeholder = await input.getAttribute("placeholder");
      const isVisible = await input.isVisible();
      console.log(`Input ${i}: type=${type}, placeholder=${placeholder}, visible=${isVisible}`);
    }

    // Look for any form elements
    const forms = page.locator("form");
    const formCount = await forms.count();
    console.log("Number of form elements:", formCount);

    // Look for search-related elements
    const searchElements = page.locator('[data-testid*="search" i], [class*="search" i], [id*="search" i]');
    const searchCount = await searchElements.count();
    console.log("Number of search-related elements:", searchCount);

    // Look for button elements
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    console.log("Number of button elements:", buttonCount);

    // Check for main content areas
    const mainAreas = page.locator("main, [role='main'], #main, #root");
    const mainCount = await mainAreas.count();
    console.log("Number of main content areas:", mainCount);

    // Get page title
    const title = await page.title();
    console.log("Page title:", title);

    // Check if we're on an error page
    const hasError = content.includes("error") || content.includes("Error") || content.includes("Application error");
    console.log("Has error indicators:", hasError);

    // Basic assertions
    expect(content.length).toBeGreaterThan(1000);
    expect(title).toBeTruthy();
    expect(inputCount + buttonCount).toBeGreaterThan(0);

    // Check that we have some meaningful content
    const hasContent = content.includes("photo") || content.includes("search") || content.includes("app");
    expect(hasContent).toBe(true);
  });

  test("should check if app is properly initialized", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check for React root
    const reactRoot = page.locator("#root");
    const hasReactRoot = await reactRoot.count() > 0;
    console.log("Has React root:", hasReactRoot);

    if (hasReactRoot) {
      const rootContent = await reactRoot.innerHTML();
      console.log("Root content length:", rootContent.length);

      // Check if it has meaningful content
      const hasMeaningfulContent = rootContent.length > 100;
      console.log("Has meaningful content:", hasMeaningfulContent);
    }

    // Check for any loading indicators
    const loadingElements = page.locator('[class*="loading" i], [class*="spinner" i], [aria-busy="true"]');
    const loadingCount = await loadingElements.count();
    console.log("Loading elements count:", loadingCount);

    // Check for any error boundaries
    const errorElements = page.locator('[class*="error" i], [data-testid*="error" i]');
    const errorCount = await errorElements.count();
    console.log("Error elements count:", errorCount);

    // Basic functionality check
    expect(hasReactRoot).toBe(true);
  });
});