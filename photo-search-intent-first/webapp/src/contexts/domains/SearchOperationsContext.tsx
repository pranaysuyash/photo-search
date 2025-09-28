/**
 * SearchOperationsContext - Enhanced version with accessibility support
 * This context provides search operations with comprehensive accessibility features
 * including screen reader announcements and keyboard navigation support.
 */
import type React from "react";
import { createContext, useContext, useMemo } from "react";
import type { SearchResult } from "../api";
import {
	useAnnouncer,
	useFocusManager,
	useKeyboardNavigation,
} from "../framework/AccessibilityFramework";

// Define the shape of our search operations context
interface SearchOperationsContextType {
	// Search execution
	doSearchImmediate: (query?: string) => Promise<void>;
	doSearchWithFilters: (query: string, filters: SearchFilters) => Promise<void>;

	// Search state management
	searchId: string;
	searchResults: SearchResult[];
	searchQuery: string;
	topK: number;
	setSearchResults: (results: SearchResult[]) => void;
	setSearchId: (id: string) => void;
	setSearchQuery: (query: string) => void;
	setTopK: (topK: number) => void;
	resetSearch: () => void;

	// Search configuration
	useCaps: boolean;
	useOcr: boolean;
	useFast: boolean;
	fastKind: "annoy" | "faiss" | "hnsw" | "";
	setUseCaps: (useCaps: boolean) => void;
	setUseOcr: (useOcr: boolean) => void;
	setUseFast: (useFast: boolean) => void;
	setFastKind: (fastKind: "annoy" | "faiss" | "hnsw" | "") => void;

	// Accessibility features
	announceSearchStart: (query: string) => void;
	announceSearchComplete: (resultsCount: number, query: string) => void;
	announceSearchError: (error: string, query: string) => void;
	announceSearchProgress: (current: number, total: number) => void;
	focusSearchInput: () => void;
	focusFirstResult: () => void;
	focusNextResult: () => void;
	focusPreviousResult: () => void;
	enableKeyboardSearchNavigation: () => void;
	disableKeyboardSearchNavigation: () => void;
}

// Search filters interface
interface SearchFilters {
	dateFrom?: number;
	dateTo?: number;
	camera?: string;
	isoMin?: number;
	isoMax?: number;
	fMin?: number;
	fMax?: number;
	place?: string;
	hasText?: boolean;
	persons?: string[];
	tags?: string[];
	favoritesOnly?: boolean;
	ratingMin?: number;
}

// Create the context with a default value
const SearchOperationsContext = createContext<
	SearchOperationsContextType | undefined
>(undefined);

// Provider component props
interface SearchOperationsProviderProps {
	children: React.ReactNode;
	value: Omit<
		SearchOperationsContextType,
		| "announceSearchStart"
		| "announceSearchComplete"
		| "announceSearchError"
		| "announceSearchProgress"
		| "focusSearchInput"
		| "focusFirstResult"
		| "focusNextResult"
		| "focusPreviousResult"
		| "enableKeyboardSearchNavigation"
		| "disableKeyboardSearchNavigation"
	>;
}

// Provider component with accessibility support
export const SearchOperationsProvider: React.FC<
	SearchOperationsProviderProps
> = ({ children, value }) => {
	// Get accessibility context
	const {
		announce,
		announceAction,
		announceProgress,
		announceError,
		announceSuccess,
	} = useAnnouncer();

	const { focusNext, focusPrevious, focusFirst, focusLast, trapFocus } =
		useFocusManager();

	const {
		enableKeyboardNavigation,
		disableKeyboardNavigation,
		isKeyboardNavigationEnabled,
	} = useKeyboardNavigation();

	// Enhanced search operations with accessibility features
	const enhancedValue = useMemo(() => {
		// Search start announcement
		const announceSearchStart = (query: string) => {
			announceAction("Search", "started");
			announce(`Searching for "${query}"`, "polite");
		};

		// Search complete announcement
		const announceSearchComplete = (resultsCount: number, query: string) => {
			announceAction("Search", "completed");
			if (resultsCount > 0) {
				announce(
					`Found ${resultsCount} result${resultsCount === 1 ? "" : "s"} for "${query}"`,
					"polite",
				);
			} else {
				announce(`No results found for "${query}"`, "polite");
			}
		};

		// Search error announcement
		const announceSearchError = (error: string, query: string) => {
			announceAction("Search", "failed");
			announceError(`Search failed for "${query}": ${error}`, "Search error");
		};

		// Search progress announcement
		const announceSearchProgress = (current: number, total: number) => {
			announceProgress(current, total, "Searching");
		};

		// Focus management for search
		const focusSearchInput = () => {
			const searchInput =
				document.querySelector("input[type='search']") ||
				document.querySelector("[role='searchbox']") ||
				document.querySelector("input[aria-label*='search']");
			if (searchInput) {
				(searchInput as HTMLElement).focus();
				announce("Focused on search input", "polite");
			}
		};

		const focusFirstResult = () => {
			const firstResult =
				document.querySelector("[data-search-result]:first-child") ||
				document.querySelector(".search-result:first-child");
			if (firstResult) {
				(firstResult as HTMLElement).focus();
				announce("Focused on first search result", "polite");
			}
		};

		const focusNextResult = () => {
			focusNext();
			announce("Moved to next search result", "polite");
		};

		const focusPreviousResult = () => {
			focusPrevious();
			announce("Moved to previous search result", "polite");
		};

		// Keyboard navigation for search
		const enableKeyboardSearchNavigation = () => {
			enableKeyboardNavigation();
			announce("Keyboard navigation enabled for search results", "polite");
		};

		const disableKeyboardSearchNavigation = () => {
			disableKeyboardNavigation();
			announce("Keyboard navigation disabled for search results", "polite");
		};

		return {
			...value,
			announceSearchStart,
			announceSearchComplete,
			announceSearchError,
			announceSearchProgress,
			focusSearchInput,
			focusFirstResult,
			focusNextResult,
			focusPreviousResult,
			enableKeyboardSearchNavigation,
			disableKeyboardSearchNavigation,
		};
	}, [
		value,
		announce,
		announceAction,
		announceProgress,
		announceError,
		focusNext,
		focusPrevious,
		enableKeyboardNavigation,
		disableKeyboardNavigation,
	]);

	return (
		<SearchOperationsContext.Provider value={enhancedValue}>
			{children}
		</SearchOperationsContext.Provider>
	);
};

