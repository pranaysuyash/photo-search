import { useCallback } from "react";
import {
	apiDiagnostics,
	apiFacesClusters,
	apiGetFavorites,
	apiGetMetadata,
	apiGetPresets,
	apiGetSaved,
	apiGetTags,
	apiLibrary,
	apiMap,
	apiWatchStart,
	apiWatchStatus,
} from "../api";
import type { ErrorHandlerOptions } from "../utils/errors";
import { _withErrorHandling, networkErrors } from "../utils/errors";

export interface DataLoadingOptions {
	dir: string;
	engine: string;
	needsHf: boolean;
	needsOAI: boolean;
	hfToken?: string;
	openaiKey?: string;
	uiActions: {
		setNote: (message: string) => void;
	};
	photoActions: {
		setFavorites: (favorites: string[]) => void;
		setSaved: (saved: unknown[]) => void;
		setTagsMap: (tags: Record<string, string[]>) => void;
		setAllTags: (tags: string[]) => void;
		setCollections: (collections: Record<string, string[]>) => void;
		setSmart: (smart: Record<string, any>) => void;
		setLibrary: (library: string[]) => void;
		appendLibrary: (library: string[]) => void;
		setLibHasMore: (hasMore: boolean) => void;
		setResults: (results: unknown[]) => void;
		setSearchId: (id: string) => void;
		setTopK: (k: number) => void;
		setFavOnly: (favOnly: boolean) => void;
		setTagFilter: (tagFilter: string) => void;
		setPresets?: (presets: unknown[]) => void;
	};
	workspaceActions: {
		setDiag: (diag: unknown) => void;
		setClusters: (clusters: unknown[]) => void;
		setPoints: (points: unknown[]) => void;
		setPersons: (persons: string[]) => void;
	};
	settingsActions: {
		setPlace: (place: string) => void;
		setCamera: (camera: string) => void;
		setIsoMin: (iso: number) => void;
		setIsoMax: (iso: number) => void;
		setFMin: (f: number) => void;
		setFMax: (f: number) => void;
		setHasText: (hasText: boolean) => void;
		setUseCaps: (useCaps: boolean) => void;
		setUseOcr: (useOcr: boolean) => void;
		setResultView: (view: "grid" | "film" | "timeline") => void;
		setTimelineBucket: (bucket: "day" | "week" | "month") => void;
		setShowInfoOverlay: (show: boolean) => void;
		setCameras?: (cameras: string[]) => void;
		setPlaces?: (places: string[]) => void;
	};
}

