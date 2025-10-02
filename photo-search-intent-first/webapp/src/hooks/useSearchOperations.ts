/**
 * Custom hook for managing search operations and related state
 * Encapsulates search logic and related actions
 */
import { useCallback } from "react";
import { apiSearch } from "../api";
import { searchHistoryService } from "../services/SearchHistoryService";
import { SmartSearchService } from "../services/SmartSearchService";
import {
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
	useOcrEnabled,
	useOpenaiKey,
	usePhotoActions,
	usePlace,
	useTagFilter,
	useTopK,
	useUIActions,
} from "../stores";
import { expandSynonyms } from "../utils/searchSynonyms";

export function useSearchOperations() {
	const dir = useDir();
	const engine = useEngine();
	const hfToken = useHfToken();
	const openaiKey = useOpenaiKey();
	const topK = useTopK();
	const favOnly = useFavOnly();
	const tagFilter = useTagFilter();
	const place = usePlace();
	const camera = useCamera();
	const isoMin = useIsoMin();
	const isoMax = useIsoMax();
	const fMin = useFMin();
	const fMax = useFMax();
	const useCaps = useCaptionsEnabled();
	const useOcr = useOcrEnabled();
	const hasText = useHasText();
	const useFast = useFastIndexEnabled();
	const fastKind = useFastKind();

	const photoActions = usePhotoActions();
	const uiActions = useUIActions();

	const doSearchImmediate = useCallback(
		async (query: string) => {
			if (!dir) {
				uiActions.setNote("Please select a photo directory first");
				return;
			}

			if (!query?.trim()) {
				uiActions.setNote("Please enter a search query");
				return;
			}

			try {
				uiActions.setBusy("Searching...");
				uiActions.setNote("");

				// Apply query expansion to improve results
				const expandedQuery = expandSynonyms(query.trim());
				const finalQuery = expandedQuery || query.trim();

				// Show expansion info if query was modified
				if (expandedQuery && expandedQuery !== query.trim()) {
					uiActions.setNote(`Expanded: "${query.trim()}" → "${expandedQuery}"`);
				}

				// Build search options from current state
				const opts: Parameters<typeof apiSearch>[4] = {
					hfToken: hfToken || undefined,
					openaiKey: openaiKey || undefined,
					favoritesOnly: favOnly,
					tags: tagFilter
						? tagFilter
								.split(",")
								.map((t) => t.trim())
								.filter(Boolean)
						: undefined,
					useFast,
					fastKind: fastKind || undefined,
					useCaptions: useCaps,
					useOcr,
					hasText,
					place: place || undefined,
					camera: camera || undefined,
					isoMin: isoMin > 0 ? isoMin : undefined,
					isoMax: isoMax < 25600 ? isoMax : undefined,
					fMin: fMin > 0 ? fMin : undefined,
					fMax: fMax < 32 ? fMax : undefined,
				};

				const result = await apiSearch(dir, finalQuery, engine, topK, opts);

				// Update state with results
				photoActions.setResults(result.results);
				photoActions.setSearchId(result.search_id);
				photoActions.setQuery(query.trim());

				// Track search history with original query
				searchHistoryService.addToHistory({
					query: query.trim(), // Keep original query for history
					resultCount: result.results.length,
					timestamp: Date.now(),
				});

				// Update success message
				const resultMessage =
					expandedQuery && expandedQuery !== query.trim()
						? `Found ${result.results.length} results (expanded query)`
						: `Found ${result.results.length} results`;

				// Clear expansion message after a short delay, then show result count
				setTimeout(
					() => {
						uiActions.setNote(resultMessage);
					},
					expandedQuery ? 2000 : 0,
				);
			} catch (error) {
				console.error("Search failed:", error);
				const message =
					error instanceof Error ? error.message : "Search failed";
				uiActions.setNote(message);
				photoActions.setResults([]);
				photoActions.setSearchId("");
			} finally {
				uiActions.clearBusy();
			}
		},
		[
			dir,
			engine,
			hfToken,
			openaiKey,
			topK,
			favOnly,
			tagFilter,
			place,
			camera,
			isoMin,
			isoMax,
			fMin,
			fMax,
			useCaps,
			useOcr,
			hasText,
			useFast,
			fastKind,
			photoActions,
			uiActions,
		],
	);

	// Enhanced smart search with intent recognition
	const doSmartSearch = useCallback(
		async (query: string, options?: {
			enableIntentRecognition?: boolean;
			enableQueryExpansion?: boolean;
			enableSmartFilters?: boolean;
		}) => {
			if (!dir) {
				uiActions.setNote("Please select a photo directory first");
				return;
			}

			if (!query?.trim()) {
				uiActions.setNote("Please enter a search query");
				return;
			}

			try {
				uiActions.setBusy("Smart searching...");
				uiActions.setNote("");

				// Get metadata for context
				const meta = {
					cameras: [], // Would be populated from API
					places: [], // Would be populated from API
					tags: [], // Would be populated from API
				};

				// Perform smart search
				const result = await SmartSearchService.smartSearch({
					dir,
					query,
					engine,
					topK,
					enableIntentRecognition: options?.enableIntentRecognition ?? true,
					enableQueryExpansion: options?.enableQueryExpansion ?? true,
					enableSmartFilters: options?.enableSmartFilters ?? true,
					context: {
						availableTags: tagFilter ? tagFilter.split(",").map(t => t.trim()).filter(Boolean) : [],
						availablePeople: [], // Would be populated from API
						availableLocations: meta.places.map(String),
						availableCameras: meta.cameras,
					},
				});

				// Update state with results
				photoActions.setResults(result.results);
				photoActions.setSearchId(result.searchId);
				photoActions.setQuery(query.trim());

				// Show search enhancement info
				let enhancementInfo = "";
				if (result.expandedQuery && result.expandedQuery !== query.trim()) {
					enhancementInfo += `Query expanded: "${query.trim()}" → "${result.expandedQuery}"`;
				}
				if (result.intent && result.intent.confidence > 0.7) {
					if (enhancementInfo) enhancementInfo += " • ";
					enhancementInfo += `Intent: ${result.intent.primary}`;
				}
				if (Object.keys(result.appliedFilters).length > 0) {
					if (enhancementInfo) enhancementInfo += " • ";
					enhancementInfo += `${Object.keys(result.appliedFilters).length} smart filters applied`;
				}

				const resultMessage = enhancementInfo
					? `Found ${result.results.length} results (${enhancementInfo})`
					: `Found ${result.results.length} results`;

				uiActions.setNote(resultMessage);

				// Store suggestions for potential use
				if (result.suggestions.length > 0) {
					// Could store these in a context for later use
					console.log("Smart suggestions available:", result.suggestions);
				}

			} catch (error) {
				console.error("Smart search failed:", error);
				const message = error instanceof Error ? error.message : "Smart search failed";
				uiActions.setNote(message);
				photoActions.setResults([]);
				photoActions.setSearchId("");
			} finally {
				uiActions.clearBusy();
			}
		},
		[
			dir,
			engine,
			topK,
			tagFilter,
			photoActions,
			uiActions,
		],
	);

	return {
		doSearchImmediate,
		doSmartSearch,
	};
}
