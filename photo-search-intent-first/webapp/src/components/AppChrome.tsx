import clsx from "clsx";
import type { MutableRefObject, RefObject } from "react";
import { Suspense } from "react";
import { lazy } from "react";
import {
  Navigate,
  Route,
  Routes,
  type Location,
  type NavigateFunction,
} from "react-router-dom";

import { HintManager, useHintTriggers } from "./HintSystem";
import { MobileOptimizations } from "./MobileOptimizations";
import MobilePWATest from "./MobilePWATest";
import ShareViewer from "./ShareViewer";
import FirstRunSetup from "./modals/FirstRunSetup";
import { AppShell } from "./AppShell";
import { SuspenseFallback } from "./SuspenseFallback";
import { StatsBar } from "./StatsBar";
import { FilterPanel } from "./FilterPanel";
import { ModalManager } from "./ModalManager";
import { ModalDataProvider } from "../contexts/ModalDataContext";
import { VideoLightbox } from "./VideoLightbox";
import { Lightbox } from "./Lightbox";
import { OverlayLayer } from "./OverlayLayer";
import { StatusBar } from "./StatusBar";
import { BottomNavigation } from "./BottomNavigation";
import { ContextualHelp, OnboardingChecklist } from "./ProgressiveOnboarding";
import { RecentActivityPanel } from "./RecentActivityPanel";
import { SearchHistoryPanel } from "./SearchHistoryPanel";
import { JobsCenter, type Job } from "./JobsCenter";
import { OfflineIndicator } from "./OfflineIndicator";
import {
  AccessibilityPanel,
  type AccessibilitySettings,
} from "./AccessibilityPanel";
import { OnboardingTour } from "./OnboardingTour";
import ErrorBoundary from "./ErrorBoundary";
import PerformanceMonitor from "./PerformanceMonitor";

import {
  ResultsConfigProvider,
  type ResultView,
} from "../contexts/ResultsConfigContext";
import { ResultsUIProvider } from "../contexts/ResultsUIContext";
import type { LibraryActions, LibraryState } from "../contexts/LibraryContext";
import type { ModalControls } from "../hooks/useModalControls";

import { CollectionsViewContainer } from "../views/CollectionsViewContainer";
import { LibraryView as LibraryContainer } from "../views/LibraryView";
import { PeopleViewContainer } from "../views/PeopleViewContainer";
import { ResultsView } from "../views/ResultsView";
import { SavedViewContainer } from "../views/SavedViewContainer";

const MapView = lazy(() => import("./MapView"));
const SmartCollections = lazy(() => import("./SmartCollections"));
const TripsView = lazy(() => import("./TripsView"));
const VideoManager = lazy(() =>
  import("./VideoManager").then((m) => ({
    default: m.VideoManager,
  }))
);

import { VideoService } from "../services/VideoService";
import { apiAuthCheck, apiOpen, apiSearchLike, apiSetFavorite } from "../api";
import { isMobileTestPath, isSharePath, viewToPath } from "../utils/router";

interface LayoutProps {
  isMobile: boolean;
  showModernSidebar: boolean;
  setShowModernSidebar: (value: boolean) => void;
  handleSwipeLeft: () => void;
  handleSwipeRight: () => void;
  handlePullToRefresh: () => void;
  accessibilitySettings: AccessibilitySettings | null;
  showAccessibilityPanel: boolean;
  setShowAccessibilityPanel: (value: boolean) => void;
  prefersReducedMotion: boolean;
  themeMode: string;
  setThemeMode: (mode: string) => void;
  highContrast: boolean;
}

