import { create } from "zustand";
import { subscribeWithSelector, persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { SettingsState, SettingsActions } from "./types";

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
    subscribeWithSelector((set, get) => ({
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
    }
  )
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
    subscribeWithSelector((set, get) => ({
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
      // UI toggles
      showExplain: false,
      showInfoOverlay: false,
      highContrast: false,

      // EXIF filters
      camera: "",
      isoMin: "",
      isoMax: "",
      fMin: "",
      fMax: "",
      place: "",

      // Actions
      setDir: (dir) => set({ dir }),
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
      setShowExplain: (showExplain) => set({ showExplain }),
      setShowInfoOverlay: (showInfoOverlay) => set({ showInfoOverlay }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setCamera: (camera) => set({ camera }),
      setIsoMin: (isoMin) => set({ isoMin }),
      setIsoMax: (isoMax) => set({ isoMax }),
      setFMin: (fMin) => set({ fMin }),
      setFMax: (fMax) => set({ fMax }),
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
        showExplain: state.showExplain,
        showInfoOverlay: state.showInfoOverlay,
        camera: state.camera,
        isoMin: state.isoMin,
        isoMax: state.isoMax,
        fMin: state.fMin,
        fMax: state.fMax,
        place: state.place,
        // Don't persist sensitive tokens
        // hfToken and openaiKey are not included
      }),
    }
  )
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
export const useShowExplain = () =>
  useSettingsStore((state) => state.showExplain);
export const useShowInfoOverlay = () =>
  useSettingsStore((state) => state.showInfoOverlay);
export const useHighContrast = () =>
  useSettingsStore((state) => state.highContrast);
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

// Stable actions selector
const settingsActionsSelector = (state: any) => ({
  setDir: state.setDir,
  setEngine: state.setEngine,
  setHfToken: state.setHfToken,
  setOpenaiKey: state.setOpenaiKey,
  setUseFast: state.setUseFast,
  setFastKind: state.setFastKind,
  setUseCaps: state.setUseCaps,
  setVlmModel: state.setVlmModel,
  setUseOcr: state.setUseOcr,
  setHasText: state.setHasText,
  setUseOsTrash: state.setUseOsTrash,
  setShowExplain: state.setShowExplain,
  setShowInfoOverlay: state.setShowInfoOverlay,
  setHighContrast: state.setHighContrast,
  setCamera: state.setCamera,
  setIsoMin: state.setIsoMin,
  setIsoMax: state.setIsoMax,
  setFMin: state.setFMin,
  setFMax: state.setFMax,
  setPlace: state.setPlace,
});

// Actions selector - use shallow comparison
export const useSettingsActions = () =>
  useSettingsStore(settingsActionsSelector);
