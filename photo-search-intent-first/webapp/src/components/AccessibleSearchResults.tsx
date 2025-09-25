/**
 * AccessibleSearchResults - Enhanced search results with accessibility features
 * This component provides a fully accessible search results interface with screen reader support,
 * keyboard navigation, and ARIA compliance.
 */
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResult } from "../api";
import {
	useAnnouncer,
	useFocusManager,
	useKeyboardNavigation,
} from "../framework/AccessibilityFramework";

// Accessible search results props
interface AccessibleSearchResultsProps {
	results: SearchResult[];
	onSelect?: (result: SearchResult) => void;
	onOpen?: (result: SearchResult) => void;
	onFavorite?: (result: SearchResult, favorite: boolean) => void;
	onDelete?: (result: SearchResult) => void;
	onExport?: (result: SearchResult, destination: string) => void;
	isLoading?: boolean;
	error?: string;
	className?: string;
	viewMode?: "grid" | "list" | "filmstrip";
	sortBy?: "relevance" | "date" | "name" | "size";
	sortOrder?: "asc" | "desc";
	showThumbnails?: boolean;
	showScores?: boolean;
	showMetadata?: boolean;
	showActions?: boolean;
	compactMode?: boolean;
	columnCount?: number;
	onScroll?: (scrollTop: number, scrollLeft: number) => void;
	onLoadMore?: () => void;
	hasMore?: boolean;
	totalResults?: number;
	searchTerm?: string;
} // Accessible search results component
export const AccessibleSearchResults: React.FC<
	AccessibleSearchResultsProps
