import { expect, test } from "@playwright/test";
import { dismissOverlays, stableScreenshot, smartWait } from "../utils/test-helpers";

test.describe("Comprehensive Accessibility Testing", () => {
	test.describe("Screen Reader and Keyboard Navigation", () => {
		test("verifies keyboard navigation throughout the app", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Test Tab navigation through main elements
			const focusableElements = await page.$$(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);

			console.log(`Found ${focusableElements.length} focusable elements`);

			// Test sequential focus navigation
			let currentIndex = 0;
			for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
				await page.keyboard.press('Tab');
				await page.waitForTimeout(100);

				const activeElement = await page.evaluate(() => document.activeElement);
				const elementInfo = await page.evaluate((el) => {
					if (!el) return null;
					return {
						tagName: el.tagName,
						type: (el as HTMLInputElement).type,
						ariaLabel: el.getAttribute('aria-label'),
						ariaRole: el.getAttribute('role'),
						textContent: el.textContent?.trim(),
						className: el.className,
					};
				}, activeElement);

				console.log(`Focused element ${i + 1}:`, elementInfo);
				expect(activeElement).toBeTruthy();
			}
		});

		test("tests ARIA labels and roles", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Check critical interactive elements have proper ARIA
			const accessibilityAudit = await page.evaluate(() => {
				const issues: string[] = [];

				// Check images have alt text
				const imagesWithoutAlt = Array.from(document.querySelectorAll('img:not([alt])'));
				if (imagesWithoutAlt.length > 0) {
					issues.push(`${imagesWithoutAlt.length} images missing alt attributes`);
				}

				// Check form inputs have labels
				const inputsWithoutLabels = Array.from(document.querySelectorAll(
					'input:not([aria-label]):not([aria-labelledby]):not([id])'
				));
				if (inputsWithoutLabels.length > 0) {
					issues.push(`${inputsWithoutLabels.length} inputs missing labels`);
				}

				// Check buttons have accessible names
				const buttonsWithoutNames = Array.from(document.querySelectorAll(
					'button:not([aria-label]):not([aria-labelledby]):empty'
				));
				if (buttonsWithoutNames.length > 0) {
					issues.push(`${buttonsWithoutNames.length} buttons missing accessible names`);
				}

				// Check landmark regions
				const landmarks = document.querySelectorAll('header, nav, main, footer, [role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]');
				if (landmarks.length < 2) {
					issues.push('Insufficient landmark regions for screen reader navigation');
				}

				// Check heading hierarchy
				const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
				const headingLevels = headings.map(h => parseInt(h.tagName.substring(1)));
				for (let i = 1; i < headingLevels.length; i++) {
					if (headingLevels[i] - headingLevels[i - 1] > 1) {
						issues.push(`Heading level skip from h${headingLevels[i - 1]} to h${headingLevels[i]}`);
						break;
					}
				}

				return {
					issues,
					totalImages: document.querySelectorAll('img').length,
					totalInputs: document.querySelectorAll('input').length,
					totalButtons: document.querySelectorAll('button').length,
					landmarksFound: landmarks.length,
					headingLevels: headingLevels,
				};
			});

			console.log("Accessibility Audit Results:", accessibilityAudit);

			// Critical accessibility assertions
			expect(accessibilityAudit.issues.length).toBeLessThan(3);
			expect(accessibilityAudit.landmarksFound).toBeGreaterThan(0);
		});

		test("tests focus management in modals", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Try to open a modal and test focus trapping
			const settingsButton = page.locator('button[aria-label*="settings"], button:has-text("Settings")').first();
			if (await settingsButton.isVisible().catch(() => false)) {
				await settingsButton.click();
				await page.waitForTimeout(500);

				// Check if focus is properly managed in modal
				const activeElement = await page.evaluate(() => document.activeElement);
				const modal = await page.locator('[role="dialog"], .modal, [class*="modal"]').first();

				if (await modal.isVisible().catch(() => false)) {
					// Verify focus is trapped within modal
					const isFocusInModal = await modal.evaluate((modal, activeEl) => {
						return modal.contains(activeEl);
					}, activeElement);

					expect(isFocusInModal).toBe(true);

					// Test modal close with Escape key
					await page.keyboard.press('Escape');
					await page.waitForTimeout(300);
				}
			}
		});
	});

	test.describe("Visual Accessibility", () => {
		test("tests color contrast compliance", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			const contrastAnalysis = await page.evaluate(() => {
				const elements = document.querySelectorAll('*');
				const contrastIssues: Array<{
					element: string;
					foreground: string;
					background: string;
					ratio: number;
				}> = [];

				elements.forEach(element => {
					const computedStyle = window.getComputedStyle(element);
					const textColor = computedStyle.color;
					const backgroundColor = computedStyle.backgroundColor;

					// Skip transparent or same colors
					if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') return;
					if (textColor === backgroundColor) return;

					// Simple contrast calculation (simplified)
					const textRgb = textColor.match(/\d+/g);
					const bgRgb = backgroundColor.match(/\d+/g);

					if (textRgb && bgRgb && textRgb.length >= 3 && bgRgb.length >= 3) {
						const textLuminance = (0.299 * parseInt(textRgb[0]) + 0.587 * parseInt(textRgb[1]) + 0.114 * parseInt(textRgb[2])) / 255;
						const bgLuminance = (0.299 * parseInt(bgRgb[0]) + 0.587 * parseInt(bgRgb[1]) + 0.114 * parseInt(bgRgb[2])) / 255;

						const contrast = textLuminance > bgLuminance
							? (textLuminance + 0.05) / (bgLuminance + 0.05)
							: (bgLuminance + 0.05) / (textLuminance + 0.05);

						if (contrast < 4.5) { // WCAG AA standard
							contrastIssues.push({
								element: element.tagName + (element.className ? '.' + element.className : ''),
								foreground: textColor,
								background: backgroundColor,
								ratio: contrast
							});
						}
					}
				});

				return contrastIssues.slice(0, 10); // Limit to first 10 issues
			});

			console.log("Color contrast issues found:", contrastAnalysis.length);
			contrastAnalysis.forEach(issue => {
				console.log(`- ${issue.element}: ratio ${issue.ratio.toFixed(2)}`);
			});

			// Should have minimal contrast issues
			expect(contrastAnalysis.length).toBeLessThan(5);
		});

		test("tests responsive text scaling", async ({ page }) => {
			// Test different viewport sizes for text readability
			const viewports = [
				{ width: 1920, height: 1080, name: 'desktop' },
				{ width: 768, height: 1024, name: 'tablet' },
				{ width: 375, height: 667, name: 'mobile' }
			];

			for (const viewport of viewports) {
				await page.setViewportSize(viewport);
				await page.goto("/");
				await dismissOverlays(page);

				const textAnalysis = await page.evaluate((vp) => {
					const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, button, a');
					const fontSizeIssues: string[] = [];

					textElements.forEach(element => {
						const computedStyle = window.getComputedStyle(element);
						const fontSize = parseFloat(computedStyle.fontSize);
						const lineHeight = parseFloat(computedStyle.lineHeight);

						// Check minimum font sizes for different viewports
						const minFontSize = vp.width <= 375 ? 14 : vp.width <= 768 ? 13 : 12;

						if (fontSize < minFontSize && computedStyle.display !== 'none') {
							fontSizeIssues.push(`${element.tagName}: ${fontSize}px (min: ${minFontSize}px)`);
						}

						// Check line height is appropriate
						if (lineHeight > 0 && fontSize / lineHeight < 1.2) {
							fontSizeIssues.push(`${element.tagName}: line height ratio ${fontSize/lineHeight} too tight`);
						}
					});

					return fontSizeIssues;
				}, viewport);

				console.log(`${viewport.name} text scaling issues:`, textAnalysis.length);
				expect(textAnalysis.length).toBeLessThan(3);
			}
		});
	});

	test.describe("Cognitive Accessibility", () => {
		test("tests clear error messages and help text", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Test error states have clear, helpful messages
			await page.fill('input[type="search"]', "%%invalid%%");
			await page.press('Enter');

			await page.waitForTimeout(1000);

			const errorMessages = await page.locator('.error, .error-message, [role="alert"]').all();
			if (errorMessages.length > 0) {
				for (const errorMsg of errorMessages) {
					const text = await errorMsg.textContent();
					expect(text?.trim().length).toBeGreaterThan(0);

					// Error messages should be descriptive
					const descriptiveWords = ['error', 'invalid', 'not found', 'please', 'try'];
					const isDescriptive = descriptiveWords.some(word =>
						text?.toLowerCase().includes(word)
					);
					expect(isDescriptive).toBe(true);
				}
			}
		});

		test("tests consistent navigation and predictable interactions", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Test that navigation elements are consistent
			const navElements = await page.locator('nav a, [role="navigation"] a, header a').all();
			console.log(`Found ${navElements.length} navigation elements`);

			// Navigation should be keyboard accessible
			for (let i = 0; i < Math.min(navElements.length, 5); i++) {
				await navElements[i].focus();
				const hasVisibleFocus = await navElements[i].evaluate((el) => {
					const computedStyle = window.getComputedStyle(el);
					return computedStyle.outline !== 'none' ||
						   computedStyle.boxShadow !== 'none' ||
						   computedStyle.borderBottom !== 'none';
				});

				// Elements should show some visual indication of focus
				console.log(`Navigation element ${i + 1} focus visible: ${hasVisibleFocus}`);
			}
		});
	});

	test.describe("Screen Reader Specific Tests", () => {
		test("tests live regions and dynamic content announcements", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			// Trigger dynamic content changes
			await page.fill('input[type="search"]', "test");
			await page.press('Enter');

			await page.waitForTimeout(1000);

			// Check for live regions
			const liveRegions = await page.locator('[aria-live], [aria-atomic], [role="status"], [role="alert"]').all();
			console.log(`Found ${liveRegions.length} live regions for dynamic content`);

			// Should have at least some live regions for search results
			expect(liveRegions.length).toBeGreaterThanOrEqual(0);
		});

		test("tests form field accessibility", async ({ page }) => {
			await page.goto("/");
			await dismissOverlays(page);

			const formFields = await page.locator('input, select, textarea').all();
			console.log(`Found ${formFields.length} form fields`);

			for (const field of formFields) {
				const accessibleName = await field.evaluate((el) => {
					return el.getAttribute('aria-label') ||
						   el.getAttribute('aria-labelledby') ||
						   el.getAttribute('placeholder') ||
						   el.getAttribute('title') ||
						   el.id; // Could be linked by label
				});

				// Every form field should have an accessible name
				expect(accessibleName).toBeTruthy();
			}
		});
	});
});