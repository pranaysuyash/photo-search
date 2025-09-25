import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { EnhancedEmptyState } from "../components/EnhancedEmptyState";
import ErrorBoundary from "../components/ErrorBoundary";
import JustifiedResults from "../components/JustifiedResults";
import TimelineResults from "../components/TimelineResults";
import { useResultsConfig } from "../contexts/ResultsConfigContext";
import { useResultsUI } from "../contexts/ResultsUIContext";
import { useFeatureFlag } from "../components/topbar/utils/featureFlags";
import { LoadingOverlay } from "../utils/loading";

const TIMELINE_ZOOM_ORDER: Array<"month" | "week" | "day"> = [
	"month",
	"week",
	"day",
];

export interface ResultsViewProps {
	// Data
	dir: string;
	engine: string;
	results: Array<{ path: string; score?: number }>;
	searchText: string;
	altSearch?: { active: boolean; applied: string; original: string } | null;
	ratingMap?: Record<string, number>;
	showInfoOverlay?: boolean;
	isLoading?: boolean;
	// Openers
	openDetailByPath: (path: string) => void;
	// Layout refs
	scrollContainerRef: React.RefObject<HTMLDivElement>;
	setSearchText: (t: string) => void;
	onSearchNow: (t: string) => void;
	onLayout?: (rows: number[][]) => void;
	// Modal controls
	onOpenHelp?: () => void;
	onOpenFilters?: () => void;
	onOpenAdvanced?: () => void;
	// View settings provided by ResultsConfig context
}

