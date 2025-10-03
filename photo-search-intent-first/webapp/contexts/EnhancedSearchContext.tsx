import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SearchResult } from "../api";
import { search } from "../api";
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
  /** all = every file, recent = time bounded, favorites = only favorites */
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
  searchProgress: number; // 0..100
};

export type EnhancedSearchActions = {
  setQuery: (q: string) => void;
  setResults: (r: SearchResult[]) => void;
  setFilters: (f: Partial<EnhancedSearchFilters>) => void;
  resetFilters: () => void;
  setSearchScope: (scope: MultiFolderSearchScope) => void;
  addToken: (expr: string) => void;
  clearTokens: (pattern: RegExp) => void;
  clear: () => void;
  performSearch: (q?: string) => Promise<void>;
  performMultiFolderSearch: (
    query: string,
    scope: MultiFolderSearchScope
  ) => Promise<void>;
};

const STORAGE_KEY = "enhanced-search-state";
const DEBOUNCE_MS = 350;

const Ctx = createContext<{
  state: EnhancedSearchState;
  actions: EnhancedSearchActions;
} | null>(null);

function loadPersistedState(): Partial<EnhancedSearchState> | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch (_e) {
    void 0;
    return null;
  }
}

function savePersistedState(state: Partial<EnhancedSearchState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_e) {
    void 0;
  }
}

