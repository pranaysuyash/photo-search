import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resetModules = async () => {
	vi.resetModules();
};

describe("logging config helpers", () => {
	const envBackup = { ...process.env };
	const randBackup = Math.random;

	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		// Restore env and Math.random
		process.env = { ...envBackup };
		// @ts-expect-error test override
		Math.random = randBackup;
	});

	it("should gate server logging by env flags and mode", async () => {
		process.env.VITE_LOG_ERRORS_TO_SERVER = "0";
		process.env.VITE_LOG_ERRORS_ENV = "all";
		process.env.MODE = "production";
		await resetModules();
		let mod = await import("../logging");
		expect(mod.shouldLogErrorsToServer()).toBe(false);

		process.env.VITE_LOG_ERRORS_TO_SERVER = "1";
		process.env.VITE_LOG_ERRORS_ENV = "prod";
		process.env.MODE = "development";
		await resetModules();
		mod = await import("../logging");
		expect(mod.shouldLogErrorsToServer()).toBe(false);

		process.env.MODE = "production";
		await resetModules();
		mod = await import("../logging");
		expect(mod.shouldLogErrorsToServer()).toBe(true);

		process.env.VITE_LOG_ERRORS_ENV = "all";
		process.env.MODE = "test";
		await resetModules();
		mod = await import("../logging");
		expect(mod.shouldLogErrorsToServer()).toBe(true);
	});

	it("should sample based on rate", async () => {
		const { shouldSample } = await import("../logging");
		// Force deterministic random
		// @ts-expect-error override for test
		Math.random = () => 0.5;
		expect(shouldSample(0)).toBe(false);
		expect(shouldSample(-1)).toBe(false);
		expect(shouldSample(0.4)).toBe(false);
		expect(shouldSample(0.6)).toBe(true);
		expect(shouldSample(1.5)).toBe(true);
	});

	it("should respect per-service toggles", async () => {
		process.env.VITE_LOG_ERRORS_TO_SERVER = "1";
		process.env.VITE_LOG_ERRORS_ENV = "all";
		process.env.VITE_LOG_VIDEO_ERRORS = "0";
		await resetModules();
		let mod = await import("../logging");
		expect(mod.serviceEnabled("video")).toBe(false);

		process.env.VITE_LOG_VIDEO_ERRORS = "1";
		await resetModules();
		mod = await import("../logging");
		expect(mod.serviceEnabled("video")).toBe(true);
	});

	it("should read image error sample rate with default", async () => {
		delete process.env.VITE_IMAGE_ERROR_SAMPLE;
		await resetModules();
		let mod = await import("../logging");
		expect(mod.getImageErrorSampleRate()).toBeCloseTo(0.02, 5);

		process.env.VITE_IMAGE_ERROR_SAMPLE = "0.25";
		await resetModules();
		mod = await import("../logging");
		expect(mod.getImageErrorSampleRate()).toBeCloseTo(0.25, 5);
	});
});
