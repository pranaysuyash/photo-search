import clsx from "clsx";
import type { MutableRefObject, RefObject } from "react";
import { lazy, memo, Suspense, useEffect } from "react";
import type { Location, NavigateFunction } from "react-router-dom";
import type { LibraryActions } from "../contexts/LibraryContext";
import { ResultsConfigProvider } from "../contexts/ResultsConfigContext";
import { ResultsUIProvider } from "../contexts/ResultsUIContext";
import type { ModalControls } from "../hooks/useModalControls";
import type {
	PhotoActions,
	SettingsActions,
	UIActions,
	WorkspaceActions,
} from "../stores/types";
import type { AccessibilitySettings } from "./AccessibilityPanel";

// Toast type definition
interface Toast {
	message: string;
	description?: string;
	actionLabel?: string;
	onAction?: () => void;
}

// Jobs actions type (defined locally since not exported from context)
interface JobsActions {
	add: (job: Job) => void;
	setStatus: (id: string, status: Job["status"]) => void;
	update: (id: string, patch: Partial<Job>) => void;
	remove: (id: string) => void;
	clearStopped: () => void;
}

const _MapView = lazy(() => import("./MapView"));
const _SmartCollections = lazy(() => import("./SmartCollections"));
const _TripsView = lazy(() => import("./TripsView"));
const _VideoManager = lazy(() =>
	import("./VideoManager").then((m) => ({
		default: m.VideoManager,
	})),
);

import {
	apiAuthCheck,
	apiCancelJob,
	apiOpen,
	apiSearchLike,
	apiSetFavorite,
} from "../api";
// Context hooks
import { useActionsContext } from "../contexts/ActionsContext";
import { useDataContext } from "../contexts/DataContext";
import { useLayoutContext } from "../contexts/LayoutContext";
import { useOnboardingContext } from "../contexts/OnboardingContext";
import { useViewStateContext } from "../contexts/ViewStateContext";
import type { FilterPreset } from "../models/FilterPreset";
import {
	isMobileTestPath,
	isSharePath,
	type View,
	viewToPath,
} from "../utils/router";
import { AccessibilityPanel } from "./AccessibilityPanel";
import { AppShell } from "./AppShell";
import { BottomNavigation } from "./BottomNavigation";
import { ContextualHelp } from "./ContextualHelp";
// Chrome islands
import {
	AuthTokenBar,
	JobsFab,
	ModalsHost,
	PanelsHost,
	RoutesHost,
} from "./chrome";
import ErrorBoundary from "./ErrorBoundary";
import { HintManager, useHintTriggers } from "./HintSystem";
import { type Job, JobsCenter } from "./JobsCenter";
import { MobileOptimizations } from "./MobileOptimizations";
import MobilePWATest from "./MobilePWATest";
import FirstRunSetup from "./modals/FirstRunSetup";
import { OfflineIndicator } from "./OfflineIndicator";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { OnboardingTour } from "./OnboardingTour";
import { OverlayLayer } from "./OverlayLayer";
import PerformanceMonitor from "./PerformanceMonitor";
import { RecentActivityPanel } from "./RecentActivityPanel";
import { SearchHistoryPanel } from "./SearchHistoryPanel";
import ShareViewer from "./ShareViewer";
import { StatsBar } from "./StatsBar";
import { StatusBar } from "./StatusBar";
import { SuspenseFallback } from "./SuspenseFallback";
import type { ViewType } from "./TopBar";
import { Welcome } from "./Welcome";

interface AppWithHintsProps {
	searchText: string;
	selected: Set<string>;
	showAccessibilityPanel: boolean;
	setShowAccessibilityPanel: (show: boolean) => void;
	handleAccessibilitySettingsChange: (settings: AccessibilitySettings) => void;
	showOnboardingTour: boolean;
	handleOnboardingComplete: () => void;
	setShowOnboardingTour: (show: boolean) => void;
}

