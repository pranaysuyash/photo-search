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
	Palette,
	Settings,
	Trash2,
} from "lucide-react";
import type React from "react";
import { apiDelete, apiUndoDelete } from "../api";
import { useUIContext } from "../contexts/UIContext";
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
	searchText: string;
	setSearchText: (text: string) => void;
	onSearch: (text: string) => void;
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
	setModal: (modal: { kind: string } | null) => void;
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
	// Results view mode
	resultView: "grid" | "timeline";
	onChangeResultView: (view: "grid" | "timeline") => void;
	timelineBucket?: "day" | "week" | "month";
	onChangeTimelineBucket?: (b: "day" | "week" | "month") => void;
	// Index progress
	diag?: {
		engines?: Array<{ key: string; index_dir: string; count: number }>;
	} | null;
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
	photoActions: {
		setFavOnly: (favOnly: boolean) => void;
		setResults: (results: any[]) => void;
	};
	uiActions: {
		setBusy: (message: string) => void;
		setNote: (note: string) => void;
	};

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
	setModal,
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
	resultView,
	onChangeResultView,
	timelineBucket,
	onChangeTimelineBucket,
	diag,
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
}: TopBarProps) {
	const { state: uiState } = useUIContext();

	return (
		<div className="top-bar top-bar-mobile bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
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
					<SearchBar
						searchText={searchText}
						setSearchText={setSearchText}
						onSearch={onSearch}
						clusters={clusters}
						allTags={allTags}
						meta={meta}
					/>
					{/* Quick filter chips */}
					<div className="quick-filters hidden md:flex items-center gap-2 ml-2">
						{(meta?.cameras || []).slice(0, 3).map((cam) => (
							<button
								key={`cam-${cam}`}
								type="button"
								className="chip"
								onClick={() => {
									const tok = `camera:"${cam}"`;
									const next = (searchText || "").trim();
									const q = next ? `${next} ${tok}` : tok;
									setSearchText(q);
									onSearch(q);
								}}
								title={`Filter camera: ${cam}`}
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
									const next = (searchText || "").trim();
									const q = next ? `${next} ${tok}` : tok;
									setSearchText(q);
									onSearch(q);
								}}
								title={`Filter tag: ${tg}`}
							>
								#{tg}
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
										const next = (searchText || "").trim();
										const q = next ? `${next} ${tok}` : tok;
										setSearchText(q);
										onSearch(q);
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
								const next = (searchText || "").trim();
								const q = next ? `${next} ${tok}` : tok;
								setSearchText(q);
								onSearch(q);
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
								const next = (searchText || "").trim();
								const q = next ? `${next} ${tok}` : tok;
								setSearchText(q);
								onSearch(q);
							}}
							title="Find videos longer than 30 seconds"
						>
							Videos &gt; 30s
						</button>
					</div>

					<motion.button
						type="button"
						className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
						onClick={() => setShowFilters((v) => !v)}
						aria-label="Show filters"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
						<span className="text-sm text-gray-700 dark:text-gray-300">
							Filters
						</span>
					</motion.button>
					{/* Optional clear filters chip, if query looks filtery (basic heuristic via presence of tokens) */}
					{/(camera:|tag:|person:|has_text:|iso:|fnumber:|width:|height:|place:)/i.test(
						searchText || "",
					) && (
						<button
							type="button"
							className="chip"
							onClick={() => {
								// Clear baked-in tokens from the search text only; advanced panel handles full resets
								const cleaned = (searchText || "")
									.replace(
										/\b(camera|tag|person|has_text|iso|fnumber|width|height|place):[^\s]+/gi,
										"",
									)
									.replace(/\s{2,}/g, " ")
									.trim();
								setSearchText(cleaned);
								onSearch(cleaned);
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
						onClick={() => setModal({ kind: "save" })}
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
					{diag && (diag.engines?.length || 0) >= 1 && (
						<div className="indexed-chip relative">
							<span className="indexed-label">Indexed</span>
							<span className="indexed-count">
								{diag.engines?.[0]?.count || 0}
							</span>
							<button
								type="button"
								className="indexed-action"
								onClick={() => onIndex?.()}
								disabled={!!isIndexing}
								aria-label={
									isIndexing
										? "Indexing photos (indeterminate)"
										: diag.engines?.[0]?.count
											? "Reindex your library"
											: "Start indexing your library"
								}
								title={
									isIndexing
										? "Indexing runs in the background. You can keep working."
										: diag.engines?.[0]?.count
											? "Reindex photos"
											: "Start indexing"
								}
							>
								{isIndexing
									? "Indexing…"
									: diag.engines?.[0]?.count
										? "Reindex"
										: "Index"}
							</button>
							{isIndexing && (
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
							)}
							{isIndexing &&
								typeof etaSeconds === "number" &&
								Number.isFinite(etaSeconds) &&
								etaSeconds > 0 && (
									<span
										className="ml-2 text-[11px] text-gray-600"
										title="Estimated time remaining"
									>
										~{Math.max(1, Math.ceil(etaSeconds / 60))}m
									</span>
								)}
							{isIndexing && (
								<button
									type="button"
									className="ml-2 chip"
									onClick={() => (paused ? onResume?.() : onPause?.())}
									aria-label={paused ? "Resume indexing" : "Pause indexing"}
									title={paused ? "Resume indexing" : "Pause indexing"}
								>
									{paused ? "Resume" : "Pause"}
								</button>
							)}
							{/* Hover card for detailed tooltip */}
							{tooltip && (
								<div className="tooltip-card" role="tooltip" aria-hidden>
									{(tooltip.split(" • ") || []).map((line, i) => (
										<div key={`item-${i}`} className="tooltip-line">
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
					{/* Jobs quick link */}
					{typeof activeJobs === "number" && activeJobs > 0 && (
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
						onClick={() => setModal({ kind: "folder" })}
						aria-label="Open settings and indexing options"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
					</motion.button>
					<motion.button
						type="button"
						className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
						title="Open theme settings"
						aria-label="Open theme settings"
						onClick={() => onOpenThemeModal?.()}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<Palette className="w-4 h-4 text-gray-600 dark:text-gray-400" />
					</motion.button>
				</div>
			</div>

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
								onSearch(searchText);
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

			{/* Rating filter */}
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

			{/* View mode toggle */}
			<div className="view-toggle">
				<span>View:</span>
				<button
					type="button"
					className={`view-button ${resultView === "grid" ? "active" : ""}`}
					onClick={() => onChangeResultView("grid")}
					aria-pressed={resultView === "grid"}
				>
					Grid
				</button>
				<button
					type="button"
					className={`view-button ${resultView === "timeline" ? "active" : ""}`}
					onClick={() => onChangeResultView("timeline")}
					aria-pressed={resultView === "timeline"}
				>
					Timeline
				</button>
			</div>
			{/* Boolean query hints */}
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

			{/* Preset boolean filter chips */}
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
							const next = (searchText || "").trim();
							const q = next ? `${next} ${tok}` : tok;
							setSearchText(q);
							onSearch(q);
						}}
						title={p.expr}
					>
						{p.label}
					</button>
				))}
			</div>
			{resultView === "timeline" && (
				<div className="view-toggle">
					<span>Bucket:</span>
					{(["day", "week", "month"] as const).map((b) => (
						<button
							key={b}
							type="button"
							className={`view-button ${timelineBucket === b ? "active" : ""}`}
							onClick={() => onChangeTimelineBucket?.(b)}
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
							onClick={() => setModal({ kind: "export" })}
							aria-label="Export selected photos"
						>
							<Download className="w-4 h-4" />
							Export
						</button>
						<button
							type="button"
							className="action-button"
							onClick={() => setModal({ kind: "enhanced-share" })}
							aria-label="Share selected photos"
						>
							<IconSearch className="w-4 h-4" />
							Share
						</button>
						{/* Feature-flagged: Sharing v1 (stubbed UI) */}
						{(import.meta as any).env?.VITE_FF_SHARING_V1 === "1" && (
							<button
								type="button"
								className="action-button"
								onClick={() => setModal({ kind: "share" as any })}
								aria-label="Share selected photos"
							>
								<IconSearch className="w-4 h-4" /> Share
							</button>
						)}
						{(import.meta as any).env?.VITE_FF_SHARING_V1 === "1" && (
							<button
								type="button"
								className="action-button"
								onClick={() => setModal({ kind: "shareManage" as any })}
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
							onClick={() => setModal({ kind: "advanced" as any })}
							aria-label="Open advanced search"
						>
							Advanced
						</button>
						<button
							type="button"
							className="action-button"
							onClick={() => setModal({ kind: "tag" })}
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
									const { apiSearchLike } = await import("../api");
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
								onClick={() => setModal({ kind: "likeplus" })}
								aria-label="Find similar photos with additional text query"
							>
								<IconSearch className="w-4 h-4" /> Similar + Text
							</button>
						)}
						<button
							type="button"
							className="action-button"
							onClick={() => setModal({ kind: "collect" })}
							aria-label="Add selected photos to a collection"
						>
							<FolderOpen className="w-4 h-4" /> Add to Collection
						</button>
						<button
							type="button"
							className="action-button"
							onClick={() => setModal({ kind: "removeCollect" as any })}
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
