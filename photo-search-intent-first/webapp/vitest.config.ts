import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		// Exclude Playwright test files from Vitest
		exclude: [
			"**/tests/**/*.test.ts",
			"**/tests/**/*.test.tsx",
			"**/tests/**/*.spec.ts",
			"**/tests/**/*.spec.tsx",
			"**/tests/**/*.e2e.ts",
			"**/tests/**/*.e2e.tsx",
			"**/tests/visual/**",
			"**/tests/onboarding/**",
			"**/node_modules/**",
			"**/dist/**",
			"**/build/**",
		],
		// Only include unit tests in src/
		include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			reportsDirectory: "./coverage",
			thresholds: {
				lines: 60,
				statements: 60,
				branches: 45,
				functions: 42,
			},
			exclude: [
				"src/test/**",
				"src/**/*.test.*",
				"tailwind.config.js",
				"postcss.config.js",
				"tsconfig.json",
				"vite.config.ts",
				"index.html",
				"src/main.tsx",
				"src/ModernApp.tsx",
				"src/App_backup.tsx",
				"src/debug/**",
				"src/components/ui/index.tsx",
				"src/stores/index.ts",
				"src/stores/useStores.ts",
			],
		},
	},
	resolve: {
		dedupe: ["react", "react-dom"],
		alias: {
			"@": resolve(__dirname, "src"),
		},
	},
});
