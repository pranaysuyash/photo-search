import { humanizeSeconds } from "../../../utils/time"; // adjust relative path if needed

export function normalizePct(value?: number): number | undefined {
	if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
	return Math.min(1, Math.max(0, value));
}

export function formatEta(seconds?: number): string | undefined {
	if (typeof seconds !== "number" || !(seconds > 0)) return undefined;
	return `ETA ~${humanizeSeconds(Math.round(seconds))}`;
}

export function ratePerMinuteStr(ratePerSecond?: number): string | undefined {
	if (typeof ratePerSecond !== "number" || !(ratePerSecond > 0))
		return undefined;
	const perMinute = ratePerSecond * 60;
	return perMinute >= 10 ? perMinute.toFixed(0) : perMinute.toFixed(1);
}