interface OnboardingProps {
  showWelcome: boolean;
  enableDemoLibrary: boolean;
  handleWelcomeStartDemo: () => Promise<void>;
  showOnboarding: boolean;
  setShowOnboarding: (value: boolean) => void;
  handleFirstRunQuickStart: (paths: string[]) => Promise<void>;
  handleFirstRunCustom: () => void;
  handleFirstRunDemo: () => Promise<void>;
  handleOnboardingComplete: () => void;
  showOnboardingTour: boolean;
  setShowOnboardingTour: (value: boolean) => void;
  showHelpHint: boolean;
  dismissHelpHint: () => void;
  userActions: unknown;
  onboardingSteps: unknown;
  completeOnboardingStep: (stepId: string) => void;
  showContextualHelp: boolean;
  setShowContextualHelp: (value: boolean) => void;
  showOnboardingChecklist: boolean;
  setShowOnboardingChecklist: (value: boolean) => void;
}

interface ViewStateProps {
  searchText: string;
  setSearchText: (value: string) => void;
  selected: Set<string>;
  setSelected: (value: Set<string>) => void;
  toggleSelect: (path: string) => void;
  gridSize: "small" | "medium" | "large";
  setGridSize: (size: "small" | "medium" | "large") => void;
  resultView: ResultView;
  setResultView: (view: ResultView) => void;
  timelineBucket: "day" | "week" | "month";
  setTimelineBucket: (bucket: "day" | "week" | "month") => void;
  currentFilter: string;
  setCurrentFilter: (value: string) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  ratingMin: number;
  setRatingMin: (value: number) => void;
  detailIdx: number | null;
  setDetailIdx: (value: number | null) => void;
  focusIdx: number | null;
  setFocusIdx: (value: number | null) => void;
  layoutRows: number[][];
  setLayoutRows: (rows: number[][]) => void;
  setIsMobileMenuOpen: (value: boolean) => void;
  showRecentActivity: boolean;
  setShowRecentActivity: (value: boolean) => void;
  showSearchHistory: boolean;
  setShowSearchHistory: (value: boolean) => void;
  bottomNavTab: "home" | "search" | "favorites" | "settings";
  setBottomNavTab: (tab: "home" | "search" | "favorites" | "settings") => void;
  authRequired: boolean;
  setAuthRequired: (value: boolean) => void;
  authTokenInput: string;
  setAuthTokenInput: (value: string) => void;
}

interface DataProps {
  dir: string | null;
  engine: string;
  hfToken: string;
  openaiKey: string;
  useFast: boolean;
  fastKind: string;
  useCaps: boolean;
  useOcr: boolean;
  hasText: boolean;
  place: string;
  camera: string;
  isoMin: number;
  isoMax: number;
  fMin: number;
  fMax: number;
  tagFilter: string;
  allTags: string[];
  needsHf: boolean;
  needsOAI: boolean;
  results: { path: string; score?: number }[];
  query: string;
  fav: string[];
  favOnly: boolean;
  topK: number;
  saved: Array<{ name: string; query: string; top_k?: number }>;
  collections: Record<string, unknown>;
  smart: Record<string, unknown>;
  library: string[];
  libHasMore: boolean;
  tagsMap: Record<string, string[]>;
  persons: string[];
  clusters: unknown[];
  points: unknown[];
  diag: any;
  meta: { cameras: string[]; places?: string[] };
  busy: string;
  note: string;
  ocrReady: boolean;
  ocrTextCount?: number;
  presets: { name: string; query: string }[];
  altSearch: unknown;
  ratingMap: Record<string, number>;
  jobs: Job[];
  libState: LibraryState;
  showInfoOverlay: boolean;
  highContrast: boolean;
  isConnected: boolean;
  items: { path: string; score?: number }[];
  hasAnyFilters: boolean;
  indexCoverage?: number;
}