// Hook to consume the context
export const useSearchOperationsContext = (): SearchOperationsContextType => {
	const context = useContext(SearchOperationsContext);
	if (context === undefined) {
		throw new Error(
			"useSearchOperationsContext must be used within a SearchOperationsProvider",
		);
	}
	return context;
};

// Selector hooks for specific search operations
export const useSearchExecution = (): Pick<
	SearchOperationsContextType,
	"doSearchImmediate" | "doSearchWithFilters"
> => {
	const context = useSearchOperationsContext();
	return useMemo(
		() => ({
			doSearchImmediate: context.doSearchImmediate,
			doSearchWithFilters: context.doSearchWithFilters,
		}),
		[context.doSearchImmediate, context.doSearchWithFilters],
	);
};

export const useSearchState = (): Pick<
	SearchOperationsContextType,
	| "searchId"
	| "searchResults"
	| "searchQuery"
	| "topK"
	| "setSearchResults"
	| "setSearchId"
	| "setSearchQuery"
	| "setTopK"
	| "resetSearch"
> => {
	const context = useSearchOperationsContext();
	return useMemo(
		() => ({
			searchId: context.searchId,
			searchResults: context.searchResults,
			searchQuery: context.searchQuery,
			topK: context.topK,
			setSearchResults: context.setSearchResults,
			setSearchId: context.setSearchId,
			setSearchQuery: context.setSearchQuery,
			setTopK: context.setTopK,
			resetSearch: context.resetSearch,
		}),
		[
			context.searchId,
			context.searchResults,
			context.searchQuery,
			context.topK,
			context.setSearchResults,
			context.setSearchId,
			context.setSearchQuery,
			context.setTopK,
			context.resetSearch,
		],
	);
};

export const useSearchConfiguration = (): Pick<
	SearchOperationsContextType,
	| "useCaps"
	| "useOcr"
	| "useFast"
	| "fastKind"
	| "setUseCaps"
	| "setUseOcr"
	| "setUseFast"
	| "setFastKind"
> => {
	const context = useSearchOperationsContext();
	return useMemo(
		() => ({
			useCaps: context.useCaps,
			useOcr: context.useOcr,
			useFast: context.useFast,
			fastKind: context.fastKind,
			setUseCaps: context.setUseCaps,
			setUseOcr: context.setUseOcr,
			setUseFast: context.setUseFast,
			setFastKind: context.setFastKind,
		}),
		[
			context.useCaps,
			context.useOcr,
			context.useFast,
			context.fastKind,
			context.setUseCaps,
			context.setUseOcr,
			context.setUseFast,
			context.setFastKind,
		],
	);
};

export const useSearchAccessibility = (): Pick<
	SearchOperationsContextType,
	| "announceSearchStart"
	| "announceSearchComplete"
	| "announceSearchError"
	| "announceSearchProgress"
	| "focusSearchInput"
	| "focusFirstResult"
	| "focusNextResult"
	| "focusPreviousResult"
	| "enableKeyboardSearchNavigation"
	| "disableKeyboardSearchNavigation"
> => {
	const context = useSearchOperationsContext();
	return useMemo(
		() => ({
			announceSearchStart: context.announceSearchStart,
			announceSearchComplete: context.announceSearchComplete,
			announceSearchError: context.announceSearchError,
			announceSearchProgress: context.announceSearchProgress,
			focusSearchInput: context.focusSearchInput,
			focusFirstResult: context.focusFirstResult,
			focusNextResult: context.focusNextResult,
			focusPreviousResult: context.focusPreviousResult,
			enableKeyboardSearchNavigation: context.enableKeyboardSearchNavigation,
			disableKeyboardSearchNavigation: context.disableKeyboardSearchNavigation,
		}),
		[
			context.announceSearchStart,
			context.announceSearchComplete,
			context.announceSearchError,
			context.announceSearchProgress,
			context.focusSearchInput,
			context.focusFirstResult,
			context.focusNextResult,
			context.focusPreviousResult,
			context.enableKeyboardSearchNavigation,
			context.disableKeyboardSearchNavigation,
		],
	);
};

export default SearchOperationsContext;
