/**
 * User Preferences Store - Manages user settings and preferences
 *
 * Handles application settings, keyboard shortcuts, and user customizations.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserPrefsState {
  // Display preferences
  language: string;
  dateFormat: "relative" | "absolute";
  timeZone: string;

  // Performance preferences
  thumbnailQuality: "low" | "medium" | "high";
  enableAnimations: boolean;
  enableTelemetry: boolean;

  // Search preferences
  searchResultLimit: number;
  enableSearchHistory: boolean;
  enableSearchSuggestions: boolean;

  // Privacy preferences
  enableFaceRecognition: boolean;
  enableLocationData: boolean;

  // Keyboard shortcuts enabled
  enableKeyboardShortcuts: boolean;

  // Onboarding/Tutorial
  hasCompletedOnboarding: boolean;
  dismissedTips: Set<string>;

  // Actions - Display
  setLanguage: (language: string) => void;
  setDateFormat: (format: "relative" | "absolute") => void;
  setTimeZone: (timeZone: string) => void;

  // Actions - Performance
  setThumbnailQuality: (quality: UserPrefsState["thumbnailQuality"]) => void;
  setEnableAnimations: (enable: boolean) => void;
  setEnableTelemetry: (enable: boolean) => void;

  // Actions - Search
  setSearchResultLimit: (limit: number) => void;
  setEnableSearchHistory: (enable: boolean) => void;
  setEnableSearchSuggestions: (enable: boolean) => void;

  // Actions - Privacy
  setEnableFaceRecognition: (enable: boolean) => void;
  setEnableLocationData: (enable: boolean) => void;

  // Actions - Keyboard
  setEnableKeyboardShortcuts: (enable: boolean) => void;

  // Actions - Onboarding
  completeOnboarding: () => void;
  dismissTip: (tipId: string) => void;
  resetTips: () => void;

  // Utility
  reset: () => void;
}

const initialState = {
  language: "en",
  dateFormat: "relative" as const,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,

  thumbnailQuality: "medium" as const,
  enableAnimations: true,
  enableTelemetry: false,

  searchResultLimit: 100,
  enableSearchHistory: true,
  enableSearchSuggestions: true,

  enableFaceRecognition: true,
  enableLocationData: true,

  enableKeyboardShortcuts: true,

  hasCompletedOnboarding: false,
  dismissedTips: new Set<string>(),
};

export const useUserPrefsStore = create<UserPrefsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Display actions
      setLanguage: (language) => set({ language }),

      setDateFormat: (dateFormat) => set({ dateFormat }),

      setTimeZone: (timeZone) => set({ timeZone }),

      // Performance actions
      setThumbnailQuality: (thumbnailQuality) => set({ thumbnailQuality }),

      setEnableAnimations: (enableAnimations) => set({ enableAnimations }),

      setEnableTelemetry: (enableTelemetry) => set({ enableTelemetry }),

      // Search actions
      setSearchResultLimit: (searchResultLimit) => set({ searchResultLimit }),

      setEnableSearchHistory: (enableSearchHistory) =>
        set({ enableSearchHistory }),

      setEnableSearchSuggestions: (enableSearchSuggestions) =>
        set({ enableSearchSuggestions }),

      // Privacy actions
      setEnableFaceRecognition: (enableFaceRecognition) =>
        set({ enableFaceRecognition }),

      setEnableLocationData: (enableLocationData) =>
        set({ enableLocationData }),

      // Keyboard actions
      setEnableKeyboardShortcuts: (enableKeyboardShortcuts) =>
        set({ enableKeyboardShortcuts }),

      // Onboarding actions
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      dismissTip: (tipId) => {
        const { dismissedTips } = get();
        const newDismissed = new Set(dismissedTips);
        newDismissed.add(tipId);
        set({ dismissedTips: newDismissed });
      },

      resetTips: () => set({ dismissedTips: new Set() }),

      // Utility
      reset: () => set(initialState),
    }),
    {
      name: "photo-search-user-prefs",
      // All fields are persisted
    }
  )
);

// Selectors
export const useLanguage = () => useUserPrefsStore((state) => state.language);
export const useThumbnailQuality = () =>
  useUserPrefsStore((state) => state.thumbnailQuality);
export const useEnableAnimations = () =>
  useUserPrefsStore((state) => state.enableAnimations);
export const usePrivacyPrefs = () =>
  useUserPrefsStore((state) => ({
    faceRecognition: state.enableFaceRecognition,
    locationData: state.enableLocationData,
  }));
export const useHasCompletedOnboarding = () =>
  useUserPrefsStore((state) => state.hasCompletedOnboarding);
