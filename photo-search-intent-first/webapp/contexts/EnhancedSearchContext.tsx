import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import type { SearchResult } from "../api";
import { search, searchWorkspace } from "../api";
import {
	useDir,
	useEngine,
	useHfToken,
	useNeedsHf,
	useNeedsOAI,
	useOpenaiKey,
} from "../stores/settingsStore";
import { usePhotoActions } from "../stores/useStores";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { expandSynonyms } from "../utils/searchSynonyms";

export interface MultiFolderSearchScope {
	type: "all" | "selected" | "custom";
	selectedFolders: string[];
	searchScope: "all" | "recent" | "favorites";
}

export type EnhancedSearchFilters = {
	tags?: string[];
	favOnly?: boolean;
	dateFrom?: number | null;
	dateTo?: number | null;
	person?: string | null;
	persons?: string[];
	place?: string | null;
	hasText?: boolean;
};

export type EnhancedSearchState = {
	query: string;
	results: SearchResult[];
	filters: EnhancedSearchFilters;
	searchScope: MultiFolderSearchScope;
	isMultiFolderSearch: boolean;
	isSearching: boolean;
	searchProgress: number;
};

export type EnhancedSearchActions = {
	setQuery: (q: string) => void;
	setResults: (r: SearchResult[]) => void;
	setFilters: (f: Partial<EnhancedSearchFilters>) => void;
	setSearchScope: (scope: MultiFolderSearchScope) => void;
	addToken: (expr: string) => void;
	clearTokens: (pattern: RegExp) => void;
	performSearch: (q?: string) => Promise<void>;
	performMultiFolderSearch: (
		query: string,
		scope: MultiFolderSearchScope,
	) => Promise<void>;
};

const Ctx = createContext<{
	state: EnhancedSearchState;
	actions: EnhancedSearchActions;
} | null>(null);

