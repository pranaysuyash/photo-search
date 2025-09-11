export const AI_TESTING_CONFIG = {
	// AI Service Configuration
	aiService: {
		provider: "openai", // 'openai', 'anthropic', 'google'
		model: "gpt-4-vision-preview",
		apiKey: process.env.AI_TESTING_API_KEY,
		maxTokens: 4000,
		temperature: 0.1,
	},

	// Testing Configuration
	testing: {
		maxScreenshots: 50,
		screenshotQuality: 80,
		interactionTimeout: 5000,
		analysisTimeout: 30000,
		maxConcurrentTests: 3,
	},

	// Analysis Prompts
	prompts: {
		uiAnalysis: `Analyze this screenshot and identify:
    1. UI/UX issues or problems
    2. Missing or broken elements
    3. Layout or design inconsistencies
    4. Accessibility concerns
    5. Performance indicators
    Provide specific recommendations for improvement.`,

		interactionAnalysis: `Compare these before/after screenshots of a user interaction:
    1. Did the interaction work as expected?
    2. Are there any visual glitches or errors?
    3. Is the feedback/response appropriate?
    4. Any performance issues during interaction?`,

		responsiveAnalysis: `Analyze this {device} screenshot for responsive design:
    1. Does the layout adapt properly to {device}?
    2. Are elements properly sized and positioned?
    3. Is text readable?
    4. Any layout breaks or issues?`,

		accessibilityAnalysis: `Check this screenshot for accessibility issues:
    1. Color contrast problems
    2. Missing alt text indicators
    3. Keyboard navigation issues
    4. Screen reader compatibility concerns`,
	},

	// Issue Classification
	issueTypes: {
		critical: ["broken functionality", "security issues", "data loss", "crash"],
		high: ["accessibility violations", "broken links", "form errors"],
		medium: ["ui inconsistencies", "performance issues", "usability problems"],
		low: [
			"cosmetic issues",
			"minor layout problems",
			"optimization opportunities",
		],
	},

	// Reporting Configuration
	reporting: {
		outputDir: "test-results/ai-analysis",
		reportFormats: ["json", "html", "markdown"],
		includeScreenshots: true,
		generateSummary: true,
	},
};
