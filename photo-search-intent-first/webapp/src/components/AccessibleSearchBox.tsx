/**
 * AccessibleSearchBox - Enhanced search box with accessibility features
 * This component provides a fully accessible search interface with screen reader support,
 * keyboard navigation, and ARIA compliance.
 */
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { SearchFilters } from "../contexts/domains/SearchOperationsContext";
import {
	useAnnouncer,
	useFocusManager,
} from "../framework/AccessibilityFramework";

// Accessible search box props
interface AccessibleSearchBoxProps {
	onSearch: (query: string, filters?: SearchFilters) => Promise<void>;
	placeholder?: string;
	initialValue?: string;
	autoFocus?: boolean;
	showSuggestions?: boolean;
	suggestions?: string[];
	onSuggestionSelect?: (suggestion: string) => void;
	isLoading?: boolean;
	error?: string;
	className?: string;
}

// Accessible search box component
export const AccessibleSearchBox: React.FC<AccessibleSearchBoxProps> = ({
	onSearch,
	placeholder = "Search photos...",
	initialValue = "",
	autoFocus = false,
	showSuggestions = false,
	suggestions = [],
	onSuggestionSelect,
	isLoading = false,
	error,
	className = "",
}) => {
	// State
	const [query, setQuery] = useState(initialValue);
	const [showSuggestionList, setShowSuggestionList] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);

	// Refs
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionListRef = useRef<HTMLUListElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Accessibility context
	const { announce, announceAction, announceError, announceSuccess } =
		useAnnouncer();

	const { trapFocus } = useFocusManager();

	// Handle search submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!query.trim()) return;

		announceAction("Search", "started");
		announce(`Searching for "${query}"`, "polite");

		try {
			await onSearch(query);
			announceAction("Search", "completed");
			announceSuccess(`Search completed for "${query}"`);
		} catch (err) {
			announceAction("Search", "failed");
			const errorMessage = err instanceof Error ? err.message : String(err);
			announceError(`Search failed: ${errorMessage}`, "Search error");
		}
	};

	// Handle input change
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setQuery(value);

		// Show/hide suggestions
		if (showSuggestions && value.trim() !== "") {
			setShowSuggestionList(true);
			setSelectedIndex(-1);
		} else {
			setShowSuggestionList(false);
			setSelectedIndex(-1);
		}
	};

	// Handle input focus
	const handleFocus = () => {
		if (showSuggestions && query.trim() !== "") {
			setShowSuggestionList(true);
		}

		// Announce focus
		announce("Search input focused", "polite");
	};

	// Handle input blur
	const handleBlur = () => {
		// Delay hiding suggestions to allow click events
		setTimeout(() => {
			setShowSuggestionList(false);
			setSelectedIndex(-1);
		}, 150);
	};

	// Handle key down
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			setShowSuggestionList(false);
			setSelectedIndex(-1);
			inputRef.current?.blur();
			announce("Suggestions closed", "polite");
		} else if (
			e.key === "ArrowDown" &&
			showSuggestionList &&
			suggestions.length > 0
		) {
			e.preventDefault();
			setSelectedIndex((prev) => (prev + 1) % suggestions.length);
			announce(
				`Selected suggestion ${selectedIndex + 2} of ${suggestions.length}`,
				"polite",
			);
		} else if (
			e.key === "ArrowUp" &&
			showSuggestionList &&
			suggestions.length > 0
		) {
			e.preventDefault();
			setSelectedIndex(
				(prev) => (prev - 1 + suggestions.length) % suggestions.length,
			);
			announce(
				`Selected suggestion ${selectedIndex} of ${suggestions.length}`,
				"polite",
			);
		} else if (e.key === "Enter" && showSuggestionList && selectedIndex >= 0) {
			e.preventDefault();
			const selectedSuggestion = suggestions[selectedIndex];
			if (onSuggestionSelect) {
				onSuggestionSelect(selectedSuggestion);
			}
			setQuery(selectedSuggestion);
			setShowSuggestionList(false);
			setSelectedIndex(-1);
			inputRef.current?.focus();
			announce(`Selected suggestion: ${selectedSuggestion}`, "polite");
		} else if (e.key === "Enter" && !showSuggestionList) {
			handleSubmit(e as unknown);
		} else if (e.key === "Tab" && showSuggestionList) {
			// Allow tab to move to next element
			setShowSuggestionList(false);
			setSelectedIndex(-1);
		}
	};

	// Handle suggestion click
	const handleSuggestionClick = (suggestion: string) => {
		if (onSuggestionSelect) {
			onSuggestionSelect(suggestion);
		}
		setQuery(suggestion);
		setShowSuggestionList(false);
		setSelectedIndex(-1);
		inputRef.current?.focus();
		announce(`Selected suggestion: ${suggestion}`, "polite");
	};

	// Handle suggestion key down
	const handleSuggestionKeyDown = (
		e: React.KeyboardEvent,
		suggestion: string,
	) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleSuggestionClick(suggestion);
		} else if (e.key === "Escape") {
			setShowSuggestionList(false);
			setSelectedIndex(-1);
			inputRef.current?.focus();
			announce("Suggestions closed", "polite");
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((prev) => (prev + 1) % suggestions.length);
			announce(
				`Selected suggestion ${selectedIndex + 2} of ${suggestions.length}`,
				"polite",
			);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex(
				(prev) => (prev - 1 + suggestions.length) % suggestions.length,
			);
			announce(
				`Selected suggestion ${selectedIndex} of ${suggestions.length}`,
				"polite",
			);
		}
	};

	// Handle clear
	const handleClear = () => {
		setQuery("");
		setShowSuggestionList(false);
		setSelectedIndex(-1);
		inputRef.current?.focus();
		announce("Search cleared", "polite");
	};

	// Focus the input on mount if autoFocus is true
	useEffect(() => {
		if (autoFocus && inputRef.current) {
			inputRef.current.focus();
			announce("Search input auto-focused", "polite");
		}
	}, [autoFocus, announce]);

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

	// Trap focus when suggestions are shown
	useEffect(() => {
		if (showSuggestionList && containerRef.current) {
			const cleanup = trapFocus(containerRef.current);
			return () => {
				if (cleanup) cleanup();
			};
		}
	}, [showSuggestionList, trapFocus]);

	return (
		<div ref={containerRef} className={`accessible-search-box ${className}`}>
			<form onSubmit={handleSubmit} className="relative">
				<div className="relative rounded-md shadow-sm">
					{/* Search icon */}
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

					{/* Search input */}
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
						aria-activedescendant={
							selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined
						}
						aria-busy={isLoading}
						aria-invalid={!!error}
						aria-errormessage={error ? "search-error" : undefined}
					/>

					{/* Clear button */}
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

				{/* Hidden search description for screen readers */}
				<div id="search-description" className="sr-only">
					Enter keywords to search your photo library. Press Enter to submit
					search.
				</div>

				{/* Submit button (visually hidden but accessible) */}
				<button
					type="submit"
					className="sr-only"
					disabled={!query.trim() || isLoading}
					aria-label={`Search for ${query || "photos"}`}
				>
					Search
				</button>
			</form>

			{/* Suggestions list */}
			{showSuggestionList && suggestions.length > 0 && (
				<ul
					ref={suggestionListRef}
					id="search-suggestions"
					className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
					aria-label="Search suggestions"
				>
					{suggestions.map((suggestion, index) => (
						<li
							key={suggestion}
							id={`suggestion-${index}`}
							className={`relative cursor-default select-none py-2 pl-3 pr-9 ${
								selectedIndex === index
									? "bg-indigo-600 text-white"
									: "text-gray-900 hover:bg-indigo-600 hover:text-white"
							}`}
							tabIndex={-1}
							onClick={() => handleSuggestionClick(suggestion)}
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
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					<span id="search-loading">Searching...</span>
				</div>
			)}

			{/* Error message */}
			{error && (
				<div
					id="search-error"
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
					<span>{error}</span>
				</div>
			)}
		</div>
	);
};

export default AccessibleSearchBox;
