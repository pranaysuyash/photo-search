/**
 * Enhanced offline-first search hook with caching and progressive enhancement
 * Provides immediate UI response with cached data, followed by fresh results when available
 */

import type { PhotoMeta } from "../models/PhotoMeta";

// Types for offline-first search results
interface OfflineFirstSearchResult {
	results: unknown[];
	isCached: boolean;
	cacheHit: boolean;
	searchTimeMs?: number;
	providerUsed?: string;
	query?: string;
	total_count?: number;
	filters_applied?: string[];
}

// Cache key generator for consistent keys
function generateCacheKey(params: SearchParams): string {
	// Create a stable, deterministic key for caching
	const stableParams = {
		dir: params.dir,
		query: params.query,
		provider: params.provider,
		top_k: params.topK,
		use_fast: params.options?.useFast,
		use_captions: params.options?.useCaptions,
		use_ocr: params.options?.useOcr,
		favorites_only: params.options?.favoritesOnly,
		tags: params.options?.tags?.sort().join(","),
		place: params.options?.place,
		camera: params.options?.camera,
		iso_min: params.options?.isoMin,
		iso_max: params.options?.isoMax,
		f_min: params.options?.fMin,
		f_max: params.options?.fMax,
		has_text: params.options?.hasText,
		use_caps: params.options?.useCaptions,
		date_from: params.options?.dateFrom,
		date_to: params.options?.dateTo,
	};

	// Create JSON string with sorted keys for consistent hashing
	const jsonString = JSON.stringify(
		stableParams,
		Object.keys(stableParams).sort(),
	);
	return btoa(jsonString).replace(/[+/=]/g, ""); // Base64 encode and remove special characters
}

