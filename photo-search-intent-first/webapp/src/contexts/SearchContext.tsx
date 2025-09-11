import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import type { SearchResult } from "../api";
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
};

const Ctx = createContext<{
	state: SearchState;
	actions: SearchActions;
} | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
	const photo = usePhotoActions();
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

	const value = useMemo(
		() => ({
			state: { query, results, filters },
			actions: {
				setQuery: setQuerySafe,
				setResults: setResultsSafe,
				setFilters,
			},
		}),
		[query, results, filters, setQuerySafe, setResultsSafe, setFilters],
	);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSearchContext() {
	const v = useContext(Ctx);
	if (!v)
		throw new Error("useSearchContext must be used within SearchProvider");
	return v;
}
