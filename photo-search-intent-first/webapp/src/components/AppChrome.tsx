import clsx from "clsx";
import type { MutableRefObject, RefObject } from "react";
import { lazy, memo, Suspense, useEffect, useMemo, useState } from "react";
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

// Removed unused lazy preloads (_MapView, _SmartCollections, _TripsView, _VideoManager)

import type { View } from "../App";
import {
  apiAuthCheck,
  apiCancelJob,
  apiOpen,
  apiSearchLike,
  apiSetFavorite,
} from "../api";
import { useHintTriggers } from "../components/HintSystem";
// Context hooks
import { useActionsContext } from "../contexts/ActionsContext";
import { useDataContext } from "../contexts/DataContext";
import { useJobsContext } from "../contexts/JobsContext";
import { useLayoutContext } from "../contexts/LayoutContext";
import { useOnboardingContext } from "../contexts/OnboardingContext";
import { useViewStateContext } from "../contexts/ViewStateContext";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import {
  useOnboardingProgress,
  useWelcomeState,
} from "../hooks/useOnboardingProgress";
import type { FilterPreset } from "../models/FilterPreset";
import { useOsTrashEnabled } from "../stores/settingsStore";
import {
  isMobileTestPath,
  isSharePath,
  pathToView,
  viewToPath,
} from "../utils/router";
import { AccessibilityPanel } from "./AccessibilityPanel";
import {
  AdaptiveResponsiveProvider,
  ViewportIndicator,
} from "./AdaptiveResponsiveLayout";
import { AppShell } from "./AppShell";
import { BottomNavigation } from "./BottomNavigation";
import { ContextualHelp } from "./ContextualHelp";
import { useJobMetrics } from "../hooks/useJobMetrics";
import { ContextualModalProvider } from "./ContextualModalSystem";
import { AuthTokenBar } from "./chrome/AuthTokenBar";
import { JobsFab } from "./chrome/JobsFab";
import { PanelsHost } from "./chrome/PanelsHost";
import { RoutesHost } from "./chrome/RoutesHost";
import { EmptyLibraryState } from "./EmptyLibraryState";
import ErrorBoundary from "./ErrorBoundary";
import { HintManager } from "./HintSystem";
import { IntentAwareWelcome } from "./IntentAwareWelcome";
import type { Job } from "./JobsCenter";
import { JobsCenter } from "./JobsCenter";
import { MobileOptimizations } from "./MobileOptimizations";
import { MobilePWATest } from "./MobilePWATest";
import { ModalSystemWrapper } from "./ModalSystemWrapper";
import AdvancedSearchModal from "./modals/AdvancedSearchModal";
import FirstRunSetup from "./modals/FirstRunSetup";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { OnboardingTour } from "./OnboardingTour";
import { OverlayLayer } from "./OverlayLayer";
import { EnhancedFirstRunOnboarding } from "./onboarding/EnhancedFirstRunOnboarding";
import PerformanceMonitor from "./PerformanceMonitor";
import { PowerUserPanel } from "./PowerUserPanel";
import { ActivityTray } from "./ActivityTray";
import { RecentActivityPanel } from "./RecentActivityPanel";
import { SearchHistoryPanel } from "./SearchHistoryPanel";
import { SearchTipsManager } from "./SearchTipsHint";
import ShareViewer from "./ShareViewer";
import { StatsBar } from "./StatsBar";
import { StatusBar } from "./StatusBar";
import { SuspenseFallback } from "./SuspenseFallback";
import type { ViewType } from "./TopBar";

type HelpContextValue =
  | "search"
  | "library"
  | "results"
  | "settings"
  | "collections";

const deriveTopBarView = (view: View): ViewType => {
  switch (view) {
    case "library":
    case "results":
    case "map":
    case "people":
    case "trips":
    case "tasks":
      return view;
    default:
      return "results";
  }
};

const deriveHelpContext = (view: View): HelpContextValue => {
  switch (view) {
    case "library":
      return "library";
    case "collections":
    case "smart":
      return "collections";
    case "results":
    case "saved":
    case "map":
    case "trips":
    case "videos":
    case "people":
      return "results";
    case "tasks":
      return "settings";
    default:
      return "search";
  }
};

