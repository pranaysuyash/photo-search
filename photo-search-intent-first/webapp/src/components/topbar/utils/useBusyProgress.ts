import type { CSSProperties } from "react";
import { useMemo } from "react";

export interface BusyProgressState {
	hasDeterminateProgress: boolean;
	ariaLabel: string;
	ariaValueNow?: number;
	dataState: "determinate" | "indeterminate";
	style?: CSSProperties;
}

export function useBusyProgress(progressPct?: number): BusyProgressState {
	return useMemo(() => {
		const hasDeterminateProgress =
			typeof progressPct === "number" && Number.isFinite(progressPct);
		if (!hasDeterminateProgress) {
			return {
				hasDeterminateProgress: false,
				ariaLabel: "Processing",
				dataState: "indeterminate" as const,
			};
		}

		const normalized = Math.min(
			100,
			Math.max(0, Math.round(progressPct * 100)),
		);
		const displayPercent = Math.min(100, Math.max(5, normalized));
		const style: CSSProperties = {
			["--progress-bar-percent" as const]: `${displayPercent}%`,
		};

		return {
			hasDeterminateProgress: true,
			ariaLabel: `${normalized}% complete`,
			ariaValueNow: normalized,
			dataState: "determinate" as const,
			style,
		};
	}, [progressPct]);
}

export default useBusyProgress;
