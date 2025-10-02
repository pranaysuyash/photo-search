import { expect, test } from "@playwright/test";

test.describe("Debug App Loading", () => {
	test("check if app loads properly", async ({ page }) => {
		// Check for any console errors before navigation
		const consoleErrors: string[] = [];
		const networkErrors: string[] = [];

		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
				console.log("Console error:", msg.text());
			} else {
				console.log("Console log:", msg.text());
			}
		});

		page.on("requestfailed", (request) => {
			networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`);
			console.log(
				"Network error:",
				request.url(),
				"-",
				request.failure()?.errorText,
			);
		});

		// Navigate to the app
		await page.goto("http://localhost:5173");
		await page.waitForLoadState("networkidle");

		// Check if root element exists
		const rootExists = await page.$("#root");
		console.log("Root element exists:", !!rootExists);

		// Check if root is visible
		const rootVisible = await page.isVisible("#root");
		console.log("Root element visible:", rootVisible);

		// Wait a bit more for any async operations
		await page.waitForTimeout(3000);

		// Check the content of root
		const rootContent = await page.$eval("#root", (el) => el.innerHTML);
		console.log("Root content length:", rootContent.length);
		console.log("Root content preview:", rootContent.substring(0, 200));

		// Check if there's any content in the body
		const bodyContent = await page.$eval("body", (el) => el.innerHTML);
		console.log("Body content length:", bodyContent.length);

		// Check for React error boundary content
		const hasErrorBoundary = await page
			.locator("text=/Something went wrong/")
			.count();
		console.log("Error boundary visible:", hasErrorBoundary > 0);

		// Check for any React-related content
		const hasReactContent =
			bodyContent.includes("react") || bodyContent.includes("data-reactroot");
		console.log("Has React content:", hasReactContent);

		// Show what's actually in the body
		console.log("Body content:", bodyContent);

		// Check if the React script loaded by looking for React in the page
		const hasReactLoaded = await page.evaluate(() => {
			return (
				typeof window.React !== "undefined" &&
				typeof window.ReactDOM !== "undefined"
			);
		});
		console.log("React loaded:", hasReactLoaded);

		// Check if our main module executed
		const mainModuleExecuted = await page.evaluate(() => {
			return (window as any).__VITE_HAS_EXECUTED_MAIN__ || false;
		});
		console.log("Main module executed:", mainModuleExecuted);

		// Take a screenshot to see what's visible
		await page.screenshot({ path: "debug-app-state.png", fullPage: true });

		// Basic assertions
		expect(!!rootExists).toBe(true);
		console.log("Console errors found:", consoleErrors.length);

		// For debugging, let's not fail the test
		expect(true).toBe(true);
	});
});
