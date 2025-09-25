/**
 * AccessibleSearch - An accessible search component with comprehensive ARIA support
 * This component demonstrates how to create an accessible search interface
 * that works well with screen readers and keyboard navigation.
 */
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "../api";
import {
	useAccessibilityContext,
	useAnnouncer,
} from "../framework/AccessibilityFramework";

// Accessible search props
interface AccessibleSearchProps {
	onSearch: (query: string) => Promise<void>;
	searchResults?: SearchResult[];
	isLoading?: boolean;
	error?: string;
	placeholder?: string;
	autoFocus?: boolean;
	showSuggestions?: boolean;
	suggestions?: string[];
	onSuggestionSelect?: (suggestion: string) => void;
	onClear?: () => void;
}

// Accessible search component
export const AccessibleSearch: React.FC<AccessibleSearchProps> = ({
	onSearch,
	searchResults,
	isLoading = false,
	error,
	placeholder = "Search photos...",
	autoFocus = false,
	showSuggestions = false,
	suggestions = [],
	onSuggestionSelect,
	onClear,
}) => {
	const [query, setQuery] = useState("");
	const [showSuggestionList, setShowSuggestionList] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionListRef = useRef<HTMLUListElement>(null);
	const { announce, announceAction, announceError } = useAnnouncer();
	const { getAriaAttributes } = useAccessibilityContext();

	// Handle search submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!query.trim()) return;

		announceAction("Search", "started");

		try {
			await onSearch(query);
			announceAction("Search", "completed");

			// Announce results count
			if (searchResults && searchResults.length > 0) {
				announce(
					`Found ${searchResults.length} result${
						searchResults.length === 1 ? "" : "s"
					} for "${query}"`,
					"polite",
				);
			} else {
				announce(`No results found for "${query}"`, "polite");
			}
		} catch {
			announceAction("Search", "failed");
			announceError("Search failed. Please try again.", "Search error");
		}
	};

	// Handle input change
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setQuery(value);

		// Show/hide suggestions
		if (showSuggestions && value.trim() !== "") {
			setShowSuggestionList(true);
		} else {
			setShowSuggestionList(false);
		}
	};

	// Handle input focus
	const handleFocus = () => {
		if (showSuggestions && query.trim() !== "") {
			setShowSuggestionList(true);
		}
	};

	// Handle input blur
	const handleBlur = () => {
		// Delay hiding suggestions to allow click events
		setTimeout(() => {
			setShowSuggestionList(false);
		}, 150);
	};

	// Handle key down
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			setShowSuggestionList(false);
			inputRef.current?.blur();
		} else if (
			e.key === "ArrowDown" &&
			showSuggestionList &&
			suggestions.length > 0
		) {
			e.preventDefault();
			const firstSuggestion =
				suggestionListRef.current?.querySelector("li:first-child");
			if (firstSuggestion) {
				(firstSuggestion as HTMLElement).focus();
			}
		}
	};

	// Handle suggestion key down
	const handleSuggestionKeyDown = (
		e: React.KeyboardEvent,
		suggestion: string,
	) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			if (onSuggestionSelect) {
				onSuggestionSelect(suggestion);
			}
			setQuery(suggestion);
			setShowSuggestionList(false);
			inputRef.current?.focus();
		} else if (e.key === "Escape") {
			setShowSuggestionList(false);
			inputRef.current?.focus();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			const currentElement = e.currentTarget as HTMLElement;
			const previousElement =
				currentElement.previousElementSibling as HTMLElement;
			if (previousElement) {
				previousElement.focus();
			} else {
				inputRef.current?.focus();
			}
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			const currentElement = e.currentTarget as HTMLElement;
			const nextElement = currentElement.nextElementSibling as HTMLElement;
			if (nextElement) {
				nextElement.focus();
			}
		}
	};

	// Handle clear
	const handleClear = () => {
		setQuery("");
		if (onClear) {
			onClear();
		}
		inputRef.current?.focus();
		announce("Search cleared", "polite");
	};

	// Focus the input on mount if autoFocus is true
	useEffect(() => {
		if (autoFocus && inputRef.current) {
			inputRef.current.focus();
		}
	}, [autoFocus]);

	// Announce loading state
	useEffect(() => {
		if (isLoading) {
			announce("Searching...", "polite");
		}
	}, [isLoading, announce]);

	// Announce error
	useEffect(() => {
		if (error) {
			announceError(error, "Search");
		}
	}, [error, announceError]);

	// Get ARIA attributes for search input
	const searchInputAttributes = getAriaAttributes("search");

	return (
		<div className="accessible-search relative">
			<form onSubmit={handleSubmit} className="relative">
				<div className="relative rounded-md shadow-sm">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						<svg
							className="h-5 w-5 text-gray-400"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
					<input
						ref={inputRef}
						type="search"
						className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
						placeholder={placeholder}
						value={query}
						onChange={handleInputChange}
						onFocus={handleFocus}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						aria-label="Search photos"
						aria-describedby="search-description"
						aria-autocomplete={showSuggestions ? "list" : "none"}
						aria-controls={
							showSuggestionList ? "search-suggestions" : undefined
						}
						aria-busy={isLoading}
						{...searchInputAttributes}
					/>
					{query && (
						<button
							type="button"
							className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full"
							onClick={handleClear}
							aria-label="Clear search"
						>
							<svg
								className="h-5 w-5"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
							</svg>
						</button>
					)}
				</div>

				<button
					type="submit"
					className="sr-only"
					disabled={!query.trim() || isLoading}
					aria-label={`Search for ${query || "photos"}`}
				>
					Search
				</button>
			</form>

			{/* Hidden description for screen readers */}
			<div id="search-description" className="sr-only">
				Enter keywords to search your photo library. Press Enter to submit
				search.
			</div>

			{/* Suggestions list */}
			{showSuggestionList && suggestions.length > 0 && (
				<ul
					ref={suggestionListRef}
					id="search-suggestions"
					className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
					aria-label="Search suggestions"
				>
					{suggestions.map((suggestion) => (
						<li
							key={suggestion}
							className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-600 hover:text-white focus:outline-none focus:bg-indigo-600 focus:text-white"
							tabIndex={-1}
							onClick={() => {
								if (onSuggestionSelect) {
									onSuggestionSelect(suggestion);
								}
								setQuery(suggestion);
								setShowSuggestionList(false);
								inputRef.current?.focus();
							}}
							onKeyDown={(e) => handleSuggestionKeyDown(e, suggestion)}
						>
							<div className="flex items-center">
								<span className="block truncate font-normal">{suggestion}</span>
							</div>
						</li>
					))}
				</ul>
			)}

			{/* Loading indicator */}
			{isLoading && (
				<div
					className="mt-2 flex items-center text-sm text-gray-500"
					aria-live="polite"
					aria-busy="true"
				>
					<svg
						className="mr-3 h-4 w-4 animate-spin"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<title>Loading indicator</title>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Searching...
				</div>
			)}

			{/* Error message */}
			{error && (
				<div
					className="mt-2 text-sm text-red-600"
					role="alert"
					aria-live="assertive"
				>
					<svg
						className="inline mr-2 h-4 w-4"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
					{error}
				</div>
			)}

			{/* Results count */}
			{searchResults && searchResults.length > 0 && (
				<div className="mt-2 text-sm text-gray-500" aria-live="polite">
					{searchResults.length} result{searchResults.length === 1 ? "" : "s"}{" "}
					found
				</div>
			)}
		</div>
	);
};

export default AccessibleSearch;