export function EnhancedSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const photo = usePhotoActions();
  const dir = useDir();
  const engine = useEngine();
  const needsHf = useNeedsHf();
  const hfToken = useHfToken();
  const needsOAI = useNeedsOAI();
  const openaiKey = useOpenaiKey();
  const workspace = useWorkspaceStore();

  const TOP_K = 50;

  // Guards against race conditions between overlapping searches
  const requestIdRef = useRef(0);

  // Load persisted state on mount
  const persisted = useMemo(() => loadPersistedState(), []);

  const [query, setQuery] = useState<string>(persisted?.query ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFiltersState] = useState<EnhancedSearchFilters>(
    persisted?.filters ?? { favOnly: false }
  );
  const [searchScope, setSearchScopeState] = useState<MultiFolderSearchScope>(
    persisted?.searchScope ?? {
      type: "all",
      selectedFolders: [],
      searchScope: "all",
    }
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);

  // Persist filters, scope, query on changes
  useEffect(() => {
    savePersistedState({ query, filters, searchScope });
  }, [query, filters, searchScope]);

  const setFilters = useCallback((f: Partial<EnhancedSearchFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...f }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({ favOnly: false });
  }, []);

  const setSearchScope = useCallback((scope: MultiFolderSearchScope) => {
    setSearchScopeState(scope);
  }, []);

  const setResultsSafe = useCallback(
    (r: SearchResult[]) => {
      setResults(r);
      try {
        (
          photo as unknown as { setResults?: (x: SearchResult[]) => void }
        )?.setResults?.(r);
      } catch (_e) {
        void 0;
      }
    },
    [photo]
  );

  const setQuerySafe = useCallback(
    (q: string) => {
      setQuery(q);
      try {
        (photo as unknown as { setQuery?: (x: string) => void })?.setQuery?.(q);
      } catch (_e) {
        void 0;
      }
    },
    [photo]
  );

  const addToken = useCallback(
    (expr: string) => {
      const next = (query || "").trim();
      const q = next ? `${next} ${expr}` : expr;
      setQuerySafe(q);
    },
    [query, setQuerySafe]
  );

  const clearTokens = useCallback(
    (pattern: RegExp) => {
      const cleaned = (query || "")
        .replace(pattern, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      setQuerySafe(cleaned);
    },
    [query, setQuerySafe]
  );

  const clear = useCallback(() => {
    setQuerySafe("");
    setResultsSafe([]);
    setSearchProgress(0);
  }, [setQuerySafe, setResultsSafe]);

  /**
   * Internal small helper to keep API usage consistent across the provider.
   */
  const doSearch = useCallback(
    async (searchDir: string, searchQuery: string, topK: number) => {
      return search(searchDir, searchQuery, engine, topK, {
        hfToken: needsHf ? hfToken : undefined,
        openaiKey: needsOAI ? openaiKey : undefined,
        favoritesOnly: filters.favOnly,
        tags: filters.tags,
        dateFrom: filters.dateFrom ?? undefined,
        dateTo: filters.dateTo ?? undefined,
        place: filters.place ?? undefined,
        useOcr: filters.hasText,
      });
    },
    [engine, needsHf, hfToken, needsOAI, openaiKey, filters]
  );

  const performSingleFolderSearch = useCallback(
    async (searchQuery: string) => {
      if (!dir || !engine) return [] as SearchResult[];

      const reqId = ++requestIdRef.current;

      try {
        // Clear prior alt-search banner on new attempts
        try {
          (
            photo as unknown as {
              setAltSearch?: (x: {
                active: boolean;
                original: string;
                applied: string;
              }) => void;
            }
          )?.setAltSearch?.({
            active: false,
            original: "",
            applied: "",
          });
        } catch (_e) {
          void 0;
        }

        const base = await doSearch(dir, searchQuery, TOP_K);
        const baseResults: SearchResult[] = (base.results || []).map(
          (r: SearchResult) => r
        );

        if (reqId !== requestIdRef.current) return [];

        if (baseResults.length > 0) {
          setResultsSafe(baseResults);
          return baseResults;
        }

        const altQuery = expandSynonyms(searchQuery);
        if (altQuery && altQuery !== searchQuery) {
          const alt = await doSearch(dir, altQuery, TOP_K);
          const altResults: SearchResult[] = (alt.results || []).map(
            (r: SearchResult) => r
          );

          if (reqId !== requestIdRef.current) return [];

          if (altResults.length > 0) {
            setResultsSafe(altResults);
            try {
              (
                photo as unknown as {
                  setAltSearch?: (x: {
                    active: boolean;
                    original: string;
                    applied: string;
                  }) => void;
                }
              )?.setAltSearch?.({
                active: true,
                original: searchQuery,
                applied: altQuery,
              });
            } catch (_e) {
              void 0;
            }
            return altResults;
          }
        }

        setResultsSafe([]);
        return [];
      } catch (error) {
        console.error("Single folder search error:", error);
        if (reqId === requestIdRef.current) setResultsSafe([]);
        return [];
      }
    },
    [dir, engine, doSearch, setResultsSafe, photo]
  );

  const performMultiFolderSearch = useCallback(
    async (searchQuery: string, scope: MultiFolderSearchScope) => {
      if (!engine) return [] as SearchResult[];

      const reqId = ++requestIdRef.current;
      setIsSearching(true);
      setSearchProgress(0);

      try {
        // Clear prior alt-search banner on new attempts
        try {
          (
            photo as unknown as {
              setAltSearch?: (x: {
                active: boolean;
                original: string;
                applied: string;
              }) => void;
            }
          )?.setAltSearch?.({
            active: false,
            original: "",
            applied: "",
          });
        } catch (_e) {
          void 0;
        }

        let searchDirs: string[] = [];
        switch (scope.type) {
          case "all":
            searchDirs = [dir, ...workspace];
            break;
          case "selected":
          case "custom":
            searchDirs =
              scope.selectedFolders.length > 0 ? scope.selectedFolders : [dir];
            break;
          default:
            searchDirs = [dir];
        }

        searchDirs = [...new Set(searchDirs)].filter(Boolean);
        if (searchDirs.length === 0 && dir) searchDirs = [dir];
        const totalDirs = searchDirs.length || 1;

        const perDirK = Math.max(1, Math.ceil(TOP_K / totalDirs));
        const allResults: SearchResult[] = [];

        for (let i = 0; i < searchDirs.length; i++) {
          const currentDir = searchDirs[i]!;
          try {
            const res = await doSearch(currentDir, searchQuery, perDirK);
            const resultsWithFolder: SearchResult[] = (res.results || []).map(
              (r: SearchResult) => ({
                ...r,
                folder: currentDir,
              })
            );
            allResults.push(...resultsWithFolder);
          } catch (error) {
            console.error(`Error searching directory ${currentDir}:`, error);
          } finally {
            if (reqId === requestIdRef.current) {
              setSearchProgress(
                Math.min(100, Math.round(((i + 1) / totalDirs) * 100))
              );
            }
          }
        }

        if (reqId !== requestIdRef.current) return [];

        const byPath = new Map<string, SearchResult>();
        for (const r of allResults) {
          const prev = byPath.get(r.path);
          if (!prev || r.score > prev.score) byPath.set(r.path, r);
        }
        const uniqueSorted = Array.from(byPath.values()).sort(
          (a, b) => b.score - a.score
        );
        const finalResults = uniqueSorted.slice(0, TOP_K);

        setResultsSafe(finalResults);

        if (finalResults.length === 0) {
          const altQuery = expandSynonyms(searchQuery);
          if (altQuery && altQuery !== searchQuery) {
            const altResults = await performSingleFolderSearch(altQuery);
            if (reqId !== requestIdRef.current) return [];
            if (altResults.length > 0) {
              try {
                (
                  photo as unknown as {
                    setAltSearch?: (x: {
                      active: boolean;
                      original: string;
                      applied: string;
                    }) => void;
                  }
                )?.setAltSearch?.({
                  active: true,
                  original: searchQuery,
                  applied: altQuery,
                });
              } catch (_e) {
                void 0;
              }
            }
          }
        }

        return finalResults;
      } catch (error) {
        console.error("Multi-folder search error:", error);
        if (reqId === requestIdRef.current) setResultsSafe([]);
        return [];
      } finally {
        if (reqId === requestIdRef.current) {
          setIsSearching(false);
          setSearchProgress(0);
        }
      }
    },
    [
      engine,
      dir,
      workspace,
      doSearch,
      setResultsSafe,
      performSingleFolderSearch,
      photo,
    ]
  );

  // Debounced search effect
  useEffect(() => {
    if (!query) {
      setResultsSafe([]);
      return;
    }
    const timer = setTimeout(() => {
      const isMultiFolder = searchScope.type !== "all" || workspace.length > 0;
      if (isMultiFolder) {
        performMultiFolderSearch(query, searchScope);
      } else {
        performSingleFolderSearch(query);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    query,
    searchScope,
    workspace.length,
    performMultiFolderSearch,
    performSingleFolderSearch,
    setResultsSafe,
  ]);

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

      if (typeof q === "string") setQuerySafe(q);
    },
    [
      query,
      searchScope,
      workspace.length,
      performMultiFolderSearch,
      performSingleFolderSearch,
      setQuerySafe,
    ]
  );

  const isMultiFolderSearch = useMemo(() => {
    return searchScope.type !== "all" || workspace.length > 0;
  }, [searchScope, workspace.length]);

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
        resetFilters,
        setSearchScope,
        addToken,
        clearTokens,
        clear,
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
      resetFilters,
      setSearchScope,
      addToken,
      clearTokens,
      clear,
      performSearch,
      performMultiFolderSearch,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEnhancedSearchContext() {
  const v = useContext(Ctx);
  if (!v)
    throw new Error(
      "useEnhancedSearchContext must be used within EnhancedSearchProvider"
    );
  return v;
}

//// FILE: webapp/types/shims.d.ts
// Minimal ambient module declarations to unblock TypeScript during refactor.
// Replace with real types when those modules are available.

declare module "../api" {
  export type SearchResult = {
    path: string;
    score: number;
    folder?: string;
    [k: string]: any;
  };
  export function search(
    dir: string,
    query: string,
    engine: any,
    topK: number,
    options?: any
  ): Promise<{ results: SearchResult[] }>;
}

declare module "../stores/settingsStore" {
  export function useDir(): string;
  export function useEngine(): any;
  export function useNeedsHf(): boolean;
  export function useHfToken(): string | undefined;
  export function useNeedsOAI(): boolean;
  export function useOpenaiKey(): string | undefined;
}

declare module "../stores/useStores" {
  export function usePhotoActions(): any;
}

declare module "../stores/workspaceStore" {
  const useWorkspaceStore: () => string[];
  export { useWorkspaceStore };
}

declare module "../utils/searchSynonyms" {
  export function expandSynonyms(q: string): string;
}
