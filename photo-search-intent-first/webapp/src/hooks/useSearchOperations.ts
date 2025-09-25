/**
 * Custom hook for managing search operations and related state
 * Encapsulates search logic and related actions
 */
import { useCallback } from "react";
import { apiSearch } from "../api";
import { searchHistoryService } from "../services/SearchHistoryService";
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

				const result = await apiSearch(dir, query.trim(), engine, topK, opts);

				// Update state with results
				photoActions.setResults(result.results);
				photoActions.setSearchId(result.search_id);
				photoActions.setQuery(query.trim());

				// Track search history
				searchHistoryService.addToHistory({
					query: query.trim(),
					resultCount: result.results.length,
					timestamp: Date.now(),
				});

				uiActions.setNote(`Found ${result.results.length} results`);
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

	return {
		doSearchImmediate,
	};
}
