import {
	Download,
	Search as IconSearch,
	Tag as IconTag,
	MoreHorizontal,
	Palette,
	Settings,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { ModalKey } from "../../../contexts/ModalContext";

import type {
	ResultView,
	TimelineBucket,
} from "../../../contexts/ResultsConfigContext";
import type { PhotoActions } from "../../../stores/types";
import type { GridSize, ViewType } from "../../TopBar";
import {
	GridSizeControl,
	RatingFilter,
	ViewModeControl,
} from "../controls/index";
import { Chip } from "../primitives/Chip";
import { MotionButton } from "../primitives/MotionButton";

type FilterChipDef = { label: string; expr: string; title?: string };

type PresetFiltersProps = {
	presets: FilterChipDef[];
	query: string;
	setQuery: (value: string) => void;
	doSearch: (value: string) => void | Promise<void>;
};

const PresetFilters: React.FC<PresetFiltersProps> = ({
	presets,
	query,
	setQuery,
	doSearch,
}) => {
	const onPick = (expr: string) => () => {
		const next = query.trim();
		const fullQuery = next ? `${next} ${expr}` : expr;
		setQuery(fullQuery);
		void doSearch(fullQuery);
	};

	return (
		<div className="preset-filters hidden md:flex flex-wrap gap-2 mt-1">
			{presets.map((preset) => (
				<Chip
					key={preset.label}
					title={preset.title ?? preset.expr}
					onClick={onPick(preset.expr)}
				>
					{preset.label}
				</Chip>
			))}
		</div>
	);
};

type IndexingAndViewControlsProps = {
	searchCommandCenter: boolean;
	showIndexChip: boolean;
	formattedIndexedCount?: string;
	formattedTotal?: string;
	coverageText?: string;
	isIndexing?: boolean;
	etaInline?: string;
	rateInline?: string;
	lastIndexedText?: string;
	activeJobs?: number;
	onIndex?: () => void;
	rawIndexedCount?: number;
	paused?: boolean;
	onPause?: () => void;
	onResume?: () => void;
	progressPct?: number;
	tooltipLines: string[];
	ocrReady?: boolean;
	onOpenJobs?: () => void;
	gridSize: GridSize;
	setGridSize: (size: GridSize) => void;
	selectedView: ViewType;
	setSelectedView: (view: ViewType) => void;
	resultView: ResultView;
	setResultView: (view: ResultView) => void;
	timelineBucket: TimelineBucket;
	setTimelineBucket: (bucket: TimelineBucket) => void;
	currentFilter: string;
	setCurrentFilter: (filter: string) => void;
	ratingMin: number;
	setRatingMin: (rating: number) => void;
	query: string;
	setQuery: (value: string) => void;
	doSearch: (value: string) => void | Promise<void>;
	photoActions: Pick<PhotoActions, "setFavOnly">;
	onOpenThemeModal?: () => void;
	openModal: (modalId: ModalKey) => void;
};

export function IndexingAndViewControls({
	searchCommandCenter,
	showIndexChip,
	formattedIndexedCount,
	formattedTotal,
	coverageText,
	isIndexing,
	etaInline,
	rateInline,
	lastIndexedText,
	activeJobs,
	onIndex,
	rawIndexedCount,
	paused,
	onPause,
	onResume,
	progressPct,
	tooltipLines,
	ocrReady,
	onOpenJobs,
	gridSize,
	setGridSize,
	selectedView,
	setSelectedView,
	resultView,
	setResultView,
	timelineBucket,
	setTimelineBucket,
	currentFilter,
	setCurrentFilter,
	ratingMin,
	setRatingMin,
	query,
	setQuery,
	doSearch,
	photoActions,
	onOpenThemeModal,
	openModal,
}: IndexingAndViewControlsProps) {
	const [showMore, setShowMore] = useState(false);
	const presetFilters = useMemo<FilterChipDef[]>(
		() => [
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
		],
		[],
	);

	return (
		<>
			<div className="top-bar-right">
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
											{
												"--progress-width":
													typeof progressPct === "number" &&
													progressPct >= 0 &&
													progressPct <= 1
														? `${Math.max(4, Math.round(progressPct * 100))}%`
														: "40%",
											} as React.CSSProperties
										}
									/>
								</div>
							</div>
						)}
						{tooltipLines.length > 0 && (
							<div className="tooltip-card" role="tooltip" aria-hidden>
								{tooltipLines.map((line) => (
									<div
										key={`index-tip-${line.slice(0, 30).replace(/\s/g, "-")}`}
										className="tooltip-line"
									>
										{line}
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{ocrReady && (
					<span className="chip" title="OCR ready: search text inside images">
						OCR
					</span>
				)}

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

				<GridSizeControl gridSize={gridSize} setGridSize={setGridSize} />

				<ViewModeControl
					selectedView={selectedView}
					setSelectedView={setSelectedView}
				/>

				<MotionButton
					type="button"
					className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
					title="Settings & Indexing"
					onClick={() => openModal("folder")}
					aria-label="Open settings and indexing options"
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
				>
					<Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
				</MotionButton>

				<MotionButton
					type="button"
					className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
					title="More actions"
					aria-label="More actions"
					aria-haspopup="true"
					aria-expanded={showMore}
					onClick={() => setShowMore((value) => !value)}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
				>
					<MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
					<span className="text-sm">More</span>
				</MotionButton>
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
							onClick={() => openModal("advanced")}
						>
							<IconSearch className="w-4 h-4 mr-2" /> Advanced Search
						</button>
						<button
							type="button"
							className="menu-item"
							onClick={() => openModal("tag")}
						>
							<IconTag className="w-4 h-4 mr-2" /> Tag Selected
						</button>
						<button
							type="button"
							className="menu-item"
							onClick={() => openModal("export")}
						>
							<Download className="w-4 h-4 mr-2" /> Export
						</button>
					</div>
				)}
			</div>

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
					].map((filterLabel) => (
						<button
							type="button"
							key={filterLabel}
							onClick={() => {
								setCurrentFilter(filterLabel.toLowerCase());
								if (filterLabel === "Favorites") {
									photoActions.setFavOnly(true);
									void doSearch(query);
								}
							}}
							className={`chip ${
								currentFilter === filterLabel.toLowerCase() ? "active" : ""
							}`}
							aria-label={`Filter by ${filterLabel}`}
						>
							{filterLabel}
						</button>
					))}
				</div>
			)}

			{!searchCommandCenter && (
				<RatingFilter ratingMin={ratingMin} setRatingMin={setRatingMin} />
			)}

			<div className="view-toggle">
				<span>View:</span>
				<button
					type="button"
					className={`view-button ${resultView === "grid" ? "active" : ""}`}
					onClick={() => setResultView("grid")}
					aria-label="Show results as grid"
				>
					Grid
				</button>
				<button
					type="button"
					className={`view-button ${resultView === "timeline" ? "active" : ""}`}
					onClick={() => setResultView("timeline")}
					aria-label="Show results as timeline"
				>
					Timeline
				</button>
			</div>

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

			{!searchCommandCenter && (
				<PresetFilters
					presets={presetFilters}
					query={query}
					setQuery={setQuery}
					doSearch={doSearch}
				/>
			)}

			{resultView === "timeline" && (
				<div className="view-toggle">
					<span>Bucket:</span>
					{(["day", "week", "month"] as const).map((bucket) => (
						<button
							key={`bucket-${bucket}`}
							type="button"
							className={`view-button ${
								timelineBucket === bucket ? "active" : ""
							}`}
							onClick={() => setTimelineBucket(bucket)}
							aria-label={`Set timeline bucket to ${bucket}`}
						>
							{bucket[0].toUpperCase() + bucket.slice(1)}
						</button>
					))}
				</div>
			)}
		</>
	);
}

export default IndexingAndViewControls;
