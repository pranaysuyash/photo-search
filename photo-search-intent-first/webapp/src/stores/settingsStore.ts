import { useMemo } from "react";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type { SettingsActions, SettingsState } from "./types";

interface SettingsStore extends SettingsState, SettingsActions {}

// Theme types
export type ThemeMode = "light" | "dark" | "auto";
export type ColorScheme =
	| "blue"
	| "green"
	| "purple"
	| "orange"
	| "gray"
	| "custom";
export type Density = "compact" | "normal" | "spacious";

export interface ThemeState {
	themeMode: ThemeMode;
	colorScheme: ColorScheme;
	density: Density;
	customColors?: {
		primary: string;
		secondary: string;
		accent: string;
	};
}

export interface ThemeActions {
	setThemeMode: (mode: ThemeMode) => void;
	setColorScheme: (scheme: ColorScheme) => void;
	setDensity: (density: Density) => void;
	setCustomColors: (colors?: {
		primary: string;
		secondary: string;
		accent: string;
	}) => void;
	resetTheme: () => void;
}

// Separate theme store
interface ThemeStore extends ThemeState, ThemeActions {}

export const useThemeStore = create<ThemeStore>()(
	persist(
		subscribeWithSelector((set, _get) => ({
			// Initial theme state
			themeMode: "auto" as ThemeMode,
			colorScheme: "blue" as ColorScheme,
			density: "normal" as Density,
			customColors: undefined,

			// Theme actions
			setThemeMode: (themeMode) => set({ themeMode }),
			setColorScheme: (colorScheme) => set({ colorScheme }),
			setDensity: (density) => set({ density }),
			setCustomColors: (customColors) => set({ customColors }),
			resetTheme: () =>
				set({
					themeMode: "auto",
					colorScheme: "blue",
					density: "normal",
					customColors: undefined,
				}),
		})),
		{
			name: "photo-search-theme",
			partialize: (state) => ({
				themeMode: state.themeMode,
				colorScheme: state.colorScheme,
				density: state.density,
				customColors: state.customColors,
			}),
		},
	),
);

// Theme selectors
export const useThemeMode = () => useThemeStore((state) => state.themeMode);
export const useColorScheme = () => useThemeStore((state) => state.colorScheme);
export const useDensity = () => useThemeStore((state) => state.density);
export const useCustomColors = () =>
	useThemeStore((state) => state.customColors);
export const useThemeActions = () =>
	useThemeStore((state) => ({
		setThemeMode: state.setThemeMode,
		setColorScheme: state.setColorScheme,
		setDensity: state.setDensity,
		setCustomColors: state.setCustomColors,
		resetTheme: state.resetTheme,
	}));

export const useSettingsStore = create<SettingsStore>()(
	persist(
		subscribeWithSelector((set, _get) => ({
			// Initial state
			dir: "",
			engine: "local",
			hfToken: "",
			openaiKey: "",
			useFast: false,
			fastKind: "",
			useCaps: false,
			vlmModel: "Qwen/Qwen2-VL-2B-Instruct",
			useOcr: false,
			hasText: false,
			useOsTrash: false,
			// Experiments / feature flags
			searchCommandCenter: true,
			// UI toggles
			showExplain: false,
			showInfoOverlay: false,
			highContrast: false,
			enableDemoLibrary: true,

			// EXIF filters
			camera: "",
			isoMin: 0,
			isoMax: 0,
			fMin: 0,
			fMax: 0,
			place: "",

			// Actions
			setDir: (dir) => {
				set({ dir });
			},
			setEngine: (engine) => set({ engine }),
			setHfToken: (hfToken) => set({ hfToken }),
			setOpenaiKey: (openaiKey) => set({ openaiKey }),
			setUseFast: (useFast) => set({ useFast }),
			setFastKind: (fastKind) => set({ fastKind }),
			setUseCaps: (useCaps) => set({ useCaps }),
			setVlmModel: (vlmModel) => set({ vlmModel }),
			setUseOcr: (useOcr) => set({ useOcr }),
			setHasText: (hasText) => set({ hasText }),
			setUseOsTrash: (useOsTrash) => set({ useOsTrash }),
			// Feature flags
			setSearchCommandCenter: (searchCommandCenter: boolean) =>
				set({ searchCommandCenter }),
			setShowExplain: (showExplain) => set({ showExplain }),
			setShowInfoOverlay: (showInfoOverlay) => set({ showInfoOverlay }),
			setHighContrast: (highContrast) => set({ highContrast }),
			setEnableDemoLibrary: (enableDemoLibrary: boolean) =>
				set({ enableDemoLibrary }),
			setCamera: (camera) => set({ camera }),
			setIsoMin: (isoMin: number | string) =>
				set({ isoMin: Number(isoMin) || 0 }),
			setIsoMax: (isoMax: number | string) =>
				set({ isoMax: Number(isoMax) || 0 }),
			setFMin: (fMin: number | string) => set({ fMin: Number(fMin) || 0 }),
			setFMax: (fMax: number | string) => set({ fMax: Number(fMax) || 0 }),
			setPlace: (place) => set({ place }),
		})),
		{
			name: "photo-search-settings", // unique name for localStorage key
			// Only persist non-sensitive settings
			partialize: (state) => ({
				dir: state.dir,
				engine: state.engine,
				useFast: state.useFast,
				fastKind: state.fastKind,
				useCaps: state.useCaps,
				vlmModel: state.vlmModel,
				useOcr: state.useOcr,
				hasText: state.hasText,
				useOsTrash: state.useOsTrash,
				searchCommandCenter: state.searchCommandCenter,
				showExplain: state.showExplain,
				showInfoOverlay: state.showInfoOverlay,
				camera: state.camera,
				isoMin: state.isoMin,
				isoMax: state.isoMax,
				fMin: state.fMin,
				fMax: state.fMax,
				place: state.place,
				enableDemoLibrary: state.enableDemoLibrary,
				// Don't persist sensitive tokens
				// hfToken and openaiKey are not included
			}),
		},
	),
);

