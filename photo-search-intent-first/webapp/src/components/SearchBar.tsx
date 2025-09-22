import type { LucideProps } from "lucide-react";
import { Clock, History, Search as IconSearch, TrendingUp } from "lucide-react";
import type React from "react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { searchHistoryService } from "../services/SearchHistoryService";
import { synonymAlternates } from "../utils/searchSynonyms";
import { SearchHistoryPanel } from "./SearchHistoryPanel";

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

type SuggestionType = "history" | "metadata" | "alternate";

interface SuggestionItem {
	cat: string;
	label: string;
	icon?: React.ComponentType<LucideProps>;
	subtitle?: string;
	type: SuggestionType;
}

// Search history management using SearchHistoryService
const addToSearchHistory = (query: string, resultCount: number = 0) => {
	if (!query?.trim()) return;
	try {
		searchHistoryService.addToHistory({
			query: query.trim(),
			timestamp: Date.now(),
			resultCount,
		});
	} catch (error) {
		console.warn("Failed to save search history:", error);
	}
};

export const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(
	(
		{
			searchText,
			setSearchText,
			onSearch,
			clusters = [],
			allTags = [],
			meta = {},
		},
		_ref,
	) => {
		const [suggestOpen, setSuggestOpen] = useState(false);
		const [activeIdx, setActiveIdx] = useState<number>(-1);
		const [showHistoryPanel, setShowHistoryPanel] = useState(false);
		const searchInputRef = useRef<HTMLInputElement>(null);
		const suggestionRefs = useRef<Array<HTMLButtonElement | null>>([]);
		// Focus management for accessibility
		useEffect(() => {
			// Auto-focus search input when component mounts and no text is present
			if (searchInputRef.current && !searchText) {
				searchInputRef.current.focus();
			}
		}, [searchText]);

		// Debounce search suggestions loading using configurable delay from service
		const debouncedSearchText = useMemo(() => {
			let timer: NodeJS.Timeout;
			const debounceDelay = searchHistoryService.getConfig().DEBOUNCE_DELAY;

			return (_text: string, cb: () => void) => {
				clearTimeout(timer);
				timer = setTimeout(cb, debounceDelay);
				return () => clearTimeout(timer);
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

		useEffect(() => {
			if (suggestOpen) {
				const cleanup = debouncedSearchText(searchText, () => {
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
				return cleanup;
			}
		}, [debouncedSearchText, searchText, suggestOpen]);

		const handleSearch = (text: string) => {
			const trimmedText = text.trim();
			if (trimmedText) {
				addToSearchHistory(trimmedText, 0); // TODO: Pass actual result count when available
			}
			onSearch(text);
			setSuggestOpen(false);
			setActiveIdx(-1);
		};

		const formatRelativeTime = (timestamp: number): string => {
			const now = Date.now();
			const diff = now - timestamp;
			const minutes = Math.floor(diff / (1000 * 60));
			const hours = Math.floor(diff / (1000 * 60 * 60));
			const days = Math.floor(diff / (1000 * 60 * 60 * 24));

			if (minutes < 60) return `${minutes}m ago`;
			if (hours < 24) return `${hours}h ago`;
			return `${days}d ago`;
		};

		const suggestions = useMemo(() => {
			if (!suggestOpen) return [];
			const q = searchText.toLowerCase();
			const items: SuggestionItem[] = [];

			if (historySuggestions.length > 0) {
				historySuggestions.forEach((histSugg) => {
					if (!q || histSugg.query.toLowerCase().includes(q)) {
						items.push({
							cat: histSugg.type === "history" ? "Recent" : "Similar",
							label: histSugg.query,
							icon: histSugg.type === "history" ? Clock : TrendingUp,
							subtitle: histSugg.metadata?.lastUsed
								? `${
										histSugg.metadata.useCount || 1
									} times, ${formatRelativeTime(histSugg.metadata.lastUsed)}`
								: undefined,
							type: "history",
						});
					}
				});
			}

			const ppl = (clusters || [])
				.map((c) => c.name)
				.filter(Boolean) as string[];
			for (const p of ppl) {
				if (!q || p.toLowerCase().includes(q)) {
					items.push({
						cat: "People",
						label: p,
						type: "metadata",
					});
				}
			}

			for (const t of allTags || []) {
				if (!q || t.toLowerCase().includes(q)) {
					items.push({
						cat: "Tag",
						label: t,
						type: "metadata",
					});
				}
			}

			for (const c of meta.cameras || []) {
				if (!q || c.toLowerCase().includes(q)) {
					items.push({
						cat: "Camera",
						label: c,
						type: "metadata",
					});
				}
			}

			for (const pl of meta.places || []) {
				if (!q || String(pl).toLowerCase().includes(q)) {
					items.push({
						cat: "Place",
						label: String(pl),
						type: "metadata",
					});
				}
			}

			const historySuggs = items
				.filter((s) => s.type === "history")
				.slice(0, 8);
			const metaSuggs = items.filter((s) => s.type === "metadata").slice(0, 12);
			const combined = [...historySuggs, ...metaSuggs].slice(0, 20);
			if (combined.length > 0) return combined;

			const alts = synonymAlternates(searchText || "");
			const fallback = ["family dinner", "golden hour", "mountain hike"];
			const altList = Array.from(new Set([...(alts || []), ...fallback])).slice(
				0,
				6,
			);
			return altList.map((label) => ({
				cat: "Suggestion",
				label,
				type: "alternate" as const,
				subtitle: "Press Enter to search",
				icon: undefined,
			}));
		}, [suggestOpen, historySuggestions, clusters, allTags, meta, searchText]);

		useEffect(() => {
			suggestionRefs.current = [];
		}, [suggestions]);

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

		// Inline validation warnings for boolean query syntax
		const warnings: string[] = (() => {
			const issues: string[] = [];
			const q = (searchText || "").trim();
			if (!q) return issues;
			try {
				// Parentheses balance
				let bal = 0;
				for (const ch of q) {
					if (ch === "(") bal++;
					else if (ch === ")") bal--;
					if (bal < 0) {
						issues.push("Unbalanced parentheses");
						break;
					}
				}
				if (bal > 0) issues.push("Unbalanced parentheses");
				// Unknown fields (field: value)
				const allowed = new Set([
					"camera",
					"place",
					"tag",
					"rating",
					"person",
					"has_text",
					"filetype",
					"iso",
					"fnumber",
					"width",
					"height",
					"mtime",
					"brightness",
					"sharpness",
					"exposure",
					"focal",
					"duration",
				]);
				const parts = q.split(/\s+/);
				for (const tok of parts) {
					const i = tok.indexOf(":");
					if (i > 0) {
						const field = tok.slice(0, i).toLowerCase();
						if (!allowed.has(field)) {
							issues.push(`Unknown field: ${field}`);
						}
					}
				}
			} catch {}
			// Deduplicate
			return Array.from(new Set(issues));
		})();

		const applySuggestion = (s: SuggestionItem) => {
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
			setTimeout(() => handleSearch(q2), 0);
		};

		return (
			<div className="search-bar-container" data-tour="search-bar">
				<div className="search-input-wrapper">
					<IconSearch className="search-icon" />
					<input
						type="text"
						placeholder="What are you looking for? Try 'kids at the park' or 'last summer'"
						value={searchText}
						onChange={(e) => {
							setSearchText(e.target.value);
							setSuggestOpen(true);
							setActiveIdx(-1);
						}}
						onKeyDown={(e) => {
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
						onFocus={() => setSuggestOpen(true)}
						onBlur={() => setTimeout(() => setSuggestOpen(false), 120)}
						ref={searchInputRef}
						className="search-input"
						role="combobox"
						aria-expanded={suggestOpen}
						aria-autocomplete="list"
						aria-controls={suggestOpen ? "suggestions-listbox" : undefined}
						aria-activedescendant={
							activeIdx >= 0 ? `sug-${activeIdx}` : undefined
						}
						data-tour="search-bar"
					/>
					<button
						type="button"
						onClick={() => setShowHistoryPanel(true)}
						className="history-button"
						title="View search history"
					>
						<History className="history-icon" />
					</button>
					{warnings.length > 0 && (
						<div
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
						{warnings.slice(0, 2).map((w, _i) => (
							<div key={`item-${String(w)}`}>{w}</div>
						))}
					</div>
				)}
				{suggestOpen && (
					<div
						className="suggestions-dropdown"
						id="suggestions-listbox"
						role="listbox"
						aria-label="Search suggestions"
					>
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
									role="option"
									aria-selected={activeIdx === i}
									tabIndex={-1}
									ref={(el) => {
										suggestionRefs.current[i] = el;
									}}
								>
									<div className="suggestion-content">
										{s.icon && <s.icon className="suggestion-icon" />}
										<div className="suggestion-text">
											<div className="suggestion-main">
												<span className="suggestion-category">{s.cat}</span>
												<span className="suggestion-label">{s.label}</span>
											</div>
											{s.subtitle && (
												<div className="suggestion-subtitle">{s.subtitle}</div>
											)}
										</div>
									</div>
									<span className="suggestion-hint">↵</span>
								</button>
							))
						)}
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
