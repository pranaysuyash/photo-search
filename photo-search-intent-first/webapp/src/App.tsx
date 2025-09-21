import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { AppProviders } from "./AppProviders";
import { AppChrome } from "./components/AppChrome";
import { useAppState } from "./hooks/useAppState";
import { useAppLifecycle } from "./hooks/useAppLifecycle";
import { useViewOrchestration } from "./hooks/useViewOrchestration";
import { useThemeBootstrap } from "./hooks/useThemeBootstrap";
import { pathToView } from "./utils/router";

export default function App() {
  // Skip to content link for keyboard users
  const skipToContentRef = useRef<HTMLAnchorElement>(null);

  // Bootstrap theme and core functionality
  useThemeBootstrap();

  // Get all state and actions from custom hooks
  const appState = useAppState();
  const appLifecycle = useAppLifecycle();
  const viewOrchestration = useViewOrchestration();

  // Prepare props for AppChrome component
  const layoutProps = {
    isMobile: appLifecycle.lifecycleState.isMobile,
    showModernSidebar: false, // TODO: implement from state
    setShowModernSidebar: (show: boolean) => {}, // TODO: implement
    handleSwipeLeft: () => {}, // TODO: implement from lifecycle
    handleSwipeRight: () => {}, // TODO: implement from lifecycle
    handlePullToRefresh: async () => {}, // TODO: implement from lifecycle
    accessibilitySettings: null, // TODO: implement from state
    showAccessibilityPanel: false, // TODO: implement from state
    setShowAccessibilityPanel: (show: boolean) => {}, // TODO: implement
    prefersReducedMotion: Boolean(useReducedMotion()),
    themeMode: appLifecycle.lifecycleState.themeMode,
    setThemeMode: () => {}, // TODO: implement from lifecycle
    highContrast: false, // TODO: implement from state
  };

  const onboardingProps = {
    showWelcome: appState.viewState.showWelcome,
    enableDemoLibrary: false, // TODO: implement from state
    handleWelcomeStartDemo: viewOrchestration.demoHandlers.handleWelcomeStartDemo,
    showOnboarding: false, // TODO: implement from state
    setShowOnboarding: (show: boolean) => {}, // TODO: implement
    handleFirstRunQuickStart: viewOrchestration.demoHandlers.handleFirstRunQuickStart,
    handleFirstRunCustom: viewOrchestration.demoHandlers.handleFirstRunCustom,
    handleFirstRunDemo: viewOrchestration.demoHandlers.handleFirstRunDemo,
    handleOnboardingComplete: () => {}, // TODO: implement from lifecycle
    showOnboardingTour: viewOrchestration.onboarding.showOnboardingTour,
    setShowOnboardingTour: viewOrchestration.onboarding.setShowOnboardingTour,
    showHelpHint: viewOrchestration.onboarding.showHelpHint,
    dismissHelpHint: viewOrchestration.onboarding.dismissHelpHint,
    userActions: viewOrchestration.onboarding.userActions,
    onboardingSteps: viewOrchestration.onboarding.onboardingSteps,
    completeOnboardingStep: viewOrchestration.onboarding.completeOnboardingStep,
    showContextualHelp: viewOrchestration.onboarding.showContextualHelp,
    setShowContextualHelp: viewOrchestration.onboarding.setShowContextualHelp,
    showOnboardingChecklist: viewOrchestration.onboarding.showOnboardingChecklist,
    setShowOnboardingChecklist: viewOrchestration.onboarding.setShowOnboardingChecklist,
  };

  const viewStateProps = {
    searchText: appState.localState.searchText,
    setSearchText: appState.actions.setSearchText,
    selected: appState.localState.selected,
    setSelected: appState.actions.setSelected,
    toggleSelect: (path: string) => {
      const newSelected = new Set(appState.localState.selected);
      if (newSelected.has(path)) {
        newSelected.delete(path);
      } else {
        newSelected.add(path);
      }
      appState.actions.setSelected(newSelected);
    },
    gridSize: appState.localState.gridSize,
    setGridSize: appState.actions.setGridSize,
    resultView: appState.localState.resultView,
    setResultView: appState.actions.setResultView,
    timelineBucket: appState.localState.timelineBucket,
    setTimelineBucket: appState.actions.setTimelineBucket,
    currentFilter: appState.localState.currentFilter,
    setCurrentFilter: appState.actions.setCurrentFilter,
    showFilters: appState.localState.showFilters,
    setShowFilters: appState.actions.setShowFilters,
    dateFrom: appState.localState.dateFrom,
    setDateFrom: appState.actions.setDateFrom,
    dateTo: appState.localState.dateTo,
    setDateTo: appState.actions.setDateTo,
    ratingMin: appState.localState.ratingMin,
    setRatingMin: appState.actions.setRatingMin,
    detailIdx: null, // TODO: implement from state
    setDetailIdx: (idx: number | null) => {}, // TODO: implement
    focusIdx: null, // TODO: implement from state
    setFocusIdx: (idx: number | null) => {}, // TODO: implement
    layoutRows: [], // TODO: implement from state
    setLayoutRows: (rows: number[][]) => {}, // TODO: implement
    setIsMobileMenuOpen: (open: boolean) => {}, // TODO: implement
    showRecentActivity: false, // TODO: implement from state
    setShowRecentActivity: (show: boolean) => {}, // TODO: implement
    showSearchHistory: false, // TODO: implement from state
    setShowSearchHistory: (show: boolean) => {}, // TODO: implement
    bottomNavTab: "home" as const, // TODO: implement from state
    setBottomNavTab: (tab: "home" | "search" | "favorites" | "settings") => {}, // TODO: implement
    authRequired: appLifecycle.lifecycleData.authRequired,
    setAuthRequired: (required: boolean) => {}, // TODO: implement
    authTokenInput: appLifecycle.lifecycleData.authTokenInput,
    setAuthTokenInput: (token: string) => {}, // TODO: implement
    currentView: appState.currentView,
  };

  const dataProps = {
    dir: appState.viewState.dir,
    engine: appState.viewState.engine,
    hfToken: appState.viewState.hfToken,
    openaiKey: appState.viewState.openaiKey,
    useFast: appState.viewState.useFast,
    fastKind: appState.viewState.fastKind,
    useCaps: appState.viewState.useCaps,
    useOcr: appState.viewState.useOcr,
    hasText: appState.viewState.hasText,
    place: appState.viewState.place,
    camera: appState.viewState.camera,
    isoMin: appState.viewState.isoMin,
    isoMax: appState.viewState.isoMax,
    fMin: appState.viewState.fMin,
    fMax: appState.viewState.fMax,
    tagFilter: appState.viewState.tagFilter,
    allTags: appState.viewState.allTags,
    needsHf: appState.viewState.needsHf,
    needsOAI: appState.viewState.needsOAI,
    results: appState.viewState.results,
    query: appState.viewState.query,
    fav: appState.viewState.fav,
    favOnly: appState.viewState.favOnly,
    topK: appState.viewState.topK,
    saved: appState.viewState.saved,
    collections: appState.viewState.collections,
    smart: appState.viewState.smart,
    library: appState.viewState.library,
    libHasMore: appState.viewState.libHasMore,
    tagsMap: appState.viewState.tagsMap,
    persons: appState.viewState.persons,
    clusters: appState.viewState.clusters,
    points: appState.viewState.points,
    diag: appState.viewState.diag,
    meta: appLifecycle.lifecycleData.meta,
    busy: appState.viewState.busy,
    note: appState.viewState.note,
    ocrReady: appLifecycle.lifecycleData.ocrReady,
    ocrTextCount: appLifecycle.lifecycleData.ocrTextCount,
    presets: [], // TODO: implement from state
    altSearch: appState.derivedState.altSearch,
    ratingMap: appState.derivedState.ratingMap,
    jobs: appState.derivedState.jobs,
    libState: appState.derivedState.libState,
    showInfoOverlay: false, // TODO: implement from state
    highContrast: false, // TODO: implement from state
    isConnected: appLifecycle.lifecycleData.isConnected,
    items: appState.derivedState.items,
    hasAnyFilters: appState.derivedState.hasAnyFilters,
    indexCoverage: appState.derivedState.indexCoverage,
  };

  const actionProps = {
    handleAccessibilitySettingsChange: (settings: any) => {}, // TODO: implement
    doSearchImmediate: async (query: string) => {}, // TODO: implement from lifecycle
    loadFav: async () => {}, // TODO: implement from lifecycle
    loadSaved: async () => {}, // TODO: implement from lifecycle
    loadTags: async () => {}, // TODO: implement from lifecycle
    loadDiag: async () => {}, // TODO: implement from lifecycle
    loadFaces: async () => {}, // TODO: implement from lifecycle
    loadMap: async () => {}, // TODO: implement from lifecycle
    loadLibrary: async () => {}, // TODO: implement from lifecycle
    loadMetadata: async () => {}, // TODO: implement from lifecycle
    loadPresets: async () => {}, // TODO: implement from lifecycle
    prepareFast: async () => {}, // TODO: implement from lifecycle
    buildOCR: async () => {}, // TODO: implement from lifecycle
    buildMetadata: async () => {}, // TODO: implement from lifecycle
    monitorOperation: () => () => {}, // TODO: implement from lifecycle
    openDetailByPath: (path: string) => {}, // TODO: implement
    navDetail: (delta: number) => {}, // TODO: implement
    tagSelected: async (tagText: string) => {}, // TODO: implement
    exportSelected: async (dest: string) => {}, // TODO: implement
    handlePhotoOpen: (path: string) => {}, // TODO: implement
    handlePhotoAction: (action: string, photo: any) => {}, // TODO: implement
    setRatingSelected: async (rating: number) => {}, // TODO: implement
    rowsEqual: (a: number[][], b: number[][]) => false, // TODO: implement
  };

  const contextProps = {
    settingsActions: appState.stateActions.settingsActions,
    photoActions: appState.stateActions.photoActions,
    uiActions: appState.stateActions.uiActions,
    workspaceActions: appState.stateActions.workspaceActions,
    modalControls: appLifecycle.modalControls,
    lib: { actions: {} }, // TODO: implement from lifecycle
    jobsActions: { actions: {} }, // TODO: implement from lifecycle
    pushToast: appLifecycle.lifecycleActions.showToast,
    setToast: (toast: any) => {}, // TODO: implement from lifecycle
    filterPresets: [], // TODO: implement from state
    savePreset: async () => {}, // TODO: implement
    loadPreset: async () => {}, // TODO: implement
    deletePreset: async () => {}, // TODO: implement
  };

  const refProps = {
    scrollContainerRef: useRef<HTMLDivElement>(null),
    layoutRowsRef: useRef<number[][]>([]),
    toastTimerRef: useRef<number | null>(null),
    activeToastRef: useRef<{ id: string; dismiss: () => void } | null>(null),
  };

  return (
    <AppProviders>
      <AppChrome
        location={appState.location}
        navigate={appState.navigate}
        layout={layoutProps}
        onboarding={onboardingProps}
        viewState={viewStateProps}
        data={dataProps}
        actions={actionProps}
        context={contextProps}
        refs={refProps}
      />
    </AppProviders>
  );
}