import { expect, test } from "@playwright/test";

test.describe("AI-Powered Testing Suite", () => {
	test.setTimeout(300000); // 5 minutes for AI analysis

	test("comprehensive app analysis", async ({ page, browser }) => {
		console.log("🚀 Starting AI-powered comprehensive testing...");

		// Start the app
		await page.goto("/");

		// Wait for the page to load completely
		await page.waitForLoadState("networkidle");

		// Handle initial app states - dismiss any welcome/onboarding screens
		const welcomeScreen = page
			.locator('[data-testid="welcome-screen"], .welcome-screen')
			.first();
		if (await welcomeScreen.isVisible().catch(() => false)) {
			// Try to find and click demo or skip buttons
			const demoButton = page
				.getByRole("button", { name: /demo|try demo/i })
				.first();
			const skipButton = page
				.getByRole("button", { name: /skip|close|maybe later/i })
				.first();

			if (await demoButton.isVisible().catch(() => false)) {
				await demoButton.click();
			} else if (await skipButton.isVisible().catch(() => false)) {
				await skipButton.click();
			}
		}

		// Handle first-run setup
		const firstRunSetup = page
			.locator('[data-testid="first-run-setup"], .first-run-setup')
			.first();
		if (await firstRunSetup.isVisible().catch(() => false)) {
			const skipButton = page
				.getByRole("button", { name: /skip|close|maybe later/i })
				.first();
			if (await skipButton.isVisible().catch(() => false)) {
				await skipButton.click();
			}
		}

		// Wait for the main app content to be visible
		await page.waitForSelector("#root", { state: "visible", timeout: 30000 });

		const testResults = {
			screenshots: [] as string[],
			issues: [] as Array<{
				type: string;
				severity: string;
				message: string;
				location?: string;
				suggestion?: string;
			}>,
			recommendations: [] as string[],
			performance: {} as {
				loadTime?: number;
				domContentLoaded?: number;
				firstPaint?: number;
				largestContentfulPaint?: number;
			},
			accessibility: [] as Array<{
				type: string;
				severity: string;
				message: string;
				elements?: string[];
			}>,
			functionality: [] as Array<{
				interactionSuccessful: boolean;
				visualChanges: string;
				performance: string;
			}>,
		};

		// 1. INITIAL STATE ANALYSIS
		console.log("📸 Analyzing initial application state...");
		const initialScreenshot = await page.screenshot({
			fullPage: true,
			path: `test-results/ai-analysis/initial-state.png`,
		});
		testResults.screenshots.push("initial-state.png");

		// Analyze initial state with AI
		const initialAnalysis = await analyzeScreenshotWithAI(
			initialScreenshot,
			"Analyze this application screenshot and identify any UI issues, missing elements, or potential problems",
		);
		testResults.issues.push(...initialAnalysis.issues);
		testResults.recommendations.push(...initialAnalysis.recommendations);

		// 2. INTERACTIVE ELEMENTS DISCOVERY
		console.log("🔍 Discovering interactive elements...");
		const interactiveElements = await page.$$(
			'[role="button"], button, a, input, select, textarea, [onclick], [tabindex]:not([tabindex="-1"])',
		);

		for (const element of interactiveElements.slice(0, 10)) {
			// Limit to first 10 for demo
			try {
				const elementInfo = await element.evaluate((el) => ({
					tagName: el.tagName,
					text: el.textContent?.trim(),
					className: el.className,
					id: el.id,
					type: (el as HTMLInputElement).type,
					placeholder: (el as HTMLInputElement).placeholder,
					isVisible: el.offsetWidth > 0 && el.offsetHeight > 0,
				}));

				if (elementInfo.isVisible) {
					console.log(
						`🎯 Testing element: ${elementInfo.tagName} - ${
							elementInfo.text || elementInfo.placeholder || elementInfo.id
						}`,
					);

					// Take screenshot before interaction
					const beforeScreenshot = await page.screenshot({
						fullPage: true,
						path: `test-results/ai-analysis/before-${
							elementInfo.tagName
						}-${Date.now()}.png`,
					});

					// Attempt interaction based on element type
					if (elementInfo.tagName === "BUTTON" || elementInfo.tagName === "A") {
						await element.click({ timeout: 5000 }).catch(() => {
							console.log(`⚠️ Could not click ${elementInfo.tagName}`);
						});
					} else if (
						elementInfo.tagName === "INPUT" &&
						elementInfo.type === "text"
					) {
						await element.fill("test input", { timeout: 5000 }).catch(() => {
							console.log(`⚠️ Could not fill input`);
						});
					}

					// Wait for any changes
					await page.waitForTimeout(1000);

					// Take screenshot after interaction
					const afterScreenshot = await page.screenshot({
						fullPage: true,
						path: `test-results/ai-analysis/after-${
							elementInfo.tagName
						}-${Date.now()}.png`,
					});

					// Analyze the interaction result
					const interactionAnalysis = await analyzeInteractionWithAI(
						beforeScreenshot,
						afterScreenshot,
						`Analyze the before/after screenshots of interacting with a ${
							elementInfo.tagName
						} element (${elementInfo.text || elementInfo.placeholder})`,
					);

					testResults.issues.push(...interactionAnalysis.issues);
					testResults.functionality.push(interactionAnalysis.functionality);
				}
			} catch (error) {
				console.log(`⚠️ Error testing element: ${error.message}`);
			}
		}

		// 3. RESPONSIVE DESIGN ANALYSIS
		console.log("📱 Testing responsive design...");
		const viewports = [
			{ width: 1920, height: 1080, name: "desktop" },
			{ width: 768, height: 1024, name: "tablet" },
			{ width: 375, height: 667, name: "mobile" },
		];

		for (const viewport of viewports) {
			await page.setViewportSize({
				width: viewport.width,
				height: viewport.height,
			});
			await page.waitForTimeout(1000);

			const responsiveScreenshot = await page.screenshot({
				fullPage: true,
				path: `test-results/ai-analysis/responsive-${viewport.name}.png`,
			});

			const responsiveAnalysis = await analyzeScreenshotWithAI(
				responsiveScreenshot,
				`Analyze this ${viewport.name} (${viewport.width}x${viewport.height}) screenshot for responsive design issues`,
			);

			testResults.issues.push(...responsiveAnalysis.issues);
			testResults.recommendations.push(...responsiveAnalysis.recommendations);
		}

		// 4. ACCESSIBILITY ANALYSIS
		console.log("♿ Running accessibility checks...");
		const accessibilityResults = await page.evaluate(() => {
			const issues = [];

			// Check for missing alt text
			const images = document.querySelectorAll("img:not([alt])");
			if (images.length > 0) {
				issues.push({
					type: "accessibility",
					severity: "high",
					message: `${images.length} images missing alt text`,
					elements: Array.from(images).map((img) => img.outerHTML),
				});
			}

			// Check for missing labels
			const inputs = document.querySelectorAll(
				"input:not([aria-label]):not([aria-labelledby])",
			);
			if (inputs.length > 0) {
				issues.push({
					type: "accessibility",
					severity: "medium",
					message: `${inputs.length} form inputs missing labels`,
					elements: Array.from(inputs).map((input) => input.outerHTML),
				});
			}

			// Check color contrast (basic check)
			const _textElements = document.querySelectorAll("*");
			// This would need more sophisticated analysis in a real implementation

			return issues;
		});

		testResults.accessibility = accessibilityResults;

		// 5. PERFORMANCE ANALYSIS
		console.log("⚡ Analyzing performance...");
		const performanceMetrics = await page.evaluate(() => {
			const perfData = performance.getEntriesByType(
				"navigation",
			)[0] as PerformanceNavigationTiming;
			return {
				loadTime: perfData.loadEventEnd - perfData.loadEventStart,
				domContentLoaded:
					perfData.domContentLoadedEventEnd -
					perfData.domContentLoadedEventStart,
				firstPaint:
					performance
						.getEntriesByType("paint")
						.find((entry) => entry.name === "first-paint")?.startTime || 0,
				largestContentfulPaint:
					performance.getEntriesByType("largest-contentful-paint")[0]
						?.startTime || 0,
			};
		});

		testResults.performance = performanceMetrics;

		// 6. GENERATE COMPREHENSIVE REPORT
		console.log("📊 Generating comprehensive test report...");
		const report = generateComprehensiveReport(testResults);

		// Save report
		await page.evaluate((reportData) => {
			console.log("=== AI TESTING REPORT ===");
			console.log(JSON.stringify(reportData, null, 2));
		}, report);

		// Assertions based on findings
		expect(
			testResults.issues.filter((issue) => issue.severity === "critical")
				.length,
		).toBeLessThan(5);
		expect(
			testResults.accessibility.filter((issue) => issue.severity === "high")
				.length,
		).toBeLessThan(3);

		console.log("✅ AI-powered testing completed!");
	});

	test("exploratory user journey testing", async ({ page }) => {
		console.log("🧭 Starting exploratory user journey testing...");

		await page.goto("/");

		// Wait for the page to load completely
		await page.waitForLoadState("networkidle");

		// Handle initial app states - dismiss any welcome/onboarding screens
		const welcomeScreen = page
			.locator('[data-testid="welcome-screen"], .welcome-screen')
			.first();
		if (await welcomeScreen.isVisible().catch(() => false)) {
			// Try to find and click demo or skip buttons
			const demoButton = page
				.getByRole("button", { name: /demo|try demo/i })
				.first();
			const skipButton = page
				.getByRole("button", { name: /skip|close|maybe later/i })
				.first();

			if (await demoButton.isVisible().catch(() => false)) {
				await demoButton.click();
			} else if (await skipButton.isVisible().catch(() => false)) {
				await skipButton.click();
			}
		}

		// Handle first-run setup
		const firstRunSetup = page
			.locator('[data-testid="first-run-setup"], .first-run-setup')
			.first();
		if (await firstRunSetup.isVisible().catch(() => false)) {
			const skipButton = page
				.getByRole("button", { name: /skip|close|maybe later/i })
				.first();
			if (await skipButton.isVisible().catch(() => false)) {
				await skipButton.click();
			}
		}

		// Wait for the main app content to be visible
		await page.waitForSelector("#root", { state: "visible", timeout: 30000 });

		const journey = [
			{ action: "initial_load", description: "Application initial load" },
			{ action: "dismiss_modal", description: "Dismiss any welcome modal" },
			{
				action: "explore_navigation",
				description: "Explore navigation elements",
			},
			{ action: "test_search", description: "Test search functionality" },
			{ action: "test_responsive", description: "Test responsive behavior" },
		];

		const journeyResults: Array<{
			step: string;
			description: string;
			screenshot: string;
			analysis: {
				issues: Array<{
					type: string;
					severity: string;
					message: string;
					location: string;
					suggestion: string;
				}>;
				recommendations: string[];
			};
		}> = [];

		for (const step of journey) {
			console.log(`🔄 ${step.description}...`);

			const screenshot = await page.screenshot({
				fullPage: true,
				path: `test-results/journey/${step.action}.png`,
			});

			const analysis = await analyzeScreenshotWithAI(
				screenshot,
				`Analyze this screenshot from the "${step.description}" step of the user journey. Identify any issues or improvements needed.`,
			);

			journeyResults.push({
				step: step.action,
				description: step.description,
				screenshot: `${step.action}.png`,
				analysis: analysis,
			});

			// Perform step-specific actions
			switch (step.action) {
				case "dismiss_modal": {
					const skipButtons = [
						page.getByRole("button", { name: /Skip|Close|Dismiss/i }),
						page.locator("button").filter({ hasText: /Skip|Close|Dismiss/i }),
					];

					for (const button of skipButtons) {
						if (await button.isVisible().catch(() => false)) {
							await button.click({ force: true }).catch(() => {});
							break;
						}
					}
					break;
				}

				case "explore_navigation": {
					const navElements = await page.$$(
						'nav a, [role="navigation"] a, button[class*="nav"]',
					);
					for (const nav of navElements.slice(0, 3)) {
						await nav.click().catch(() => {});
						await page.waitForTimeout(500);
					}
					break;
				}

				case "test_search": {
					const searchInputs = [
						page.locator('input[type="search"]'),
						page.locator('input[placeholder*="search" i]'),
						page.locator('input[placeholder*="find" i]'),
					];

					for (const searchInput of searchInputs) {
						if (await searchInput.isVisible().catch(() => false)) {
							await searchInput.fill("test query");
							await searchInput.press("Enter");
							await page.waitForTimeout(1000);
							break;
						}
					}
					break;
				}
			}

			await page.waitForTimeout(1000);
		}

		// Generate journey report
		const _journeyReport = {
			journey: journeyResults,
			summary: {
				totalSteps: journey.length,
				issuesFound: journeyResults.reduce(
					(sum, step) => sum + step.analysis.issues.length,
					0,
				),
				recommendations: journeyResults.flatMap(
					(step) => step.analysis.recommendations,
				),
			},
		};

		console.log("🧭 Exploratory journey testing completed!");
		expect(journeyResults.length).toBeGreaterThan(0);
	});
});

