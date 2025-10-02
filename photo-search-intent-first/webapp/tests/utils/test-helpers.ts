/**
 * Enhanced test helpers for improved stability and reliability
 */

import { expect, type Locator, type Page } from "@playwright/test";

const debugLog = (...args: Array<unknown>): void => {
	if (process.env.PLAYWRIGHT_VERBOSE === "1") {
		console.debug(...args);
	}
};

/**
 * Waits for the app to fully load and be ready for interaction
 */
export async function waitForAppReady(
	page: Page,
	options: {
		timeout?: number;
		skipOnboarding?: boolean;
	} = {},
): Promise<void> {
	const { timeout = 60000, skipOnboarding = true } = options;

	// Set up localStorage to skip onboarding if requested
	if (skipOnboarding) {
		await page.addInitScript(() => {
			try {
				localStorage.setItem("hasSeenOnboarding", "true");
				localStorage.setItem("onboardingComplete", "true");
				localStorage.setItem("showWelcome", "false");
				localStorage.setItem("showOnboardingTour", "false");
				localStorage.setItem("showOnboardingChecklist", "false");
				// Also set sessionStorage
				sessionStorage.setItem("hasSeenOnboarding", "true");
				sessionStorage.setItem("onboardingComplete", "true");
				sessionStorage.setItem("showWelcome", "false");
			} catch (e) {
				console.warn("Failed to set localStorage:", e);
			}
		});
	}

	// Navigate to the app
	await page.goto("/");
	await page.waitForLoadState("networkidle");

	// Wait for React to be ready - check for functional app rather than global React
	await page.waitForFunction(
		() => {
			return (
				document.readyState === "complete" &&
				document.querySelector("#root") !== null &&
				// Check for actual app content rather than global React object
				(document.querySelector("[data-testid]") !== null ||
					document.querySelector("button") !== null ||
					document.querySelector("input") !== null)
			);
		},
		{ timeout },
	);

	// Wait for main app content to be visible
	await page.waitForSelector("#root", { state: "visible", timeout });

	// Dismiss any overlays that might be blocking interaction - do this multiple times as needed
	await dismissOverlays(page);
	// Additional wait for any transitions to complete after dismissing overlays
	await page.waitForTimeout(500);
	// Dismiss overlays again as they might appear after first dismissal
	await dismissOverlays(page);

	// Wait for the main content area to be ready
	// Try multiple possible selectors in case the element ID changes
	const mainContentSelectors = [
		"#main-content",
		"#root",
		"[data-testid='main-content']",
		"[class*='main-content' i]",
		"[class*='App' i]",
		"main",
		"[data-testid='app-container']",
		"[class*='container' i]",
	];

	let mainContentFound = false;
	for (const selector of mainContentSelectors) {
		try {
			await page.waitForSelector(selector, {
				state: "visible",
				timeout: 5000, // Increased timeout to 5 seconds
			});
			mainContentFound = true;
			debugLog(`Found main content with selector: ${selector}`);
			break;
		} catch (error) {
			// Continue to next selector
		}
	}

	if (!mainContentFound) {
		console.warn(
			"None of the main content selectors were found. Continuing anyway...",
		);
	}

	// Additional wait for any async operations
	await page.waitForTimeout(1000);
}

/**
 * Dismisses common overlay elements that can interfere with testing
 */
export async function dismissOverlays(page: Page): Promise<void> {
	const overlays = [
		// Welcome/onboarding screens - be more specific and defensive
		{
			locator: page.locator(".fixed.inset-0.bg-black\\/80.z-50").first(),
			buttonSelector: 'button:has-text("Maybe later")',
		},
		// Welcome screen with specific heading
		{
			locator: page
				.locator('h1:has-text("Find any photo instantly")')
				.locator("..")
				.locator("..")
				.locator("..")
				.first(),
			buttonSelector: 'button:has-text("Maybe later")',
		},
		// Onboarding tour welcome
		{
			locator: page
				.locator('h3:has-text("Welcome to Photo Search!")')
				.locator("..")
				.locator("..")
				.first(),
			buttonSelector: 'button:has-text("Skip")',
		},
		// First run setup
		{
			locator: page.locator('[data-testid="first-run-setup"]').first(),
			buttonSelector: 'button:has-text("Skip")',
		},
		// Onboarding tour
		{
			locator: page.locator('[data-testid="onboarding-tour"]').first(),
			buttonSelector: 'button:has-text("Skip")',
		},
		// Help hints
		{
			locator: page.locator('[data-testid="help-hint"]').first(),
			buttonSelector: 'button:has-text("Got it")',
		},
	];

	for (const overlay of overlays) {
		try {
			// Check if overlay exists and is visible with shorter timeout
			const isVisible = await overlay.locator
				.isVisible({ timeout: 1000 })
				.catch(() => false);
			if (!isVisible) continue;

			debugLog("Found overlay, attempting to dismiss");

			// Try to find and click the dismiss button
			const button = overlay.locator
				.page()
				.locator(overlay.buttonSelector)
				.first();
			const buttonVisible = await button
				.isVisible({ timeout: 500 })
				.catch(() => false);

			if (buttonVisible) {
				// Use evaluate to click to avoid potential WebKit issues with locator.click()
				await button
					.evaluate((el: HTMLElement) => el.click())
					.catch((err) => {
						debugLog("Failed to click button via evaluate:", err.message);
						// Fallback to regular click
						return button.click({ timeout: 1000 }).catch(() => {
							debugLog("Failed to click button via locator");
						});
					});

				// Wait a bit for the overlay to disappear
				await page.waitForTimeout(200);
			}
		} catch (error) {
			debugLog("Error dismissing overlay:", (error as Error).message);
			// Continue to next overlay
		}
	}
}