export const useDataLoading = (_options: DataLoadingOptions) => {
	const {
		dir,
		engine,
		needsHf,
		needsOAI,
		hfToken,
		openaiKey,
		uiActions,
		photoActions,
		workspaceActions,
		settingsActions: _settingsActions,
	} = _options;

	const defaultErrorOptions: ErrorHandlerOptions = {
		showToast: false,
		logToConsole: true,
		context: {
			component: "useDataLoading",
		},
	};

	const loadFavorites = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async () => {
			if (!dir) return;

			if (networkErrors.isOffline()) {
				uiActions.setNote("Cannot load favorites: No internet connection");
				return;
			}

			await _withErrorHandling(
				async () => {
					const f = await apiGetFavorites(dir);
					photoActions.setFavorites(f.favorites || []);
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "loadFavorites",
					},
					fallbackMessage: "Failed to load favorites",
				},
			);
		}, [dir, photoActions, uiActions]);

	const loadSavedSearches = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async () => {
			if (!dir) return;

			if (networkErrors.isOffline()) {
				uiActions.setNote("Cannot load saved searches: No internet connection");
				return;
			}

			await _withErrorHandling(
				async () => {
					const r = await apiGetSaved(dir);
					photoActions.setSaved(r.saved || []);
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "loadSavedSearches",
					},
					fallbackMessage: "Failed to load saved searches",
				},
			);
		}, [dir, photoActions, uiActions]);

	const loadPresets = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async () => {
			if (!dir) return;

			if (networkErrors.isOffline()) {
				uiActions.setNote("Cannot load presets: No internet connection");
				return;
			}

			return await _withErrorHandling(
				async () => {
					const r = await apiGetPresets(dir);
					const presets = r.presets || [];
					if (photoActions.setPresets) {
						photoActions.setPresets(presets);
					}
					return presets;
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "loadPresets",
					},
					fallbackMessage: "Failed to load presets",
				},
			);
		}, [dir, uiActions, photoActions]);

	const loadTags = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async () => {
			if (!dir) return;

			if (networkErrors.isOffline()) {
				uiActions.setNote("Cannot load tags: No internet connection");
				return;
			}

			await _withErrorHandling(
				async () => {
					const r = await apiGetTags(dir);
					photoActions.setTagsMap(r.tags || {});
					photoActions.setAllTags(r.all || []);
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "loadTags",
					},
					fallbackMessage: "Failed to load tags",
				},
			);
		}, [dir, photoActions, uiActions]);

	const loadDiagnostics = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async () => {
			if (!dir) return;

			if (networkErrors.isOffline()) {
				uiActions.setNote("Cannot load diagnostics: No internet connection");
				return;
			}

			await _withErrorHandling(
				async () => {
					const r = await apiDiagnostics(
						dir,
						engine,
						needsOAI ? openaiKey : undefined,
						needsHf ? hfToken : undefined,
					);
					workspaceActions.setDiag(r);
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "loadDiagnostics",
					},
					fallbackMessage: "Failed to load diagnostics",
				},
			);
		}, [
			dir,
			engine,
			needsOAI,
			openaiKey,
			needsHf,
			hfToken,
			workspaceActions,
			uiActions,
		]);

	const loadFaces = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async () => {
			if (!dir) return;

			if (networkErrors.isOffline()) {
				uiActions.setNote("Cannot load face clusters: No internet connection");
				return;
			}

			await _withErrorHandling(
				async () => {
					const r = await apiFacesClusters(dir);
					workspaceActions.setClusters(r.clusters || []);
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "loadFaces",
					},
					fallbackMessage: "Failed to load face clusters",
				},
			);
		}, [dir, workspaceActions, uiActions]);

	const loadMap = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async () => {
			if (!dir) return;

			if (networkErrors.isOffline()) {
				uiActions.setNote("Cannot load map data: No internet connection");
				return;
			}

			await _withErrorHandling(
				async () => {
					const r = await apiMap(dir);
					workspaceActions.setPoints(r.points || []);
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "loadMap",
					},
					fallbackMessage: "Failed to load map data",
				},
			);
		}, [dir, workspaceActions, uiActions]);

	const loadLibrary = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			async (limit = 120, offset = 0, append = false) => {
				if (!dir) return;

				if (networkErrors.isOffline()) {
					uiActions.setNote("Cannot load library: No internet connection");
					return;
				}

				await _withErrorHandling(
					async () => {
						const r = await apiLibrary(dir, engine, limit, offset, {
							openaiKey: needsOAI ? openaiKey : undefined,
							hfToken: needsHf ? hfToken : undefined,
						});

						// Calculate if there are more pages to load
						const hasMore =
							r.paths &&
							r.paths.length === limit &&
							offset + r.paths.length < r.total;

						if (append) {
							if (r.paths && r.paths.length > 0) {
								photoActions.appendLibrary(r.paths);
							}
						} else {
							photoActions.setLibrary(r.paths || []);
						}

						photoActions.setLibHasMore(hasMore);
					},
					{
						...defaultErrorOptions,
						context: {
							...defaultErrorOptions.context,
							action: "loadLibrary",
						},
						fallbackMessage: "Failed to load library",
					},
				);
			},
			[
				dir,
				engine,
				needsOAI,
				openaiKey,
				needsHf,
				hfToken,
				photoActions,
				uiActions,
			],
		);

	const loadMetadata = useCallback(async () => {
		if (!dir) return;

		if (networkErrors.isOffline()) {
			uiActions.setNote("Cannot load metadata: No internet connection");
			return;
		}

		return await _withErrorHandling(
			async () => {
				const r = await apiGetMetadata(dir);
				const result = { cameras: r.cameras || [], places: r.places || [] };
				if (_settingsActions.setCameras) {
					_settingsActions.setCameras(result.cameras);
				}
				if (_settingsActions.setPlaces) {
					_settingsActions.setPlaces(result.places);
				}
				return result;
			},
			{
				...defaultErrorOptions,
				context: {
					...defaultErrorOptions.context,
					action: "loadMetadata",
				},
				fallbackMessage: "Failed to load metadata",
			},
		);
	}, [dir, uiActions, _settingsActions]);

	const loadAllData = useCallback(async () => {
		if (!dir) return;

		// Load all data in parallel for better performance
		await Promise.all([
			loadFavorites(),
			loadSavedSearches(),
			loadTags(),
			loadDiagnostics(),
			loadFaces(),
			loadLibrary(120, 0),
		]);
	}, [
		dir,
		loadFavorites,
		loadSavedSearches,
		loadTags,
		loadDiagnostics,
		loadFaces,
		loadLibrary,
	]);

	const setupFileWatcher = useCallback(async () => {
		if (!dir) return;

		await _withErrorHandling(
			async () => {
				const status = await apiWatchStatus();
				if (status.available) {
					await apiWatchStart(dir, engine, 1500, 12);
				}
			},
			{
				...defaultErrorOptions,
				context: {
					...defaultErrorOptions.context,
					action: "setupFileWatcher",
				},
				fallbackMessage: "Failed to setup file watcher",
			},
		);
	}, [dir, engine]);

	const refreshAll = useCallback(async () => {
		if (!dir) return;

		await _withErrorHandling(
			async () => {
				await Promise.all([
					loadFavorites(),
					loadSavedSearches(),
					loadTags(),
					loadDiagnostics(),
					loadFaces(),
					loadLibrary(120, 0),
					loadMetadata(),
				]);
			},
			{
				...defaultErrorOptions,
				context: {
					...defaultErrorOptions.context,
					action: "refreshAll",
				},
				fallbackMessage: "Failed to refresh all data",
			},
		);
	}, [
		dir,
		loadFavorites,
		loadSavedSearches,
		loadTags,
		loadDiagnostics,
		loadFaces,
		loadLibrary,
		loadMetadata,
	]);

	return {
		loadFavorites,
		loadSavedSearches,
		loadPresets,
		loadTags,
		loadDiagnostics,
		loadFaces,
		loadMap,
		loadLibrary,
		loadMetadata,
		loadAllData,
		setupFileWatcher,
		refreshAll,
	};
};
