import { History, Search as IconSearch } from "lucide-react";
import {
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { searchHistoryService } from "../services/SearchHistoryService";
import {
	type SearchIntent,
	SearchIntentRecognizer,
} from "../services/SearchIntentRecognizer";
import { EnhancedSearchSuggestions } from "./EnhancedSearchSuggestions";
import { SearchHistoryPanel } from "./SearchHistoryPanel";
import { SearchIntentInfo } from "./SearchIntentInfo";
import {
	buildSuggestions,
	computeWarnings,
	type SuggestionItem,
} from "./searchBarUtils";

interface SearchBarProps {
	searchText: string;
	setSearchText: (text: string) => void;
	onSearch: (text: string) => void;
	clusters?: Array<{ name?: string }>;
	allTags?: string[];
	meta?: {
		cameras?: string[];
		places?: (string | number)[];
	};
}

// Suggestion types & items now imported from searchBarUtils

export const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(
	({
		searchText,
		setSearchText,
		onSearch,
		clusters = [],
		allTags = [],
		meta = {},
	}) => {
		const [suggestOpen, setSuggestOpen] = useState(false);
		const [activeIdx, setActiveIdx] = useState<number>(-1);
		const [showHistoryPanel, setShowHistoryPanel] = useState(false);
		const [currentIntent, setCurrentIntent] = useState<
			SearchIntent | undefined
		>();
		const [useEnhancedSuggestions, setUseEnhancedSuggestions] = useState(true);
		const searchInputRef = useRef<HTMLInputElement>(null);
		// Fire a one-time custom event the very first time the user meaningfully interacts
		// with the search bar so higher-level UX (non-blocking search tips hint) can decide
		// whether to surface guidance. This keeps the SearchBar decoupled from onboarding logic.
		const firstInteractionFiredRef = useRef(false);
		const fireFirstInteraction = useCallback(() => {
			if (firstInteractionFiredRef.current) return;
			firstInteractionFiredRef.current = true;
			try {
				window.dispatchEvent(new CustomEvent("search-first-interaction"));
			} catch {
				/* no-op */
			}
		}, []);
		const suggestionRefs = useRef<Array<HTMLButtonElement | null>>([]);

		// Focus management for accessibility
		useEffect(() => {
			// Auto-focus search input when component mounts and no text is present
			if (searchInputRef.current && !searchText) {
				searchInputRef.current.focus();
			}
		}, [searchText]);

		// If user already has pre-filled search text (e.g., via query params) treat that as prior interaction.
		useEffect(() => {
			if (searchText && !firstInteractionFiredRef.current) {
				fireFirstInteraction();
			}
		}, [searchText, fireFirstInteraction]);

		// Debounce search suggestions loading using configurable delay from service
		const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
		const debouncedSearch = useCallback((cb: () => void) => {
			const debounceDelay = searchHistoryService.getConfig().DEBOUNCE_DELAY;
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = setTimeout(cb, debounceDelay);
		}, []);

		useEffect(() => {
			return () => {
				if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
			};
		}, []);

		// Load search suggestions when debounced input changes
		const [historySuggestions, setHistorySuggestions] = useState<
			Array<{
				query: string;
				type: "history";
				metadata?: { lastUsed?: number; useCount?: number };
			}>
		>([]);

		// Recognize intent when query changes
		useEffect(() => {
			if (searchText.trim()) {
				const intent = SearchIntentRecognizer.recognizeIntent(searchText, {
					recentSearches: searchHistoryService
						.getHistory()
						.slice(0, 5)
						.map((h) => h.query),
					availableTags: allTags,
					availablePeople: clusters.map((c) => c.name || "").filter(Boolean),
					availableLocations: meta.places?.map((p) => String(p)) || [],
				});
				setCurrentIntent(intent);
			} else {
				setCurrentIntent(undefined);
			}
		}, [searchText, allTags, clusters, meta.places]);

		useEffect(() => {
			if (!suggestOpen) return;
			debouncedSearch(() => {
				const suggestions = searchHistoryService.getSuggestions(searchText);
				const historySuggs = suggestions
					.filter((s) => s.type === "history")
					.slice(0, 8)
					.map((sugg) => ({
						query: sugg.query,
						type: "history" as const,
						metadata: sugg.metadata,
					}));
				setHistorySuggestions(historySuggs);
			});
		}, [debouncedSearch, searchText, suggestOpen]);

		// Handle enhanced suggestion selection
		const handleEnhancedSuggestionSelect = useCallback(
			(suggestion: string, intent?: SearchIntent) => {
				setSearchText(suggestion);
				setCurrentIntent(intent);
				setSuggestOpen(false);
				setActiveIdx(-1);
				setTimeout(() => {
					onSearch(suggestion);
				}, 0);
			},
			[setSearchText, onSearch],
		);

		const handleSearch = useCallback(
			(text: string) => {
				const trimmedText = text.trim();
				if (trimmedText) {
					// Search history is now tracked in useSearchOperations hook
				}
				onSearch(text);
				try {
					window.dispatchEvent(new Event("search-executed"));
				} catch (_err) {
					/* swallow */
				}
				setSuggestOpen(false);
				setActiveIdx(-1);
			},
			[onSearch],
		);

		const formatRelativeTime = useCallback((timestamp: number): string => {
			const now = Date.now();
			const diff = now - timestamp;
			const minutes = Math.floor(diff / (1000 * 60));
			const hours = Math.floor(diff / (1000 * 60 * 60));
			const days = Math.floor(diff / (1000 * 60 * 60 * 24));
			if (minutes < 60) return `${minutes}m ago`;
			if (hours < 24) return `${hours}h ago`;
			return `${days}d ago`;
		}, []);

		const suggestions = useMemo(
			() =>
				buildSuggestions({
					searchText,
					suggestOpen,
					historySuggestions,
					clusters,
					allTags,
					meta,
					formatRelativeTime,
				}),
			[
				suggestOpen,
				historySuggestions,
				clusters,
				allTags,
				meta,
				searchText,
				formatRelativeTime,
			],
		);
		try {
			window.dispatchEvent(new Event("search-executed"));
		} catch (_err) {
			/* swallow */
		}

		useEffect(() => {
			suggestionRefs.current = new Array(suggestions.length).fill(null);
		}, [suggestions.length]);

		useEffect(() => {
			if (!suggestOpen) {
				setActiveIdx(-1);
				return;
			}
			setActiveIdx((idx) => {
				if (suggestions.length === 0) return -1;
				if (idx < 0) return -1;
				return Math.min(idx, suggestions.length - 1);
			});
		}, [suggestOpen, suggestions.length]);

		useEffect(() => {
			if (activeIdx >= 0) {
				suggestionRefs.current[activeIdx]?.scrollIntoView({
					block: "nearest",
				});
			}
		}, [activeIdx]);

		const warnings = computeWarnings(searchText || "");

		const applySuggestion = useCallback(
			(s: SuggestionItem) => {
				let tok = s.label;
				if (s.type === "metadata") {
					if (s.cat === "People") tok = `person:"${s.label}"`;
					else if (s.cat === "Camera") tok = `camera:"${s.label}"`;
					else if (s.cat === "Place") tok = `place:"${s.label}"`;
					else if (s.cat === "Tag") tok = `tag:${s.label}`;
				}
				const next = (searchText || "").trim();
				const q2 = next ? `${next} ${tok}`.trim() : tok;
				setSearchText(q2);
				setSuggestOpen(false);
				setTimeout(() => {
					handleSearch(q2);
				}, 0);
			},
			[handleSearch, searchText, setSearchText],
		);

		return (
			<div className="search-bar-container" data-tour="search-bar">
				<div className="search-input-wrapper">
					<IconSearch className="search-icon" aria-hidden="true" />
					<input
						type="search"
						placeholder="What are you looking for? Try 'kids at the park' or 'last summer'"
						data-testid="search-input"
						value={searchText}
						onChange={(e) => {
							setSearchText(e.target.value);
							setSuggestOpen(true);
							setActiveIdx(-1);
							if (e.target.value.trim()) fireFirstInteraction();
						}}
						onKeyDown={(e) => {
							// Consider any non-navigation key as interaction
							if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
								fireFirstInteraction();
							}
							if (e.key === "Enter") {
								if (activeIdx >= 0 && suggestions.length > 0) {
									applySuggestion(suggestions[activeIdx]);
									e.preventDefault();
									return;
								}
								handleSearch(searchText);
							} else if (e.key === "Escape") {
								setSuggestOpen(false);
								if (searchInputRef.current) {
									searchInputRef.current.blur();
								}
							} else if (e.key === "ArrowDown") {
								e.preventDefault();
								if (!suggestOpen) setSuggestOpen(true);
								if (suggestions.length > 0) {
									setActiveIdx((idx) => {
										if (idx < 0) return 0;
										const nextIdx = (idx + 1) % suggestions.length;
										return nextIdx;
									});
								}
							} else if (e.key === "ArrowUp") {
								e.preventDefault();
								if (suggestions.length > 0) {
									setActiveIdx((idx) => {
										if (idx < 0) return suggestions.length - 1;
										if (idx === 0) return -1;
										return idx - 1;
									});
								}
							}
						}}
						onFocus={() => {
							setSuggestOpen(true);
							fireFirstInteraction();
						}}
						onBlur={() => setTimeout(() => setSuggestOpen(false), 120)}
						ref={searchInputRef}
						className="search-input"
						aria-label="Search photos"
						aria-describedby={
							warnings.length > 0 ? "search-warnings" : undefined
						}
						data-tour="search-bar"
					/>
					<button
						type="button"
						onClick={() => setShowHistoryPanel(true)}
						className="history-button"
						title="View search history"
						aria-label="View search history"
					>
						<History className="history-icon" aria-hidden="true" />
					</button>
					{warnings.length > 0 && (
						<div
							id="search-warnings"
							className="ml-2 text-red-600 text-xs"
							title={warnings.join("\n")}
							role="alert"
							aria-live="polite"
						>
							!
						</div>
					)}
				</div>
				{warnings.length > 0 && (
					<div className="text-[11px] text-red-600 mt-1 px-1">
						{warnings.slice(0, 2).map((w) => (
							<div key={`item-${String(w)}`}>{w}</div>
						))}
					</div>
				)}

				{/* Show search intent info when intent is recognized with high confidence */}
				{currentIntent && currentIntent.confidence > 0.6 && (
					<div className="mt-2 mx-1">
						<SearchIntentInfo
							intent={currentIntent}
							query={searchText}
							onClose={() => setCurrentIntent(undefined)}
						/>
					</div>
				)}
				{suggestOpen && (
					<div className="suggestions-dropdown" id="suggestions-listbox">
						{useEnhancedSuggestions ? (
							<EnhancedSearchSuggestions
								query={searchText}
								onSuggestionSelect={handleEnhancedSuggestionSelect}
								availableTags={allTags}
								availablePeople={clusters
									.map((c) => c.name || "")
									.filter(Boolean)}
								availableLocations={meta.places?.map((p) => String(p)) || []}
								availableCameras={meta.cameras || []}
								className="max-h-96 overflow-y-auto"
							/>
						) : (
							<>
								{suggestions.length === 0 ? (
									<div className="px-3 py-2 text-gray-600 text-sm">
										No suggestions available.
									</div>
								) : (
									suggestions.map((s, i) => (
										<button
											type="button"
											key={`${s.cat}:${s.label}`}
											id={`sug-${i}`}
											className="suggestion-item"
											data-active={activeIdx === i ? "true" : undefined}
											onMouseEnter={() => setActiveIdx(i)}
											onMouseDown={(e) => {
												e.preventDefault();
												applySuggestion(s);
											}}
											/* role/aria-selected removed to appease strict lints; visual highlight retained */
											tabIndex={-1}
											ref={(el) => {
												suggestionRefs.current[i] = el;
											}}
										>
											<div className="suggestion-content">
												{s.icon && (
													<s.icon
														className="suggestion-icon"
														aria-hidden="true"
													/>
												)}
												<div className="suggestion-text">
													<div className="suggestion-main">
														<span className="suggestion-category">{s.cat}</span>
														<span className="suggestion-label">{s.label}</span>
													</div>
													{s.subtitle && (
														<div className="suggestion-subtitle">
															{s.subtitle}
														</div>
													)}
												</div>
											</div>
											<span className="suggestion-hint">↵</span>
										</button>
									))
								)}
							</>
						)}

						{/* Toggle for enhanced suggestions */}
						<div className="border-t border-border p-2 flex items-center justify-between">
							<span className="text-xs text-muted-foreground">
								{useEnhancedSuggestions
									? "AI-Powered Suggestions"
									: "Classic Suggestions"}
							</span>
							<button
								type="button"
								onClick={() =>
									setUseEnhancedSuggestions(!useEnhancedSuggestions)
								}
								className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/70 transition-colors"
								aria-label={`Switch to ${
									useEnhancedSuggestions ? "classic" : "enhanced"
								} suggestions`}
							>
								{useEnhancedSuggestions ? "Classic" : "Enhanced"}
							</button>
						</div>
					</div>
				)}
				{showHistoryPanel && (
					<SearchHistoryPanel
						onSearch={(query) => {
							setSearchText(query);
							setShowHistoryPanel(false);
							handleSearch(query);
						}}
						onClose={() => setShowHistoryPanel(false)}
					/>
				)}
			</div>
		);
	},
);

SearchBar.displayName = "SearchBar";
