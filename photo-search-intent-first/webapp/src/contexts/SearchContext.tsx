import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import type { SearchResult } from "../api";
import { apiSearch } from "../api";
import { useDir, useEngine, useTopK, useNeedsHf, useHfToken, useNeedsOAI, useOpenaiKey } from "../stores/settingsStore";
import { usePhotoActions } from "../stores/useStores";

export type SearchFilters = {
	tags?: string[];
	favOnly?: boolean;
	dateFrom?: number | null;
	dateTo?: number | null;
	person?: string | null;
	persons?: string[];
	place?: string | null;
	hasText?: boolean;
};

export type SearchState = {
	query: string;
	results: SearchResult[];
	filters: SearchFilters;
};

export type SearchActions = {
    setQuery: (q: string) => void;
    setResults: (r: SearchResult[]) => void;
    setFilters: (f: Partial<SearchFilters>) => void;
    addToken: (expr: string) => void;
    clearTokens: (pattern: RegExp) => void;
    performSearch: (q?: string) => Promise<void>;
};

const Ctx = createContext<{
	state: SearchState;
	actions: SearchActions;
} | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
    const photo = usePhotoActions();
    const dir = useDir();
    const engine = useEngine();
    const topK = useTopK();
    const needsHf = useNeedsHf();
    const hfToken = useHfToken();
    const needsOAI = useNeedsOAI();
    const openaiKey = useOpenaiKey();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [filters, setFiltersState] = useState<SearchFilters>({
		favOnly: false,
	});

	const setFilters = useCallback((f: Partial<SearchFilters>) => {
		setFiltersState((prev) => ({ ...prev, ...f }));
	}, []);

    const setResultsSafe = useCallback(
        (r: SearchResult[]) => {
            setResults(r);
            try {
                (photo as any)?.setResults?.(r);
            } catch {}
        },
        [photo],
    );

    const setQuerySafe = useCallback(
        (q: string) => {
            setQuery(q);
            try {
                (photo as any)?.setQuery?.(q);
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
            const cleaned = (query || "").replace(pattern, "").replace(/\s{2,}/g, " ").trim();
            setQuerySafe(cleaned);
        },
        [query, setQuerySafe],
    );

    const performSearch = useCallback(
        async (q?: string) => {
            const qq = typeof q === "string" ? q : query;
            if (!qq) return;
            if (!dir || !engine) return;
            try {
                const r = await apiSearch(dir, qq, engine, topK || 24, {
                    hfToken: needsHf ? hfToken : undefined,
                    openaiKey: needsOAI ? openaiKey : undefined,
                    favoritesOnly: filters.favOnly,
                    tags: filters.tags,
                    dateFrom: filters.dateFrom ?? undefined,
                    dateTo: filters.dateTo ?? undefined,
                    place: filters.place ?? undefined,
                    useOcr: filters.hasText,
                });
                setResultsSafe(r.results || []);
                if (typeof q === "string") setQuerySafe(q);
            } catch {
                // swallow, caller can surface via UI if desired
            }
        },
        [query, dir, engine, topK, needsHf, hfToken, needsOAI, openaiKey, filters, setResultsSafe, setQuerySafe],
    );

	const value = useMemo(
        () => ({
            state: { query, results, filters },
            actions: {
                setQuery: setQuerySafe,
                setResults: setResultsSafe,
                setFilters,
                addToken,
                clearTokens,
                performSearch,
            },
        }),
        [query, results, filters, setQuerySafe, setResultsSafe, setFilters, addToken, clearTokens, performSearch],
    );

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSearchContext() {
	const v = useContext(Ctx);
	if (!v)
		throw new Error("useSearchContext must be used within SearchProvider");
	return v;
}