interface ContextProps {
	settingsActions: SettingsActions;
	photoActions: PhotoActions;
	uiActions: UIActions;
	workspaceActions: WorkspaceActions;
	modalControls: ModalControls;
	lib: LibraryActions;
	jobsActions: JobsActions;
	pushToast: (toast: Toast) => void;
	setToast: (toast: Toast | null) => void;
	filterPresets: FilterPreset[];
	savePreset: (preset: FilterPreset) => void;
	loadPreset: (preset: FilterPreset) => void;
	deletePreset: (presetId: string) => void;
}

interface RefProps {
	scrollContainerRef: RefObject<HTMLDivElement>;
	layoutRowsRef: MutableRefObject<number[][]>;
	toastTimerRef: MutableRefObject<number | null>;
	activeToastRef: MutableRefObject<{ id: string; dismiss: () => void } | null>;
}

export interface AppChromeProps {
	location: Location;
	navigate: NavigateFunction;
	context: ContextProps;
	refs: RefProps;
}

const AppWithHints = memo(function AppWithHints({
	searchText,
	selected,
	showAccessibilityPanel: _showAccessibilityPanel,
	setShowAccessibilityPanel: _setShowAccessibilityPanel,
	handleAccessibilitySettingsChange: _handleAccessibilitySettingsChange,
	showOnboardingTour: _showOnboardingTour,
	handleOnboardingComplete: _handleOnboardingComplete,
	setShowOnboardingTour: _setShowOnboardingTour,
}: AppWithHintsProps) {
	const { triggerHint } = useHintTriggers();

	// Fire hints only when relevant state changes, not every render
	useEffect(() => {
		if (searchText?.trim()) {
			triggerHint("search-success");
		}
	}, [searchText, triggerHint]);

	useEffect(() => {
		if (selected.size > 1) {
			triggerHint("multiple-photos-selected");
		} else if (selected.size === 1) {
			triggerHint("photo-selected");
		}
	}, [selected, triggerHint]);

	// AppWithHints no longer mounts AccessibilityPanel to avoid double-render.
	// The panel is rendered once in AppChrome below.
	return null;
});

