import type React from "react";
import { createContext, useContext, useMemo, useState } from "react";

export type SettingsState = {
	engine: string;
	useFast: boolean;
	fastKind?: string;
	useCaptions: boolean;
	useOcr: boolean;
	topK: number;
};

export type SettingsActions = {
	setEngine: (e: string) => void;
	setUseFast: (v: boolean) => void;
	setFastKind: (k?: string) => void;
	setUseCaptions: (v: boolean) => void;
	setUseOcr: (v: boolean) => void;
	setTopK: (k: number) => void;
};

const Ctx = createContext<{
	state: SettingsState;
	actions: SettingsActions;
} | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
	const [engine, setEngine] = useState("local");
	const [useFast, setUseFast] = useState(false);
	const [fastKind, setFastKind] = useState<string | undefined>("faiss");
	const [useCaptions, setUseCaptions] = useState(false);
	const [useOcr, setUseOcr] = useState(false);
	const [topK, setTopK] = useState(60);

	const value = useMemo(
		() => ({
			state: { engine, useFast, fastKind, useCaptions, useOcr, topK },
			actions: {
				setEngine,
				setUseFast,
				setFastKind,
				setUseCaptions,
				setUseOcr,
				setTopK,
			},
		}),
		[engine, useFast, fastKind, useCaptions, useOcr, topK],
	);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettingsContext() {
	const v = useContext(Ctx);
	if (!v)
		throw new Error("useSettingsContext must be used within SettingsProvider");
	return v;
}