> = ({
	results = [],
	onSelect,
	onOpen,
	onFavorite,
	isLoading = false,
	error,
	className = "",
	viewMode = "grid",
	sortBy = "relevance",
	sortOrder = "desc",
	showThumbnails = true,
	showScores = true,
	showMetadata = true,
	showActions = true,
	compactMode = false,
	columnCount = 4,
	onScroll,
	onLoadMore,
	hasMore = false,
	totalResults = 0,
	searchTerm = "",
}) => {
	// State
	const [selectedResults, setSelectedResults] = useState<Set<string>>(
		new Set(),
	);
	const [focusedResultIndex, setFocusedResultIndex] = useState<number>(-1);
	const [isSelectionMode, setIsSelectionMode] = useState(false);
	const [sortByField, setSortByField] = useState(sortBy);
	const [sortOrderField, setSortOrderField] = useState(sortOrder);

	// Refs
	const containerRef = useRef<HTMLDivElement>(null);
	const resultRefs = useRef<Array<HTMLLIElement | null>>([]);

	// Accessibility context
	const { announce, announceError } = useAnnouncer();

	const { trapFocus } = useFocusManager();
	const {
		enableKeyboardNavigation,
		disableKeyboardNavigation,
		isKeyboardNavigationEnabled,
	} = useKeyboardNavigation();

	// Handle result selection
	const handleResultSelect = useCallback(
		(result: SearchResult) => {
			if (isSelectionMode) {
				setSelectedResults((prev) => {
					const newSet = new Set(prev);
					if (newSet.has(result.path)) {
						newSet.delete(result.path);
					} else {
						newSet.add(result.path);
					}
					return newSet;
				});
				announce(
					`Selected ${
						selectedResults.has(result.path) ? "deselected" : "selected"
					} ${result.path}`,
					"polite",
				);
			} else {
				if (onSelect) {
					onSelect(result);
					announce(`Selected ${result.path}`, "polite");
				}
			}
		},
		[isSelectionMode, selectedResults, onSelect, announce],
	);

	// Handle result opening
	const handleResultOpen = useCallback(
		(result: SearchResult) => {
			if (onOpen) {
				onOpen(result);
				announce(`Opening ${result.path}`, "polite");
			}
		},
		[onOpen, announce],
	);

	// Handle result favoriting
	const handleResultFavorite = useCallback(
		(result: SearchResult, favorite: boolean) => {
			if (onFavorite) {
				onFavorite(result, favorite);
				announce(
					`${favorite ? "Added" : "Removed"} ${result.path} ${
						favorite ? "to" : "from"
					} favorites`,
					"polite",
				);
			}
		},
		[onFavorite, announce],
	);

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!isKeyboardNavigationEnabled) return;

			switch (e.key) {
				case "ArrowRight":
					e.preventDefault();
					if (viewMode === "grid") {
						setFocusedResultIndex((prev) =>
							prev < results.length - 1 ? prev + 1 : prev,
						);
						announce(
							`Focused on result ${focusedResultIndex + 2} of ${
								results.length
							}`,
							"polite",
						);
					}
					break;

				case "ArrowLeft":
					e.preventDefault();
					if (viewMode === "grid") {
						setFocusedResultIndex((prev) => (prev > 0 ? prev - 1 : prev));
						announce(
							`Focused on result ${Math.max(0, focusedResultIndex)} of ${
								results.length
							}`,
							"polite",
						);
					}
					break;

				case "ArrowDown":
					e.preventDefault();
					if (viewMode === "grid") {
						setFocusedResultIndex((prev) =>
							prev < results.length - columnCount ? prev + columnCount : prev,
						);
						announce(
							`Focused on result ${focusedResultIndex + columnCount + 1} of ${
								results.length
							}`,
							"polite",
						);
					} else if (viewMode === "list") {
						setFocusedResultIndex((prev) =>
							prev < results.length - 1 ? prev + 1 : prev,
						);
						announce(
							`Focused on result ${focusedResultIndex + 2} of ${
								results.length
							}`,
							"polite",
						);
					}
					break;

				case "ArrowUp":
					e.preventDefault();
					if (viewMode === "grid") {
						setFocusedResultIndex((prev) =>
							prev >= columnCount ? prev - columnCount : prev,
						);
						announce(
							`Focused on result ${Math.max(
								0,
								focusedResultIndex - columnCount + 1,
							)} of ${results.length}`,
							"polite",
						);
					} else if (viewMode === "list") {
						setFocusedResultIndex((prev) => (prev > 0 ? prev - 1 : prev));
						announce(
							`Focused on result ${Math.max(0, focusedResultIndex)} of ${
								results.length
							}`,
							"polite",
						);
					}
					break;

				case "Enter":
					e.preventDefault();
					if (focusedResultIndex >= 0 && focusedResultIndex < results.length) {
						const result = results[focusedResultIndex];
						if (result) {
							handleResultOpen(result);
						}
					}
					break;

				case " ":
					e.preventDefault();
					if (focusedResultIndex >= 0 && focusedResultIndex < results.length) {
						const result = results[focusedResultIndex];
						if (result) {
							handleResultSelect(result);
						}
					}
					break;

				case "Escape":
					if (isSelectionMode) {
						setIsSelectionMode(false);
						setSelectedResults(new Set());
						announce("Selection mode disabled", "polite");
					}
					break;

				case "a":
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						setSelectedResults(new Set(results.map((r) => r.path)));
						setIsSelectionMode(true);
						announce(`Selected all ${results.length} results`, "polite");
					}
					break;

				case "A":
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						setSelectedResults(new Set());
						setIsSelectionMode(false);
						announce("Deselected all results", "polite");
					}
					break;
			}
		},
		[
			isKeyboardNavigationEnabled,
			viewMode,
			results,
			focusedResultIndex,
			columnCount,
			handleResultOpen,
			handleResultSelect,
			announce,
			isSelectionMode,
		],
	);

	// Handle result focus
	const handleResultFocus = useCallback(
		(index: number) => {
			setFocusedResultIndex(index);
			announce(`Focused on result ${index + 1} of ${results.length}`, "polite");
		},
		[results.length, announce],
	);

	// Handle result blur
	const handleResultBlur = useCallback(() => {
		setFocusedResultIndex(-1);
	}, []);

	// Handle scroll for infinite loading
	const handleScroll = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			const target = e.target as HTMLDivElement;
			const { scrollTop, scrollHeight, clientHeight } = target;

			if (onScroll) {
				onScroll(scrollTop, target.scrollLeft);
			}

			// Check if we've scrolled near the bottom for infinite loading
			if (
				hasMore &&
				onLoadMore &&
				scrollHeight - scrollTop - clientHeight < 100
			) {
				onLoadMore();
				announce("Loading more results...", "polite");
			}
		},
		[onScroll, hasMore, onLoadMore, announce],
	);

	// Announce loading state
	useEffect(() => {
		if (isLoading) {
			announce("Loading search results...", "polite");
		} else if (results.length > 0) {
			announce(
				`Loaded ${results.length} search results for "${searchTerm}"`,
				"polite",
			);
		} else if (error) {
			announceError(error, "Search results");
		}
	}, [isLoading, results.length, searchTerm, error, announce, announceError]);

	// Reset focus when results change
	useEffect(() => {
		setFocusedResultIndex(-1);
		setSelectedResults(new Set());
		setIsSelectionMode(false);
	}, []);

	// Trap focus within container when selection mode is active
	useEffect(() => {
		if (isSelectionMode && containerRef.current) {
			const cleanup = trapFocus(containerRef.current);
			return () => {
				if (cleanup) cleanup();
			};
		}
	}, [isSelectionMode, trapFocus]);

	// Enable keyboard navigation on mount
	useEffect(() => {
		enableKeyboardNavigation();
		return () => {
			disableKeyboardNavigation();
		};
	}, [enableKeyboardNavigation, disableKeyboardNavigation]);

	// Render result item
	const renderResultItem = useCallback(
		(result: SearchResult, index: number) => {
			const isSelected = selectedResults.has(result.path);
			const isFocused = focusedResultIndex === index;

			return (
				<li
					ref={(el) => {
						resultRefs.current[index] = el;
					}}
					key={result.path}
					className={`
          relative group rounded-lg border transition-all duration-200 ease-in-out
          ${
						isSelected
							? "ring-2 ring-blue-500 border-blue-500 bg-blue-50"
							: "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
					}
          ${isFocused ? "ring-2 ring-blue-500 ring-offset-2" : ""}
          ${compactMode ? "p-2" : "p-4"}
          ${
						viewMode === "grid"
							? "flex flex-col"
							: viewMode === "list"
								? "flex flex-row items-center"
								: "flex flex-col"
					}
        `}
					aria-label={`${result.path}, relevance score ${result.score.toFixed(
						2,
					)}`}
					tabIndex={isFocused ? 0 : -1}
					onClick={() => handleResultSelect(result)}
					onFocus={() => handleResultFocus(index)}
					onBlur={handleResultBlur}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							handleResultOpen(result);
						} else if (e.key === " ") {
							e.preventDefault();
							handleResultSelect(result);
						}
					}}
				>
					{/* Thumbnail */}
					{showThumbnails && (
						<div
							className={`
              ${
								viewMode === "grid"
									? "mb-2"
									: viewMode === "list"
										? "mr-4 flex-shrink-0"
										: "mb-2"
							}
              ${
								compactMode
									? "w-16 h-16"
									: viewMode === "list"
										? "w-20 h-20"
										: "w-full h-48"
							}
              overflow-hidden rounded-md
            `}
						>
							<img
								src={result.path}
								alt={`Thumbnail for ${result.path}`}
								className="w-full h-full object-cover"
								loading="lazy"
								onError={(e) => {
									const target = e.target as HTMLImageElement;
									target.src =
										"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='12' text-anchor='middle' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";
								}}
								aria-hidden="true"
							/>
						</div>
					)}

					{/* Content */}
					<div
						className={`
          flex-grow
          ${
						viewMode === "grid"
							? "flex flex-col"
							: viewMode === "list"
								? "flex-grow"
								: "flex flex-col"
					}
        `}
					>
						{/* Path */}
						<div
							className={`
            font-medium text-gray-900 truncate
            ${compactMode ? "text-sm" : "text-base"}
          `}
						>
							{result.path.split("/").pop()}
						</div>

						{/* Score */}
						{showScores && (
							<div
								className={`
              text-gray-500
              ${compactMode ? "text-xs" : "text-sm"}
            `}
							>
								Relevance: {(result.score * 100).toFixed(1)}%
							</div>
						)}

						{/* Metadata */}
						{showMetadata && (
							<div
								className={`
              text-gray-400 mt-1
              ${compactMode ? "text-xs" : "text-xs"}
            `}
							>
								{/* Add metadata display here if available */}
								Modified: {new Date(result.path).toLocaleDateString()}
							</div>
						)}
					</div>

					{/* Actions */}
					{showActions && !compactMode && (
						<div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleResultFavorite(
										result,
										!selectedResults.has(result.path),
									);
								}}
								className="p-1 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 shadow-sm"
								aria-label={`Favorite ${result.path}`}
							>
								<svg
									className={`h-4 w-4 ${
										selectedResults.has(result.path)
											? "text-red-500 fill-current"
											: "text-gray-400"
									}`}
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
								>
									<path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
								</svg>
							</button>

							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleResultOpen(result);
								}}
								className="p-1 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 shadow-sm"
								aria-label={`Open ${result.path}`}
							>
								<svg
									className="h-4 w-4 text-gray-400"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
								>
									<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
									<path
										fillRule="evenodd"
										d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
										clipRule="evenodd"
									/>
								</svg>
							</button>
						</div>
					)}
				</li>
			);
		},
		[
			selectedResults,
			focusedResultIndex,
			compactMode,
			viewMode,
			showThumbnails,
			showScores,
			showMetadata,
			showActions,
			handleResultSelect,
			handleResultFocus,
			handleResultBlur,
			handleResultOpen,
			handleResultFavorite,
		],
	);

	// Render loading state
	if (isLoading) {
		return (
			<div
				className={`flex items-center justify-center ${className}`}
				aria-live="polite"
				aria-busy="true"
			>
				<div className="text-center">
					<svg
						className="animate-spin h-12 w-12 text-blue-500 mx-auto"
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
					<p className="mt-4 text-lg font-medium text-gray-900">
						Loading search results...
					</p>
					<p className="mt-2 text-sm text-gray-500">
						Please wait while we search your photo library
					</p>
				</div>
			</div>
		);
	}

	// Render error state
	if (error) {
		return (
			<div
				className={`rounded-lg border border-red-200 bg-red-50 p-6 ${className}`}
				role="alert"
				aria-live="assertive"
			>
				<div className="flex">
					<div className="flex-shrink-0">
						<svg
							className="h-5 w-5 text-red-400"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
					<div className="ml-3">
						<h3 className="text-sm font-medium text-red-800">Search Error</h3>
						<div className="mt-2 text-sm text-red-700">
							<p>{error}</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Render empty state
	if (results.length === 0) {
		return (
			<div className={`text-center py-12 ${className}`} aria-live="polite">
				<svg
					className="mx-auto h-12 w-12 text-gray-400"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<h3 className="mt-2 text-sm font-medium text-gray-900">
					No results found
				</h3>
				<p className="mt-1 text-sm text-gray-500">
					Try adjusting your search terms or filters.
				</p>
			</div>
		);
	}

	// Render results
	return (
		<section
			ref={containerRef}
			className={`accessible-search-results ${className}`}
			aria-label="Search results navigation"
			tabIndex={-1}
			onKeyDown={handleKeyDown}
			onScroll={handleScroll}
		>
			{/* Results count and sorting */}
			<div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
				<div className="text-sm text-gray-700">
					Showing <span className="font-medium">{results.length}</span> of{" "}
					<span className="font-medium">{totalResults || results.length}</span>{" "}
					results
				</div>

				<div className="mt-2 sm:mt-0 flex space-x-2">
					<select
						value={sortByField}
						onChange={(e) =>
							setSortByField(
								e.target.value as "name" | "size" | "relevance" | "date",
							)
						}
						className="block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
						aria-label="Sort by"
					>
						<option value="relevance">Relevance</option>
						<option value="date">Date</option>
						<option value="name">Name</option>
						<option value="size">Size</option>
					</select>

					<select
						value={sortOrderField}
						onChange={(e) =>
							setSortOrderField(e.target.value as "desc" | "asc")
						}
						className="block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
						aria-label="Sort order"
					>
						<option value="desc">Descending</option>
						<option value="asc">Ascending</option>
					</select>
				</div>
			</div>

			{/* Results list */}
			<ul
				aria-label="Search results"
				className={`
          ${
						viewMode === "grid"
							? `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-${columnCount} gap-4`
							: viewMode === "list"
								? "space-y-2"
								: "flex overflow-x-auto space-x-4 pb-4"
					}
        `}
			>
				{results.map((result, index) => renderResultItem(result, index))}
			</ul>

			{/* Load more button for infinite scroll */}
			{hasMore && onLoadMore && (
				<div className="mt-6 text-center">
					<button
						type="button"
						onClick={onLoadMore}
						className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
						aria-label="Load more results"
					>
						<svg
							className="-ml-1 mr-2 h-4 w-4"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						Load More
					</button>
				</div>
			)}

			{/* Selection mode controls */}
			{isSelectionMode && (
				<div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
					<span>{selectedResults.size} selected</span>
					<button
						type="button"
						onClick={() => {
							setIsSelectionMode(false);
							setSelectedResults(new Set());
							announce("Selection mode disabled", "polite");
						}}
						className="px-2 py-1 bg-white text-blue-500 rounded text-sm font-medium"
						aria-label="Cancel selection"
					>
						Cancel
					</button>
				</div>
			)}
		</section>
	);
};

export default AccessibleSearchResults;