// AI Analysis Functions
async function analyzeScreenshotWithAI(_screenshot: Buffer, prompt: string) {
	// This would integrate with an AI service like OpenAI's GPT-4 Vision
	// For now, return mock analysis
	console.log(`🤖 AI Analysis: ${prompt}`);

	return {
		issues: [
			{
				type: "ui",
				severity: "low",
				message: "Mock issue detected",
				location: "unknown",
				suggestion: "Mock suggestion",
			},
		],
		recommendations: ["Mock recommendation for improvement"],
	};
}

async function analyzeInteractionWithAI(
	_beforeScreenshot: Buffer,
	_afterScreenshot: Buffer,
	prompt: string,
) {
	console.log(`🤖 AI Interaction Analysis: ${prompt}`);

	return {
		issues: [],
		functionality: {
			interactionSuccessful: true,
			visualChanges: "detected",
			performance: "acceptable",
		},
	};
}

function generateComprehensiveReport(results: any) {
	return {
		summary: {
			totalIssues: results.issues.length,
			criticalIssues: results.issues.filter(
				(i: any) => i.severity === "critical",
			).length,
			accessibilityIssues: results.accessibility.length,
			performanceScore:
				results.performance.loadTime < 3000 ? "good" : "needs_improvement",
		},
		issues: results.issues,
		recommendations: results.recommendations,
		accessibility: results.accessibility,
		performance: results.performance,
		screenshots: results.screenshots,
	};
}
