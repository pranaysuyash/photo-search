/**
 * Store Index - Central export for all Zustand stores
 *
 * Provides convenient imports for all application stores.
 */

export * from "./photoStore";
export * from "./searchStore";
export * from "./libraryStore";
export * from "./uiStore";
export * from "./settingsStore";
export * from "./userPrefsStore";

// Re-export commonly used hooks for convenience
export { usePhotoStore } from "./photoStore";
export { useSearchStore } from "./searchStore";
export { useLibraryStore } from "./libraryStore";
export { useUIStore } from "./uiStore";
export { useSettingsStore } from "./settingsStore";
export { useUserPrefsStore } from "./userPrefsStore";