// Selectors for optimized subscriptions
export const useDir = () => useSettingsStore((state) => state.dir);
export const useEngine = () => useSettingsStore((state) => state.engine);
export const useHfToken = () => useSettingsStore((state) => state.hfToken);
export const useOpenaiKey = () => useSettingsStore((state) => state.openaiKey);
export const useFastIndexEnabled = () =>
	useSettingsStore((state) => state.useFast);
export const useFastKind = () => useSettingsStore((state) => state.fastKind);
export const useCaptionsEnabled = () =>
	useSettingsStore((state) => state.useCaps);
export const useVlmModel = () => useSettingsStore((state) => state.vlmModel);
export const useOcrEnabled = () => useSettingsStore((state) => state.useOcr);
export const useHasText = () => useSettingsStore((state) => state.hasText);
export const useOsTrashEnabled = () =>
	useSettingsStore((state) => state.useOsTrash);
export const useSearchCommandCenter = () =>
	useSettingsStore((state) => state.searchCommandCenter);
export const useShowExplain = () =>
	useSettingsStore((state) => state.showExplain);
export const useShowInfoOverlay = () =>
	useSettingsStore((state) => state.showInfoOverlay);
export const useHighContrast = () =>
	useSettingsStore((state) => state.highContrast);
export const useEnableDemoLibrary = () =>
	useSettingsStore((state) => state.enableDemoLibrary);
export const useCamera = () => useSettingsStore((state) => state.camera);
export const useIsoMin = () => useSettingsStore((state) => state.isoMin);
export const useIsoMax = () => useSettingsStore((state) => state.isoMax);
export const useFMin = () => useSettingsStore((state) => state.fMin);
export const useFMax = () => useSettingsStore((state) => state.fMax);
export const usePlace = () => useSettingsStore((state) => state.place);

// Computed selectors
export const useNeedsHf = () => {
	const engine = useSettingsStore((state) => state.engine);
	return engine.startsWith("hf");
};
export const useNeedsOAI = () => {
	const engine = useSettingsStore((state) => state.engine);
	return engine === "openai";
};

// EXIF filters combined
export const useExifFilters = () =>
	useSettingsStore((state) => ({
		camera: state.camera,
		isoMin: state.isoMin,
		isoMax: state.isoMax,
		fMin: state.fMin,
		fMax: state.fMax,
		place: state.place,
	}));

// Actions selector - memoize to avoid update-depth loops in tests
export const useSettingsActions = () => {
	const setDir = useSettingsStore((s) => s.setDir);
	const setEngine = useSettingsStore((s) => s.setEngine);
	const setHfToken = useSettingsStore((s) => s.setHfToken);
	const setOpenaiKey = useSettingsStore((s) => s.setOpenaiKey);
	const setUseFast = useSettingsStore((s) => s.setUseFast);
	const setFastKind = useSettingsStore((s) => s.setFastKind);
	const setUseCaps = useSettingsStore((s) => s.setUseCaps);
	const setVlmModel = useSettingsStore((s) => s.setVlmModel);
	const setUseOcr = useSettingsStore((s) => s.setUseOcr);
	const setHasText = useSettingsStore((s) => s.setHasText);
	const setUseOsTrash = useSettingsStore((s) => s.setUseOsTrash);
	const setShowExplain = useSettingsStore((s) => s.setShowExplain);
	const setShowInfoOverlay = useSettingsStore((s) => s.setShowInfoOverlay);
	const setHighContrast = useSettingsStore((s) => s.setHighContrast);
	const setEnableDemoLibrary = useSettingsStore((s) => s.setEnableDemoLibrary);
	const setCamera = useSettingsStore((s) => s.setCamera);
	const setIsoMin = useSettingsStore((s) => s.setIsoMin);
	const setIsoMax = useSettingsStore((s) => s.setIsoMax);
	const setFMin = useSettingsStore((s) => s.setFMin);
	const setFMax = useSettingsStore((s) => s.setFMax);
	const setPlace = useSettingsStore((s) => s.setPlace);

	// Optional methods that may not be implemented in all contexts
	const setResultView = useSettingsStore((s) => s.setResultView) || (() => {});
	const setTimelineBucket =
		useSettingsStore((s) => s.setTimelineBucket) || (() => {});

	return useMemo(
		() => ({
			setDir,
			setEngine,
			setHfToken,
			setOpenaiKey,
			setUseFast,
			setFastKind,
			setUseCaps,
			setVlmModel,
			setUseOcr,
			setHasText,
			setUseOsTrash,
			setShowExplain,
			setShowInfoOverlay,
			setHighContrast,
			setEnableDemoLibrary,
			setCamera,
			setIsoMin,
			setIsoMax,
			setFMin,
			setFMax,
			setPlace,
			setResultView,
			setTimelineBucket,
		}),
		[
			setDir,
			setEngine,
			setHfToken,
			setOpenaiKey,
			setUseFast,
			setFastKind,
			setUseCaps,
			setVlmModel,
			setUseOcr,
			setHasText,
			setUseOsTrash,
			setShowExplain,
			setShowInfoOverlay,
			setHighContrast,
			setEnableDemoLibrary,
			setCamera,
			setIsoMin,
			setIsoMax,
			setFMin,
			setFMax,
			setPlace,
			setResultView,
			setTimelineBucket,
		],
	);
};
