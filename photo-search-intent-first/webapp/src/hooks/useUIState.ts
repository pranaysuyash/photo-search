/**
 * Custom hook for managing UI state and preferences
 * Encapsulates grid size, view modes, and UI preferences
 */
import { useCallback, useMemo } from "react";
import { useSettings } from "@/stores/useSettingsStore";
import { useUIActions } from "@/stores/useUIStore";

type GridSize = "small" | "medium" | "large";
type ViewType = "results" | "library" | "map" | "people" | "tasks" | "trips";

interface UseUIStateProps {
	initialGridSize?: GridSize;
	initialView?: ViewType;
}

export function useUIState({
	initialGridSize = "medium",
	initialView = "results",
}: UseUIStateProps = {}) {
	const { settingsActions } = useSettings();
	const { uiActions } = useUIActions();

	// Grid size management
	const gridSize = useMemo(() => {
		// This would come from settings store in reality
		return initialGridSize;
	}, [initialGridSize]);

	const setGridSize = useCallback(
		(size: GridSize) => {
			// Update in settings store
			settingsActions.setGridSize(size);
			// Update UI
			uiActions.setNote(`Grid size: ${size}`);
		},
		[settingsActions, uiActions],
	);

	// View management
	const currentView = useMemo(() => {
		// This would come from settings store in reality
		return initialView;
	}, [initialView]);

	const setView = useCallback(
		(view: ViewType) => {
			// Update in settings store
			settingsActions.setCurrentView(view);
			// Update UI
			uiActions.setNote(`Switched to ${view} view`);
		},
		[settingsActions, uiActions],
	);

	// Toggle info overlay
	const toggleInfoOverlay = useCallback(() => {
		settingsActions.toggleInfoOverlay();
		uiActions.setNote(
			settingsActions.showInfoOverlay
				? "Info overlay enabled"
				: "Info overlay disabled",
		);
	}, [settingsActions, uiActions]);

	// Toggle fullscreen mode
	const toggleFullscreen = useCallback(() => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch((err) => {
				console.error(`Error attempting to enable fullscreen: ${err.message}`);
				uiActions.setNote("Failed to enter fullscreen mode");
			});
		} else {
			document.exitFullscreen().catch((err) => {
				console.error(`Error attempting to exit fullscreen: ${err.message}`);
				uiActions.setNote("Failed to exit fullscreen mode");
			});
		}
	}, [uiActions]);

	// Theme management
	const toggleTheme = useCallback(() => {
		const currentTheme = document.documentElement.classList.contains("dark")
			? "dark"
			: "light";
		const newTheme = currentTheme === "dark" ? "light" : "dark";

		document.documentElement.classList.toggle("dark");
		localStorage.setItem("ps_theme", newTheme);
		uiActions.setNote(`Theme switched to ${newTheme}`);
	}, [uiActions]);

	return {
		// State
		gridSize,
		currentView,
		showInfoOverlay: settingsActions.showInfoOverlay,

		// Actions
		setGridSize,
		setView,
		toggleInfoOverlay,
		toggleFullscreen,
		toggleTheme,

		// Utilities
		isSmallGrid: gridSize === "small",
		isLargeGrid: gridSize === "large",
		isResultsView: currentView === "results",
		isLibraryView: currentView === "library",
	};
}
