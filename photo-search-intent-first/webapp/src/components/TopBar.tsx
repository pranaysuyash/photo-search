import { motion } from "framer-motion";
import {
	BookmarkPlus,
	Download,
	Filter,
	FolderOpen,
	Grid as IconGrid,
	List as IconList,
	Search as IconSearch,
	Tag as IconTag,
	Info,
	Menu,
	MoreHorizontal,
	Palette,
	Settings,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { SearchResult } from "../api";
import { apiDelete, apiSearchLike, apiUndoDelete } from "../api";
import { FOLDER_MODAL_EVENT } from "../constants/events";
import type { IndexStatusDetails } from "../contexts/LibraryContext";
import { useModalContext } from "../contexts/ModalContext";
import { useResultsConfig } from "../contexts/ResultsConfigContext";
import { useSearchContext } from "../contexts/SearchContext";
import { useUIContext } from "../contexts/UIContext";
import { useSearchCommandCenter } from "../stores/settingsStore";
import type { PhotoActions, UIActions } from "../stores/types";
import { humanizeSeconds } from "../utils/time";
import { SearchBar } from "./SearchBar";

export type GridSize = "small" | "medium" | "large";
export type ViewType =
	| "results"
	| "library"
	| "map"
	| "people"
	| "tasks"
	| "trips";

export interface TopBarProps {
	// Search and filter state
	searchText?: string;
	setSearchText?: (text: string) => void;
	onSearch?: (text: string) => void;
	clusters: Array<{ name?: string }>;
	allTags: string[];
	meta: {
		cameras?: string[];
		places?: (string | number)[];
	};

	// UI state
	busy: boolean;
	gridSize: GridSize;
	setGridSize: (size: GridSize) => void;
	selectedView: ViewType;
	setSelectedView: (view: ViewType) => void;
	currentFilter: string;
	setCurrentFilter: (filter: string) => void;
	ratingMin: number;
	setRatingMin: (rating: number) => void;

	// Modal and menu controls
	setIsMobileMenuOpen: (open: boolean) => void;
	setShowFilters: (show: boolean | ((prev: boolean) => boolean)) => void;

	// Selection state
	selected: Set<string>;
	setSelected: (selected: Set<string>) => void;

	// Settings and API
	dir: string;
	engine: string;
	topK: number;
	useOsTrash: boolean;
	showInfoOverlay: boolean;
	onToggleInfoOverlay: () => void;
	// Results view mode provided via ResultsConfig context
	// Index progress
	diag?: {
		engines?: Array<{ key: string; index_dir: string; count: number }>;
	} | null;
	indexedCount?: number;
	indexedTotal?: number;
	coveragePct?: number;
	indexStatus?: IndexStatusDetails;
	isIndexing?: boolean;
	onIndex?: () => void;
	// Jobs integration
	activeJobs?: number;
	onOpenJobs?: () => void;
	// Progress (analytics/status‑driven)
	progressPct?: number; // 0–1
	etaSeconds?: number; // seconds remaining (optional)
	paused?: boolean;
	onPause?: () => void;
	onResume?: () => void;
	tooltip?: string;
	ocrReady?: boolean;

	// Actions
	photoActions: Pick<PhotoActions, "setFavOnly" | "setResults">;
	uiActions: Pick<UIActions, "setBusy" | "setNote">;

	// Toast system
	toastTimerRef: React.MutableRefObject<number | null>;
	setToast: (
		toast: {
			message: string;
			actionLabel?: string;
			onAction?: () => void;
		} | null,
	) => void;

	// Theme modal
	onOpenThemeModal?: () => void;
	onOpenDiagnostics?: () => void;
	// Search overlay (feature-flagged)
	onOpenSearchOverlay?: () => void;
}

export function TopBar({
	searchText,
	setSearchText,
	onSearch,
	clusters,
	allTags,
	meta,
	busy,
	gridSize,
	setGridSize,
	selectedView,
	setSelectedView,
	currentFilter,
	setCurrentFilter,
	ratingMin,
	setRatingMin,
	setIsMobileMenuOpen,
	setShowFilters,
	selected,
	setSelected,
	dir,
	engine,
	topK,
	useOsTrash,
	showInfoOverlay,
	onToggleInfoOverlay,
	diag,
	indexedCount,
	indexedTotal,
	coveragePct,
	indexStatus,
	isIndexing,
	onIndex,
	activeJobs,
	onOpenJobs,
	progressPct,
	etaSeconds,
	paused,
	onPause,
	onResume,
	tooltip,
	ocrReady,
	photoActions,
	uiActions,
	toastTimerRef,
	setToast,
	onOpenThemeModal,
	onOpenSearchOverlay,
}: TopBarProps) {
	const { resultView, setResultView, timelineBucket, setTimelineBucket } =
		useResultsConfig();
	const { state: uiState } = useUIContext();
	const searchCommandCenter = useSearchCommandCenter();
	const searchCtx = useSearchContext();
	const [showMore, setShowMore] = useState(false);
	const { actions: modal } = useModalContext();
	const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
	const rawIndexedCount =
		typeof indexedCount === "number" ? indexedCount : diag?.engines?.[0]?.count;
	const totalForDisplay =
		typeof indexedTotal === "number" ? indexedTotal : indexStatus?.target;
	const formattedIndexedCount =
		typeof rawIndexedCount === "number"
			? numberFormatter.format(rawIndexedCount)
			: undefined;
	const formattedTotal =
		typeof totalForDisplay === "number"
			? numberFormatter.format(totalForDisplay)
			: undefined;
	const computedCoverage = (() => {
		if (typeof coveragePct === "number" && Number.isFinite(coveragePct)) {
			return Math.min(1, Math.max(0, coveragePct));
		}
		if (typeof indexStatus?.coverage === "number") {
			return indexStatus.coverage;
		}
		if (
			typeof rawIndexedCount === "number" &&
			typeof totalForDisplay === "number" &&
			totalForDisplay > 0
		) {
			return Math.min(1, Math.max(0, rawIndexedCount / totalForDisplay));
		}
		return undefined;
	})();
	const coverageText =
		computedCoverage !== undefined
			? `${Math.round(computedCoverage * 100)}%`
			: undefined;
	const effectiveEtaSeconds =
		indexStatus?.etaSeconds && Number.isFinite(indexStatus.etaSeconds)
			? indexStatus.etaSeconds
			: typeof etaSeconds === "number" && etaSeconds > 0
				? etaSeconds
				: undefined;
	const ratePerSecond =
		indexStatus?.ratePerSecond && Number.isFinite(indexStatus.ratePerSecond)
			? indexStatus.ratePerSecond
			: undefined;
	const etaInline =
		effectiveEtaSeconds && effectiveEtaSeconds > 0
			? `ETA ~${humanizeSeconds(Math.round(effectiveEtaSeconds))}`
			: undefined;
	const rateInline =
		ratePerSecond && ratePerSecond > 0
			? `Rate ${
					ratePerSecond * 60 >= 10
						? (ratePerSecond * 60).toFixed(0)
						: (ratePerSecond * 60).toFixed(1)
				} items/min`
			: undefined;
	const lastIndexedText = indexStatus?.lastIndexedAt
		? new Date(indexStatus.lastIndexedAt).toLocaleString()
		: undefined;
	const hoverLines = useMemo(() => {
		const lines: string[] = [];
		if (indexStatus?.processed && indexStatus.processed.total > 0) {
			const processedPctRaw = Math.round(
				(indexStatus.processed.done / indexStatus.processed.total) * 100,
			);
			const baseProcessed = `Processed: ${numberFormatter.format(
				indexStatus.processed.done,
			)}/${numberFormatter.format(indexStatus.processed.total)}`;
			lines.push(
				Number.isFinite(processedPctRaw)
					? `${baseProcessed} (${Math.max(0, Math.min(100, processedPctRaw))}%)`
					: baseProcessed,
			);
		}
		const targetForHover =
			indexStatus?.target !== undefined ? indexStatus.target : totalForDisplay;
		const indexedForHover =
			indexStatus?.indexed !== undefined
				? indexStatus.indexed
				: rawIndexedCount;
		if (
			typeof indexedForHover === "number" &&
			typeof targetForHover === "number"
		) {
			const coverageLabel = coverageText ? ` (${coverageText})` : "";
			lines.push(
				`Indexed: ${numberFormatter.format(
					indexedForHover,
				)}/${numberFormatter.format(targetForHover)}${coverageLabel}`,
			);
		}
		if (typeof indexStatus?.drift === "number" && indexStatus.drift !== 0) {
			const driftAbs = Math.abs(indexStatus.drift);
			const driftLabel = indexStatus.drift > 0 ? "Remaining" : "Over";
			lines.push(`${driftLabel}: ${numberFormatter.format(driftAbs)}`);
		}
		if (effectiveEtaSeconds) {
			lines.push(`ETA: ${humanizeSeconds(Math.round(effectiveEtaSeconds))}`);
		}
		if (ratePerSecond && ratePerSecond > 0) {
			const perMinute = ratePerSecond * 60;
			const rateText =
				perMinute >= 10 ? perMinute.toFixed(0) : perMinute.toFixed(1);
			lines.push(`Rate: ${rateText} items/min`);
		}
		if (lastIndexedText) {
			lines.push(`Last index: ${lastIndexedText}`);
		}
		return lines;
	}, [
		indexStatus,
		numberFormatter,
		totalForDisplay,
		rawIndexedCount,
		coverageText,
		effectiveEtaSeconds,
		ratePerSecond,
		lastIndexedText,
	]);
	const tooltipFallback = tooltip ? tooltip.split(" • ") : [];
	const tooltipLines = hoverLines.length > 0 ? hoverLines : tooltipFallback;
	const showIndexChip =
		typeof rawIndexedCount === "number" && !Number.isNaN(rawIndexedCount);
	const q = (searchText ?? searchCtx.state.query) || "";
	const setQ = (t: string) =>
		setSearchText ? setSearchText(t) : searchCtx.actions.setQuery(t);
	const doSearch = async (t: string) => {
		if (onSearch) onSearch(t);
		else await searchCtx.actions.performSearch(t);
	};

	const handleOpenFolderModal = () => {
		modal.open("folder");
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent(FOLDER_MODAL_EVENT));
		}
	};

	return (
		<div className="top-bar bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
			{/* Busy progress bar */}
			{busy && (
				<div className="progress-bar">
					<div className="progress-bar-fill"></div>
				</div>
			)}
			<div className="top-bar-content">
				<div className="top-bar-left">
					<motion.button
						type="button"
						className="mobile-menu-button p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
						onClick={() => setIsMobileMenuOpen(true)}
						aria-label="Open menu"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
					</motion.button>
					{searchCommandCenter ? (
						<motion.button
							type="button"
							className="ml-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
							onClick={() => onOpenSearchOverlay?.()}
							aria-label="Open search"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
						>
							<IconSearch className="w-4 h-4 text-gray-600 dark:text-gray-400" />
							<span className="text-sm text-gray-700 dark:text-gray-300">
								Search
							</span>
						</motion.button>
					) : (
						<SearchBar
							searchText={q}
							setSearchText={setQ}
							onSearch={doSearch}
							clusters={clusters}
							allTags={allTags}
							meta={meta}
						/>
					)}
					{/* Quick filter chips (hidden when Search Command Center is enabled) */}
					{!searchCommandCenter && (
						<div className="quick-filters hidden md:flex items-center gap-2 ml-2">
							{(meta?.cameras || []).slice(0, 3).map((cam) => (
								<button
									key={`cam-${cam}`}
									type="button"
									className="chip"
									onClick={() => {
										const tok = `camera:"${cam}"`;
										const next = q.trim();
										const qq = next ? `${next} ${tok}` : tok;
										setQ(qq);
										doSearch(qq);
									}}
									title={`Filter camera: ${cam}`}
									aria-label={`Filter results by camera ${String(cam)}`}
								>
									{String(cam)}
								</button>
							))}
							{(allTags || []).slice(0, 6).map((tg) => (
								<button
									key={`tag-${tg}`}
									type="button"
									className="chip"
									onClick={() => {
										const tok = `tag:${tg}`;
										const next = q.trim();
										const qq = next ? `${next} ${tok}` : tok;
										setQ(qq);
										doSearch(qq);
									}}
									title={`Filter tag: ${tg}`}
									aria-label={`Filter results by tag ${String(tg)}`}
								>
									{String(tg)}
								</button>
							))}
							{(clusters || [])
								.filter((c) => c.name)
								.slice(0, 6)
								.map((c) => (
									<button
										key={`person-${c.name}`}
										type="button"
										className="chip"
										onClick={() => {
											const name = String(c.name);
											const tok = `person:"${name}"`;
											const next = q.trim();
											const qq = next ? `${next} ${tok}` : tok;
											setQ(qq);
											doSearch(qq);
										}}
										title={`Filter person: ${String(c.name)}`}
									>
										{String(c.name)}
									</button>
								))}
							<button
								type="button"
								className="chip"
								onClick={() => {
									const tok = `has_text:true`;
									const next = q.trim();
									const qq = next ? `${next} ${tok}` : tok;
									setQ(qq);
									doSearch(qq);
								}}
								title="Filter photos that contain text"
							>
								Text
							</button>
							<button
								type="button"
								className="chip"
								onClick={() => {
									const tok = `(filetype:mp4 OR filetype:mov OR filetype:webm OR filetype:mkv OR filetype:avi) AND duration:>30`;
									const next = q.trim();
									const qq = next ? `${next} ${tok}` : tok;
									setQ(qq);
									doSearch(qq);
								}}
								title="Find videos longer than 30 seconds"
							>
								Videos &gt; 30s
							</button>
						</div>
					)}

					<motion.button
						type="button"
						className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
						onClick={() => setShowFilters((v) => !v)}
						aria-label="Show filters"
						data-tour="filters-toggle"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
						<span className="text-sm text-gray-700 dark:text-gray-300">
							Filters
						</span>
					</motion.button>

					{/* Quick action: Select library (for onboarding) */}
					<motion.button
						type="button"
						className="ml-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
						onClick={handleOpenFolderModal}
						aria-label="Select photo folder"
						data-tour="select-library"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<FolderOpen className="w-4 h-4 text-gray-600 dark:text-gray-400" />
						<span className="text-sm text-gray-700 dark:text-gray-300">
							Add Photos
						</span>
					</motion.button>
					{/* Optional clear filters chip (hidden when Search Command Center is enabled) */}
					{!searchCommandCenter &&
						/(camera:|tag:|person:|has_text:|iso:|fnumber:|width:|height:|place:)/i.test(
							q || "",
						) && (
							<button
								type="button"
								className="chip"
								onClick={() => {
									// Clear baked-in tokens from the search text only; advanced panel handles full resets
									const cleaned = (q || "")
										.replace(
											/\b(camera|tag|person|has_text|iso|fnumber|width|height|place):[^\s]+/gi,
											"",
										)
										.replace(/\s{2,}/g, " ")
										.trim();
									setQ(cleaned);
									doSearch(cleaned);
								}}
								title="Clear filter tokens from query"
								aria-label="Clear filter tokens"
							>
								Clear filters
							</button>
						)}
					<motion.button
						type="button"
						className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
						onClick={() => modal.open("save")}
						title="Save this search for later"
						aria-label="Save current search"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<BookmarkPlus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
						<span className="text-sm text-gray-700 dark:text-gray-300">
							Remember
						</span>
					</motion.button>
				</div>

				<div className="top-bar-right">
					{/* Indexed/progress chip */}
					{showIndexChip && (
						<div className="indexed-chip relative flex flex-wrap items-center gap-3 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
							<div className="flex flex-col gap-1 leading-tight">
								<span className="indexed-label">Indexed</span>
								<div className="flex items-baseline gap-1">
									<span className="indexed-count">
										{formattedIndexedCount ?? "0"}
									</span>
									{formattedTotal && (
										<span className="indexed-total">/ {formattedTotal}</span>
									)}
								</div>
								{coverageText && (
									<span className="indexed-coverage">
										{coverageText} coverage
									</span>
								)}
								{isIndexing && (etaInline || rateInline) && (
									<span className="indexed-meta">
										{[etaInline, rateInline].filter(Boolean).join(" • ")}
									</span>
								)}
								{!isIndexing && lastIndexedText && (
									<span className="indexed-meta">
										Last index {lastIndexedText}
									</span>
								)}
								{searchCommandCenter &&
									typeof activeJobs === "number" &&
									activeJobs > 0 && (
										<span className="indexed-meta">Jobs {activeJobs}</span>
									)}
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									className="indexed-action px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-full transition-colors hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
									onClick={() => onIndex?.()}
									disabled={!!isIndexing}
									aria-label={
										isIndexing
											? "Indexing photos (running)"
											: rawIndexedCount && rawIndexedCount > 0
												? "Reindex your library"
												: "Start indexing your library"
									}
									title={
										isIndexing
											? "Indexing runs in the background. You can keep working."
											: rawIndexedCount && rawIndexedCount > 0
												? "Reindex photos"
												: "Start indexing"
									}
								>
									{isIndexing
										? "Indexing…"
										: rawIndexedCount && rawIndexedCount > 0
											? "Reindex"
											: "Index"}
								</button>
								{isIndexing && (
									<button
										type="button"
										className="chip"
										onClick={() => (paused ? onResume?.() : onPause?.())}
										aria-label={paused ? "Resume indexing" : "Pause indexing"}
										title={paused ? "Resume indexing" : "Pause indexing"}
									>
										{paused ? "Resume" : "Pause"}
									</button>
								)}
							</div>
							{isIndexing && (
								<div className="basis-full">
									<div className="indexed-progress" aria-hidden>
										<div
											className="indexed-progress-bar"
											style={
												typeof progressPct === "number" &&
												progressPct >= 0 &&
												progressPct <= 1
													? {
															width: `${Math.max(
																4,
																Math.round(progressPct * 100),
															)}%`,
														}
													: undefined
											}
										/>
									</div>
								</div>
							)}
							{tooltipLines.length > 0 && (
								<div className="tooltip-card" role="tooltip" aria-hidden>
									{tooltipLines.map((line, idx) => (
										<div key={`index-tip-${idx}`} className="tooltip-line">
											{line}
										</div>
									))}
								</div>
							)}
						</div>
					)}
					{/* OCR ready indicator */}
					{ocrReady && (
						<span className="chip" title="OCR ready: search text inside images">
							OCR
						</span>
					)}
					{/* Jobs quick link (hidden when Search Command Center is enabled) */}
					{!searchCommandCenter &&
						typeof activeJobs === "number" &&
						activeJobs > 0 && (
							<button
								type="button"
								className="chip"
								onClick={() => onOpenJobs?.()}
								title="View running tasks"
								aria-label={`Open Jobs (${activeJobs})`}
							>
								Jobs ({activeJobs})
							</button>
						)}
					<div className="grid-size-control">
						{(["small", "medium", "large"] as GridSize[]).map((s) => (
							<button
								type="button"
								key={s}
								onClick={() => setGridSize(s)}
								className={`grid-size-button ${gridSize === s ? "active" : ""}`}
								aria-label={`Set grid size to ${s}`}
							>
								{s.charAt(0).toUpperCase() + s.slice(1)}
							</button>
						))}
					</div>

					<div className="view-mode-control">
						<button
							type="button"
							onClick={() => setSelectedView("results")}
							className={`view-mode-button ${
								selectedView === "results" ? "active" : ""
							}`}
							aria-label="Grid view"
						>
							<IconGrid className="w-4 h-4" />
						</button>
						<button
							type="button"
							onClick={() => setSelectedView("library")}
							className={`view-mode-button ${
								selectedView === "library" ? "active" : ""
							}`}
							aria-label="List view"
						>
							<IconList className="w-4 h-4" />
						</button>
					</div>

					<motion.button
						type="button"
						className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
						title="Settings & Indexing"
						onClick={() => modal.open("folder")}
						aria-label="Open settings and indexing options"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
					</motion.button>
					{/* Progressive disclosure: More menu toggles secondary actions */}
					<motion.button
						type="button"
						className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
						title="More actions"
						aria-label="More actions"
						aria-haspopup="true"
						aria-expanded={showMore}
						onClick={() => setShowMore((v) => !v)}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
						<span className="text-sm">More</span>
					</motion.button>
					{showMore && (
						<div className="absolute right-2 mt-12 z-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 w-56">
							<button
								type="button"
								className="menu-item"
								onClick={() => onOpenThemeModal?.()}
							>
								<Palette className="w-4 h-4 mr-2" /> Theme
							</button>
							<button
								type="button"
								className="menu-item"
								onClick={() => modal.open("advanced")}
							>
								<IconSearch className="w-4 h-4 mr-2" /> Advanced Search
							</button>
							<button
								type="button"
								className="menu-item"
								onClick={() => modal.open("tag")}
							>
								<IconTag className="w-4 h-4 mr-2" /> Tag Selected
							</button>
							<button
								type="button"
								className="menu-item"
								onClick={() => modal.open("export")}
							>
								<Download className="w-4 h-4 mr-2" /> Export
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Primary time-scope chips (hidden when Search Command Center is enabled) */}
			{!searchCommandCenter && (
				<div className="filter-chips">
					{[
						"All",
						"Today",
						"This Week",
						"This Month",
						"Favorites",
						"People",
						"Screenshots",
					].map((f) => (
						<button
							type="button"
							key={f}
							onClick={() => {
								setCurrentFilter(f.toLowerCase());
								if (f === "Favorites") {
									photoActions.setFavOnly(true);
									doSearch(q);
								}
							}}
							className={`chip ${
								currentFilter === f.toLowerCase() ? "active" : ""
							}`}
							aria-label={`Filter by ${f}`}
						>
							{f}
						</button>
					))}
				</div>
			)}

			{/* Rating filter */}
			{/* Rating filter (hidden when Search Command Center is enabled) */}
			{!searchCommandCenter && (
				<div className="rating-filter">
					<span>Min rating:</span>
					{[0, 1, 2, 3, 4, 5].map((n) => (
						<button
							key={n}
							type="button"
							className={`rating-button ${ratingMin === n ? "active" : ""}`}
							onClick={() => setRatingMin(n)}
							aria-label={`Filter by minimum rating of ${n}`}
						>
							{n === 0 ? "Any" : `${"★".repeat(n)}`}
						</button>
					))}
				</div>
			)}

			{/* View mode toggle */}
			{/* View mode toggle remains visible */}
			<div className="view-toggle">
				<span>View:</span>
				<button
					type="button"
					className={`view-button ${resultView === "grid" ? "active" : ""}`}
					onClick={() => setResultView("grid")}
					aria-pressed={resultView === "grid"}
				>
					Grid
				</button>
				<button
					type="button"
					className={`view-button ${resultView === "timeline" ? "active" : ""}`}
					onClick={() => setResultView("timeline")}
					aria-pressed={resultView === "timeline"}
				>
					Timeline
				</button>
			</div>
			{/* Boolean query hints */}
			{/* Boolean query hints (hidden when Search Command Center is enabled) */}
			{!searchCommandCenter && (
				<div className="text-[11px] text-gray-600 mt-1">
					Boolean: AND, OR, NOT, ( ) • Fields:{" "}
					<span className="font-mono">camera:</span>{" "}
					<span className="font-mono">place:</span>{" "}
					<span className="font-mono">tag:</span>{" "}
					<span className="font-mono">rating:</span>{" "}
					<span className="font-mono">person:</span>{" "}
					<span className="font-mono">has_text:</span>{" "}
					<span className="font-mono">filetype:</span> • Numeric:{" "}
					<span className="font-mono">iso:</span>{" "}
					<span className="font-mono">fnumber:</span>{" "}
					<span className="font-mono">width:</span>{" "}
					<span className="font-mono">height:</span>{" "}
					<span className="font-mono">mtime:</span>{" "}
					<span className="font-mono">brightness:</span>{" "}
					<span className="font-mono">sharpness:</span>{" "}
					<span className="font-mono">exposure:</span>{" "}
					<span className="font-mono">focal:</span>{" "}
					<span className="font-mono">duration:</span> (supports &gt;=, &lt;=,
					&gt;, &lt;, =)
				</div>
			)}

			{/* Preset boolean filter chips */}
			{/* Preset boolean filter chips (hidden when Search Command Center is enabled) */}
			{!searchCommandCenter && (
				<div className="preset-filters hidden md:flex flex-wrap gap-2 mt-1">
					{[
						{ label: "High ISO", expr: "iso:>=1600" },
						{ label: "Shallow DoF", expr: "fnumber:<2.8" },
						{ label: "Text in Image", expr: "has_text:true" },
						{ label: "Large", expr: "width:>=3000 height:>=2000" },
						{
							label: "Recent (30d)",
							expr: `mtime:>=${Math.floor(Date.now() / 1000 - 30 * 24 * 3600)}`,
						},
						{ label: "Underexposed", expr: "brightness:<50" },
						{ label: "Sharp Only", expr: "sharpness:>=60" },
						{
							label: "Video > 30s",
							expr: "filetype:mp4 OR filetype:mov OR filetype:webm OR filetype:mkv OR filetype:avi AND duration:>30",
						},
					].map((p) => (
						<button
							key={p.label}
							type="button"
							className="chip"
							onClick={() => {
								const tok = p.expr;
								const next = q.trim();
								const qq = next ? `${next} ${tok}` : tok;
								setQ(qq);
								doSearch(qq);
							}}
							title={p.expr}
						>
							{p.label}
						</button>
					))}
				</div>
			)}
			{resultView === "timeline" && (
				<div className="view-toggle">
					<span>Bucket:</span>
					{(["day", "week", "month"] as const).map((b) => (
						<button
							key={b}
							type="button"
							className={`view-button ${timelineBucket === b ? "active" : ""}`}
							onClick={() => setTimelineBucket(b)}
							aria-pressed={timelineBucket === b}
						>
							{b[0].toUpperCase() + b.slice(1)}
						</button>
					))}
				</div>
			)}

			{selected.size > 0 && (
				<div className="selected-actions">
					<span className="selected-count">
						{selected.size} photo{selected.size !== 1 ? "s" : ""} selected
					</span>
					<div className="action-buttons">
						<button
							type="button"
							className="action-button"
							onClick={() => modal.open("export")}
							aria-label="Export selected photos"
						>
							<Download className="w-4 h-4" />
							Export
						</button>
						<button
							type="button"
							className="action-button"
							onClick={() => modal.open("enhanced-share")}
							aria-label="Share selected photos"
						>
							<IconSearch className="w-4 h-4" />
							Share
						</button>
						{/* Feature-flagged: Sharing v1 (stubbed UI) */}
						{(import.meta.env?.VITE_FF_SHARING_V1 as string) === "1" && (
							<button
								type="button"
								className="action-button"
								onClick={() => modal.open("share")}
								aria-label="Share selected photos"
							>
								<IconSearch className="w-4 h-4" /> Share
							</button>
						)}
						{(import.meta.env?.VITE_FF_SHARING_V1 as string) === "1" && (
							<button
								type="button"
								className="action-button"
								onClick={() => modal.open("shareManage")}
								aria-label="Manage shared links"
							>
								Manage Shares
							</button>
						)}
						<button
							type="button"
							className={`action-button ${showInfoOverlay ? "active" : ""}`}
							onClick={onToggleInfoOverlay}
							aria-pressed={showInfoOverlay}
							aria-label="Toggle info overlay on grid items"
						>
							<Info className="w-4 h-4" /> Info
						</button>
						<button
							type="button"
							className="action-button"
							onClick={() => modal.open("advanced")}
							aria-label="Open advanced search"
							data-tour="advanced-button"
						>
							Advanced
						</button>
						<button
							type="button"
							className="action-button"
							onClick={() => modal.open("tag")}
							aria-label="Tag selected photos"
						>
							<IconTag className="w-4 h-4" />
							Tag
						</button>
						{selected.size === 1 && (
							<button
								type="button"
								className="action-button"
								onClick={async () => {
									const p = Array.from(selected)[0];
									uiActions.setBusy("Searching similar…");
									try {
										const r = await apiSearchLike(dir, p, engine, topK);
										photoActions.setResults(r.results || []);
										setSelectedView("results");
									} catch (e) {
										uiActions.setNote(
											e instanceof Error ? e.message : "Search failed",
										);
									} finally {
										uiActions.setBusy("");
									}
								}}
								aria-label="Find similar photos to the selected photo"
							>
								<IconSearch className="w-4 h-4" /> Similar
							</button>
						)}
						{selected.size === 1 && (
							<button
								type="button"
								className="action-button"
								onClick={() => modal.open("likeplus")}
								aria-label="Find similar photos with additional text query"
							>
								<IconSearch className="w-4 h-4" /> Similar + Text
							</button>
						)}
						<button
							type="button"
							className="action-button"
							onClick={() => modal.open("collect")}
							aria-label="Add selected photos to a collection"
						>
							<FolderOpen className="w-4 h-4" /> Add to Collection
						</button>
						<button
							type="button"
							className="action-button"
							onClick={() => modal.open("removeCollect")}
							aria-label="Remove selected photos from a collection"
						>
							<FolderOpen className="w-4 h-4 rotate-180" /> Remove from
							Collection
						</button>
						<button
							type="button"
							className="action-button danger"
							onClick={async () => {
								if (selected.size === 0) return;
								if (!confirm(`Move ${selected.size} item(s) to Trash?`)) return;
								try {
									uiActions.setBusy("Deleting…");
									const r = await apiDelete(
										dir,
										Array.from(selected),
										useOsTrash,
									);
									uiActions.setNote(
										`Moved ${r.moved} to ${useOsTrash ? "OS Trash" : "Trash"}`,
									);
									setSelected(new Set());
									// Show Undo toast only when undoable (app trash)
									if (!useOsTrash) {
										if (toastTimerRef.current)
											window.clearTimeout(toastTimerRef.current);
										setToast({
											message: `Moved ${r.moved} to Trash`,
											actionLabel: "Undo",
											onAction: async () => {
												try {
													const u = await apiUndoDelete(dir);
													uiActions.setNote(`Restored ${u.restored}`);
												} catch {}
												setToast(null);
												if (toastTimerRef.current) {
													window.clearTimeout(toastTimerRef.current);
													toastTimerRef.current = null;
												}
											},
										});
										toastTimerRef.current = window.setTimeout(() => {
											setToast(null);
											toastTimerRef.current = null;
										}, 10000);
									} else {
										setToast({ message: `Moved ${r.moved} to OS Trash` });
									}
								} catch (e) {
									uiActions.setNote(
										e instanceof Error ? e.message : "Delete failed",
									);
								} finally {
									uiActions.setBusy("");
								}
							}}
							aria-label="Delete selected photos"
						>
							<Trash2 className="w-4 h-4" />
							Delete
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