/**
 * Enhanced click handler that deals with overlay interference
 */
export async function safeClick(
	page: Page,
	selector: string | Locator,
	options: {
		timeout?: number;
		force?: boolean;
	} = {},
): Promise<void> {
	const { timeout = 10000, force = false } = options;
	const locator =
		typeof selector === "string" ? page.locator(selector) : selector;

	// Try up to 3 times with increasing delays
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			// Check for and dismiss any overlays first
			await dismissOverlays(page);

			// Wait for element to be ready
			await locator.waitFor({ state: "visible", timeout });

			// Try to click
			await locator.click({ timeout, force });
			return; // Success!
		} catch (error) {
			debugLog(`Click attempt ${attempt} failed:`, (error as Error).message);
			if (attempt === 3) {
				throw error;
			}
			// Wait before retry
			await page.waitForTimeout(attempt * 500);
		}
	}
}

/**
 * Enhanced screenshot with better stability
 */
export async function stableScreenshot(
	page: Page,
	options: {
		name?: string;
		mask?: (Locator | string)[];
		maxDiffPixelRatio?: number;
		fullPage?: boolean;
	} = {},
): Promise<void> {
	const {
		name = "screenshot",
		mask = [],
		maxDiffPixelRatio = 0.02,
		fullPage = false,
	} = options;

	// Ensure page is stable
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(500);

	// Wait for any animations to complete
	await page.evaluate(() => {
		return new Promise((resolve) => {
			// Check for CSS animations
			const animatedElements = document.querySelectorAll(
				'*[style*="animation"], *[class*="animate"]',
			);
			if (animatedElements.length === 0) {
				resolve(0);
				return;
			}

			// Wait a bit for animations
			setTimeout(resolve, 300);
		});
	});

	// Convert mask selectors to locators
	const maskLocators = mask.map((item) =>
		typeof item === "string" ? page.locator(item) : item,
	);

	await expect(page).toHaveScreenshot(name, {
		fullPage,
		maxDiffPixelRatio,
		mask: maskLocators,
		animations: "disabled",
	});
}

/**
 * Handles multiple elements with same selector by finding the most appropriate one
 */
export async function findBestMatch(
	page: Page,
	baseSelector: string,
): Promise<Locator> {
	// Fall back to base selector
	const baseLocator = page.locator(baseSelector);
	const count = await baseLocator.count();

	if (count > 1) {
		console.log(
			`Found ${count} elements for "${baseSelector}", using first visible one`,
		);
		// Return first visible element
		for (let i = 0; i < count; i++) {
			const element = baseLocator.nth(i);
			if (await element.isVisible().catch(() => false)) {
				return element;
			}
		}
	}

	return baseLocator.first();
}

/**
 * Performance-aware wait that doesn't timeout too quickly
 */
export async function smartWait(
	page: Page,
	condition: () => Promise<boolean>,
	timeout = 30000,
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		try {
			if (await condition()) {
				return;
			}
		} catch {
			// Continue trying
		}
		await page.waitForTimeout(100);
	}

	throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Waits for search input to be ready and returns the locator
 */
export async function waitForSearchInput(page: Page): Promise<Locator> {
	// Wait for the search input to be visible and enabled
	const searchInput = page
		.locator(
			'input[type="search"], input[placeholder*="search" i], input[placeholder*="find" i]',
		)
		.first();
	await searchInput.waitFor({ state: "visible", timeout: 10000 });
	await searchInput.waitFor({ state: "attached", timeout: 10000 });

	// Ensure it's not disabled
	await page.waitForFunction(
		() => {
			const input = document.querySelector(
				'input[type="search"], input[placeholder*="search" i], input[placeholder*="find" i]',
			) as HTMLInputElement | null;
			return input && !input.disabled && input.offsetParent !== null;
		},
		{ timeout: 5000 },
	);

	return searchInput;
}

/**
 * Performs a search and waits for results
 */
export async function performSearch(page: Page, query: string): Promise<void> {
	const searchInput = await waitForSearchInput(page);

	// Clear and type the search query
	await searchInput.clear();
	await searchInput.fill(query);
	await searchInput.press("Enter");

	// Wait for search to complete (loading state to disappear)
	await page.waitForFunction(
		() => {
			const loadingElements = document.querySelectorAll(
				'[class*="loading"], [class*="busy"], [aria-busy="true"]',
			);
			return loadingElements.length === 0;
		},
		{ timeout: 15000 },
	);
}