export const ResultsView: React.FC<ResultsViewProps> = ({
	dir,
	engine,
	results,
	searchText,
	altSearch,
	ratingMap,
	showInfoOverlay,
	isLoading = false,
	openDetailByPath,
	scrollContainerRef,
	setSearchText,
	onSearchNow,
	onLayout,
	onOpenHelp,
	onOpenFilters,
	onOpenAdvanced,
}) => {
	const { selected, toggleSelect, focusIdx } = useResultsUI();
	const { resultView, timelineBucket, setTimelineBucket } = useResultsConfig();
	const timelineZoomEnabled = useFeatureFlag("TIMELINE_ZOOM_V2");
	const zoomIndex = TIMELINE_ZOOM_ORDER.indexOf(timelineBucket);
	const canZoomIn = timelineZoomEnabled &&
		zoomIndex > -1 &&
		zoomIndex < TIMELINE_ZOOM_ORDER.length - 1;
	const canZoomOut = timelineZoomEnabled && zoomIndex > 0;
	const zoomIn = useCallback(() => {
		if (!timelineZoomEnabled) return;
		if (zoomIndex < 0) return;
		if (zoomIndex < TIMELINE_ZOOM_ORDER.length - 1) {
			setTimelineBucket(TIMELINE_ZOOM_ORDER[zoomIndex + 1]);
		}
	}, [timelineZoomEnabled, zoomIndex, setTimelineBucket]);
	const zoomOut = useCallback(() => {
		if (!timelineZoomEnabled) return;
		if (zoomIndex <= 0) return;
		setTimelineBucket(TIMELINE_ZOOM_ORDER[zoomIndex - 1]);
	}, [timelineZoomEnabled, zoomIndex, setTimelineBucket]);
	const zoomLabel = useMemo(() => {
		switch (timelineBucket) {
			case "month":
				return "Months";
			case "week":
				return "Weeks";
			case "day":
			default:
				return "Days";
		}
	}, [timelineBucket]);
	const hasResults = (results?.length || 0) > 0;
	useEffect(() => {
		if (!timelineZoomEnabled) return;
		const handler = (event: KeyboardEvent) => {
			if (resultView !== "timeline") return;
			if (event.defaultPrevented) return;
			if (event.key === "=" || event.key === "+") {
				event.preventDefault();
				zoomIn();
			} else if (event.key === "-") {
				event.preventDefault();
				zoomOut();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [timelineZoomEnabled, resultView, zoomIn, zoomOut]);

	const handleWheelZoom = useCallback(
		(event: React.WheelEvent<HTMLDivElement>) => {
			if (!timelineZoomEnabled || resultView !== "timeline") return;
			if (!(event.ctrlKey || event.metaKey)) return;
			event.preventDefault();
			if (event.deltaY > 0) zoomOut();
			else if (event.deltaY < 0) zoomIn();
		},
		[timelineZoomEnabled, resultView, zoomIn, zoomOut],
	);

	return (
		<ErrorBoundary componentName="Search Results">
			<div className="p-4">
				{/* Context toolbar */}
				{hasResults && (searchText || "").trim() && (
					<div className="mb-2 flex items-center justify-between">
						<div className="text-sm text-gray-600">
							{results.length} results
						</div>
						{altSearch?.active && (
							<div
								className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-800 border border-yellow-200"
								aria-live="polite"
							>
								Showing results for "{altSearch.applied}" (from "
								{altSearch.original}")
								<button
									type="button"
									className="ml-2 underline"
									onClick={() => {
										setSearchText(altSearch.original);
										onSearchNow(altSearch.original);
									}}
								>
									Search original
								</button>
							</div>
						)}
					</div>
				)}

				<LoadingOverlay isLoading={isLoading} message="Searching...">
					{!hasResults ? (
						<div className="p-2">
							<EnhancedEmptyState
								type="no-results"
								searchQuery={searchText}
								onRunSample={(q) => onSearchNow(q)}
								onClearSearch={() => setSearchText("")}
								onOpenFilters={onOpenFilters}
								onOpenAdvanced={onOpenAdvanced}
								onOpenHelp={onOpenHelp}
								sampleQueries={[
									"beach sunset",
									"birthday cake",
									"mountain hike",
									"red car",
									"family portrait",
									"city skyline",
								]}
							/>
						</div>
					) : resultView === "grid" ? (
						<JustifiedResults
							dir={dir}
							engine={engine}
							items={(results || []).map((r) => ({
								path: r.path,
								score: r.score,
							}))}
							selected={selected}
							onToggleSelect={toggleSelect}
							onOpen={(p) => openDetailByPath(p)}
							scrollContainerRef={scrollContainerRef}
							focusIndex={focusIdx ?? undefined}
							onLayout={onLayout}
							ratingMap={ratingMap}
							showInfoOverlay={showInfoOverlay}
						/>
					) : (
						<div
							className="relative"
							onWheel={handleWheelZoom}
						>
							{timelineZoomEnabled && (
								<div className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur px-3 py-2 border border-gray-200 dark:border-gray-700 mb-3 shadow-sm">
									<button
										type="button"
										className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
										onClick={zoomOut}
										disabled={!canZoomOut}
										aria-label="Zoom timeline out"
									>
										−
									</button>
									<span className="text-xs uppercase tracking-wide text-gray-700 dark:text-gray-300">
										Zoom: {zoomLabel}
									</span>
									<button
										type="button"
										className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
										onClick={zoomIn}
										disabled={!canZoomIn}
										aria-label="Zoom timeline in"
									>
										+
									</button>
									<span className="sr-only" aria-live="polite">
										Timeline zoom level {zoomLabel}
									</span>
									<div className="hidden text-[11px] text-gray-500 dark:text-gray-400 sm:block">
										Ctrl/Cmd + Scroll, +/- to change zoom
									</div>
								</div>
							)}
							<TimelineResults
								dir={dir}
								engine={engine}
								items={(results || []).map((r) => ({
									path: r.path,
									score: r.score,
								}))}
								selected={selected}
								onToggleSelect={toggleSelect}
								onOpen={(p) => openDetailByPath(p)}
								showInfoOverlay={showInfoOverlay}
								bucket={timelineBucket}
							/>
						</div>
					)}
				</LoadingOverlay>
			</div>
		</ErrorBoundary>
	);
};

export default ResultsView;
