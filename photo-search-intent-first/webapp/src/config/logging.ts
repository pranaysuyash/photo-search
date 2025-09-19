export type LogEnvGate = "prod" | "all";

// Lightweight central logging configuration and helpers
// Prefer Vite env but merge with Node env for tests and non-Vite contexts
const viteEnv = ((import.meta as unknown as { env?: Record<string, any> })
	?.env || {}) as Record<string, any>;
// Resolve env dynamically so tests can tweak process.env between calls
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEnv(): Record<string, any> {
	return {
		...(typeof process !== "undefined" ? (process as unknown).env : {}),
		...viteEnv,
	};
}

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const num = (v: unknown, fallback: number) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : fallback;
};
const bool = (v: unknown, fallbackTrue = true) => {
	if (v === undefined || v === null || v === "") return fallbackTrue;
	const s = String(v).toLowerCase();
	if (["0", "false", "off", "no"].includes(s)) return false;
	if (["1", "true", "on", "yes"].includes(s)) return true;
	return fallbackTrue;
};

export function getLoggingConfig() {
	const env = getEnv();
	return {
		enabled: String(env.VITE_LOG_ERRORS_TO_SERVER ?? "1") !== "0",
		envGate: (String(env.VITE_LOG_ERRORS_ENV || "prod") === "all"
			? "all"
			: "prod") as LogEnvGate,
		mode: env.MODE || env.NODE_ENV || "development",
		globalSample: clamp(num(env.VITE_ERROR_LOG_SAMPLE ?? "1", 1)),
		imageErrorSample: clamp(num(env.VITE_IMAGE_ERROR_SAMPLE ?? "0.02", 0.02)),
	};
}

export function shouldLogErrorsToServer(): boolean {
	const cfg = getLoggingConfig();
	return cfg.enabled && (cfg.envGate === "all" || cfg.mode === "production");
}

export function shouldSample(rate: number): boolean {
	const r = clamp(num(rate, 0));
	return r > 0 && Math.random() < r;
}

export function getImageErrorSampleRate(): number {
	return getLoggingConfig().imageErrorSample;
}

// Per-service enable flags (default enabled)
export type LogService =
	| "image"
	| "video"
	| "offline"
	| "backup"
	| "offlinePhoto";

export function serviceEnabled(service: LogService): boolean {
	const env = getEnv();
	switch (service) {
		case "image":
			return bool(env.VITE_LOG_IMAGE_ERRORS, true) && shouldLogErrorsToServer();
		case "video":
			return bool(env.VITE_LOG_VIDEO_ERRORS, true) && shouldLogErrorsToServer();
		case "offline":
			return (
				bool(env.VITE_LOG_OFFLINE_ERRORS, true) && shouldLogErrorsToServer()
			);
		case "backup":
			return (
				bool(env.VITE_LOG_BACKUP_ERRORS, true) && shouldLogErrorsToServer()
			);
		case "offlinePhoto":
			return (
				bool(env.VITE_LOG_OFFLINE_PHOTO_ERRORS, true) &&
				shouldLogErrorsToServer()
			);
		default:
			return shouldLogErrorsToServer();
	}
}