interface ActionProps {
  handleAccessibilitySettingsChange: (settings: AccessibilitySettings) => void;
  doSearchImmediate: (text?: string) => Promise<void>;
  loadFav: () => Promise<void>;
  loadSaved: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadDiag: () => Promise<void>;
  loadFaces: () => Promise<void>;
  loadMap: () => Promise<void>;
  loadLibrary: (
    limit?: number,
    offset?: number,
    append?: boolean
  ) => Promise<void>;
  loadMetadata: () => Promise<void>;
  loadPresets: () => Promise<void>;
  prepareFast: (kind: "annoy" | "faiss" | "hnsw") => Promise<void>;
  buildOCR: () => Promise<void>;
  buildMetadata: () => Promise<void>;
  monitorOperation: (
    jobId: string,
    operation: "ocr" | "metadata" | "fast_index"
  ) => () => void;
  openDetailByPath: (path: string) => void;
  navDetail: (delta: number) => void;
  tagSelected: (tagText: string) => Promise<void>;
  exportSelected: (dest: string) => Promise<void>;
  handlePhotoOpen: (path: string) => void;
  handlePhotoAction: (
    action: string,
    photo: { path: string } & Partial<import("../models/PhotoMeta").PhotoMeta>
  ) => void;
  setRatingSelected: (rating: 0 | 1 | 2 | 3 | 4 | 5) => Promise<void>;
  rowsEqual: (a: number[][], b: number[][]) => boolean;
}

interface ContextProps {
  settingsActions: any;
  photoActions: any;
  uiActions: any;
  workspaceActions: any;
  modalControls: ModalControls;
  lib: LibraryActions;
  jobsActions: any;
  pushToast: (toast: any) => void;
  setToast: (
    toast: {
      message: string;
      actionLabel?: string;
      onAction?: () => void;
    } | null
  ) => void;
  filterPresets: { name: string; query: string }[];
  savePreset: (preset: { name: string; query: string }) => void;
  loadPreset: (name: string) => void;
  deletePreset: (name: string) => void;
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
  layout: LayoutProps;
  onboarding: OnboardingProps;
  viewState: ViewStateProps;
  data: DataProps;
  actions: ActionProps;
  context: ContextProps;
  refs: RefProps;
}

interface AppWithHintsProps {
  searchText: string;
  selected: Set<string>;
  showAccessibilityPanel: boolean;
  setShowAccessibilityPanel: (value: boolean) => void;
  handleAccessibilitySettingsChange: (settings: AccessibilitySettings) => void;
  showOnboardingTour: boolean;
  handleOnboardingComplete: () => void;
  setShowOnboardingTour: (value: boolean) => void;
}

function AppWithHints({
  searchText,
  selected,
  showAccessibilityPanel,
  setShowAccessibilityPanel,
  handleAccessibilitySettingsChange,
  showOnboardingTour,
  handleOnboardingComplete,
  setShowOnboardingTour,
}: AppWithHintsProps) {
  const { triggerHint } = useHintTriggers();

  if (searchText?.trim()) {
    triggerHint("search-success");
  }

  if (selected.size > 1) {
    triggerHint("multiple-photos-selected");
  } else if (selected.size === 1) {
    triggerHint("photo-selected");
  }

  return (
    <>
      {showAccessibilityPanel && (
        <AccessibilityPanel
          isOpen={showAccessibilityPanel}
          onClose={() => setShowAccessibilityPanel(false)}
          onSettingsChange={handleAccessibilitySettingsChange}
        />
      )}
    </>
  );
}

