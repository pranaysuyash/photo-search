import type React from "react";
import { Fragment } from "react";
import { FOLDER_MODAL_EVENT } from "../constants/events";
import type { IndexStatusDetails } from "../contexts/LibraryContext";
import { useResultsConfig } from "../contexts/ResultsConfigContext";
import { useSearchContext } from "../contexts/SearchContext";
// Centralized modal controls hook (replaces direct useModalContext usage here)
import useModalControls from "../hooks/useModalControls";
import { useSearchCommandCenter } from "../stores/settingsStore";
import type { PhotoActions, UIActions } from "../stores/types";
import { IndexingAndViewControls } from "./topbar/pieces/IndexingAndViewControls";
import { PrimarySearchControls } from "./topbar/pieces/PrimarySearchControls";
import { SelectionActionsBar } from "./topbar/pieces/SelectionActionsBar";
import { useBusyProgress } from "./topbar/utils/useBusyProgress";
import { useIndexingSummary } from "./topbar/utils/useIndexingSummary";
import { useSelectionSummary } from "./topbar/utils/useSelectionSummary";

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

	// Library switching
	enableDemoLibrary?: boolean;
	onLibraryChange?: (dir: string | null) => void;
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
	enableDemoLibrary,
	onLibraryChange,
}: TopBarProps) {
	const { resultView, setResultView, timelineBucket, setTimelineBucket } =
		useResultsConfig();
	const searchCommandCenter = useSearchCommandCenter();
	const searchCtx = useSearchContext();
	// Use centralized modal controls API for consistency & future instrumentation
	const modalControls = useModalControls();
	const {
		hasDeterminateProgress,
		ariaLabel: progressAriaText,
		ariaValueNow: progressAriaValue,
		dataState: progressDataState,
		style: progressFillStyle,
	} = useBusyProgress(progressPct);
	const {
		rawIndexedCount,
		formattedIndexedCount,
		formattedTotal,
		coverageText,
		etaInline,
		rateInline,
		lastIndexedText,
		tooltipLines,
		showIndexChip,
	} = useIndexingSummary({
		diag,
		indexedCount,
		indexedTotal,
		coveragePct,
		indexStatus,
		etaSeconds,
		tooltip,
	});
	const {
		selectedArray,
		selectionCount,
		selectionMode,
		isSingleSelection,
		primarySelectedPath,
		clearSelection,
	} = useSelectionSummary({ selected, setSelected });
	const q = (searchText ?? searchCtx.state.query) || "";
	const setQ = (t: string) =>
		setSearchText ? setSearchText(t) : searchCtx.actions.setQuery(t);
	const doSearch = async (t: string) => {
		if (onSearch) onSearch(t);
		else await searchCtx.actions.performSearch(t);
	};

	const handleOpenFolderModal = () => {
		modalControls.openFolder();
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent(FOLDER_MODAL_EVENT));
		}
	};

	return (
		<div
			className="top-bar bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50"
			aria-busy={busy || undefined}
		>
			{/* Busy progress bar */}
			{busy && (
				<div
					className="progress-bar"
					role="progressbar"
					aria-label={progressAriaText}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={hasDeterminateProgress ? progressAriaValue : undefined}
					aria-valuetext={progressAriaText}
					data-progress-state={progressDataState}
				>
					<div
						className="progress-bar-fill"
						aria-hidden="true"
						style={progressFillStyle}
					></div>
				</div>
			)}
			<div className="top-bar-content">
				{selectionMode ? (
					<SelectionActionsBar
						selectionCount={selectionCount}
						selectedPaths={selectedArray}
						isSingleSelection={isSingleSelection}
						primarySelectedPath={primarySelectedPath}
						clearSelection={clearSelection}
						modalOpen={modalControls.openModal}
						uiActions={uiActions}
						photoActions={photoActions}
						dir={dir}
						engine={engine}
						topK={topK}
						useOsTrash={useOsTrash}
						setSelected={setSelected}
						setSelectedView={setSelectedView}
						toastTimerRef={toastTimerRef}
						setToast={setToast}
						showInfoOverlay={showInfoOverlay}
						onToggleInfoOverlay={onToggleInfoOverlay}
						onOpenThemeModal={onOpenThemeModal}
					/>
				) : (
					<Fragment>
						<PrimarySearchControls
							searchCommandCenter={!!searchCommandCenter}
							onOpenSearchOverlay={onOpenSearchOverlay}
							searchText={q}
							setSearchText={setQ}
							doSearch={doSearch}
							clusters={clusters}
							allTags={allTags}
							meta={meta}
							dir={dir}
							setShowFilters={setShowFilters}
							enableDemoLibrary={enableDemoLibrary}
							onLibraryChange={onLibraryChange}
							handleOpenFolderModal={handleOpenFolderModal}
							openModal={modalControls.openModal}
						/>
						<IndexingAndViewControls
							searchCommandCenter={!!searchCommandCenter}
							showIndexChip={showIndexChip}
							formattedIndexedCount={formattedIndexedCount}
							formattedTotal={formattedTotal}
							coverageText={coverageText}
							isIndexing={isIndexing}
							etaInline={etaInline}
							rateInline={rateInline}
							lastIndexedText={lastIndexedText}
							activeJobs={activeJobs}
							onIndex={onIndex}
							rawIndexedCount={rawIndexedCount}
							paused={paused}
							onPause={onPause}
							onResume={onResume}
							progressPct={progressPct}
							tooltipLines={tooltipLines}
							ocrReady={ocrReady}
							onOpenJobs={onOpenJobs}
							gridSize={gridSize}
							setGridSize={setGridSize}
							selectedView={selectedView}
							setSelectedView={setSelectedView}
							resultView={resultView}
							setResultView={setResultView}
							timelineBucket={timelineBucket}
							setTimelineBucket={setTimelineBucket}
							currentFilter={currentFilter}
							setCurrentFilter={setCurrentFilter}
							ratingMin={ratingMin}
							setRatingMin={setRatingMin}
							query={q}
							setQuery={setQ}
							doSearch={doSearch}
							photoActions={photoActions}
							onOpenThemeModal={onOpenThemeModal}
							openModal={modalControls.openModal}
						/>
					</Fragment>
				)}
			</div>
		</div>
	);
}
