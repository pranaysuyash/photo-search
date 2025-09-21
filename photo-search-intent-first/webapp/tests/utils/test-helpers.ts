/**
 * Enhanced test helpers for improved stability and reliability
 */

import { Page, Locator } from "@playwright/test";

/**
 * Dismisses common overlay elements that can interfere with testing
 */
export async function dismissOverlays(page: Page): Promise<void> {
	const overlays = [
		// Welcome/onboarding screens
		{
			locator: page.locator('div[class*="fixed inset-0"]').filter({ hasText: "Find any photo instantly" }),
			buttonSelector: 'button:has-text("Maybe later"), button:has-text("Skip"), button:has-text("Close")'
		},
		// First run setup
		{
			locator: page.locator('div[class*="fixed inset-0"]').filter({ hasText: "Welcome — let's find your photos" }),
			buttonSelector: 'button:has-text("Skip"), button:has-text("Maybe later")'
		},
			];

	for (const overlay of overlays) {
		if (await overlay.locator.isVisible().catch(() => false)) {
			console.log("Dismissing overlay:", overlay.locator);
			if (overlay.action) {
				await overlay.action(overlay.locator);
			} else {
				const buttons = page.locator(overlay.buttonSelector!);
				const visibleButton = await buttons.first().isVisible().catch(() => false);
				if (visibleButton) {
					await buttons.first().click();
					await page.waitForTimeout(300);
				}
			}
		}
	}
}

/**
 * Enhanced click handler that deals with overlay interference
 */
export async function safeClick(page: Page, selector: string | Locator, options = {}): Promise<void> {
	const locator = typeof selector === "string" ? page.locator(selector) : selector;

	// Try up to 3 times with increasing delays
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			// Check for and dismiss any overlays first
			await dismissOverlays(page);

			// Wait for element to be ready
			await locator.waitFor({ state: "visible", timeout: 5000 });

			// Try to click
			await locator.click({ timeout: 5000, force: true, ...options });
			return; // Success!
		} catch (error) {
			console.log(`Click attempt ${attempt} failed:`, error.message);
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
export async function stableScreenshot(page: Page, options: {
	name?: string;
	mask?: (Locator | string)[];
	maxDiffPixelRatio?: number;
	fullPage?: boolean;
} = {}): Promise<void> {
	const { name = "screenshot", mask = [], maxDiffPixelRatio = 0.02, fullPage = false } = options;

	// Ensure page is stable
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(500);

	// Wait for any animations to complete
	await page.evaluate(() => {
		return new Promise((resolve) => {
			// Check for CSS animations
			const animatedElements = document.querySelectorAll('*[style*="animation"], *[class*="animate"]');
			if (animatedElements.length === 0) {
				resolve(0);
				return;
			}

			// Wait a bit for animations
			setTimeout(resolve, 300);
		});
	});

	// Convert mask selectors to locators
	const maskLocators = mask.map(item => typeof item === "string" ? page.locator(item) : item);

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
export async function findBestMatch(page: Page, baseSelector: string, context?: string): Promise<Locator> {
	let selector = baseSelector;

	if (context) {
		// Try context-specific selector first
		const contextLocator = page.locator(context).locator(baseSelector);
		if (await contextLocator.count() > 0) {
			return contextLocator.first();
		}
	}

	// Fall back to base selector
	const baseLocator = page.locator(baseSelector);
	const count = await baseLocator.count();

	if (count > 1) {
		console.log(`Found ${count} elements for "${baseSelector}", using first visible one`);
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
export async function smartWait(page: Page, condition: () => Promise<boolean>, timeout = 30000): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		try {
			if (await condition()) {
				return;
			}
		} catch (error) {
			// Continue trying
		}
		await page.waitForTimeout(100);
	}

	throw new Error(`Condition not met within ${timeout}ms`);
}