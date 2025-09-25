import { test } from "@playwright/test";

test("basic page load test", async ({ page }) => {
  // Simple test to check if page loads
  await page.goto("/");
  console.log("Page loaded successfully");

  // Check if body has content
  const bodyText = await page.locator("body").textContent();
  console.log("Body has content:", bodyText && bodyText.length > 0);

  // Check for root element
  const rootElement = page.locator("#root");
  console.log(
    "Root element exists:",
    await rootElement.isVisible().catch(() => false)
  );
});