// Enhanced search hook with offline-first capabilities
export function useOfflineFirstSearch() {
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
	const hasText = useHasText();
	const useFast = useFastIndexEnabled();
	const fastKind = useFastKind();
	const useCaps = useCaptionsEnabled();
	const useOcr = useOcrEnabled();

	const photoActions = usePhotoActions();
	const uiActions = useUIActions();
	const queryClient = useQueryClient();

	// Track search state
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isCachedResult, setIsCachedResult] = useState(false);
	const [cacheHit, setCacheHit] = useState(false);

	// Track last search parameters to avoid redundant searches
	const lastSearchParams = useRef<SearchParams | null>(null);

	// Perform search with offline-first approach
	const doSearch = useCallback(
		async (query: string, immediate = false) => {
			if (!dir) {
				uiActions.setNote("Please select a photo directory first");
				return;
			}

			if (!query?.trim()) {
				uiActions.setNote("Please enter a search query");
				return;
			}

			try {
				// Apply query expansion to improve results
				const expandedQuery = expandSynonyms(query.trim());
				const finalQuery = expandedQuery || query.trim();

				// Show expansion info if query was modified
				if (expandedQuery && expandedQuery !== query.trim()) {
					uiActions.setNote(`Expanded: "${query.trim()}" → "${expandedQuery}"`);
				}

				// Build search parameters with all current filters
				const searchParams: SearchParams = {
					dir,
					query: finalQuery,
					provider: engine,
					topK,
					options: {
						favoritesOnly: favOnly,
						tags: tagFilter
							? tagFilter
									.split(",")
									.map((t) => t.trim())
									.filter(Boolean)
							: undefined,
						place: place || undefined,
						camera: camera || undefined,
						isoMin: isoMin > 0 ? isoMin : undefined,
						isoMax: isoMax < 25600 ? isoMax : undefined,
						fMin: fMin > 0 ? fMin : undefined,
						fMax: fMax < 32 ? fMax : undefined,
						hasText: hasText || undefined,
						useFast: useFast,
						fastKind: fastKind || undefined,
						useCaptions: useCaps,
						useOcr: useOcr,
						hfToken: hfToken || undefined,
						openaiKey: openaiKey || undefined,
					},
				};

				// Check if this is the same search as last time
				const cacheKey = generateCacheKey(searchParams);
				const isSameSearch =
					lastSearchParams.current &&
					generateCacheKey(lastSearchParams.current) === cacheKey;

				// If same search and not forcing immediate, skip
				if (isSameSearch && !immediate) {
					return;
				}

				// Update last search params
				lastSearchParams.current = searchParams;

				// Set busy state
				uiActions.setBusy("Searching...");
				setIsRefreshing(true);

				const isOnline = offlineService.getStatus();

				// Try to get cached results first
				const cachedResults = await offlineCapableSearch(
					dir,
					finalQuery,
					engine,
					topK,
					searchParams.options,
				);

				// If we have cached results, show them immediately
				if (cachedResults && cachedResults.length > 0) {
					setIsCachedResult(true);
					setCacheHit(true);

					// Update UI with cached results immediately
					photoActions.setResults(
						cachedResults.map((result) => ({
							path: result.path,
							score: result.similarity,
							metadata: result.metadata,
						})),
					);

					// Show that we're using cached results
					uiActions.setNote(`Found ${cachedResults.length} cached results`);
				} else {
					setIsCachedResult(false);
					setCacheHit(false);
				}

				if (!isOnline) {
					setIsRefreshing(false);
					return;
				}

				// Now perform online search for fresh results
				try {
					const freshResults = await search(searchParams);

					// Update UI with fresh results
					photoActions.setResults(freshResults.results);
					photoActions.setSearchId(freshResults.search_id || "");
					photoActions.setQuery(query.trim());

					// Update with fresh result count
					const resultMessage =
						expandedQuery && expandedQuery !== query.trim()
							? `Found ${freshResults.results.length} results (expanded query)`
							: `Found ${freshResults.results.length} results`;

					uiActions.setNote(resultMessage);

					// Cache the fresh results for future offline use
					// This would typically be done by the API layer

					// Update cache hit indicators
					setIsCachedResult(false);
					setCacheHit(false);
				} catch (error) {
					console.error("Online search failed:", error);

					// If online search failed but we have cached results, keep showing them
					if (cachedResults && cachedResults.length > 0) {
						uiActions.setNote(
							`Showing ${cachedResults.length} cached results (online search failed)`,
						);
					} else {
						// No cached results and online search failed
						const message =
							error instanceof Error ? error.message : "Search failed";
						uiActions.setNote(message);
						photoActions.setResults([]);
						photoActions.setSearchId("");
					}
				}
			} catch (error) {
				console.error("Search operation failed:", error);
				const message =
					error instanceof Error ? error.message : "Search operation failed";
				uiActions.setNote(message);
				photoActions.setResults([]);
				photoActions.setSearchId("");
			} finally {
				uiActions.clearBusy();
				setIsRefreshing(false);
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
			hasText,
			useFast,
			fastKind,
			useCaps,
			useOcr,
			photoActions,
			uiActions,
		],
	);

	// Smart search with enhanced capabilities
	const doSmartSearch = useCallback(
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
				uiActions.setBusy("Smart searching...");
				setIsRefreshing(true);

				// For smart search, we'll use the same offline-first approach
				// but with enhanced query processing

				// Expand the query for better results
				const expandedQuery = expandSynonyms(query.trim());
				const finalQuery = expandedQuery || query.trim();

				// Show expansion info
				if (expandedQuery && expandedQuery !== query.trim()) {
					uiActions.setNote(`Expanded: "${query.trim()}" → "${expandedQuery}"`);
				}

				// Build search parameters
				const searchParams: SearchParams = {
					dir,
					query: finalQuery,
					provider: engine,
					topK,
					options: {
						favoritesOnly: favOnly,
						tags: tagFilter
							? tagFilter
									.split(",")
									.map((t) => t.trim())
									.filter(Boolean)
							: undefined,
						place: place || undefined,
						camera: camera || undefined,
						isoMin: isoMin > 0 ? isoMin : undefined,
						isoMax: isoMax < 25600 ? isoMax : undefined,
						fMin: fMin > 0 ? fMin : undefined,
						fMax: fMax < 32 ? fMax : undefined,
						hasText: hasText || undefined,
						useFast: useFast,
						fastKind: fastKind || undefined,
						useCaptions: useCaps,
						useOcr: useOcr,
						hfToken: hfToken || undefined,
						openaiKey: openaiKey || undefined,
					},
				};

				// Try to get cached results first
				const cachedResults = await offlineCapableSearch(
					dir,
					finalQuery,
					engine,
					topK,
					searchParams.options,
				);

				// Show cached results immediately if available
				if (cachedResults && cachedResults.length > 0) {
					setIsCachedResult(true);
					setCacheHit(true);

					photoActions.setResults(
						cachedResults.map((result) => ({
							path: result.path,
							score: result.similarity,
							metadata: result.metadata,
						})),
					);

					uiActions.setNote(`Found ${cachedResults.length} cached results`);
				} else {
					setIsCachedResult(false);
					setCacheHit(false);
				}

				// Perform online smart search
				try {
					const freshResults = await search(searchParams);

					// Update with fresh results
					photoActions.setResults(freshResults.results);
					photoActions.setSearchId(freshResults.search_id || "");
					photoActions.setQuery(query.trim());

					// Show result count
					const resultMessage =
						expandedQuery && expandedQuery !== query.trim()
							? `Found ${freshResults.results.length} results (expanded query)`
							: `Found ${freshResults.results.length} results`;

					uiActions.setNote(resultMessage);

					// Update cache indicators
					setIsCachedResult(false);
					setCacheHit(false);
				} catch (error) {
					console.error("Smart search failed:", error);

					// Show cached results if available
					if (cachedResults && cachedResults.length > 0) {
						uiActions.setNote(
							`Showing ${cachedResults.length} cached results (smart search failed)`,
						);
					} else {
						const message =
							error instanceof Error ? error.message : "Smart search failed";
						uiActions.setNote(message);
						photoActions.setResults([]);
						photoActions.setSearchId("");
					}
				}
			} catch (error) {
				console.error("Smart search operation failed:", error);
				const message =
					error instanceof Error
						? error.message
						: "Smart search operation failed";
				uiActions.setNote(message);
				photoActions.setResults([]);
				photoActions.setSearchId("");
			} finally {
				uiActions.clearBusy();
				setIsRefreshing(false);
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
			hasText,
			useFast,
			fastKind,
			useCaps,
			useOcr,
			photoActions,
			uiActions,
		],
	);

	// Cancel current search
	const cancelSearch = useCallback(() => {
		// In a real implementation, we would cancel the ongoing search
		// For now, we'll just clear the busy state
		uiActions.clearBusy();
		setIsRefreshing(false);
		uiActions.setNote("Search cancelled");
	}, [uiActions]);

	// Get search status
	const getSearchStatus = useCallback(() => {
		return {
			isRefreshing,
			isCachedResult,
			cacheHit,
			lastSearchParams: lastSearchParams.current,
		};
	}, [isRefreshing, isCachedResult, cacheHit]);

	return {
		doSearch,
		doSmartSearch,
		cancelSearch,
		getSearchStatus,
		isRefreshing,
		isCachedResult,
		cacheHit,
	};
}

