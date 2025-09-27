import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/electron",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["html", { outputFolder: "test-results/electron-html" }],
    ["list"],
  ],
  use: {
    trace: "on",
    screenshot: "on",
    video: "on",
  },
  projects: [
    {
      name: "electron",
      testMatch: "**/*.electron.spec.ts",
    },
  ],
  outputDir: "test-results/electron",
});
