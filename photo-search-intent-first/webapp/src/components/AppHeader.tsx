import { motion } from "framer-motion";
import type React from "react";
import type { View } from "../App";
import type { PhotoActions, UIActions, WorkspaceState } from "../stores/types";
import { TopBar, type ViewType } from "./TopBar";
import type { IndexStatusDetails } from "../contexts/LibraryContext";

// Define the modal types
type ModalKind =
	| "export"
	| "enhanced-share"
	| "tag"
	| "folder"
	| "likeplus"
	| "save"
	| "collect"
	| "removeCollect";

interface _ModalState {
	kind: ModalKind;
}

interface AppHeaderProps {
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
	diag: WorkspaceState["diag"];
	indexedCount?: number;
	indexedTotal?: number;
	coveragePct?: number;
	indexStatus?: IndexStatusDetails;
	busy: boolean;
	gridSize: "small" | "medium" | "large";
	setGridSize: (size: "small" | "medium" | "large") => void;
	selectedView: View;
	setSelectedView: (view: View) => void;
	currentFilter: string;
	setCurrentFilter: (filter: string) => void;
	ratingMin: number;
	setRatingMin: (rating: number) => void;
	setModal: (modal: { kind: string } | null) => void;
	setIsMobileMenuOpen: (open: boolean) => void;
	setShowFilters: (show: boolean | ((prev: boolean) => boolean)) => void;
	selected: Set<string>;
	setSelected: (selected: Set<string>) => void;
	dir: string;
	engine: string;
	topK: number;
	useOsTrash: boolean;
	showInfoOverlay: boolean;
	onToggleInfoOverlay: () => void;
	resultView: "grid" | "timeline";
	onChangeResultView: (view: string) => void;
	timelineBucket: "day" | "week" | "month";
	onChangeTimelineBucket: (bucket: string) => void;
	photoActions: PhotoActions;
	uiActions: UIActions;
	toastTimerRef: React.MutableRefObject<number | null>;
	setToast: (
		toast: {
			message: string;
			actionLabel?: string;
			onAction?: () => void;
		} | null,
	) => void;
	isIndexing: boolean;
	onIndex: () => void;
	activeJobs: number;
	onOpenJobs: () => void;
	progressPct: number;
	etaSeconds: number;
	paused: boolean;
	tooltip: string;
	ocrReady: boolean;
	onPause: () => void;
	onResume: () => void;
	onOpenThemeModal: () => void;
	onOpenSettingsModal?: () => void;

	// Accessibility and onboarding
	setShowAccessibilityPanel: (
		show: boolean | ((prev: boolean) => boolean),
	) => void;
	setShowOnboardingTour: (show: boolean | ((prev: boolean) => boolean)) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
	searchText,
	setSearchText,
	onSearch,
	clusters,
	allTags,
	meta,
	diag,
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
	photoActions,
	uiActions,
	toastTimerRef,
	setToast,
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
	tooltip,
	ocrReady,
	onPause,
	onResume,
	onOpenThemeModal,
	onOpenSettingsModal,
	setShowAccessibilityPanel,
	setShowOnboardingTour,
}) => {
	return (
		<header
			className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 px-4 md:px-8 py-4 md:py-6"
			data-tour="search-bar"
		>
			<TopBar
				searchText={searchText}
				setSearchText={setSearchText}
				onSearch={onSearch}
				clusters={clusters}
				allTags={allTags}
				meta={meta}
				diag={diag}
				busy={busy}
				gridSize={gridSize}
				setGridSize={setGridSize}
				selectedView={selectedView as ViewType}
				setSelectedView={(view: ViewType) => setSelectedView(view as View)}
				currentFilter={currentFilter}
				setCurrentFilter={setCurrentFilter}
				ratingMin={ratingMin}
				setRatingMin={setRatingMin}
				setModal={setModal}
				setIsMobileMenuOpen={setIsMobileMenuOpen}
				setShowFilters={setShowFilters}
				selected={selected}
				setSelected={setSelected}
				dir={dir}
				engine={engine}
				topK={topK}
				useOsTrash={useOsTrash}
				showInfoOverlay={showInfoOverlay}
				onToggleInfoOverlay={onToggleInfoOverlay}
				resultView={resultView as "grid" | "timeline"}
				onChangeResultView={onChangeResultView}
				timelineBucket={timelineBucket}
				onChangeTimelineBucket={onChangeTimelineBucket}
				photoActions={photoActions}
				uiActions={uiActions}
				toastTimerRef={toastTimerRef}
				setToast={setToast}
				indexedCount={indexedCount}
				indexedTotal={indexedTotal}
				coveragePct={coveragePct}
				indexStatus={indexStatus}
				isIndexing={isIndexing}
				onIndex={onIndex}
				activeJobs={activeJobs}
				onOpenJobs={onOpenJobs}
				progressPct={progressPct}
				etaSeconds={etaSeconds}
				paused={paused}
				tooltip={tooltip}
				ocrReady={ocrReady}
				onPause={onPause}
				onResume={onResume}
				onOpenThemeModal={onOpenThemeModal}
			/>

			{/* Modern UX Integration - Accessibility Button */}
			<div className="px-4 pt-2 flex items-center gap-2">
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => onOpenSettingsModal?.()}
					className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
					aria-label="Open settings"
				>
					<span className="text-sm">⚙️</span>
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => setShowAccessibilityPanel(true)}
					className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
					aria-label="Accessibility settings"
				>
					<span className="text-sm">♿</span>
				</motion.button>

				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => setShowOnboardingTour(true)}
					className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
					aria-label="Help and onboarding"
				>
					<span className="text-sm">?</span>
				</motion.button>
			</div>
		</header>
	);
};