// Hook for getting library data with offline-first approach
export function useOfflineFirstLibrary() {
	const dir = useDir();
	const [library, setLibrary] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isCached, setIsCached] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadLibrary = useCallback(async () => {
		if (!dir) {
			setError("No directory selected");
			return;
		}

		setIsLoading(true);
		setError(null);
		setIsCached(false);

		try {
			// Try to get cached library data first
			const cachedLibrary = await offlineCapableGetLibrary(dir);

			if (cachedLibrary && cachedLibrary.length > 0) {
				setLibrary(cachedLibrary);
				setIsCached(true);
			}

			// Try to get fresh library data
			try {
				// In a real implementation, this would call the actual API
				// For now, we'll just use the cached data
				const freshLibrary = cachedLibrary;

				if (freshLibrary && freshLibrary.length > 0) {
					setLibrary(freshLibrary);
					setIsCached(false);
				}
			} catch (error) {
				console.error("Failed to load fresh library data:", error);
				// Keep showing cached data if available
				if (!cachedLibrary || cachedLibrary.length === 0) {
					setError("Failed to load library data");
				}
			}
		} catch (error) {
			console.error("Failed to load library data:", error);
			setError(
				error instanceof Error ? error.message : "Failed to load library data",
			);
			setLibrary([]);
		} finally {
			setIsLoading(false);
		}
	}, [dir]);

	// Load library on mount and when directory changes
	useEffect(() => {
		if (dir) {
			loadLibrary();
		}
	}, [dir, loadLibrary]);

	return {
		library,
		isLoading,
		isCached,
		error,
		refresh: loadLibrary,
	};
}

