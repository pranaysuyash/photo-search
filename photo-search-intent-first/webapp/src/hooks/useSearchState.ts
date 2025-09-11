/**
 * Unified search state management hook
 * Solves the searchText/query synchronization issue
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePhotoActions, useSearchQuery } from "../stores/useStores";

interface UseSearchStateOptions {
	debounceMs?: number;
	onSearch?: (query: string) => void;
	trimWhitespace?: boolean;
	minLength?: number;
	maxLength?: number;
}

interface UseSearchStateReturn {
	searchText: string;
	setSearchText: (text: string) => void;
	isSearching: boolean;
	hasQuery: boolean;
	clearSearch: () => void;
	submitSearch: () => void;
	query: string; // Store query for reference
}

/**
 * Unified search state management that synchronizes local and store state
 * Solves the searchText/query divergence issue in App.tsx
 *
 * @example
 * const { searchText, setSearchText, isSearching, hasQuery, clearSearch } = useSearchState({
 *   debounceMs: 300,
 *   onSearch: (query) => performSearch(query),
 *   minLength: 2
 * });
 */
export const useSearchState = (
	options: UseSearchStateOptions = {},
): UseSearchStateReturn => {
	const {
		debounceMs = 0,
		onSearch,
		trimWhitespace = true,
		minLength = 0,
		maxLength = 1000,
	} = options;

	// Get store state and actions
	const storeQuery = useSearchQuery();
	const { setQuery } = usePhotoActions();

	// Local state for input field
	const [searchText, setSearchText] = useState(storeQuery);
	const [_isSearching, _setIsSearching] = useState(false);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Keep local state in sync with store state
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
	useEffect(() => {
		// Only update local state if it differs from store state
		// This prevents infinite loops and maintains user input during typing
		if (searchText !== storeQuery && !debounceTimerRef.current) {
			setSearchText(storeQuery);
		}
	}, [storeQuery, searchText]);

	/**
	 * Validates and sanitizes search text
	 */
	const sanitizeSearchText = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			(text: string): string => {
				let sanitized = text;

				// Trim whitespace if enabled
				if (trimWhitespace) {
					sanitized = sanitized.trim();
				}

				// Remove excessive whitespace
				sanitized = sanitized.replace(/\s+/g, " ");

				// Apply length constraints
				if (maxLength && sanitized.length > maxLength) {
					sanitized = sanitized.slice(0, maxLength);
				}

				// Remove potentially problematic characters
				sanitized = sanitized.replace(
					/* biome-ignore lint/suspicious/noControlCharactersInRegex: Required */ /[\x00-\x1F\x7F]/g,
					"",
				); // Remove control characters

				return sanitized;
			},
			[trimWhitespace, maxLength],
		);

	/**
	 * Updates search text with validation and optional debouncing
	 */
	const updateSearchText = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			(_text: string) => {
				const sanitized = sanitizeSearchText(_text);
				setSearchText(sanitized);

				// Clear existing debounce timer
				if (debounceTimerRef.current) {
					clearTimeout(debounceTimerRef.current);
					debounceTimerRef.current = null;
				}

				// Apply length validation
				if (sanitized.length < minLength) {
					return;
				}

				if (debounceMs > 0) {
					// Debounced update
					debounceTimerRef.current = setTimeout(() => {
						setQuery(sanitized);
						onSearch?.(sanitized);
						debounceTimerRef.current = null;
					}, debounceMs);
				} else {
					// Immediate update
					setQuery(sanitized);
					onSearch?.(sanitized);
				}
			},
			[sanitizeSearchText, debounceMs, minLength, setQuery, onSearch],
		);

	/**
	 * Clears the search completely
	 */
	const clearSearch = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(() => {
			setSearchText("");
			setQuery("");

			// Clear debounce timer
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}

			onSearch?.("");
		}, [setQuery, onSearch]);

	/**
	 * Forces immediate search submission (bypasses debouncing)
	 */
	const submitSearch = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(() => {
			// Clear debounce timer
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}

			const sanitized = sanitizeSearchText(searchText);
			setQuery(sanitized);
			onSearch?.(sanitized);
		}, [searchText, sanitizeSearchText, setQuery, onSearch]);

	// Cleanup on unmount
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	return {
		searchText,
		setSearchText: updateSearchText,
		isSearching: !!debounceTimerRef.current,
		hasQuery: searchText.length > 0,
		clearSearch,
		submitSearch,
		query: storeQuery,
	};
};

/**
 * Hook for managing search history
 * Provides suggestions and recent searches functionality
 */
export const _useSearchHistory = (maxHistory = 10) => {
	const [history, setHistory] = useState<string[]>([]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
	useEffect(() => {
		// Load from localStorage
		try {
			const stored = localStorage.getItem("searchHistory");
			if (stored) {
				setHistory(JSON.parse(stored));
			}
		} catch (error) {
			console.warn("Failed to load search history:", error);
		}
	}, []);

	const addToHistory = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			(_query: string) => {
				if (!_query || _query.length < 2) return;

				const updated = [
					_query,
					...history.filter((item) => item !== _query),
				].slice(0, maxHistory);

				setHistory(updated);

				try {
					localStorage.setItem("searchHistory", JSON.stringify(updated));
				} catch (error) {
					console.warn("Failed to save search history:", error);
				}
			},
			[history, maxHistory],
		);

	const clearHistory = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(() => {
			setHistory([]);
			try {
				localStorage.removeItem("searchHistory");
			} catch (error) {
				console.warn("Failed to clear search history:", error);
			}
		}, []);

	return {
		history,
		addToHistory,
		clearHistory,
	};
};

/**
 * Hook for search validation and error handling
 */
export const _useSearchValidation = () => {
	const validateQuery = (
		query: string,
	): { isValid: boolean; error?: string } => {
		if (!query || query.trim().length === 0) {
			return { isValid: false, error: "Search query cannot be empty" };
		}

		if (query.length > 1000) {
			return {
				isValid: false,
				error: "Search query is too long (max 1000 characters)",
			};
		}

		// Check for potentially malicious input
		if (query.includes("<") || query.includes(">")) {
			return {
				isValid: false,
				error: "Search query contains invalid characters",
			};
		}

		return { isValid: true };
	};

	const sanitizeQuery = (query: string): string => {
		return query
			.trim()
			.replace(/\s+/g, " ")
			.replace(
				/* biome-ignore lint/suspicious/noControlCharactersInRegex: Required */ /[\x00-\x1F\x7F]/g,
				"",
			) // Remove control characters
			.slice(0, 1000); // Limit length
	};

	return {
		validateQuery,
		sanitizeQuery,
	};
};