export function EnhancedSearchProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const photo = usePhotoActions();
	const dir = useDir();
	const engine = useEngine();
	const topK = 50;
	const needsHf = useNeedsHf();
	const hfToken = useHfToken();
	const needsOAI = useNeedsOAI();
	const openaiKey = useOpenaiKey();
	const workspace = useWorkspaceStore();

	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [filters, setFiltersState] = useState<EnhancedSearchFilters>({
		favOnly: false,
	});
	const [searchScope, setSearchScopeState] = useState<MultiFolderSearchScope>({
		type: "all",
		selectedFolders: [],
		searchScope: "all",
	});
	const [isSearching, setIsSearching] = useState(false);
	const [searchProgress, setSearchProgress] = useState(0);

	const setFilters = useCallback((f: Partial<EnhancedSearchFilters>) => {
		setFiltersState((prev) => ({ ...prev, ...f }));
	}, []);

	const setSearchScope = useCallback((scope: MultiFolderSearchScope) => {
		setSearchScopeState(scope);
	}, []);

	const setResultsSafe = useCallback(
		(r: SearchResult[]) => {
			setResults(r);
			try {
				(photo as unknown)?.setResults?.(r);
			} catch {}
		},
		[photo],
	);

	const setQuerySafe = useCallback(
		(q: string) => {
			setQuery(q);
			try {
				(photo as unknown)?.setQuery?.(q);
			} catch {}
		},
		[photo],
	);

	const addToken = useCallback(
		(expr: string) => {
			const next = (query || "").trim();
			const q = next ? `${next} ${expr}` : expr;
			setQuerySafe(q);
		},
		[query, setQuerySafe],
	);

	const clearTokens = useCallback(
		(pattern: RegExp) => {
			const cleaned = (query || "")
				.replace(pattern, "")
				.replace(/\s{2,}/g, " ")
				.trim();
			setQuerySafe(cleaned);
		},
		[query, setQuerySafe],
	);

	const performSingleFolderSearch = useCallback(
		async (searchQuery: string) => {
			if (!dir || !engine) return;

			try {
				// Clear unknown prior alt search banner on new attempts
				try {
					(photo as unknown)?.setAltSearch?.({
						active: false,
						original: "",
						applied: "",
					});
				} catch {}

				const base = await search(dir, searchQuery, engine, topK, {
					hfToken: needsHf ? hfToken : undefined,
					openaiKey: needsOAI ? openaiKey : undefined,
					favoritesOnly: filters.favOnly,
					tags: filters.tags,
					dateFrom: filters.dateFrom ?? undefined,
					dateTo: filters.dateTo ?? undefined,
					place: filters.place ?? undefined,
					useOcr: filters.hasText,
				});
				const baseResults = base.results || [];

				if (baseResults.length > 0) {
					setResultsSafe(baseResults);
					return baseResults;
				}

				// Soft fallback: try a synonym-expanded query when none found
				const altQuery = expandSynonyms(searchQuery);

				if (altQuery && altQuery !== searchQuery) {
					const alt = await search(dir, altQuery, engine, topK, {
						hfToken: needsHf ? hfToken : undefined,
						openaiKey: needsOAI ? openaiKey : undefined,
						favoritesOnly: filters.favOnly,
						tags: filters.tags,
						dateFrom: filters.dateFrom ?? undefined,
						dateTo: filters.dateTo ?? undefined,
						place: filters.place ?? undefined,
						useOcr: filters.hasText,
					});
					const altResults = alt.results || [];

					if (altResults.length > 0) {
						setResultsSafe(altResults);
						try {
							(photo as unknown)?.setAltSearch?.({
								active: true,
								original: searchQuery,
								applied: altQuery,
							});
						} catch {}
						return altResults;
					}
				}

				// Nothing matched, keep empty results and original state
				setResultsSafe([]);
				return [];
			} catch (error) {
				console.error("Single folder search error:", error);
				setResultsSafe([]);
				return [];
			}
		},
		[
			query,
			dir,
			engine,
			needsHf,
			hfToken,
			needsOAI,
			openaiKey,
			filters,
			setResultsSafe,
			photo,
		],
	);

	const performMultiFolderSearch = useCallback(
		async (searchQuery: string, scope: MultiFolderSearchScope) => {
			if (!engine || workspace.length === 0) return;

			setIsSearching(true);
			setSearchProgress(0);

			try {
				// Clear unknown prior alt search banner on new attempts
				try {
					(photo as unknown)?.setAltSearch?.({
						active: false,
						original: "",
						applied: "",
					});
				} catch {}

				let searchDirs: string[] = [];

				// Determine which directories to search based on scope
				switch (scope.type) {
					case "all":
						searchDirs = [dir, ...workspace];
						break;
					case "selected":
						searchDirs =
							scope.selectedFolders.length > 0 ? scope.selectedFolders : [dir];
						break;
					case "custom":
						searchDirs =
							scope.selectedFolders.length > 0 ? scope.selectedFolders : [dir];
						break;
					default:
						searchDirs = [dir];
				}

				// Remove duplicates and ensure we have at least one directory
				searchDirs = [...new Set(searchDirs)].filter(Boolean);
				if (searchDirs.length === 0) {
					searchDirs = [dir].filter(Boolean);
				}

				const allResults: SearchResult[] = [];
				const totalDirs = searchDirs.length;

				// Search each directory and aggregate results
				for (let i = 0; i < searchDirs.length; i++) {
					const currentDir = searchDirs[i];
					setSearchProgress(((i + 1) / totalDirs) * 100);

					try {
						const searchResults = await search({
							dir: currentDir,
							query: searchQuery,
							provider: engine,
							topK: Math.ceil(topK / searchDirs.length), // Distribute results across folders
							options: {
								hfToken: needsHf ? hfToken : undefined,
								openaiKey: needsOAI ? openaiKey : undefined,
								favoritesOnly: filters.favOnly,
								tags: filters.tags,
								dateFrom: filters.dateFrom ?? undefined,
								dateTo: filters.dateTo ?? undefined,
								place: filters.place ?? undefined,
								useOcr: filters.hasText,
							},
						});

						// Add folder information to results
						const resultsWithFolder = (searchResults.results || []).map(
							(result) => ({
								...result,
								folder: currentDir,
							}),
						);

						allResults.push(...resultsWithFolder);
					} catch (error) {
						console.error(`Error searching directory ${currentDir}:`, error);
					}
				}

				// Sort all results by score (descending) and remove duplicates
				const uniqueResults = allResults
					.filter(
						(result, index, self) =>
							index === self.findIndex((r) => r.path === result.path),
					)
					.sort((a, b) => b.score - a.score);

				// Take top K results overall
				const finalResults = uniqueResults.slice(0, topK);

				setResultsSafe(finalResults);

				// Try synonym expansion if no results found
				if (finalResults.length === 0) {
					const altQuery = expandSynonyms(searchQuery);
					if (altQuery && altQuery !== searchQuery) {
						// For simplicity, just try the primary directory with expanded query
						const altResults = await performSingleFolderSearch(altQuery);
						if (altResults.length > 0) {
							try {
								(photo as unknown)?.setAltSearch?.({
									active: true,
									original: searchQuery,
									applied: altQuery,
								});
							} catch {}
						}
					}
				}

				return finalResults;
			} catch (error) {
				console.error("Multi-folder search error:", error);
				setResultsSafe([]);
				return [];
			} finally {
				setIsSearching(false);
				setSearchProgress(0);
			}
		},
		[
			dir,
			engine,
			workspace,
			needsHf,
			hfToken,
			needsOAI,
			openaiKey,
			filters,
			topK,
			setResultsSafe,
			photo,
		],
	);

	const performSearch = useCallback(
		async (q?: string) => {
			const searchQuery = typeof q === "string" ? q : query;
			if (!searchQuery) return;

			const isMultiFolder = searchScope.type !== "all" || workspace.length > 0;

			if (isMultiFolder) {
				await performMultiFolderSearch(searchQuery, searchScope);
			} else {
				await performSingleFolderSearch(searchQuery);
			}

			if (typeof q === "string") {
				setQuerySafe(q);
			}
		},
		[
			query,
			searchScope,
			workspace,
			performMultiFolderSearch,
			performSingleFolderSearch,
			setQuerySafe,
		],
	);

	const isMultiFolderSearch = useMemo(() => {
		return searchScope.type !== "all" || workspace.length > 0;
	}, [searchScope, workspace]);

	const value = useMemo(
		() => ({
			state: {
				query,
				results,
				filters,
				searchScope,
				isMultiFolderSearch,
				isSearching,
				searchProgress,
			},
			actions: {
				setQuery: setQuerySafe,
				setResults: setResultsSafe,
				setFilters,
				setSearchScope,
				addToken,
				clearTokens,
				performSearch,
				performMultiFolderSearch,
			},
		}),
		[
			query,
			results,
			filters,
			searchScope,
			isMultiFolderSearch,
			isSearching,
			searchProgress,
			setQuerySafe,
			setResultsSafe,
			setFilters,
			setSearchScope,
			addToken,
			clearTokens,
			performSearch,
			performMultiFolderSearch,
		],
	);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEnhancedSearchContext() {
	const v = useContext(Ctx);
	if (!v)
		throw new Error(
			"useEnhancedSearchContext must be used within EnhancedSearchProvider",
		);
	return v;
}