// Hook for getting photo metadata with offline-first approach
export function useOfflineFirstMetadata(photoPath: string) {
	const dir = useDir();
	const [metadata, setMetadata] = useState<PhotoMeta | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isCached, setIsCached] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadMetadata = useCallback(async () => {
		if (!dir || !photoPath) {
			setError("No directory or photo path provided");
			return;
		}

		setIsLoading(true);
		setError(null);
		setIsCached(false);

		try {
			// Try to get cached metadata first
			const cachedMetadata = await offlineCapableGetMetadata(dir, photoPath);

			if (cachedMetadata) {
				setMetadata(cachedMetadata);
				setIsCached(true);
			}

			// Try to get fresh metadata
			try {
				// In a real implementation, this would call the actual API
				// For now, we'll just use the cached data
				const freshMetadata = cachedMetadata;

				if (freshMetadata) {
					setMetadata(freshMetadata);
					setIsCached(false);
				}
			} catch (error) {
				console.error("Failed to load fresh metadata:", error);
				// Keep showing cached data if available
				if (!cachedMetadata) {
					setError("Failed to load metadata");
				}
			}
		} catch (error) {
			console.error("Failed to load metadata:", error);
			setError(
				error instanceof Error ? error.message : "Failed to load metadata",
			);
			setMetadata(null);
		} finally {
			setIsLoading(false);
		}
	}, [dir, photoPath]);

	// Load metadata when photo path changes
	useEffect(() => {
		if (dir && photoPath) {
			loadMetadata();
		}
	}, [dir, photoPath, loadMetadata]);

	return {
		metadata,
		isLoading,
		isCached,
		error,
		refresh: loadMetadata,
	};
}

// Hook for managing favorites with offline-first approach
export function useOfflineFirstFavorites() {
	const dir = useDir();
	const [favorites, setFavorites] = useState<Set<string>>(new Set());
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load favorites
	const loadFavorites = useCallback(async () => {
		if (!dir) {
			setError("No directory selected");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			// In a real implementation, this would load favorites from cache or API
			// For now, we'll return an empty set
			setFavorites(new Set());
		} catch (error) {
			console.error("Failed to load favorites:", error);
			setError(
				error instanceof Error ? error.message : "Failed to load favorites",
			);
		} finally {
			setIsLoading(false);
		}
	}, [dir]);

	// Toggle favorite status
	const toggleFavorite = useCallback(
		async (photoPath: string) => {
			if (!dir) {
				setError("No directory selected");
				return false;
			}

			try {
				// In a real implementation, this would update favorites in cache and queue for sync
				// For now, we'll just update the local state
				setFavorites((prev) => {
					const newFavorites = new Set(prev);
					if (newFavorites.has(photoPath)) {
						newFavorites.delete(photoPath);
					} else {
						newFavorites.add(photoPath);
					}
					return newFavorites;
				});

				return true;
			} catch (error) {
				console.error("Failed to toggle favorite:", error);
				setError(
					error instanceof Error ? error.message : "Failed to toggle favorite",
				);
				return false;
			}
		},
		[dir],
	);

	// Check if photo is favorite
	const isFavorite = useCallback(
		(photoPath: string) => {
			return favorites.has(photoPath);
		},
		[favorites],
	);

	// Load favorites on mount
	useEffect(() => {
		if (dir) {
			loadFavorites();
		}
	}, [dir, loadFavorites]);

	return {
		favorites: Array.from(favorites),
		isLoading,
		error,
		toggleFavorite,
		isFavorite,
		refresh: loadFavorites,
	};
}