export function AppChrome({
  location,
  navigate,
  layout,
  onboarding,
  viewState,
  data,
  actions,
  context,
  refs,
}: AppChromeProps) {
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
    highContrast,
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
    layoutRows,
    setLayoutRows,
    setIsMobileMenuOpen,
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
    hfToken,
    openaiKey,
    useFast,
    fastKind,
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
    needsHf,
    needsOAI,
    results,
    query,
    fav,
    favOnly,
    topK,
    saved,
    collections,
    smart,
    library,
    libHasMore,
    tagsMap,
    persons,
    clusters,
    points,
    diag,
    meta,
    busy,
    note,
    ocrReady,
    ocrTextCount,
    presets,
    altSearch,
    ratingMap,
    jobs,
    libState,
    showInfoOverlay,
    isConnected,
    items,
    hasAnyFilters,
    indexCoverage,
  } = data;

  const {
    handleAccessibilitySettingsChange,
    doSearchImmediate,
    loadFav,
    loadSaved,
    loadTags,
    loadDiag,
    loadFaces,
    loadMap,
    loadLibrary,
    loadMetadata,
    loadPresets,
    prepareFast,
    buildOCR,
    buildMetadata,
    monitorOperation,
    openDetailByPath,
    navDetail,
    tagSelected,
    exportSelected,
    handlePhotoOpen,
    handlePhotoAction,
    setRatingSelected,
    rowsEqual,
  } = actions;

  const {
    settingsActions,
    photoActions,
    uiActions,
    workspaceActions,
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
          }
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
            collections={collections}
            onOpenCollection={(collectionName) => {
              navigate(viewToPath("collections"));
              console.log(`Opening collection: ${collectionName}`);
            }}
            dir={dir}
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
              setIsMobileMenuOpen,
              setShowFilters,
              selected,
              setSelected,
              dir,
              engine,
              topK,
              useOsTrash: Boolean(settingsActions.setUseOsTrash),
              showInfoOverlay,
              onToggleInfoOverlay: settingsActions.setShowInfoOverlay
                ? () => settingsActions.setShowInfoOverlay(!showInfoOverlay)
                : undefined,
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
                  <Routes>
                    <Route
                      path="/people"
                      element={
                        <PeopleViewContainer
                          onOpenHelp={modalControls.openHelp}
                        />
                      }
                    />
                    <Route
                      path="/collections"
                      element={
                        <CollectionsViewContainer
                          onOpenHelp={modalControls.openHelp}
                        />
                      }
                    />
                    <Route
                      path="/library"
                      element={
                        <LibraryContainer
                          dir={dir}
                          library={library}
                          isIndexing={libState.isIndexing}
                          progressPct={libState.progressPct}
                          etaSeconds={libState.etaSeconds}
                          onSelectLibrary={modalControls.openFolder}
                          onRunDemo={handleWelcomeStartDemo}
                          onOpenHelp={modalControls.openHelp}
                          onLoadLibrary={loadLibrary}
                          hasMore={libHasMore}
                          isLoading={Boolean(busy)}
                          selected={selected}
                          onToggleSelect={toggleSelect}
                          onOpen={(path) => {
                            const idx = (library || []).findIndex(
                              (p) => p === path
                            );
                            if (idx >= 0) setDetailIdx(idx);
                          }}
                          tagsMap={tagsMap}
                        />
                      }
                    />
                    <Route
                      path="/search"
                      element={
                        <ResultsView
                          dir={dir}
                          engine={engine}
                          results={results.map((r) => ({
                            path: r.path,
                            score: r.score,
                          }))}
                          searchText={searchText}
                          altSearch={altSearch}
                          ratingMap={ratingMap}
                          showInfoOverlay={showInfoOverlay}
                          isLoading={Boolean(busy)}
                          openDetailByPath={openDetailByPath}
                          scrollContainerRef={scrollContainerRef}
                          setSearchText={setSearchText}
                          onSearchNow={doSearchImmediate}
                          onLayout={(rows) =>
                            setLayoutRows((prev) =>
                              rowsEqual(prev, rows) ? prev : rows
                            )
                          }
                          onOpenHelp={modalControls.openHelp}
                          onOpenFilters={() => setShowFilters(true)}
                          onOpenAdvanced={() => {
                            /* TODO: Open advanced search modal */
                          }}
                        />
                      }
                    />
                    <Route
                      path="/map"
                      element={
                        <div className="p-4">
                          <MapView
                            dir={dir || ""}
                            engine={engine || "default"}
                            points={points || []}
                            onLoadMap={loadMap}
                            selectedPhotos={selected}
                            onPhotoSelect={toggleSelect}
                            onPhotoOpen={handlePhotoOpen}
                          />
                        </div>
                      }
                    />
                    <Route
                      path="/smart"
                      element={
                        <div className="p-4">
                          <SmartCollections
                            dir={dir}
                            engine={engine}
                            topK={topK}
                            smart={smart}
                            setSmart={photoActions.setSmart}
                            setResults={photoActions.setResults}
                            setSearchId={photoActions.setSearchId}
                            setNote={uiActions.setNote}
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
                          />
                        </div>
                      }
                    />
                    <Route
                      path="/trips"
                      element={
                        <div className="p-4">
                          <TripsView
                            dir={dir}
                            engine={engine}
                            setBusy={uiActions.setBusy}
                            setNote={uiActions.setNote}
                            setResults={photoActions.setResults}
                          />
                        </div>
                      }
                    />
                    <Route
                      path="/videos"
                      element={
                        <div className="p-4">
                          <VideoManager currentDir={dir} provider={engine} />
                        </div>
                      }
                    />
                    <Route
                      path="/saved"
                      element={
                        <SavedViewContainer
                          onRun={(_name, q, k) => {
                            if (q) setSearchText(q);
                            if (k) photoActions.setTopK(k);
                            doSearchImmediate(q);
                          }}
                          onOpenHelp={modalControls.openHelp}
                        />
                      }
                    />
                    <Route
                      path="/"
                      element={<Navigate to="/library" replace />}
                    />
                  </Routes>
                </Suspense>
                <StatsBar
                  items={items}
                  note={note}
                  diag={diag}
                  engine={engine}
                />

                <FilterPanel
                  show={showFilters}
                  onClose={() => setShowFilters(false)}
                  onApply={() => {
                    setShowFilters(false);
                    doSearchImmediate(searchText);
                  }}
                  favOnly={favOnly}
                  setFavOnly={photoActions.setFavOnly}
                  tagFilter={tagFilter}
                  setTagFilter={photoActions.setTagFilter}
                  camera={camera}
                  setCamera={settingsActions.setCamera}
                  isoMin={String(isoMin || "")}
                  setIsoMin={(value: string) =>
                    settingsActions.setIsoMin(parseFloat(value) || 0)
                  }
                  isoMax={String(isoMax || "")}
                  setIsoMax={(value: string) =>
                    settingsActions.setIsoMax(parseFloat(value) || 0)
                  }
                  dateFrom={dateFrom}
                  setDateFrom={setDateFrom}
                  dateTo={dateTo}
                  setDateTo={setDateTo}
                  fMin={String(fMin || "")}
                  setFMin={(value: string) =>
                    settingsActions.setFMin(parseFloat(value) || 0)
                  }
                  fMax={String(fMax || "")}
                  setFMax={(value: string) =>
                    settingsActions.setFMax(parseFloat(value) || 0)
                  }
                  place={place}
                  setPlace={settingsActions.setPlace}
                  useCaps={useCaps}
                  setUseCaps={settingsActions.setUseCaps}
                  useOcr={useOcr}
                  setUseOcr={settingsActions.setUseOcr}
                  hasText={hasText}
                  setHasText={settingsActions.setHasText}
                  ratingMin={ratingMin}
                  setRatingMin={setRatingMin}
                  person=""
                  setPerson={() => {}}
                  collection=""
                  setCollection={() => {}}
                  color=""
                  setColor={() => {}}
                  orientation=""
                  setOrientation={() => {}}
                  availableCameras={meta?.cameras || []}
                  yearRange={[2020, new Date().getFullYear()]}
                  filterPresets={filterPresets}
                  onSavePreset={savePreset}
                  onLoadPreset={loadPreset}
                  onDeletePreset={deletePreset}
                />

                <ModalDataProvider
                  data={{
                    selected,
                    dir,
                    engine,
                    topK,
                    highContrast,
                    useFast,
                    fastKind,
                    useCaps,
                    useOcr,
                    hasText,
                    useOsTrash: Boolean(settingsActions.setUseOsTrash),
                    searchText,
                    query,
                    collections,
                    clusters,
                    allTags,
                    meta,
                  }}
                  actions={{
                    settingsActions,
                    uiActions: {
                      setBusy: uiActions.setBusy,
                      setNote: uiActions.setNote,
                    },
                    photoActions: {
                      setResults: photoActions.setResults,
                      setSaved: photoActions.setSaved,
                      setCollections: photoActions.setCollections,
                    },
                    libIndex: () => lib.index(),
                    prepareFast,
                    buildOCR,
                    buildMetadata,
                    tagSelected,
                  }}
                >
                  <ModalManager />
                </ModalDataProvider>

                {detailIdx !== null &&
                  results &&
                  results[detailIdx] &&
                  (VideoService.isVideoFile(results[detailIdx].path) ? (
                    <VideoLightbox
                      videoPath={results[detailIdx].path}
                      videoUrl={`/api/media/${encodeURIComponent(
                        results[detailIdx].path
                      )}`}
                      onPrevious={() => navDetail(-1)}
                      onNext={() => navDetail(1)}
                      onClose={() => setDetailIdx(null)}
                    />
                  ) : (
                    <Lightbox
                      dir={dir}
                      engine={engine}
                      path={results[detailIdx].path}
                      onPrev={() => navDetail(-1)}
                      onNext={() => navDetail(1)}
                      onClose={() => setDetailIdx(null)}
                      onReveal={async () => {
                        try {
                          const path =
                            results && detailIdx !== null
                              ? results[detailIdx]?.path
                              : undefined;
                          if (path) await apiOpen(dir, path);
                        } catch {}
                      }}
                      onFavorite={async () => {
                        try {
                          const path =
                            results && detailIdx !== null
                              ? results[detailIdx]?.path
                              : undefined;
                          if (path) {
                            await apiSetFavorite(
                              dir,
                              path,
                              !fav.includes(path)
                            );
                            await loadFav();
                          }
                        } catch {}
                      }}
                      onMoreLikeThis={async () => {
                        try {
                          const path =
                            results && detailIdx !== null
                              ? results[detailIdx]?.path
                              : undefined;
                          if (!path) return;
                          uiActions.setBusy("Searching similar…");
                          const response = await apiSearchLike(
                            dir,
                            path,
                            engine,
                            topK
                          );
                          photoActions.setResults(response.results || []);
                          navigate("/search");
                        } catch (error) {
                          uiActions.setNote(
                            error instanceof Error
                              ? error.message
                              : "Search failed"
                          );
                        } finally {
                          uiActions.setBusy("");
                        }
                      }}
                    />
                  ))}

                <button
                  type="button"
                  onClick={modalControls.openJobs}
                  className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full shadow px-4 py-2"
                  title="Open Jobs"
                  aria-label="Open the jobs panel"
                >
                  Jobs
                </button>

                <OverlayLayer busy={busy} note={note} />

                {authRequired && (
                  <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-2 flex items-center gap-2 border-b border-amber-200 dark:border-amber-800">
                    <span className="text-sm">API requires token</span>
                    <input
                      type="password"
                      className="px-2 py-1 text-sm rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900"
                      placeholder="Enter token"
                      value={authTokenInput}
                      onChange={(event) =>
                        setAuthTokenInput(event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="text-sm px-2 py-1 bg-amber-600 text-white rounded"
                      onClick={async () => {
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
                          uiActions.setNote(
                            "Token rejected — check API_TOKEN."
                          );
                        }
                      }}
                    >
                      Save
                    </button>
                  </div>
                )}

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
                  onCancel={(jobId) =>
                    jobsActions.setStatus(jobId, "cancelled")
                  }
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
                  userActions={userActions}
                />

                <OnboardingChecklist
                  isVisible={showOnboardingChecklist && !showOnboardingTour}
                  onComplete={() => {
                    setShowOnboardingChecklist(false);
                    try {
                      localStorage.setItem("onboardingComplete", "true");
                    } catch {}
                  }}
                  completedSteps={onboardingSteps as any}
                  inProgressStepId={
                    libState.isIndexing ? "index_photos" : undefined
                  }
                  onStepComplete={() => {}}
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
                          description:
                            "Try searching: beach sunset, birthday cake, mountain hike",
                        });
                        break;
                      case "explore_features":
                        navigate("/collections");
                        pushToast({
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
