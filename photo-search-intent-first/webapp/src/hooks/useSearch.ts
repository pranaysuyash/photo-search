/**
 * Consolidated search functionality hook
 * Reduces the 139 dependency crisis in App.tsx by centralizing search logic
 */

import { useCallback, useMemo, useState } from "react";
import {
	apiDiagnostics,
	apiGetFavorites,
	apiGetSaved,
	apiGetSmart,
	apiGetTags,
	apiSetSmart,
	type SearchResult,
} from "../api";
import { usePhotoVaultAPI } from "../services/PhotoVaultAPIProvider";
import {
	useAllTags,
	useCamera,
	useCaptionsEnabled,
	useDir,
	useEngine,
	useFastIndexEnabled,
	useFastKind,
	useFavOnly,
	useFMax,
	useFMin,
	useHasText,
	useHfToken,
	useIsoMax,
	useIsoMin,
	useNeedsHf,
	useNeedsOAI,
	useOcrEnabled,
	useOpenaiKey,
	usePersons,
	usePhotoActions,
	usePlace,
	useSearchResults,
	useSettingsActions,
	useTagFilter,
	useTagsMap,
	useTopK,
	useUIActions,
	useWorkspace,
	useWorkspaceActions,
} from "../stores/useStores";
import { _useSearchHistory, useSearchState } from "./useSearchState";

interface UseSearchOptions {
	debounceMs?: number;
	onSearchStart?: () => void;
	onSearchComplete?: (results: SearchResult[], query: string) => void;
	onSearchError?: (error: Error) => void;
}

interface UseSearchReturn {
	// Search state
	searchText: string;
	setSearchText: (text: string) => void;
	isSearching: boolean;
	hasQuery: boolean;
	clearSearch: () => void;
	submitSearch: () => void;
	query: string;

	// Search actions
	performSearch: (text?: string) => Promise<void>;
	searchLikeThis: (photoPath: string) => Promise<void>;
	saveSearch: (name: string) => Promise<void>;

	// Search history
	searchHistory: string[];
	addToHistory: (query: string) => void;
	clearHistory: () => void;

	// Search filters
	filters: {
		favOnly: boolean;
		setFavOnly: (value: boolean) => void;
		tagFilter: string;
		setTagFilter: (value: string) => void;
		camera: string;
		setCamera: (value: string) => void;
		place: string;
		setPlace: (value: string) => void;
		hasText: boolean;
		setHasText: (value: boolean) => void;
		isoMin: number;
		setIsoMin: (value: number) => void;
		isoMax: number;
		setIsoMax: (value: number) => void;
		fMin: number;
		setFMin: (value: number) => void;
		fMax: number;
		setFMax: (value: number) => void;
		persons: string[];
		setPersons: (persons: string[]) => void;
		dateFrom: string;
		setDateFrom: (value: string) => void;
		dateTo: string;
		setDateTo: (value: string) => void;
		ratingMin: number;
		setRatingMin: (value: number) => void;
	};

	// Search options
	options: {
		topK: number;
		setTopK: (value: number) => void;
		useFast: boolean;
		fastKind?: string;
		useCaps: boolean;
		useOcr: boolean;
		wsToggle: boolean;
	};

	// Derived state
	hasActiveFilters: boolean;
	searchResults: SearchResult[];
	resultsCount: number;

	// Utility functions
	buildSearchUrl: (query: string) => string;
	parseSearchParams: (search: string) => void;
}

/**
 * Consolidated search hook that centralizes all search functionality
 * Replaces the massive 139 dependency useCallback in App.tsx
 *
 * @example
 * const {
 *   searchText,
 *   setSearchText,
 *   performSearch,
 *   filters,
 *   searchHistory,
 *   hasActiveFilters
 * } = useSearch({
 *   debounceMs: 300,
 *   onSearchComplete: (results, query) => console.log(`Found ${results.length} results for "${query}"`)
 * });
 */
