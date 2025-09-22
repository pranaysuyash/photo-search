/**
 * Custom hook for data loading lifecycle management
 * Encapsulates all data loading logic that depends on directory changes
 */
import { useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useJobs } from "@/stores/useJobsStore";
import { usePhotoActions } from "@/stores/usePhotoStore";
import { useSettings } from "@/stores/useSettingsStore";
import { useUIActions } from "@/stores/useUIStore";
import { useWorkspace } from "@/stores/useWorkspaceStore";

interface UseDataLifecycleProps {
	dir: string | null;
	engine: string;
	needsHf: boolean;
	hfToken?: string;
	needsOAI: boolean;
	openaiKey?: string;
	loadLibrary: (
		limit?: number,
		offset?: number,
		append?: boolean,
	) => Promise<void>;
	loadFav: () => Promise<void>;
	loadSaved: () => Promise<void>;
	loadTags: () => Promise<void>;
	loadDiag: () => Promise<void>;
	loadFaces: () => Promise<void>;
	loadMap: () => Promise<void>;
	loadPresets: () => Promise<void>;
}

export function useDataLifecycle({
	dir,
	engine,
	needsHf,
	hfToken,
	needsOAI,
	openaiKey,
	loadLibrary,
	loadFav,
	loadSaved,
	loadTags,
	loadDiag,
	loadFaces,
	loadMap,
	loadPresets,
}: UseDataLifecycleProps) {
	const { pushToast } = useToast();
	const { jobsActions } = useJobs();
	const { settingsActions } = useSettings();
	const { workspaceActions } = useWorkspace();
	const { photoActions } = usePhotoActions();
	const { uiActions } = useUIActions();

	// Load all initial data when directory changes
	const loadInitialData = useCallback(async () => {
		if (!dir) return;

		try {
			// Load core data in parallel
			await Promise.all([
				loadLibrary(120, 0, false),
				loadFav(),
				loadSaved(),
				loadTags(),
				loadDiag(),
				loadFaces(),
				loadMap(),
				loadPresets(),
			]);

			uiActions.setNote("Library loaded");
		} catch (error) {
			console.error("Failed to load initial data:", error);
			pushToast({
				variant: "destructive",
				title: "Data Loading Error",
				description: "Failed to load library data. Please try refreshing.",
			});
		}
	}, [
		dir,
		loadLibrary,
		loadFav,
		loadSaved,
		loadTags,
		loadDiag,
		loadFaces,
		loadMap,
		loadPresets,
		uiActions,
		pushToast,
	]);

	// Reload data when needed (e.g., after operations)
	const reloadData = useCallback(async () => {
		if (!dir) return;

		try {
			await Promise.all([loadLibrary(120, 0, false), loadFav(), loadTags()]);

			uiActions.setNote("Data refreshed");
		} catch (error) {
			console.error("Failed to reload data:", error);
			pushToast({
				variant: "destructive",
				title: "Reload Error",
				description: "Failed to refresh data. Please try again.",
			});
		}
	}, [dir, loadLibrary, loadFav, loadTags, uiActions, pushToast]);

	// Effect to load initial data when directory changes
	useEffect(() => {
		if (dir) {
			loadInitialData();
		}
	}, [dir, loadInitialData]);

	return {
		loadInitialData,
		reloadData,
	};
}
