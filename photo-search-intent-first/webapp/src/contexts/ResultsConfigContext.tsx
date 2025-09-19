import type React from "react";
import { createContext, useContext } from "react";

export type ResultView = "grid" | "film" | "timeline" | "map";
export type TimelineBucket = "day" | "week" | "month";

export interface ResultsConfigValue {
	resultView: ResultView;
	setResultView: (view: ResultView) => void;
	timelineBucket: TimelineBucket;
	setTimelineBucket: (b: TimelineBucket) => void;
}

const Ctx = createContext<ResultsConfigValue | null>(null);

export function ResultsConfigProvider({
	value,
	children,
}: {
	value: ResultsConfigValue;
	children: React.ReactNode;
}) {
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResultsConfig() {
	const v = useContext(Ctx);
	if (!v)
		throw new Error(
			"useResultsConfig must be used within ResultsConfigProvider",
		);
	return v;
}
