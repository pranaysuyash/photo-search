// Export all stores and their selectors

export * from "./photoStore";
export * from "./settingsStore";
export * from "./types";
export * from "./uiStore";
export * from "./workspaceStore";

// Combined selectors for convenience
import { usePhotoStore } from "./photoStore";
import { useSettingsStore } from "./settingsStore";
import { useUIStore } from "./uiStore";
import { useWorkspaceStore } from "./workspaceStore";

// Shallow equality checks for performance
export const useShallow = <T>(selector: (state: any) => T) => selector;

// Combined state selector for components that need multiple stores
export const useCombinedState = () => ({
	photo: usePhotoStore(),
	ui: useUIStore(),
	settings: useSettingsStore(),
	workspace: useWorkspaceStore(),
});

// Reset all stores (useful for logout/reset functionality)
export const resetAllStores = () => {
	usePhotoStore.setState({
		results: [],
		searchId: "",
		query: "",
		topK: 24,
		fav: [],
		favOnly: false,
		tags: { allTags: [], tagsMap: {}, tagFilter: "" },
		saved: [],
		collections: {},
		smart: {},
		library: [],
	});

	useUIStore.setState({
		busy: "",
		note: "",
		viewMode: "grid",
		showWelcome: false,
		showHelp: false,
	});

	useWorkspaceStore.setState({
		workspace: [],
		wsToggle: false,
		persons: [],
		clusters: [],
		groups: [],
		points: [],
		diag: null,
	});

	// Don't reset settings as they contain user preferences
};