export function AppChrome({
	location,
	navigate,
	context,
	refs,
}: AppChromeProps) {
	// Use context hooks instead of prop destructuring
	const layout = useLayoutContext();
	const viewState = useViewStateContext();
	const data = useDataContext();
	const actions = useActionsContext();
	const onboarding = useOnboardingContext();

	const { triggerHint } = useHintTriggers();

	const {
		isMobile,
		showModernSidebar,
		setShowModernSidebar,
		handleSwipeLeft,
		handleSwipeRight,
		handlePullToRefresh,
		accessibilitySettings,
		showAccessibilityPanel,
		setShowAccessibilityPanel,
		prefersReducedMotion,
		themeMode,
		setThemeMode,
	} = layout;
	const {
		showWelcome,
		enableDemoLibrary,
		handleWelcomeStartDemo,
		showOnboarding,
		setShowOnboarding,
		handleFirstRunQuickStart,
		handleFirstRunCustom,
		handleFirstRunDemo,
		handleOnboardingComplete,
		showOnboardingTour,
		setShowOnboardingTour,
		showHelpHint,
		dismissHelpHint,
		userActions,
		onboardingSteps,
		completeOnboardingStep,
		showContextualHelp,
		setShowContextualHelp,
		showOnboardingChecklist,
		setShowOnboardingChecklist,
	} = onboarding;

	const {
		searchText,
		setSearchText,
		selected,
		setSelected,
		toggleSelect,
		gridSize,
		setGridSize,
		resultView,
		setResultView,
		timelineBucket,
		setTimelineBucket,
		currentFilter,
		setCurrentFilter,
		showFilters,
		setShowFilters,
		dateFrom,
		setDateFrom,
		dateTo,
		setDateTo,
		ratingMin,
		setRatingMin,
		detailIdx,
		setDetailIdx,
		focusIdx,
		setFocusIdx,
		setLayoutRows,
		showRecentActivity,
		setShowRecentActivity,
		showSearchHistory,
		setShowSearchHistory,
		bottomNavTab,
		setBottomNavTab,
		authRequired,
		setAuthRequired,
		authTokenInput,
		setAuthTokenInput,
	} = viewState;

	const {
		dir,
		engine,
		hfToken: _hfToken,
		openaiKey: _openaiKey,
		useCaps,
		useOcr,
		hasText,
		place,
		camera,
		isoMin,
		isoMax,
		fMin,
		fMax,
		tagFilter,
		allTags,
		needsHf: _needsHf,
		needsOAI: _needsOAI,
		results,
		query,
		fav,
		favOnly,
		topK,
		saved: _saved,
		collections,
		smart,
		library,
		libHasMore,
		tagsMap,
		persons,
		clusters,
		points: _points,
		diag,
		meta,
		busy,
		note,
		ocrReady,
		ocrTextCount: _ocrTextCount,
		presets: _presets,
		altSearch,
		ratingMap,
		jobs,
		libState,
		showInfoOverlay,
		isConnected,
		items,
		hasAnyFilters: _hasAnyFilters,
		indexCoverage,
	} = data;

	const {
		handleAccessibilitySettingsChange,
		doSearchImmediate,
		loadFav,
		loadSaved: _loadSaved,
		loadTags: _loadTags,
		loadDiag: _loadDiag,
		loadFaces: _loadFaces,
		loadMap: _loadMap,
		loadLibrary,
		loadMetadata: _loadMetadata,
		loadPresets: _loadPresets,
		prepareFast: _prepareFast,
		monitorOperation: _monitorOperation,
		openDetailByPath,
		navDetail,
		exportSelected: _exportSelected,
		handlePhotoOpen: _handlePhotoOpen,
		handlePhotoAction: _handlePhotoAction,
		setRatingSelected: _setRatingSelected,
		rowsEqual: _rowsEqual,
	} = actions;

	const {
		settingsActions,
		photoActions,
		uiActions,
		workspaceActions: _workspaceActions,
		modalControls,
		lib,
		jobsActions,
		pushToast,
		setToast,
		filterPresets,
		savePreset,
		loadPreset,
		deletePreset,
	} = context;

	const { scrollContainerRef, layoutRowsRef, toastTimerRef } = refs;

	// Additional contextual hint triggers
	useEffect(() => {
		if (results.length > 0 && !busy) {
			// Trigger hint when search completes with results
			setTimeout(() => triggerHint("search-success"), 1000);
		}
	}, [results.length, busy, triggerHint]);

	useEffect(() => {
		if (
			fav.length > 0 &&
			!(userActions as string[]).includes("first-favorite")
		) {
			// First time user favorites a photo
			triggerHint("first-favorite");
		}
	}, [fav.length, userActions, triggerHint]);

	useEffect(() => {
		if (selected.size > 5) {
			// User has selected multiple photos for bulk operations
			triggerHint("bulk-actions-available");
		}
	}, [selected.size, triggerHint]);

	useEffect(() => {
		if (!isConnected) {
			// App goes offline
			triggerHint("offline-mode");
		}
	}, [isConnected, triggerHint]);

	useEffect(() => {
		if (jobs.some((job) => job.status === "running")) {
			// Background jobs are running
			triggerHint("background-jobs-active");
		}
	}, [jobs, triggerHint]);

	useEffect(() => {
		if (collections && Object.keys(collections).length > 0) {
			// User has created collections
			triggerHint("collections-created");
		}
	}, [collections, triggerHint]);

	const chrome = (
		<MobileOptimizations
			onSwipeLeft={handleSwipeLeft}
			onSwipeRight={handleSwipeRight}
			onSwipeUp={() => setShowModernSidebar(!showModernSidebar)}
			enableSwipeGestures={isMobile}
			enablePullToRefresh
			onPullToRefresh={handlePullToRefresh}
		>
			{isSharePath(location.pathname) && <ShareViewer />}
			{isMobileTestPath(location.pathname) && <MobilePWATest />}
			<div
				className={clsx(
					"flex h-screen bg-white dark:bg-gray-950 dark:text-gray-100",
					{
						"high-contrast": accessibilitySettings?.highContrast,
						"large-text": accessibilitySettings?.largeText,
						hidden:
							isSharePath(location.pathname) ||
							isMobileTestPath(location.pathname),
					},
				)}
			>
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-blue-600 text-white px-4 py-2 rounded-md"
				>
					Skip to main content
				</a>
				<OfflineIndicator />
				{showWelcome && (
					<Welcome
						onStartDemo={handleWelcomeStartDemo}
						onSelectFolder={() => {
							modalControls.openFolder();
							uiActions.setShowWelcome(false);
						}}
						onClose={() => uiActions.setShowWelcome(false)}
					/>
				)}

				<FirstRunSetup
					open={!dir && showOnboarding}
					onClose={() => {
						setShowOnboarding(false);
						try {
							localStorage.setItem("hasSeenOnboarding", "true");
						} catch {}
					}}
					onQuickStart={handleFirstRunQuickStart}
					onCustom={handleFirstRunCustom}
					onDemo={handleFirstRunDemo}
					onTour={modalControls.openHelp}
				/>

				<ResultsConfigProvider
					value={{
						resultView,
						setResultView,
						timelineBucket,
						setTimelineBucket,
					}}
				>
					<AppShell
						showModernSidebar={showModernSidebar}
						isMobile={isMobile}
						sidebarStats={{
							totalPhotos: library?.length || 0,
							collections: Object.keys(collections || {}).length,
							people: (clusters || []).length,
							favorites: fav.length,
						}}
						darkMode={themeMode === "dark"}
						onDarkModeToggle={() =>
							setThemeMode(themeMode === "dark" ? "light" : "dark")
						}
						onSettingsClick={() => setShowAccessibilityPanel(true)}
						selectedView={viewToPath(location.pathname) as View}
						onViewChange={(view) => navigate(viewToPath(view as View))}
						onSelectLibrary={modalControls.openFolder}
						collections={collections as Record<string, string[]>}
						onOpenCollection={(collectionName) => {
							navigate(viewToPath("collections"));
							console.log(`Opening collection: ${collectionName}`);
						}}
						dir={dir ?? undefined}
						topBarProps={{
							searchText,
							setSearchText,
							onSearch: doSearchImmediate,
							clusters: clusters || [],
							allTags: allTags || [],
							meta: meta || { cameras: [], places: [] },
							busy: Boolean(busy),
							gridSize,
							setGridSize,
							selectedView: viewToPath(location.pathname) as ViewType,
							setSelectedView: (view) =>
								navigate(viewToPath(String(view) as View)),
							currentFilter,
							setCurrentFilter,
							ratingMin,
							setRatingMin,
							setShowFilters,
							selected,
							setSelected,
							dir: dir || "",
							engine,
							topK,
							useOsTrash: Boolean(settingsActions.setUseOsTrash),
							showInfoOverlay,
							onToggleInfoOverlay: settingsActions.setShowInfoOverlay
								? () => settingsActions.setShowInfoOverlay(!showInfoOverlay)
								: () => {},
							photoActions,
							uiActions,
							indexedCount: diag?.engines?.[0]?.count,
							indexedTotal: library?.length,
							coveragePct: indexCoverage,
							indexStatus: libState.indexStatus,
							isIndexing: libState.isIndexing,
							onIndex: () => lib.index(),
							activeJobs: jobs.filter((job) => job.status === "running").length,
							onOpenJobs: modalControls.openJobs,
							progressPct: libState.progressPct,
							etaSeconds: libState.etaSeconds,
							paused: libState.paused,
							tooltip: libState.tip,
							ocrReady,
							onOpenSearchOverlay: modalControls.openSearch,
							onPause: async () => {
								try {
									await lib.pause?.(dir ?? undefined);
								} catch {}
							},
							onResume: async () => {
								try {
									await lib.resume?.(dir ?? undefined);
								} catch {}
							},
							onOpenThemeModal: modalControls.openTheme,
							onOpenDiagnostics: modalControls.openDiagnostics,
							toastTimerRef,
							setToast,
							enableDemoLibrary,
							onLibraryChange: settingsActions.setDir,
						}}
						quickActions={{
							prefersReducedMotion,
							onOpenAccessibility: () => setShowAccessibilityPanel(true),
							onOpenOnboarding: () => setShowOnboardingTour(true),
							showHelpHint,
							onDismissHelpHint: dismissHelpHint,
						}}
					>
						<main
							id="main-content"
							className="flex-1 overflow-auto"
							ref={scrollContainerRef}
							aria-label="Main content"
						>
							<ResultsUIProvider
								value={{
									selected,
									setSelected,
									toggleSelect,
									focusIdx,
									setFocusIdx,
									detailIdx,
									setDetailIdx,
									layoutRowsRef,
									setLayoutRows,
								}}
							>
								<Suspense fallback={<SuspenseFallback label="Loading…" />}>
									<RoutesHost
										dir={dir}
										engine={engine}
										library={library}
										libState={{
											isIndexing: libState.isIndexing,
											progressPct: libState.progressPct || 0,
											etaSeconds: libState.etaSeconds || 0,
										}}
										results={results.map((r) => ({
											path: r.path,
											score: r.score,
										}))}
										searchText={searchText}
										altSearch={
											altSearch || { active: false, applied: "", original: "" }
										}
										ratingMap={ratingMap}
										showInfoOverlay={showInfoOverlay}
										busy={Boolean(busy)}
										selected={selected}
										tagsMap={tagsMap}
										smart={smart}
										topK={topK}
										query={query}
										favOnly={favOnly}
										tagFilter={tagFilter}
										useCaps={useCaps}
										useOcr={useOcr}
										hasText={hasText}
										camera={camera}
										isoMin={String(isoMin || "")}
										isoMax={String(isoMax || "")}
										fMin={String(fMin || "")}
										fMax={String(fMax || "")}
										place={place}
										persons={persons}
										hasMore={libHasMore}
										isLoading={Boolean(busy)}
										onSelectLibrary={modalControls.openFolder}
										onRunDemo={handleWelcomeStartDemo}
										onOpenHelp={modalControls.openHelp}
										onLoadLibrary={loadLibrary}
										onCompleteOnboardingStep={completeOnboardingStep}
										onToggleSelect={toggleSelect}
										onOpen={(path) => {
											const idx = (library || []).findIndex((p) => p === path);
											if (idx >= 0) setDetailIdx(idx);
										}}
										openDetailByPath={openDetailByPath}
										scrollContainerRef={scrollContainerRef}
										setSearchText={setSearchText}
										onSearchNow={doSearchImmediate}
										onLayout={(rows: number[][]) => setLayoutRows(rows)}
										onOpenFilters={() => setShowFilters(true)}
										onOpenAdvanced={() => {
											/* TODO: Open advanced search modal */
										}}
										setSmart={photoActions.setSmart}
										setResults={photoActions.setResults}
										setSearchId={photoActions.setSearchId}
										setNote={uiActions.setNote}
										setBusy={uiActions.setBusy}
										setTopK={photoActions.setTopK}
									/>
								</Suspense>
								<StatsBar
									items={items}
									note={note}
									diag={diag}
									engine={engine}
								/>

								<PanelsHost
									dir={dir}
									engine={engine}
									results={results.map((r) => ({
										path: r.path,
										score: r.score,
									}))}
									detailIdx={detailIdx}
									showFilters={showFilters}
									favOnly={favOnly}
									tagFilter={tagFilter}
									camera={camera}
									isoMin={isoMin}
									isoMax={isoMax}
									dateFrom={dateFrom}
									dateTo={dateTo}
									fMin={fMin}
									fMax={fMax}
									place={place}
									useCaps={useCaps}
									useOcr={useOcr}
									hasText={hasText}
									ratingMin={ratingMin}
									availableCameras={meta?.cameras || []}
									yearRange={[2020, new Date().getFullYear()]}
									filterPresets={filterPresets}
									onCloseFilters={() => setShowFilters(false)}
									onApplyFilters={() => {
										setShowFilters(false);
										doSearchImmediate(searchText);
									}}
									onSetFavOnly={photoActions.setFavOnly}
									onSetTagFilter={photoActions.setTagFilter}
									onSetCamera={settingsActions.setCamera}
									onSetIsoMin={(value: number) =>
										settingsActions.setIsoMin(value)
									}
									onSetIsoMax={(value: number) =>
										settingsActions.setIsoMax(value)
									}
									onSetDateFrom={setDateFrom}
									onSetDateTo={setDateTo}
									onSetFMin={(value: number) => settingsActions.setFMin(value)}
									onSetFMax={(value: number) => settingsActions.setFMax(value)}
									onSetPlace={settingsActions.setPlace}
									onSetUseCaps={settingsActions.setUseCaps}
									onSetUseOcr={settingsActions.setUseOcr}
									onSetHasText={settingsActions.setHasText}
									onSetRatingMin={setRatingMin}
									onSavePreset={savePreset}
									onLoadPreset={loadPreset}
									onDeletePreset={deletePreset}
									onNavDetail={navDetail}
									onCloseDetail={() => setDetailIdx(null)}
									onReveal={async (path: string) => {
										try {
											if (dir) await apiOpen(dir, path);
										} catch (error) {
											console.error("Failed to reveal file:", error);
										}
									}}
									onFavorite={async (path: string) => {
										try {
											if (dir) {
												await apiSetFavorite(dir, path, !fav.includes(path));
												await loadFav();
											}
										} catch (error) {
											console.error("Failed to favorite:", error);
										}
									}}
									onMoreLikeThis={async (path: string) => {
										try {
											if (!dir) return;
											uiActions.setBusy("Searching similar…");
											const response = await apiSearchLike(
												dir,
												path,
												engine,
												topK,
											);
											photoActions.setResults(response.results || []);
											navigate("/search");
										} catch (error) {
											uiActions.setNote(
												error instanceof Error
													? error.message
													: "Search failed",
											);
										} finally {
											uiActions.setBusy("");
										}
									}}
								/>

								<JobsFab onOpenJobs={modalControls.openJobs} />

								<OverlayLayer busy={busy} note={note} />

								<AuthTokenBar
									authRequired={authRequired}
									authTokenInput={authTokenInput}
									onAuthTokenInputChange={setAuthTokenInput}
									onSaveToken={async () => {
										const token = authTokenInput.trim();
										if (!token) return;
										try {
											localStorage.setItem("api_token", token);
										} catch {}
										const ok = await apiAuthCheck(token);
										if (ok) {
											setAuthRequired(false);
											setAuthTokenInput("");
											uiActions.setNote("Token accepted.");
										} else {
											uiActions.setNote("Token rejected, check API_TOKEN.");
										}
									}}
								/>

								<StatusBar
									photoCount={library?.length || 0}
									indexedCount={library?.length || 0}
									searchProvider={engine}
									isIndexing={libState.isIndexing}
									isConnected={isConnected}
									currentDirectory={dir}
									activeJobs={
										jobs.filter((job) => job.status === "running").length
									}
								/>

								<JobsCenter
									jobs={jobs}
									onPause={(jobId) => jobsActions.setStatus(jobId, "paused")}
									onResume={(jobId) => jobsActions.setStatus(jobId, "running")}
									onCancel={async (jobId) => {
										try {
											await apiCancelJob(jobId);
											jobsActions.setStatus(jobId, "cancelled");
										} catch (error) {
											console.error("Failed to cancel job:", error);
											// Still update local state even if API call fails
											jobsActions.setStatus(jobId, "cancelled");
										}
									}}
									onRetry={(jobId) => jobsActions.setStatus(jobId, "queued")}
									onClear={(jobId) => jobsActions.remove(jobId)}
									onClearAll={() => jobsActions.clearStopped()}
								/>

								<BottomNavigation
									activeTab={bottomNavTab}
									onTabChange={(tab) => {
										setBottomNavTab(tab);
										switch (tab) {
											case "home":
												navigate("/library");
												break;
											case "search":
												navigate("/search");
												break;
											case "favorites":
												navigate("/search");
												photoActions.setFavOnly(true);
												break;
											case "settings":
												navigate("/library");
												break;
										}
									}}
									onShowFilters={() => setShowFilters(true)}
									onShowUpload={modalControls.openFolder}
									onShowLibrary={modalControls.openFolder}
									showSecondaryActions
								/>

								<ContextualHelp
									isVisible={showContextualHelp}
									onDismiss={() => setShowContextualHelp(false)}
									context={
										viewToPath(location.pathname) as unknown as
											| "search"
											| "library"
											| "results"
											| "settings"
											| "collections"
									}
									userActions={userActions as string[]}
								/>

								<OnboardingChecklist
									isVisible={showOnboardingChecklist && !showOnboardingTour}
									onComplete={() => {
										setShowOnboardingChecklist(false);
										try {
											localStorage.setItem("onboardingComplete", "true");
										} catch {}
									}}
									completedSteps={onboardingSteps as string[]}
									inProgressStepId={
										libState.isIndexing ? "index_photos" : undefined
									}
									onStepAction={(step) => {
										switch (step) {
											case "select_directory":
												navigate("/library");
												modalControls.openFolder();
												break;
											case "index_photos":
												navigate("/library");
												if (!dir) modalControls.openFolder();
												else lib.index();
												break;
											case "first_search":
												navigate("/search");
												pushToast({
													message: "Try searching for photos",
													description:
														"Try searching: beach sunset, birthday cake, mountain hike",
												});
												break;
											case "explore_features":
												navigate("/collections");
												pushToast({
													message: "Explore app features",
													description:
														"Explore collections, favorites, and sharing",
												});
												break;
										}
									}}
								/>

								<PerformanceMonitor />

								<ErrorBoundary componentName="RecentActivityPanel">
									{showRecentActivity && (
										<RecentActivityPanel
											onClose={() => setShowRecentActivity(false)}
										/>
									)}
								</ErrorBoundary>

								<ErrorBoundary componentName="SearchHistoryPanel">
									{showSearchHistory && (
										<SearchHistoryPanel
											onSearch={(query) => {
												setSearchText(query);
												doSearchImmediate(query);
											}}
											onClose={() => setShowSearchHistory(false)}
										/>
									)}
								</ErrorBoundary>
							</ResultsUIProvider>
						</main>

						{/* ModalManager moved outside main content to remain mounted across route changes */}
						<ModalsHost />
					</AppShell>
				</ResultsConfigProvider>

				{showAccessibilityPanel && (
					<AccessibilityPanel
						isOpen={showAccessibilityPanel}
						onClose={() => setShowAccessibilityPanel(false)}
						onSettingsChange={handleAccessibilitySettingsChange}
					/>
				)}

				{showOnboardingTour && (
					<OnboardingTour
						isActive={showOnboardingTour}
						onComplete={handleOnboardingComplete}
						onSkip={() => setShowOnboardingTour(false)}
					/>
				)}

				<AppWithHints
					searchText={searchText}
					selected={selected}
					showAccessibilityPanel={showAccessibilityPanel}
					setShowAccessibilityPanel={setShowAccessibilityPanel}
					handleAccessibilitySettingsChange={handleAccessibilitySettingsChange}
					showOnboardingTour={showOnboardingTour}
					handleOnboardingComplete={handleOnboardingComplete}
					setShowOnboardingTour={setShowOnboardingTour}
				/>
			</div>
		</MobileOptimizations>
	);

	return <HintManager>{chrome}</HintManager>;
}
