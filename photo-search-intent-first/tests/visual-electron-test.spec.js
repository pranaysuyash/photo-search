const { test, _electron } = require('@playwright/test');
const path = require('path');

test.describe('Electron App Visual Testing', () => {
    let electronApp;
    let page;

    test.beforeAll(async () => {
        // Start Electron app
        electronApp = await _electron.launch({
            args: [path.join(__dirname, '..', 'electron', 'main.js')],
            timeout: 30000,
        });

        // Get the main window
        page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    });

    test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test('Initial app load - visual check', async () => {
        // Wait for initial load
        await page.waitForTimeout(3000);

        // Take screenshot of initial state
        await page.screenshot({
            path: 'test-results/electron-initial-load.png',
            fullPage: true
        });

        // Check if page is blank or has content
        const bodyText = await page.textContent('body');
        console.log('Body text content:', bodyText?.length ? `${bodyText.substring(0, 200)}...` : 'EMPTY/BLANK');

        // Check for React root element
        const reactRoot = await page.locator('#root');
        const rootExists = await reactRoot.count();
        console.log('React root exists:', rootExists > 0);

        if (rootExists > 0) {
            const rootContent = await reactRoot.textContent();
            console.log('React root content:', rootContent?.length ? `${rootContent.substring(0, 200)}...` : 'EMPTY');
        }

        // Check for any error messages
        const errorElements = await page.locator('[class*="error"], .error, [data-testid*="error"]').all();
        if (errorElements.length > 0) {
            for (let i = 0; i < errorElements.length; i++) {
                const errorText = await errorElements[i].textContent();
                console.log(`Error element ${i}:`, errorText);
            }
        }

        // Check console messages for errors
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.log('Console error:', msg.text());
            }
        });

        // Wait a bit more for any dynamic content
        await page.waitForTimeout(2000);

        // Take final screenshot
        await page.screenshot({
            path: 'test-results/electron-after-wait.png',
            fullPage: true
        });
    });

    test('Check main UI components', async () => {
        await page.waitForTimeout(3000);

        // Look for common UI elements
        const selectors = [
            'nav', '[role="navigation"]',
            'header', '[role="banner"]',
            'main', '[role="main"]',
            'button', '[role="button"]',
            'input', '[type="search"]',
            '.search', '[data-testid*="search"]',
            '.photo', '.image', '[data-testid*="photo"]',
            '.sidebar', '.menu',
            '.modal', '[role="dialog"]'
        ];

        const findings = {};

        for (const selector of selectors) {
            const elements = await page.locator(selector).all();
            findings[selector] = {
                count: elements.length,
                visible: 0,
                text: []
            };

            for (const element of elements) {
                const isVisible = await element.isVisible();
                if (isVisible) {
                    findings[selector].visible++;
                    const text = await element.textContent();
                    if (text?.trim()) {
                        findings[selector].text.push(text.trim().substring(0, 50));
                    }
                }
            }
        }

        console.log('UI Component Analysis:', JSON.stringify(findings, null, 2));

        // Take screenshot of current state
        await page.screenshot({
            path: 'test-results/electron-ui-components.png',
            fullPage: true
        });
    });

    test('Test navigation and routes', async () => {
        await page.waitForTimeout(2000);

        // Check current URL/route
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);

        // Look for navigation elements
        const navLinks = await page.locator('a, [role="link"], [data-testid*="nav"]').all();
        console.log(`Found ${navLinks.length} potential navigation elements`);

        // Try to find and click navigation items
        const navTexts = [];
        for (let i = 0; i < Math.min(navLinks.length, 5); i++) {
            try {
                const text = await navLinks[i].textContent();
                const isVisible = await navLinks[i].isVisible();
                navTexts.push({ text: text?.trim(), visible: isVisible });
            } catch (e) {
                console.log('Error getting nav element:', e.message);
            }
        }
        console.log('Navigation elements:', navTexts);

        await page.screenshot({
            path: 'test-results/electron-navigation.png',
            fullPage: true
        });
    });

    test('Test search functionality', async () => {
        await page.waitForTimeout(2000);

        // Look for search inputs
        const searchSelectors = [
            'input[type="search"]',
            'input[placeholder*="search"]',
            'input[placeholder*="Search"]',
            '.search input',
            '[data-testid*="search"] input'
        ];

        let searchInput = null;
        for (const selector of searchSelectors) {
            const element = page.locator(selector).first();
            if (await element.count() > 0 && await element.isVisible()) {
                searchInput = element;
                console.log(`Found search input with selector: ${selector}`);
                break;
            }
        }

        if (searchInput) {
            // Try to interact with search
            await searchInput.click();
            await searchInput.fill('test search');

            await page.screenshot({
                path: 'test-results/electron-search-input.png',
                fullPage: true
            });

            // Look for search button
            const searchButton = page.locator('button:has-text("Search"), [type="submit"]').first();
            if (await searchButton.count() > 0) {
                await searchButton.click();
                await page.waitForTimeout(1000);

                await page.screenshot({
                    path: 'test-results/electron-search-results.png',
                    fullPage: true
                });
            }
        } else {
            console.log('No search input found');
            await page.screenshot({
                path: 'test-results/electron-no-search.png',
                fullPage: true
            });
        }
    });

    test('Check for modal/popup functionality', async () => {
        await page.waitForTimeout(2000);

        // Look for buttons that might open modals
        const buttonTexts = ['Settings', 'Options', 'Menu', 'Add', 'Upload', 'Select'];

        for (const buttonText of buttonTexts) {
            const button = page.locator(`button:has-text("${buttonText}")`).first();
            if (await button.count() > 0 && await button.isVisible()) {
                console.log(`Found button: ${buttonText}`);
                await button.click();
                await page.waitForTimeout(1000);

                await page.screenshot({
                    path: `test-results/electron-modal-${buttonText.toLowerCase()}.png`,
                    fullPage: true
                });

                // Check for modal/dialog
                const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]').first();
                if (await modal.count() > 0) {
                    console.log(`Modal opened for ${buttonText}`);

                    // Try to close modal
                    const closeButton = page.locator('button:has-text("Close"), button:has-text("×"), [aria-label="Close"]').first();
                    if (await closeButton.count() > 0) {
                        await closeButton.click();
                        await page.waitForTimeout(500);
                    }
                }
                break; // Only test one button to avoid side effects
            }
        }
    });

    test('Performance and loading analysis', async () => {
        // Reload page to test loading
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        // Wait for any loading indicators to disappear
        await page.waitForTimeout(3000);

        // Check for loading states
        const loadingSelectors = [
            '.loading', '[data-testid*="loading"]',
            '.spinner', '.loader',
            '[aria-busy="true"]'
        ];

        for (const selector of loadingSelectors) {
            const elements = await page.locator(selector).all();
            if (elements.length > 0) {
                console.log(`Found loading indicator: ${selector} (${elements.length} elements)`);
            }
        }

        // Final state screenshot
        await page.screenshot({
            path: 'test-results/electron-final-state.png',
            fullPage: true
        });

        // Get performance metrics
        const performanceEntries = await page.evaluate(() => {
            return JSON.stringify({
                loadComplete: document.readyState,
                timing: performance.timing ? {
                    loadEventEnd: performance.timing.loadEventEnd,
                    domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd,
                    loadEventStart: performance.timing.loadEventStart
                } : null,
                entries: performance.getEntriesByType('navigation').map(entry => ({
                    type: entry.type,
                    loadEventEnd: entry.loadEventEnd,
                    domContentLoadedEventEnd: entry.domContentLoadedEventEnd
                }))
            });
        });

        console.log('Performance metrics:', performanceEntries);
    });
});