export const useSearch = (options: UseSearchOptions = {}): UseSearchReturn => {
	const {
		debounceMs = 300,
		onSearchStart,
		onSearchComplete,
		onSearchError,
	} = options;

	// Store selectors
	const dir = useDir();
	const engine = useEngine();
	const favOnly = useFavOnly();
	const topK = useTopK();
	const tagFilter = useTagFilter();
	const camera = useCamera();
	const isoMin = useIsoMin();
	const isoMax = useIsoMax();
	const fMin = useFMin();
	const fMax = useFMax();
	const place = usePlace();
	const hasText = useHasText();
	const needsHf = useNeedsHf();
	const needsOAI = useNeedsOAI();
	const hfToken = useHfToken();
	const openaiKey = useOpenaiKey();
	const useFast = useFastIndexEnabled();
	const fastKind = useFastKind();
	const useCaps = useCaptionsEnabled();
	const useOcr = useOcrEnabled();
	const persons = usePersons();
	const wsToggle = useWorkspace();
	const results = useSearchResults();
	const _allTags = useAllTags();
	const tagsMap = useTagsMap();

	// Actions
	const photoActions = usePhotoActions();
	const settingsActions = useSettingsActions();
	const workspaceActions = useWorkspaceActions();
	const uiActions = useUIActions();

	// API service (initialized via RootProviders; falls back to singleton if needed)
	const apiSvc = usePhotoVaultAPI();

	// Search history
	// Search history - needs to be implemented in useSearchState
	const {
		history: searchHistory,
		addToHistory,
		clearHistory,
	} = _useSearchHistory();

	// Missing state variables that need to be managed
	const [dateFrom, setDateFrom] = useState<string>("");
	const [dateTo, setDateTo] = useState<string>("");
	const [ratingMin, setRatingMin] = useState<number>(0);

	// Unified search state
	const {
		searchText,
		setSearchText,
		isSearching,
		hasQuery,
		clearSearch,
		submitSearch,
		query,
	} = useSearchState({
		debounceMs,
		onSearch: (searchQuery) => performSearch(searchQuery),
	});

	// Rating map for filtering
	const ratingMap = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useMemo(() => {
			const m: Record<string, number> = {};
			const tm = tagsMap || {};
			for (const p of Object.keys(tm)) {
				const arr: string[] = tm[p] || [];
				const rt = arr.find((t) => /^rating:[1-5]$/.test(t));
				if (rt) m[p] = parseInt(rt.split(":")[1], 10);
			}
			return m;
		}, [tagsMap]);

	/**
	 * Main search function - consolidated from App.tsx
	 */
	const performSearch = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			async (text?: string) => {
				if (!dir) return;

				const searchQuery = text ?? searchText;
				if (!searchQuery.trim()) return;

				onSearchStart?.();
				uiActions.setBusy("Searching…");
				uiActions.setNote("");

				try {
					addToHistory(searchQuery);

					const tagList = tagFilter
						.split(",")
						.map((s: string) => s.trim())
						.filter(Boolean);

					const ppl = persons.filter(Boolean);

					let searchResults: { results?: SearchResult[]; search_id?: string };

					const dateFromTimestamp = dateFrom
						? Math.floor(new Date(dateFrom).getTime() / 1000)
						: undefined;

					const dateToTimestamp = dateTo
						? Math.floor(new Date(dateTo).getTime() / 1000)
						: undefined;

					if (wsToggle) {
						searchResults = await apiSvc.searchWorkspace(searchQuery, topK, {
							favoritesOnly: favOnly,
							tags: tagList,
							dateFrom: dateFromTimestamp,
							dateTo: dateToTimestamp,
							place: place || undefined,
							hasText,
							...(ppl.length === 1
								? { person: ppl[0] }
								: ppl.length > 1
									? { persons: ppl }
									: {}),
						});
					} else {
						searchResults = await apiSvc.search(searchQuery, topK, {
							hfToken: needsHf ? hfToken : undefined,
							openaiKey: needsOAI ? openaiKey : undefined,
							favoritesOnly: favOnly,
							tags: tagList,
							dateFrom: dateFromTimestamp,
							dateTo: dateToTimestamp,
							...(useFast
								? { useFast: true, fastKind: fastKind || undefined }
								: {}),
							useCaptions: useCaps,
							useOcr,
							camera: camera || undefined,
							isoMin: isoMin || undefined,
							isoMax: isoMax || undefined,
							fMin: fMin || undefined,
							fMax: fMax || undefined,
							place: place || undefined,
							hasText: hasText || undefined,
							...(ppl.length === 1
								? { person: ppl[0] }
								: ppl.length > 1
									? { persons: ppl }
									: {}),
						});
					}

					let finalResults = searchResults.results || [];

					// Apply rating filter if set
					if (ratingMin > 0) {
						finalResults = finalResults.filter(
							(it) => (ratingMap[it.path] || 0) >= ratingMin,
						);
					}

					photoActions.setResults(finalResults);
					photoActions.setSearchId(searchResults.search_id || "");
					uiActions.setNote(`Found ${finalResults.length} results.`);

					onSearchComplete?.(finalResults, searchQuery);
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Search failed";
					uiActions.setNote(errorMessage);
					// Log with context for diagnostics
					try {
						const { handleError } = await import("../utils/errors");
						handleError(error as Error, {
							logToServer: true,
							context: {
								action: "search",
								component: "useSearch.performSearch",
								dir,
							},
						});
					} catch {}
					onSearchError?.(error as Error);
				} finally {
					uiActions.setBusy("");
				}
			},
			[
				dir,
				engine,
				searchText,
				favOnly,
				topK,
				tagFilter,
				camera,
				isoMin,
				isoMax,
				fMin,
				fMax,
				place,
				hasText,
				needsHf,
				hfToken,
				needsOAI,
				openaiKey,
				useFast,
				fastKind,
				useCaps,
				useOcr,
				persons,
				wsToggle,
				ratingMin,
				ratingMap,
				dateFrom,
				dateTo,
				photoActions,
				uiActions,
				addToHistory,
				onSearchStart,
				onSearchComplete,
				onSearchError,
			],
		);

	/**
	 * Search for similar photos
	 */
	const searchLikeThis = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			async (_photoPath: string) => {
				if (!dir) return;

				try {
					uiActions.setBusy("Searching similar…");
					const r = await apiSvc.searchSimilar(_photoPath, topK);
					photoActions.setResults(r.results || []);
					uiActions.setNote(`Found ${r.results?.length || 0} similar photos`);
				} catch (error) {
					uiActions.setNote(
						error instanceof Error ? error.message : "Similar search failed",
					);
				} finally {
					uiActions.setBusy("");
				}
			},
			[dir, engine, topK, photoActions, uiActions],
		);

	/**
	 * Save current search as smart collection
	 */
	const saveSearch = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			async (_name: string) => {
				if (!dir || !searchText.trim()) return;

				try {
					const tags = tagFilter
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean);

					const ppl = persons.filter(Boolean);

					const rules: unknown = {
						query: searchText.trim(),
						favoritesOnly: favOnly,
						tags,
						useCaptions: useCaps,
						useOcr,
						hasText,
						camera: camera || undefined,
						isoMin: isoMin || undefined,
						isoMax: isoMax || undefined,
						fMin: fMin || undefined,
						fMax: fMax || undefined,
						place: place || undefined,
					};

					if (ppl.length === 1) rules.person = ppl[0];
					else if (ppl.length > 1) rules.persons = ppl;

					await apiSetSmart(dir, _name, rules);

					const r = await apiGetSmart(dir);
					photoActions.setSmart(r.smart || {});

					uiActions.setNote(`Saved smart collection: ${_name}`);
				} catch (error) {
					uiActions.setNote(
						error instanceof Error
							? error.message
							: "Failed to save smart collection",
					);
				}
			},
			[
				dir,
				searchText,
				tagFilter,
				persons,
				favOnly,
				useCaps,
				useOcr,
				hasText,
				camera,
				isoMin,
				isoMax,
				fMin,
				fMax,
				place,
				photoActions,
				uiActions,
			],
		);

	// Helper functions for data refresh
	const _refreshFavorites = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async () => {
			if (!dir) return;
			try {
				const f = await apiGetFavorites(dir);
				photoActions.setFavorites(f.favorites || []);
			} catch {}
		}, [dir, photoActions]);

	const _refreshSavedSearches = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async () => {
			if (!dir) return;
			try {
				const r = await apiGetSaved(dir);
				photoActions.setSaved(r.saved || []);
			} catch {}
		}, [dir, photoActions]);

	const _refreshTags = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async () => {
			if (!dir) return;
			try {
				const r = await apiGetTags(dir);
				photoActions.setTagsMap(r.tags || {});
				photoActions.setAllTags(r.all || []);
			} catch {}
		}, [dir, photoActions]);

	const _refreshDiagnostics = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async () => {
			if (!dir) return;
			try {
				const _r = await apiDiagnostics(
					dir,
					engine,
					needsOAI ? openaiKey : undefined,
					needsHf ? hfToken : undefined,
				);
				// Note: This would need to be handled by a workspace action or similar
			} catch {}
		}, [dir, engine, needsOAI, openaiKey, needsHf, hfToken]);

	// Derived state
	const hasActiveFilters = // biome-ignore lint/correctness/useExhaustiveDependencies: Memoized value
		// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useMemo(() => {
			const anyExif = Boolean(
				camera || isoMin || isoMax || fMin || fMax || place,
			);
			const anyDate = Boolean(dateFrom && dateTo);
			const anyPeople = Array.isArray(persons) && persons.length > 0;
			const anyTags = Boolean(tagFilter?.trim());
			const anyQuality = ratingMin > 0 || hasText;
			return Boolean(
				favOnly || anyExif || anyDate || anyPeople || anyTags || anyQuality,
			);
		}, [
			camera,
			isoMin,
			isoMax,
			fMin,
			fMax,
			place,
			dateFrom,
			dateTo,
			persons,
			tagFilter,
			ratingMin,
			hasText,
			favOnly,
		]);

	const resultsCount = results?.length || 0;

	/**
	 * Build search URL for sharing/bookmarking
	 */
	const buildSearchUrl = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			(_searchQuery: string) => {
				const sp = new URLSearchParams();
				sp.set("q", _searchQuery);
				if (favOnly) sp.set("fav", "1");
				if (tagFilter?.trim()) sp.set("tags", tagFilter);
				if (dateFrom && dateTo) {
					sp.set("date_from", dateFrom);
					sp.set("date_to", dateTo);
				}
				if (place?.trim()) sp.set("place", place);
				if (hasText) sp.set("has_text", "1");
				if (camera?.trim()) sp.set("camera", camera);
				if (isoMin) sp.set("iso_min", String(isoMin));
				if (isoMax) sp.set("iso_max", String(isoMax));
				if (fMin) sp.set("f_min", String(fMin));
				if (fMax) sp.set("f_max", String(fMax));
				const ppl = persons.filter(Boolean);
				if (ppl.length === 1) sp.set("person", ppl[0]);
				if (ppl.length > 1) sp.set("persons", ppl.join(","));

				return `/search?${sp.toString()}`;
			},
			[
				favOnly,
				tagFilter,
				dateFrom,
				dateTo,
				place,
				hasText,
				camera,
				isoMin,
				isoMax,
				fMin,
				fMax,
				persons,
			],
		);

	/**
	 * Parse search parameters from URL
	 */
	const parseSearchParams = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			(_search: string) => {
				const sp = new URLSearchParams(_search);

				const q = sp.get("q") || "";
				if (q) setSearchText(q);

				const fav = sp.get("fav");
				if (fav === "1") photoActions.setFavOnly(true);

				const tagsCSV = sp.get("tags") || "";
				if (tagsCSV) photoActions.setTagFilter(tagsCSV);

				const df = sp.get("date_from");
				const dt = sp.get("date_to");
				if (df) setDateFrom(df);
				if (dt) setDateTo(dt);

				const plc = sp.get("place");
				if (plc) settingsActions.setPlace(plc);

				const ht = sp.get("has_text");
				if (ht === "1") settingsActions.setHasText(true);

				const cam = sp.get("camera");
				if (cam) settingsActions.setCamera(cam);

				const isoMinP = sp.get("iso_min");
				if (isoMinP) settingsActions.setIsoMin(parseFloat(isoMinP));

				const isoMaxP = sp.get("iso_max");
				if (isoMaxP) settingsActions.setIsoMax(parseFloat(isoMaxP));

				const fmin = sp.get("f_min");
				if (fmin) settingsActions.setFMin(parseFloat(fmin));

				const fmax = sp.get("f_max");
				if (fmax) settingsActions.setFMax(parseFloat(fmax));

				const person = sp.get("person");
				const personsCSV = sp.get("persons");
				if (personsCSV) {
					workspaceActions.setPersons(
						personsCSV
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean),
					);
				} else if (person) {
					workspaceActions.setPersons([person]);
				}
			},
			[setSearchText, photoActions, settingsActions, workspaceActions],
		);

	return {
		// Search state
		searchText,
		setSearchText,
		isSearching,
		hasQuery,
		clearSearch,
		submitSearch,
		query,

		// Search actions
		performSearch,
		searchLikeThis,
		saveSearch,

		// Search history
		searchHistory,
		addToHistory,
		clearHistory,

		// Search filters
		filters: {
			favOnly,
			setFavOnly: photoActions.setFavOnly,
			tagFilter,
			setTagFilter: photoActions.setTagFilter,
			camera,
			setCamera: settingsActions.setCamera,
			isoMin,
			setIsoMin: settingsActions.setIsoMin,
			isoMax,
			setIsoMax: settingsActions.setIsoMax,
			fMin,
			setFMin: settingsActions.setFMin,
			fMax,
			setFMax: settingsActions.setFMax,
			place,
			setPlace: settingsActions.setPlace,
			hasText,
			setHasText: settingsActions.setHasText,
			persons,
			setPersons: workspaceActions.setPersons,
			dateFrom,
			setDateFrom,
			dateTo,
			setDateTo,
			ratingMin,
			setRatingMin,
		},

		// Search options
		options: {
			topK,
			setTopK: photoActions.setTopK,
			useFast,
			fastKind,
			useCaps,
			useOcr,
			wsToggle: Boolean(wsToggle),
		},

		// Derived state
		hasActiveFilters,
		searchResults: results || [],
		resultsCount,

		// Utility functions
		buildSearchUrl,
		parseSearchParams,
	};
};