interface AppWithHintsProps {
  searchText: string;
  selected: Set<string>;
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

interface EnhancedOnboardingResult {
  directory?: string;
  includeVideos?: boolean;
  enableDemo?: boolean;
  completedSteps?: string[];
}

const AppWithHints = memo(function AppWithHints({
  searchText,
  selected,
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

// Test window interface for optional hooks (kept narrow & tree-shakeable)
interface TestWindow extends Window {
  __TEST_COMPLETE_ONBOARDING__?: (
    payload: Partial<EnhancedOnboardingResult>
  ) => void;
  __JOBS_FAB_STATS__?: {
    activeJobsCount: number;
    indexingActive: boolean;
    indexingProgress?: number;
  };
  __JOBS_FAB_STATS_RECOMPUTES__?: number;
  __HINT_LOG__?: Array<{ id: string; ts: number }>; // future use
}

const isTestMode =
  typeof window !== "undefined" &&
  Boolean(
    (window as Partial<TestWindow> & { __TEST_MODE__?: boolean }).__TEST_MODE__
  );

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
  const jobsContext = useJobsContext();
  const onboarding = useOnboardingContext();
  const osTrashEnabled = useOsTrashEnabled();

  const { pathname } = location;
  const currentView = useMemo(() => pathToView(pathname), [pathname]);
  const topBarView = useMemo(
    () => deriveTopBarView(currentView),
    [currentView]
  );
  const helpContext = useMemo(
    () => deriveHelpContext(currentView),
    [currentView]
  );
  const isShareRoute = isSharePath(pathname);
  const isMobileTestRoute = isMobileTestPath(pathname);
  const jobsForFab = jobsContext.state.jobs;
  const jobMetrics = useJobMetrics(jobsForFab);
  // Enhanced onboarding state
  const {
    shouldShowOnboarding: shouldShowEnhancedOnboarding,
    hasCompletedOnboarding,
    markStepComplete,
  } = useOnboardingProgress();
  const { markWelcomeSeen } = useWelcomeState();

  const [showEnhancedOnboarding, setShowEnhancedOnboarding] = useState(false);
  const [showPowerUserPanel, setShowPowerUserPanel] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const { triggerHint } = useHintTriggers();

  // Initialize keyboard shortcuts system
  useKeyboardShortcuts();

  // Listen for power user panel events
  useEffect(() => {
    const handleOpenPowerUserPanel = () => setShowPowerUserPanel(true);
    window.addEventListener("open-power-user-panel", handleOpenPowerUserPanel);
    return () =>
      window.removeEventListener(
        "open-power-user-panel",
        handleOpenPowerUserPanel
      );
  }, []);

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
    hfToken, // Intent-First: keep for future API key handling
    openaiKey, // Intent-First: keep for future API key handling
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
    results,
    query,
    fav,
    favOnly,
    topK,
    collections,
    smart,
    library,
    libHasMore,
    tagsMap,
    persons,
    clusters,
    diag,
    meta,
    busy,
    note,
    ocrReady,
    ocrTextCount, // Intent-First: keep for future OCR features
    presets, // Intent-First: keep for future preset management
    hasAnyFilters, // Intent-First: keep for future filter state
  } = data;

  // Pull additional frequently used data fields from data context for clarity
  const {
    showInfoOverlay,
    isConnected,
    ratingMap,
    altSearch,
    jobs,
    libState,
    items,
    indexCoverage,
  } = data;

  const runningJobsCount = useMemo(
    () => jobs.filter((job) => job.status === "running").length,
    [jobs]
  );

  const {
    handleAccessibilitySettingsChange,
    doSearchImmediate,
    loadFav,
    loadLibrary,
    // Omitted unused actions for this chrome layer (loadSaved, loadTags, etc.)
    openDetailByPath,
    navDetail,
    // exportSelected, handlePhotoOpen, handlePhotoAction, setRatingSelected, rowsEqual not used here
  } = actions;

  const {
    settingsActions,
    photoActions,
    uiActions,
    // workspaceActions unused here
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
      const timeoutId = window.setTimeout(
        () => triggerHint("search-success"),
        1000
      );
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
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

  // Enhanced onboarding integration
  useEffect(() => {
    // Show enhanced onboarding if:
    // 1. User hasn't completed onboarding
    // 2. No directory is selected (first time setup)
    // 3. Enhanced onboarding should be shown based on progress tracking
    if (!hasCompletedOnboarding && !dir && shouldShowEnhancedOnboarding) {
      setShowEnhancedOnboarding(true);
    }
  }, [hasCompletedOnboarding, dir, shouldShowEnhancedOnboarding]);

  const handleEnhancedOnboardingComplete = (
    payload: EnhancedOnboardingResult
  ) => {
    // Mark onboarding as completed
    markStepComplete("welcome");
    markStepComplete("directory-selection");
    markStepComplete("options");
    markStepComplete("demo");
    markStepComplete("complete");

    // Handle the setup data from enhanced onboarding
    if (payload?.directory && typeof payload.directory === "string") {
      // Set the selected directory
      settingsActions.setDir(payload.directory);
    }

    if (typeof payload?.includeVideos === "boolean") {
      // Update video preferences when setter is available
      settingsActions.setIncludeVideos?.(payload.includeVideos);
    }

    if (payload?.enableDemo) {
      // Enable demo library
      handleWelcomeStartDemo();
    }

    // Close enhanced onboarding and mark welcome as seen
    setShowEnhancedOnboarding(false);
    markWelcomeSeen();

    // Show success message
    pushToast({
      message: "Setup complete!",
      description: "You're ready to start searching your photos.",
    });
  };

  const handleEnhancedOnboardingClose = () => {
    setShowEnhancedOnboarding(false);
    // Don't mark as completed - user can come back later
  };

  // Attach test onboarding completion hook once (guarded by isTestMode)
  // Attach test onboarding completion hook (kept stable for tests)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional controlled exposure
  useEffect(() => {
    if (!isTestMode) return;
    (window as TestWindow).__TEST_COMPLETE_ONBOARDING__ = (payload) => {
      handleEnhancedOnboardingComplete({ ...(payload || {}) });
    };
    return () => {
      if ((window as TestWindow).__TEST_COMPLETE_ONBOARDING__) {
        delete (window as TestWindow).__TEST_COMPLETE_ONBOARDING__;
      }
    };
  }, [isTestMode, handleEnhancedOnboardingComplete]);

  const chrome = (
    <MobileOptimizations
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      onSwipeUp={() => setShowModernSidebar(!showModernSidebar)}
      enableSwipeGestures={isMobile}
      enablePullToRefresh
      onPullToRefresh={handlePullToRefresh}
    >
      {isShareRoute && <ShareViewer />}
      {isMobileTestRoute && <MobilePWATest />}
      <div
        className={clsx(
          "flex h-screen bg-white dark:bg-gray-950 dark:text-gray-100",
          {
            "high-contrast": accessibilitySettings?.highContrast,
            "large-text": accessibilitySettings?.largeText,
            hidden: isShareRoute || isMobileTestRoute,
          }
        )}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Skip to main content
        </a>
        {showWelcome && (
          <IntentAwareWelcome
            onStartDemo={handleWelcomeStartDemo}
            onSelectFolder={() => {
              modalControls.openFolder();
              uiActions.setShowWelcome(false);
            }}
            onClose={() => uiActions.setShowWelcome(false)}
            onIntentDetected={(intent) => {
              console.log("User intent detected:", intent);
              // Could store intent for future personalization
              try {
                localStorage.setItem("userIntent", JSON.stringify(intent));
              } catch (e) {
                // ignore storage errors (quota / private mode)
              }
            }}
          />
        )}

        <FirstRunSetup
          open={!dir && showOnboarding && !showEnhancedOnboarding}
          onClose={() => {
            setShowOnboarding(false);
            try {
              localStorage.setItem("hasSeenOnboarding", "true");
            } catch (e) {
              // ignore storage errors
            }
          }}
          onQuickStart={handleFirstRunQuickStart}
          onCustom={handleFirstRunCustom}
          onDemo={handleFirstRunDemo}
          onTour={modalControls.openHelp}
        />

        <AdvancedSearchModal
          open={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          onApply={(query: string) => {
            setSearchText(query);
            doSearchImmediate(query);
            setShowAdvancedSearch(false);
          }}
          onSave={(name: string, query: string) => {
            // TODO: Implement saved search functionality
            console.log("Save search:", name, query);
            setShowAdvancedSearch(false);
          }}
          allTags={allTags || []}
          cameras={meta?.cameras || []}
          people={(clusters || [])
            .map((c) => c.name || "Unknown")
            .filter(Boolean)}
        />

        <EnhancedFirstRunOnboarding
          isOpen={showEnhancedOnboarding}
          onClose={handleEnhancedOnboardingClose}
          onComplete={handleEnhancedOnboardingComplete}
        />

        <PowerUserPanel
          isOpen={showPowerUserPanel}
          onClose={() => setShowPowerUserPanel(false)}
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
            data-selected-view={currentView}
            data-help-context={helpContext}
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
            onPowerUserClick={() => setShowPowerUserPanel(true)}
            selectedView={currentView}
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
              selectedView: topBarView,
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
              useOsTrash: osTrashEnabled,
              showInfoOverlay,
              onToggleInfoOverlay: settingsActions.setShowInfoOverlay
                ? () => settingsActions.setShowInfoOverlay?.(!showInfoOverlay)
                : () => {},
              photoActions,
              uiActions,
              indexedCount: diag?.engines?.[0]?.count,
              indexedTotal: library?.length,
              coveragePct: indexCoverage,
              indexStatus: libState.indexStatus,
              isIndexing: libState.isIndexing,
              onIndex: () => lib.index(),
              activeJobs: runningJobsCount,
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
                } catch {
                  // Ignore pause errors - UI state will be updated regardless
                }
              },
              onResume: async () => {
                try {
                  await lib.resume?.(dir ?? undefined);
                } catch {
                  // Ignore resume errors - UI state will be updated regardless
                }
              },
              onOpenThemeModal: modalControls.openTheme,
              onOpenDiagnostics: modalControls.openDiagnostics,
              toastTimerRef,
              setToast,
              enableDemoLibrary,
              onLibraryChange: (val: string | null) => {
                if (typeof val === "string") settingsActions.setDir(val);
              },
            }}
            quickActions={{
              prefersReducedMotion,
              onOpenAccessibility: () => setShowAccessibilityPanel(true),
              onOpenOnboarding: () => setShowOnboardingTour(true),
              showHelpHint,
              onDismissHelpHint: dismissHelpHint,
            }}
            footer={
              <StatusBar
                photoCount={library?.length || 0}
                indexedCount={library?.length || 0}
                searchProvider={engine}
                isIndexing={libState.isIndexing}
                isConnected={isConnected}
                currentDirectory={dir}
                activeJobs={runningJobsCount}
              />
            }
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
                  {library && library.length > 0 ? (
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
                      searchId={null} // TODO: Connect to actual search ID from search context
                      searchText={searchText}
                      altSearch={
                        altSearch || {
                          active: false,
                          applied: "",
                          original: "",
                        }
                      }
                      ratingMap={ratingMap}
                      showInfoOverlay={showInfoOverlay}
                      busy={Boolean(busy)}
                      selected={selected}
                      tagsMap={tagsMap}
                      allTags={allTags}
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
                        const idx = (library || []).findIndex(
                          (p) => p === path
                        );
                        if (idx >= 0) setDetailIdx(idx);
                      }}
                      openDetailByPath={openDetailByPath}
                      scrollContainerRef={scrollContainerRef}
                      setSearchText={setSearchText}
                      onSearchNow={doSearchImmediate}
                      onLayout={(rows: number[][]) => setLayoutRows(rows)}
                      onOpenFilters={() => setShowFilters(true)}
                      onOpenAdvanced={() => {
                        setShowAdvancedSearch(true);
                      }}
                      setSmart={photoActions.setSmart}
                      setResults={photoActions.setResults}
                      setSearchId={photoActions.setSearchId}
                      setNote={uiActions.setNote}
                      setBusy={(b: string | boolean) =>
                        uiActions.setBusy(
                          typeof b === "string" ? b : b ? "Busy" : ""
                        )
                      }
                      setTopK={photoActions.setTopK}
                    />
                  ) : (
                    <EmptyLibraryState
                      onSelectFolder={modalControls.openFolder}
                    />
                  )}
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
                        topK
                      );
                      photoActions.setResults(response.results || []);
                      navigate("/search");
                    } catch (error) {
                      uiActions.setNote(
                        error instanceof Error ? error.message : "Search failed"
                      );
                    } finally {
                      uiActions.setBusy("");
                    }
                  }}
                />

                <JobsFab
                  activeJobs={jobMetrics.activeJobsCount}
                  isIndexing={jobMetrics.indexingActive}
                  progressPct={jobMetrics.indexingProgress}
                  onOpenJobs={modalControls.openJobs}
                />

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
                    } catch {
                      // Ignore localStorage errors (private mode, quota exceeded)
                    }
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

                <ActivityTray />

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
                  data-help-context={helpContext}
                  isVisible={showContextualHelp}
                  onDismiss={() => setShowContextualHelp(false)}
                  context={helpContext}
                  userActions={userActions as string[]}
                />

                <OnboardingChecklist
                  isVisible={showOnboardingChecklist && !showOnboardingTour}
                  onComplete={() => {
                    setShowOnboardingChecklist(false);
                    try {
                      localStorage.setItem("onboardingComplete", "true");
                    } catch {
                      // Ignore localStorage errors (private mode, quota exceeded)
                    }
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

              {/* Contextual search tips (first-interaction) */}
              <SearchTipsManager
                libraryCount={library?.length || 0}
                onboardingActive={showOnboardingTour}
              />
            </main>

            {/* ModalSystemWrapper provides enhanced modal system with fallback to legacy */}
            <ModalSystemWrapper />
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

        <AppWithHints searchText={searchText} selected={selected} />
      </div>
    </MobileOptimizations>
  );

  return (
    <AdaptiveResponsiveProvider>
      <ContextualModalProvider>
        <HintManager>{chrome}</HintManager>
        <ViewportIndicator />
      </ContextualModalProvider>
    </AdaptiveResponsiveProvider>
  );
}
