import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createAppError,
	ErrorType,
	handleError,
	logServerError,
} from "../../utils/errors";

vi.mock("../../api", () => ({
	apiAnalyticsLog: vi.fn(async () => ({})),
}));

const mockedApiAnalyticsLog = vi.mocked(
	(await import("../../api")).apiAnalyticsLog,
);

beforeEach(() => {
	mockedApiAnalyticsLog.mockClear();
	localStorage.clear();
	// Ensure server logging is enabled in tests regardless of env defaults
	process.env.VITE_LOG_ERRORS_TO_SERVER = "1";
	process.env.VITE_LOG_ERRORS_ENV = "all";
	process.env.VITE_ERROR_LOG_SAMPLE = "1";
});

describe("errors logging", () => {
	it("logs to server when enabled and dir provided in context", async () => {
		handleError(new Error("Boom"), {
			showToast: false,
			logToConsole: false,
			logToServer: true,
			context: {
				dir: "/test/dir",
				action: "index",
				component: "IndexManager",
				userId: "u1",
				sessionId: "s1",
				metadata: { step: 1 },
			},
		});
		// Wait for async logging IIFE
		await new Promise((r) => setTimeout(r, 0));
		expect(mockedApiAnalyticsLog).toHaveBeenCalledTimes(1);
		const [dir, kind, payload] = mockedApiAnalyticsLog.mock.calls[0];
		expect(dir).toBe("/test/dir");
		expect(kind).toBe("error");
		expect(payload).toMatchObject({
			action: "index",
			component: "IndexManager",
		});
	});

	it("falls back to persisted dir when context.dir is missing", async () => {
		localStorage.setItem(
			"photo-search-settings",
			JSON.stringify({ state: { dir: "/persisted/dir" }, version: 1 }),
		);
		handleError(createAppError("Network fail", ErrorType.NETWORK), {
			showToast: false,
			logToConsole: false,
			logToServer: true,
		});
		await new Promise((r) => setTimeout(r, 0));
		expect(mockedApiAnalyticsLog).toHaveBeenCalledTimes(1);
		expect(mockedApiAnalyticsLog.mock.calls[0][0]).toBe("/persisted/dir");
	});

	it("logServerError returns boolean and calls analytics when dir present", async () => {
		const ok = await logServerError(new Error("Bad things"), {
			dir: "/another/dir",
			action: "save",
			component: "SaveModal",
			metadata: { items: 2 },
		});
		expect(ok).toBe(true);
		expect(mockedApiAnalyticsLog).toHaveBeenCalledTimes(1);
	});

	it("logServerError returns false without dir", async () => {
		const ok = await logServerError(new Error("noop"), {
			dir: "",
			action: "noop",
			component: "X",
			metadata: {},
		});
		expect(ok).toBe(false);
	});
});
