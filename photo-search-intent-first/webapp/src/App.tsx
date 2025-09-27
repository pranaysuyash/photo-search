import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
// API layer
import {
  apiAnalytics,
  apiBuildFast,
  apiBuildMetadata,
  apiBuildOCR,
  apiDiagnostics,
  apiExport,
  apiFacesClusters,
  apiGetFavorites,
  apiGetMetadata,
  apiGetPresets,
  apiGetSaved,
  apiGetTags,
  apiLibrary,
  apiMap,
  apiMetadataBatch,
  apiOcrStatus,
  apiOperationStatus,
  apiSetTags,
} from "./api";
import { telemetryService } from "./services/TelemetryService";
// Store helpers
import { useAltSearch } from "./stores";
import {
  useEnableDemoLibrary,
  useHighContrast,
  useSearchCommandCenter,
  useThemeStore,
} from "./stores/settingsStore";
import {
  useAllTags,
  // Individual UI hooks
  useBusy,
  useCamera,
  useCaptionsEnabled,
  useClusters,
  useCollections,
  useDiag,
  // Individual settings hooks
  useDir,
  useEngine,
  useFastIndexEnabled,
  useFastKind,
  useFavOnly,
  useFavorites,
  useFMax,
  useFMin,
  useHasText,
  useHfToken,
  useIsoMax,
  useIsoMin,
  useLibHasMore,
  useLibrary,
  useNeedsHf,
  useNeedsOAI,
  useNote,
  useOcrEnabled,
  useOpenaiKey,
  usePersons,
  usePhotoActions,
  usePlace,
  usePoints,
  useSavedSearches,
  useSearchQuery,
  // Individual photo hooks
  useSearchResults,
  // Actions
  useSettingsActions,
  useShowInfoOverlay,
  useShowWelcome,
  useSmartCollections,
  useTagFilter,
  useTagsMap,
  useTopK,
  useUIActions,
  useWorkspaceActions,
} from "./stores/useStores";

type GridSize = "small" | "medium" | "large";
export type View =
  | "results"
  | "library"
  | "people"
  | "map"
  | "collections"
  | "smart"
  | "trips"
  | "saved"
  | "memories"
  | "tasks"
  | "videos";

import type { AccessibilitySettings } from "./components/AccessibilityPanel";
import { AppChrome } from "./components/AppChrome";
import type { Job } from "./components/JobsCenter";
import {
  useHapticFeedback,
  useMobileDetection,
} from "./components/MobileOptimizations";
import { useOnboarding } from "./components/OnboardingTour";
import { ToastAction } from "./components/ui/toast";
import { ActionsProvider } from "./contexts/ActionsContext";
import { DataProvider } from "./contexts/DataContext";
import { useJobsContext } from "./contexts/JobsContext";
import { LayoutProvider } from "./contexts/LayoutContext";
import { useLibraryContext } from "./contexts/LibraryContext";
import type { ModalKey } from "./contexts/ModalContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import type { ResultView } from "./contexts/ResultsConfigContext";
import { ViewStateProvider } from "./contexts/ViewStateContext";
import { ModalDataBridgeProvider } from "./providers/ModalDataBridgeProvider";

import { useToast } from "./hooks/use-toast";
import { useConnectivityAndAuth } from "./hooks/useConnectivityAndAuth";
import {
  useFavorites as useFavoritesQuery,
  useSavedSearches as useSavedSearchesQuery,
  useTags as useTagsQuery,
  useToggleFavorite,
  useUpdateTags,
} from "./hooks/useDataQueries";
import { useDemoLibraryHandlers } from "./hooks/useDemoLibraryHandlers";
import type { FilterPresetSetters } from "./hooks/useFilterPresets";
import { useFilterPresets } from "./hooks/useFilterPresets";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useModalControls } from "./hooks/useModalControls";
import useModalStatus from "./hooks/useModalStatus";
import { useMonitorOperation } from "./hooks/useMonitorOperation";
import { useOnboardingActions } from "./hooks/useOnboardingActions";
import useOnboardingFlows, {
  type OnboardingStep,
} from "./hooks/useOnboardingFlows";
import { usePageViewTracking } from "./hooks/usePageViewTracking";
import { useQueryParamFilters } from "./hooks/useQueryParamFilters";
import { useResultsShortcuts } from "./hooks/useResultsShortcuts";
import { useSearchOperations } from "./hooks/useSearchOperations";
import type { FilterPreset } from "./models/FilterPreset";
import { handleError } from "./utils/errors";
import { pathToView } from "./utils/router";
import {
  loadViewPreferences,
  saveViewPreferences,
} from "./utils/viewPreferences";

const RESULT_VIEW_VALUES: ResultView[] = ["grid", "film", "timeline", "map"];
const TIMELINE_BUCKET_VALUES: Array<"day" | "week" | "month"> = [
  "day",
  "week",
  "month",
];

// (Removed) Local ScrollLoader in favor of shared utils/loading ScrollLoader

/**
 * App component that uses modal controls from hook
 */
function AppWithModalControls() {
  // Get modal controls from hook
  const modalControls = useModalControls();

  // Modern UX Integration - Mobile detection and haptic feedback
  const { isMobile } = useMobileDetection();
  const { trigger: hapticTrigger } = useHapticFeedback();

  // Modern UX Integration - Onboarding and hints
  const { hasCompletedTour, completeTour } = useOnboarding();
  // const { triggerHint } = useHintTriggers(); // Moved inside provider context

  // Modern UX Integration - New state for enhanced features
  const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);
  const [showModernSidebar, setShowModernSidebar] = useState(false);
  const [accessibilitySettings, setAccessibilitySettings] =
    useState<AccessibilitySettings | null>(null);

  // Individual hooks for settings
  const dir = useDir();
  const engine = useEngine();
  const hfToken = useHfToken();
  const openaiKey = useOpenaiKey();
  const useFast = useFastIndexEnabled();
  const fastKind = useFastKind();
  const useCaps = useCaptionsEnabled();
  const useOcr = useOcrEnabled();
  const hasText = useHasText();
  const place = usePlace();
  const camera = useCamera();
  const isoMin = useIsoMin();
  const isoMax = useIsoMax();
  const fMin = useFMin();
  const fMax = useFMax();
  const tagFilter = useTagFilter();
  const allTags = useAllTags();
  const needsHf = useNeedsHf();
  const needsOAI = useNeedsOAI();

  // Individual hooks for photo
  const results = useSearchResults();
  const query = useSearchQuery();
  // const searchId = useSearchId()
  const fav = useFavorites();
  const favOnly = useFavOnly();
  const topK = useTopK();
  const saved = useSavedSearches();
  const collections = useCollections();
  const smart = useSmartCollections();
  const library = useLibrary();
  const _libHasMore = useLibHasMore();
  const tagsMap = useTagsMap();

  // Individual hooks for UI
  const busy = useBusy();
  const note = useNote();
  // const viewMode = useViewMode()
  const showWelcome = useShowWelcome();

  // Individual hooks for workspace
  // const workspace = useWorkspace()
  const persons = usePersons();
  const clusters = useClusters();
  // const groups = useGroups()
  const points = usePoints();
  const diag = useDiag();

  // Actions
  const settingsActions = useSettingsActions();
  const photoActions = usePhotoActions();
  const uiActions = useUIActions();
  const workspaceActions = useWorkspaceActions();

  // Theme controls
  const themeMode = useThemeStore((s) => s.themeMode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);

  // Local UI state
  // Route-driven: derive current view from location
  const location = useLocation();
  const navigate = useNavigate();
  const currentView = pathToView(location.pathname);
  const viewPreferences = useMemo(() => loadViewPreferences(), []);
  const [searchText, setSearchText] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [gridSize, setGridSize] = useState<GridSize>(
    () => viewPreferences.gridSize ?? "medium"
  );
  const [resultView, _setResultView] = useState<ResultView>(
    () => viewPreferences.resultView ?? "grid"
  );
  const [timelineBucket, _setTimelineBucket] = useState<
    "day" | "week" | "month"
  >(() => viewPreferences.timelineBucket ?? "day");
  const handleSetResultView = useCallback(
    (view: ResultView) => {
      _setResultView(view);
      settingsActions.setResultView?.(
        view as "grid" | "film" | "timeline" | "map"
      );
    },
    [settingsActions]
  );
  const handleSetTimelineBucket = useCallback(
    (bucket: "day" | "week" | "month") => {
      _setTimelineBucket(bucket);
      settingsActions.setTimelineBucket?.(bucket);
    },
    [settingsActions]
  );

  useEffect(() => {
    saveViewPreferences({ resultView, timelineBucket, gridSize });
  }, [resultView, timelineBucket, gridSize]);
  const [currentFilter, setCurrentFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { anyOpen: anyModalOpen } = useModalStatus();
  const enableDemoLibrary = useEnableDemoLibrary();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const {
    handleWelcomeStartDemo,
    handleFirstRunQuickStart,
    handleFirstRunCustom,
    handleFirstRunDemo,
  } = useDemoLibraryHandlers({
    enableDemoLibrary: enableDemoLibrary || false,
    modalControls,
    engine,
    needsHf,
    hfToken,
    needsOAI,
    openaiKey,
    setShowOnboarding,
  });
  const [detailIdx, setDetailIdx] = useState<number | null>(null);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [layoutRows, setLayoutRows] = useState<number[][]>([]);
  // Panels toggles
  const [showRecentActivity, setShowRecentActivity] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const layoutRowsRef = useRef(layoutRows);
  const lastSelectionCountRef = useRef<number>(selected.size);
  const [bottomNavTab, setBottomNavTab] = useState<
    "home" | "search" | "favorites" | "settings"
  >("home");

  useEffect(() => {
    layoutRowsRef.current = layoutRows;
  }, [layoutRows]);

  useEffect(() => {
    const count = selected.size;
    if (lastSelectionCountRef.current === count) return;
    lastSelectionCountRef.current = count;
    if (typeof window === "undefined") return;
    const message =
      count === 0
        ? "Selection cleared."
        : `${count} photo${count === 1 ? "" : "s"} selected.`;
    window.dispatchEvent(
      new CustomEvent("announce", {
        detail: {
          message,
          priority: count > 0 ? "assertive" : "polite",
        },
      })
    );
  }, [selected]);

  const {
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
  } = useOnboardingFlows({
    hasCompletedTour,
    currentView,
    dir,
    library,
    searchText,
  });

  // Modern UX Integration - Enhanced handlers
  const handleAccessibilitySettingsChange = useCallback(
    (settings: AccessibilitySettings) => {
      setAccessibilitySettings(settings);
      telemetryService.trackAccessibilityEvent(
        "accessibility_settings_updated",
        {
          highContrast: settings.highContrast,
          reducedMotion: settings.reducedMotion,
          screenReaderMode: settings.screenReaderMode,
          keyboardNavigation: settings.keyboardNavigation,
        }
      );
    },
    []
  );

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboardingTour(false);
    completeTour();
    uiActions.setNote("Welcome to Photo Search! 🎉");
  }, [completeTour, uiActions, setShowOnboardingTour]);

  // Placeholder for swipe handlers - will be defined after function declarations
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [meta, setMeta] = useState<{ cameras: string[]; places?: string[] }>({
    cameras: [],
    places: [],
  });
  const { state: jobsState, actions: jobsActions } = useJobsContext();
  const jobs = jobsState.jobs;
  // Library state and actions (indexing, etc.)
  const { state: libState, actions: lib } = useLibraryContext();
  // Indexing state moved to LibraryProvider
  const [ocrReady, setOcrReady] = useState<boolean>(false);
  const [ocrTextCount, setOcrTextCount] = useState<number | undefined>(
    undefined
  );
  const [ratingMin, setRatingMin] = useState(0);
  const { toast: pushToast } = useToast();
  const toastTimerRef = useRef<number | null>(null);
  const activeToastRef = useRef<{ id: string; dismiss: () => void } | null>(
    null
  );
  const setToast = useCallback(
    (
      toast: {
        message: string;
        actionLabel?: string;
        onAction?: () => void;
      } | null
    ) => {
      if (!toast) {
        if (activeToastRef.current) {
          activeToastRef.current.dismiss();
          activeToastRef.current = null;
        }
        return;
      }

      if (activeToastRef.current) {
        activeToastRef.current.dismiss();
        activeToastRef.current = null;
      }

      const { message, actionLabel, onAction } = toast;

      const nextToast = pushToast({
        description: message,
        action:
          actionLabel && onAction ? (
            <ToastAction
              altText={actionLabel}
              onClick={() => {
                try {
                  onAction();
                } finally {
                  if (activeToastRef.current) {
                    activeToastRef.current.dismiss();
                    activeToastRef.current = null;
                  }
                }
              }}
            >
              {actionLabel}
            </ToastAction>
          ) : undefined,
      });

      activeToastRef.current = {
        id: nextToast.id,
        dismiss: nextToast.dismiss,
      };
    },
    [pushToast]
  );
  const [presets, setPresets] = useState<{ name: string; query: string }[]>([]);
  const altSearch = useAltSearch();

  // Filter Presets State Management
  const filterPresetSetters = useMemo<FilterPresetSetters>(
    () => ({
      setFavOnly: photoActions.setFavOnly,
      setTagFilter: photoActions.setTagFilter,
      setPlace: settingsActions.setPlace,
      setCamera: settingsActions.setCamera,
      setIsoMin: (value: string) =>
        settingsActions.setIsoMin(parseFloat(value) || 0),
      setIsoMax: (value: string) =>
        settingsActions.setIsoMax(parseFloat(value) || 0),
      setFMin: (value: string) =>
        settingsActions.setFMin(parseFloat(value) || 0),
      setFMax: (value: string) =>
        settingsActions.setFMax(parseFloat(value) || 0),
      setDateFrom: (value: string) => setDateFrom(value),
      setDateTo: (value: string) => setDateTo(value),
      setUseCaps: settingsActions.setUseCaps,
      setUseOcr: settingsActions.setUseOcr,
      setHasText: settingsActions.setHasText,
      setRatingMin: (value: number) => setRatingMin(value),
    }),
    [
      photoActions.setFavOnly,
      photoActions.setTagFilter,
      settingsActions.setPlace,
      settingsActions.setCamera,
      settingsActions.setIsoMin,
      settingsActions.setIsoMax,
      settingsActions.setFMin,
      settingsActions.setFMax,
      settingsActions.setUseCaps,
      settingsActions.setUseOcr,
      settingsActions.setHasText,
    ]
  );

  const { filterPresets, savePreset, loadPreset, deletePreset } =
    useFilterPresets(filterPresetSetters);

  // Search Command Center
  const searchCommandCenter = useSearchCommandCenter();

  const monitorOperation = useMonitorOperation(dir);

  // TanStack Query hooks for server state
  const favoritesQuery = useFavoritesQuery(dir);
  const savedSearchesQuery = useSavedSearchesQuery(dir);
  const tagsQuery = useTagsQuery(dir);
  const toggleFavoriteMutation = useToggleFavorite();
  const updateTagsMutation = useUpdateTags();

  const [isConnected, setIsConnected] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [authTokenInput, setAuthTokenInput] = useState("");
  const ratingMap = useMemo(() => {
    const m: Record<string, number> = {};
    const tm = tagsMap || {};
    for (const p of Object.keys(tm)) {
      const arr: string[] = tm[p] || [];
      const rt = arr.find((t) => /^rating:[1-5]$/.test(t));
      if (rt) m[p] = parseInt(rt.split(":")[1], 10);
    }
    return m;
  }, [tagsMap]);
  // Initialize theme from localStorage
  useEffect(() => {
    try {
      const pref = localStorage.getItem("ps_theme");
      if (pref === "dark") document.documentElement.classList.add("dark");
    } catch (e) {
      console.warn("Failed to initialize theme from localStorage:", e);
    }
  }, []);

  // MonitoringService is automatically initialized via singleton instance
  usePageViewTracking();

  const highContrast = useHighContrast();
  const showInfoOverlay = useShowInfoOverlay();

  // Onboarding tour action listeners ("Do it for me")
  useOnboardingActions({
    openModal: (key: string) => {
      modalControls.openModal(key as ModalKey);
    },
    openFilters: () => setShowFilters(true),
  });

  // Connectivity and auth requirement
  useConnectivityAndAuth({ setIsConnected, setAuthRequired });

  // Global keyboard shortcuts
  useGlobalShortcuts({
    anyModalOpen,
    openModal: (key: string) => modalControls.openModal(key as ModalKey),
    toggleModal: (key: string) => modalControls.toggleModal(key as ModalKey),
    openFilters: () => setShowFilters(true),
    searchCommandCenter: Boolean(searchCommandCenter),
    showInfoOverlay,
    setShowInfoOverlay: settingsActions.setShowInfoOverlay,
    selectedView: currentView,
    resultView: resultView as string,
  });

  const prefersReducedMotion = useReducedMotion();

  // Determine if unknown filters are active (for no-results empty state)
  const hasAnyFilters = useMemo(() => {
    const anyExif = Boolean(
      camera || isoMin || isoMax || fMin || fMax || place
    );
    const anyDate = Boolean(dateFrom && dateTo);
    const anyPeople = Array.isArray(persons) && persons.length > 0;
    const anyTags = Boolean(tagFilter?.trim());
    const anyQuality = ratingMin > 0 || hasText;
    return Boolean(
      favOnly || anyExif || anyDate || anyPeople || anyTags || anyQuality
    );
  }, [
    camera,
    isoMin,
    isoMax,
    fMin,
    fMax,
    place,
    dateFrom,
    dateTo,
    persons,
    tagFilter,
    ratingMin,
    hasText,
    favOnly,
  ]);

  // Route-driven views: derive from location when needed; navigation uses navigate()

  useQueryParamFilters({
    location,
    searchText,
    setSearchText,
    setDateFrom,
    setDateTo,
    setRatingMin,
    resultView,
    timelineBucket,
    setResultViewLocal: _setResultView,
    setTimelineBucketLocal: _setTimelineBucket,
    photoActions: {
      setFavOnly: photoActions.setFavOnly,
      setTagFilter: photoActions.setTagFilter,
    },
    settingsActions: {
      setPlace: settingsActions.setPlace,
      setHasText: settingsActions.setHasText,
      setCamera: settingsActions.setCamera,
      setIsoMin: settingsActions.setIsoMin,
      setIsoMax: settingsActions.setIsoMax,
      setFMin: settingsActions.setFMin,
      setFMax: settingsActions.setFMax,
      setUseFast: settingsActions.setUseFast,
      setFastKind: (value: string) =>
        settingsActions.setFastKind(value as "" | "annoy" | "faiss" | "hnsw"),
      setUseCaps: settingsActions.setUseCaps,
      setUseOcr: settingsActions.setUseOcr,
      setResultView: (value: string) =>
        settingsActions.setResultView?.(
          value as "grid" | "film" | "timeline" | "map"
        ),
      setTimelineBucket: (value: string) =>
        settingsActions.setTimelineBucket?.(
          value as "day" | "week" | "month" | "year"
        ),
    },
    workspaceActions: {
      setPersons: workspaceActions.setPersons,
    },
  });

  // Onboarding flows handled by useOnboardingFlows
  const libLimit = 120;

  // Derived list to show: search results or library - memoized to prevent recreation
  const items: { path: string; score?: number }[] = useMemo(() => {
    return (library || []).map((p) => ({ path: p }));
  }, [library]);

  // Data loading helpers
  const loadFav = useCallback(async () => {
    if (!dir) return;
    try {
      const f = await apiGetFavorites(dir);
      photoActions.setFavorites(f.favorites || []);
    } catch (e) {
      console.error("Failed to load favorites:", e);
    }
  }, [dir, photoActions]);

  const loadSaved = useCallback(async () => {
    if (!dir) return;
    try {
      const r = await apiGetSaved(dir);
      photoActions.setSaved(r.saved || []);
    } catch (e) {
      console.error("Failed to load saved searches:", e);
    }
  }, [dir, photoActions]);
  const loadPresets = useCallback(async () => {
    if (!dir) return;
    try {
      const r = await apiGetPresets(dir);
      setPresets(r.presets || []);
    } catch (e) {
      console.error("Failed to load presets:", e);
    }
  }, [dir]);

  // Index status polling moved to LibraryProvider

  // Compute index coverage from diagnostics + library
  const _indexCoverage = useMemo(() => {
    try {
      const count = diag?.engines?.[0]?.count || 0;
      const total = library?.length || 0;
      return total > 0 ? count / total : undefined;
    } catch {
      return undefined;
    }
  }, [diag, library?.length]);

  const loadTags = useCallback(async () => {
    if (!dir) return;
    try {
      const r = await apiGetTags(dir);
      photoActions.setTagsMap(r.tags || {});
      photoActions.setAllTags(r.all || []);
    } catch (e) {
      console.error("Failed to load tags:", e);
    }
  }, [dir, photoActions]);

  const loadDiag = useCallback(async () => {
    if (!dir) return;
    try {
      const r = await apiDiagnostics(
        dir,
        engine,
        needsOAI ? openaiKey : undefined,
        needsHf ? hfToken : undefined
      );
      workspaceActions.setDiag(r);
    } catch (e) {
      console.error("Failed to load diagnostics:", e);
    }
  }, [dir, engine, needsOAI, openaiKey, needsHf, hfToken, workspaceActions]);

  const loadFaces = useCallback(async () => {
    if (!dir) return;
    try {
      const r = await apiFacesClusters(dir);
      workspaceActions.setClusters(r.clusters || []);
    } catch (e) {
      console.error("Failed to load faces:", e);
    }
  }, [dir, workspaceActions]);

  const loadMap = useCallback(async () => {
    if (!dir) return;
    try {
      const r = await apiMap(dir);
      workspaceActions.setPoints(r.points || []);
    } catch (e) {
      console.error("Failed to map data:", e);
    }
  }, [dir, workspaceActions]);

  const loadLibrary = useCallback(
    async (limit = 120, offset = 0, append = false) => {
      try {
        if (!dir) return;

        // Validate directory before making API call
        // In web context, check if path appears to be absolute (starts with / on Unix or C:\\ on Windows)
        const isAbsolutePath = dir.startsWith("/") || /^[A-Za-z]:\\/.test(dir);
        if (!isAbsolutePath) {
          console.warn("Directory path should be absolute:", dir);
        }

        const r = await apiLibrary(dir, engine, limit, offset, {
          openaiKey: needsOAI ? openaiKey : undefined,
          hfToken: needsHf ? hfToken : undefined,
        });

        // Calculate if there are more pages to load
        const hasMore =
          r.paths &&
          r.paths.length === limit &&
          offset + r.paths.length < r.total;

        if (append) {
          if (r.paths && r.paths.length > 0) {
            photoActions.appendLibrary(r.paths);
          }
        } else {
          photoActions.setLibrary(r.paths || []);
        }

        photoActions.setLibHasMore(hasMore);
      } catch (e) {
        console.error("Failed to load library:", e);
        // Show user-friendly error message
        uiActions.setNote(
          e instanceof Error
            ? `Failed to load library: ${e.message}`
            : "Failed to load library"
        );
      }
    },
    [
      dir,
      engine,
      needsOAI,
      openaiKey,
      needsHf,
      hfToken,
      photoActions,
      uiActions,
    ]
  );

  const loadMetadata = useCallback(async () => {
    try {
      if (!dir) return;

      // Use batch metadata loading if library is available
      if (library && library.length > 0) {
        try {
          // Load metadata for first batch of images
          const batchSize = Math.min(50, library.length);
          const firstBatch = library.slice(0, batchSize);
          const result = await apiMetadataBatch(dir, firstBatch);

          if (result.ok && result.meta) {
            // Record successful metadata load for observability
            telemetryService.trackUsage("metadata_batch_loaded");
          }
        } catch (batchError) {
          console.warn(
            "Batch metadata loading failed, falling back to individual:",
            batchError
          );
        }
      }

      // Fallback to original method for basic metadata
      const r = await apiGetMetadata(dir);
      setMeta({ cameras: r.cameras || [], places: r.places || [] });
    } catch (e) {
      console.error("Failed to load metadata:", e);
    }
  }, [dir, library]);

  // One-time OCR status check per directory
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!dir) {
        setOcrReady(false);
        setOcrTextCount(undefined);
        return;
      }
      try {
        const r = await apiOcrStatus(dir);
        if (!cancelled) {
          setOcrReady(!!r.ready);
          setOcrTextCount(
            typeof r.count === "number" ? Math.max(0, r.count) : undefined
          );
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to check OCR status:", e);
          setOcrReady(false);
          setOcrTextCount(undefined);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [dir]);

  // Actions migrated: indexing managed by LibraryProvider

  const { doSearchImmediate: _doSearchImmediate } = useSearchOperations();

  // Validate search inputs before executing search
  const doSearchImmediate = useCallback(
    async (text: string) => {
      // Validate directory
      if (!dir || dir.trim() === "") {
        uiActions.setNote("Please select a photo library directory first");
        return;
      }

      // Validate search query
      if (!text || text.trim() === "") {
        uiActions.setNote("Please enter a search query");
        return;
      }

      // Validate directory path
      try {
        // In web context, check if path appears to be absolute (starts with / on Unix or C:\ on Windows)
        const isAbsolutePath =
          dir.startsWith("/") || /^[A-Za-z]:[\\/]/.test(dir);
        if (!isAbsolutePath) {
          uiActions.setNote("Directory path should be absolute");
          return;
        }
      } catch (_e) {
        uiActions.setNote("Invalid directory path");
        return;
      }

      return await _doSearchImmediate(text);
    },
    [dir, _doSearchImmediate, uiActions]
  );

  // Hook up advanced search apply events from ModalManager
  useEffect(() => {
    const onApply = (e: Event) => {
      // @ts-ignore
      const q = e?.detail?.q as string | undefined;
      if (typeof q === "string") {
        setSearchText(q);
        doSearchImmediate(q);
      }
    };
    window.addEventListener("advanced-search-apply", onApply);
    return () => window.removeEventListener("advanced-search-apply", onApply);
  }, [doSearchImmediate]);

  const prepareFast = useCallback(
    async (kind: "annoy" | "faiss" | "hnsw") => {
      if (!dir) {
        pushToast({
          description: "Select a library before preparing a fast index.",
        });
        return;
      }
      const jobId = `fast-${Date.now()}`;
      jobsActions.add({
        id: jobId,
        type: "index",
        title: `Building ${kind.toUpperCase()} index`,
        description: "Optimizing search speed",
        status: "running",
        startTime: new Date(),
      });
      const stop = monitorOperation(jobId, "fast_index");
      pushToast({ description: `Preparing ${kind.toUpperCase()} index…` });
      try {
        await apiBuildFast(
          dir,
          kind,
          engine,
          needsHf ? hfToken : undefined,
          needsOAI ? openaiKey : undefined
        );
        uiActions.setNote(`${kind.toUpperCase()} ready`);
        let finalStatus: Awaited<ReturnType<typeof apiOperationStatus>> | null =
          null;
        try {
          finalStatus = await apiOperationStatus(dir, "fast_index");
        } catch (statusErr) {
          console.warn("Unable to read fast index status", statusErr);
        }
        jobsActions.update(jobId, {
          status: "completed",
          endTime: new Date(),
          description:
            finalStatus && typeof finalStatus.kind === "string"
              ? `${String(finalStatus.kind).toUpperCase()} index ready`
              : `${kind.toUpperCase()} index ready`,
        } as Partial<Job>);
      } catch (e) {
        uiActions.setNote(
          e instanceof Error ? e.message : "Failed to build index"
        );
        jobsActions.update(jobId, {
          status: "failed",
          endTime: new Date(),
          error: e instanceof Error ? e.message : "Failed to build index",
        } as Partial<Job>);
        handleError(e, {
          logToServer: true,
          context: { action: "build_fast", component: "App.buildFast", dir },
        });
      } finally {
        stop();
      }
    },
    [
      dir,
      engine,
      needsHf,
      hfToken,
      needsOAI,
      openaiKey,
      uiActions,
      jobsActions,
      monitorOperation,
      pushToast,
    ]
  );

  const buildOCR = useCallback(async () => {
    if (!dir) {
      pushToast({ description: "Select a library before running OCR." });
      return;
    }
    const jobId = `ocr-${Date.now()}`;
    jobsActions.add({
      id: jobId,
      type: "analyze",
      title: "Extracting text (OCR)",
      description: "Scanning photos for text",
      status: "running",
      startTime: new Date(),
    });
    const stop = monitorOperation(jobId, "ocr");
    pushToast({ description: "Extracting text (OCR)…" });
    try {
      const r = await apiBuildOCR(
        dir,
        engine,
        ["en"],
        needsHf ? hfToken : undefined,
        needsOAI ? openaiKey : undefined
      );
      uiActions.setNote(`OCR updated ${r.updated} images`);
      let finalStatus: Awaited<ReturnType<typeof apiOperationStatus>> | null =
        null;
      try {
        finalStatus = await apiOperationStatus(dir, "ocr");
      } catch (statusErr) {
        console.warn("Unable to read OCR status", statusErr);
      }
      const finalTotal =
        typeof finalStatus?.total === "number"
          ? finalStatus.total
          : typeof finalStatus?.done === "number"
          ? finalStatus.done
          : r.updated;
      const finalDone =
        typeof finalStatus?.done === "number" ? finalStatus.done : r.updated;
      jobsActions.update(jobId, {
        status: "completed",
        progress: finalDone,
        total: finalTotal,
        estimatedTimeRemaining: 0,
        endTime: new Date(),
        description: "OCR complete",
      } as Partial<Job>);
      await loadTags();
      try {
        const status = await apiOcrStatus(dir);
        setOcrReady(!!status.ready);
        setOcrTextCount(
          typeof status.count === "number"
            ? Math.max(0, status.count)
            : undefined
        );
      } catch (refreshError) {
        console.warn("Failed to refresh OCR status", refreshError);
      }
    } catch (e) {
      uiActions.setNote(e instanceof Error ? e.message : "OCR failed");
      jobsActions.update(jobId, {
        status: "failed",
        error: e instanceof Error ? e.message : "OCR failed",
        endTime: new Date(),
      } as Partial<Job>);
      handleError(e, {
        logToServer: true,
        context: { action: "build_ocr", component: "App.buildOCR", dir },
      });
    } finally {
      stop();
    }
  }, [
    dir,
    engine,
    needsHf,
    hfToken,
    needsOAI,
    openaiKey,
    loadTags,
    uiActions,
    jobsActions,
    monitorOperation,
    pushToast,
  ]);

  const buildMetadata = useCallback(async () => {
    if (!dir) {
      pushToast({ description: "Select a library before building metadata." });
      return;
    }
    const jobId = `metadata-${Date.now()}`;
    jobsActions.add({
      id: jobId,
      type: "analyze",
      title: "Building metadata",
      description: "Extracting EXIF and quality metrics",
      status: "running",
      startTime: new Date(),
    });
    const stop = monitorOperation(jobId, "metadata");
    pushToast({ description: "Building metadata…" });
    try {
      const r = await apiBuildMetadata(
        dir,
        engine,
        needsHf ? hfToken : undefined,
        needsOAI ? openaiKey : undefined
      );
      uiActions.setNote(`Metadata ready (${r.updated})`);
      let finalStatus: Awaited<ReturnType<typeof apiOperationStatus>> | null =
        null;
      try {
        finalStatus = await apiOperationStatus(dir, "metadata");
      } catch (statusErr) {
        console.warn("Unable to read metadata status", statusErr);
      }
      const finalTotal =
        typeof finalStatus?.total === "number"
          ? finalStatus.total
          : typeof finalStatus?.done === "number"
          ? finalStatus.done
          : r.updated;
      const finalDone =
        typeof finalStatus?.done === "number" ? finalStatus.done : r.updated;
      jobsActions.update(jobId, {
        status: "completed",
        progress: finalDone,
        total: finalTotal,
        estimatedTimeRemaining: 0,
        endTime: new Date(),
        description: "Metadata build complete",
      } as Partial<Job>);
    } catch (e) {
      uiActions.setNote(
        e instanceof Error ? e.message : "Metadata build failed"
      );
      jobsActions.update(jobId, {
        status: "failed",
        error: e instanceof Error ? e.message : "Metadata build failed",
        endTime: new Date(),
      } as Partial<Job>);
      handleError(e, {
        logToServer: true,
        context: {
          action: "build_metadata",
          component: "App.buildMetadata",
          dir,
        },
      });
    } finally {
      stop();
    }
  }, [
    dir,
    engine,
    needsHf,
    hfToken,
    needsOAI,
    openaiKey,
    uiActions,
    jobsActions,
    monitorOperation,
    pushToast,
  ]);

  // Poll analytics when busy to surface progress notes (visibility-aware)
  useEffect(() => {
    if (!busy || !dir) return;
    let t: number;
    let last = 0;
    let isVisible = true;

    // Visibility change handlers
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        // Resume polling when page becomes visible
        tick();
      }
    };

    const handlePageHide = () => {
      isVisible = false;
    };

    // Add visibility listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("pagehide", handlePageHide);

    const summarize = (e: Record<string, unknown>) => {
      const type = e?.type as string | undefined;
      if (!type)
        return {
          msg: "",
          progress: undefined as
            | undefined
            | {
                jobId?: string;
                progress?: number;
                total?: number;
                status?: Job["status"];
                description?: string;
              },
        };

      // Helper to compute a friendly message
      const fmt = (m: string) => m;

      // Common job progress payload
      const jobId = typeof e.job_id === "string" ? e.job_id : undefined;
      const progressPatch: {
        jobId?: string;
        progress?: number;
        total?: number;
        status?: Job["status"];
        description?: string;
      } = { jobId };

      switch (type) {
        // Existing events
        case "ocr_build":
          return { msg: fmt(`OCR updated ${e.updated}`), progress: undefined };
        case "captions_build":
          return {
            msg: fmt(`Captions updated ${e.updated}`),
            progress: undefined,
          };
        case "fast_build":
          return {
            msg: fmt(
              `${String(e.kind).toUpperCase()} ${e.ok ? "ready" : "failed"}`
            ),
            progress: undefined,
          };
        case "thumbs_build":
          return { msg: fmt(`Thumbs made ${e.made}`), progress: undefined };
        case "trips_build":
          return { msg: fmt(`Trips ${e.trips}`), progress: undefined };
        case "metadata_build":
          return {
            msg: fmt(`Metadata updated ${e.updated}`),
            progress: undefined,
          };
        case "export":
          return {
            msg: fmt(`Exported ${e.copied}, skipped ${e.skipped}`),
            progress: undefined,
          };

        // New embedding / indexing bridge events
        case "embed_start": {
          const total = Number(e.total) || 0;
          progressPatch.total = total;
          progressPatch.progress = 0;
          progressPatch.status = "running";
          progressPatch.description = `Embedding ${total} images…`;
          return {
            msg: fmt(`Embedding ${total} images…`),
            progress: progressPatch,
          };
        }
        case "embed_load": {
          const done = Number(e.done) || 0;
          const total = Number(e.total) || undefined;
          progressPatch.progress = done;
          if (total) progressPatch.total = total;
          progressPatch.status = "running";
          progressPatch.description = `Loaded ${done}${
            total ? `/${total}` : ""
          } images…`;
          return {
            msg: fmt(progressPatch.description),
            progress: progressPatch,
          };
        }
        case "embed_encode": {
          const bs = e.batch_size ?? e.note;
          progressPatch.status = "running";
          progressPatch.description = `Encoding (bs=${bs}${
            e.workers != null ? `, workers=${e.workers}` : ""
          })…`;
          return {
            msg: fmt(progressPatch.description),
            progress: progressPatch,
          };
        }
        case "embed_encode_done": {
          const valid = Number(e.valid) || undefined;
          progressPatch.status = "running";
          progressPatch.description = `Encoded${
            valid ? ` ${valid}` : ""
          } images`;
          return {
            msg: fmt(progressPatch.description),
            progress: progressPatch,
          };
        }
        case "index_add_chunk": {
          const added = Number(e.added) || 0;
          progressPatch.progress = added;
          progressPatch.status = "running";
          progressPatch.description = `Indexed ${added} vectors…`;
          return {
            msg: fmt(progressPatch.description),
            progress: progressPatch,
          };
        }
        case "index_done": {
          const added = Number(e.added) || 0;
          progressPatch.progress = added;
          progressPatch.status = "completed";
          progressPatch.description = `Index built (${added})`;
          return {
            msg: fmt(progressPatch.description),
            progress: progressPatch,
          };
        }
        case "job_status": {
          const status = String(e.status || "").toLowerCase();
          if (status === "failed") {
            progressPatch.status = "failed";
            progressPatch.description = `Job failed${
              e.error ? `: ${e.error}` : ""
            }`;
            return {
              msg: fmt(progressPatch.description),
              progress: progressPatch,
            };
          }
          if (status === "completed") {
            progressPatch.status = "completed";
            progressPatch.description = "Job completed";
            return { msg: fmt("Job completed"), progress: progressPatch };
          }
          if (status === "cancelled" || status === "canceled") {
            progressPatch.status = "failed"; // or a custom "cancelled" if your Job type supports it
            progressPatch.description = "Job cancelled";
            return { msg: fmt("Job cancelled"), progress: progressPatch };
          }
          return { msg: "", progress: undefined };
        }
        default:
          return { msg: "", progress: undefined };
      }
    };

    const tick = async () => {
      try {
        const r = await apiAnalytics(dir, 10);
        const ev = (r.events || []).slice(-1)[0];
        if (ev && ev.time !== last) {
          last = ev.time || 0;
          const { msg, progress } = summarize(ev);
          if (msg) uiActions.setNote(msg);
          if (progress?.jobId) {
            jobsActions.update(progress.jobId, {
              status: progress.status,
              progress: progress.progress,
              total: progress.total,
              description: progress.description,
            } as Partial<Job>);
          }
        }
      } catch (e) {
        console.warn("Failed to poll analytics:", e);
      }
      // Only schedule next tick if page is still visible
      if (isVisible) {
        t = window.setTimeout(tick, 2000);
      }
    };

    // Start polling if page is visible
    if (isVisible) {
      tick();
    }

    return () => {
      if (t) window.clearTimeout(t);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("pagehide", handlePageHide);
    };
  }, [busy, dir, uiActions, jobsActions]);

  // Index status polling moved to LibraryProvider

  useEffect(() => {
    try {
      const sp = new URLSearchParams(location.search);
      const rv = sp.get("rv");
      if (
        rv &&
        RESULT_VIEW_VALUES.includes(rv as ResultView) &&
        rv !== resultView
      ) {
        handleSetResultView(rv as ResultView);
      }
      const tb = sp.get("tb");
      if (
        tb &&
        TIMELINE_BUCKET_VALUES.includes(tb as "day" | "week" | "month") &&
        tb !== timelineBucket
      ) {
        handleSetTimelineBucket(tb as "day" | "week" | "month");
      }
    } catch (e) {
      console.warn("Failed to parse view state from URL", e);
    }
  }, [
    location.search,
    handleSetResultView,
    handleSetTimelineBucket,
    resultView,
    timelineBucket,
  ]);

  // Keep URL in sync with resultView/timelineBucket (when in results view)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(location.search);
      const currentRv = sp.get("rv");
      const currentTb = sp.get("tb");

      // Only update URL if values have actually changed
      if (currentRv !== resultView || currentTb !== timelineBucket) {
        sp.set("rv", resultView);
        sp.set("tb", timelineBucket);
        navigate(
          { pathname: location.pathname, search: `?${sp.toString()}` },
          { replace: true }
        );
      }
    } catch (e) {
      console.warn("Failed to sync URL with view state:", e);
    }
  }, [
    resultView,
    timelineBucket,
    location.pathname,
    location.search,
    navigate,
  ]);

  const toggleSelect = useCallback((p: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  }, []);

  const handlePhotoOpen = useCallback(
    (path: string) => {
      const idx = (library || []).findIndex((p) => p === path);
      if (idx >= 0) setDetailIdx(idx);
    },
    [library]
  );

  const _exportSelected = useCallback(
    async (dest: string) => {
      if (!dir || selected.size === 0) return;
      try {
        const r = await apiExport(
          dir,
          Array.from(selected),
          dest,
          "copy",
          false,
          false
        );
        uiActions.setNote(
          `Exported ${r.copied}, skipped ${r.skipped}, errors ${r.errors} → ${r.dest}`
        );
      } catch (e) {
        uiActions.setNote(e instanceof Error ? e.message : "Export failed");
      }
    },
    [dir, selected, uiActions]
  );

  // Lightbox helpers
  const openDetailByPath = useCallback(
    (p: string) => {
      const idx = (results || []).findIndex((r) => r.path === p);
      if (idx >= 0) setDetailIdx(idx);
    },
    [results]
  );
  const navDetail = useCallback(
    (delta: number) => {
      setDetailIdx((i) => {
        if (i === null) return null;
        const n = i + delta;
        if (!results || n < 0 || n >= results.length) return i;
        return n;
      });
    },
    [results]
  );

  const tagSelected = useCallback(
    async (tagText: string) => {
      if (!dir || selected.size === 0) return;
      const tagList = tagText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      try {
        await Promise.all(
          Array.from(selected).map((p) =>
            updateTagsMutation.mutateAsync({
              dir,
              path: p,
              tags: tagList,
            })
          )
        );
        uiActions.setNote(`Updated tags for ${selected.size} photos`);
      } catch (e) {
        uiActions.setNote(e instanceof Error ? e.message : "Tag update failed");
      }
    },
    [dir, selected, updateTagsMutation, uiActions]
  );

  // Swipe handlers - defined after all dependencies are declared
  const handleSwipeLeft = useCallback(() => {
    // Navigate to next photo in lightbox or next view
    if (detailIdx !== null) {
      navDetail(1);
    }
  }, [detailIdx, navDetail]);

  const handleSwipeRight = useCallback(() => {
    // Navigate to previous photo in lightbox or previous view
    if (detailIdx !== null) {
      navDetail(-1);
    }
  }, [detailIdx, navDetail]);

  const handlePullToRefresh = useCallback(async () => {
    if (dir) {
      await loadLibrary(libLimit, 0);
      uiActions.setNote("Library refreshed");
    }
  }, [dir, loadLibrary, uiActions]);

  // Modern UX Integration - Enhanced photo action handler with haptic feedback
  const _handlePhotoAction = useCallback(
    (
      action: string,
      photo: { path: string } & Partial<import("./models/PhotoMeta").PhotoMeta>
    ) => {
      switch (action) {
        case "favorite":
          // Toggle favorite with haptic feedback
          if (photo.path) {
            toggleFavoriteMutation.mutate({
              dir,
              path: photo.path,
              favorite: !fav.includes(photo.path),
            });
            telemetryService.trackUsage("photo_action_favorite_toggled");
            telemetryService.trackAccessibilityEvent("photo_action", {
              action: "favorite",
              hasPath: true,
            });
          }
          hapticTrigger("light");
          break;
        case "rate":
          // Update rating
          if (photo.path) {
            const rating = photo.rating || 1;
            telemetryService.trackUsage("photo_action_rate_triggered");
            telemetryService.trackAccessibilityEvent("photo_action", {
              action: "rate",
              rating,
              hasPath: true,
            });
          }
          break;
        case "delete":
          // Delete photo
          if (photo.path) {
            setSelected(new Set([photo.path]));
            telemetryService.trackUsage("photo_action_delete_triggered");
            telemetryService.trackAccessibilityEvent("photo_action", {
              action: "delete",
              hasPath: true,
            });
          }
          uiActions.setNote("Photo deleted");
          hapticTrigger("medium");
          break;
        case "share":
          // Handle share action
          if (navigator.share && isMobile && photo.path) {
            navigator.share({
              title: photo.title || "Photo",
              url: photo.path,
            });
            telemetryService.trackUsage("photo_action_share_native");
            telemetryService.trackAccessibilityEvent("photo_action", {
              action: "share",
              hasPath: true,
              mode: "native",
            });
          } else {
            telemetryService.trackUsage("photo_action_share_fallback");
            telemetryService.trackAccessibilityEvent("photo_action", {
              action: "share",
              hasPath: Boolean(photo.path),
              mode: "fallback",
            });
          }
          break;
        default:
          telemetryService.trackUsage("photo_action_unknown");
          telemetryService.trackAccessibilityEvent("photo_action", {
            action,
            hasPath: Boolean(photo.path || photo.id),
          });
      }
    },
    [dir, fav, toggleFavoriteMutation, hapticTrigger, uiActions, isMobile]
  );

  const _setRatingSelected = useCallback(
    async (rating: 1 | 2 | 3 | 4 | 5 | 0) => {
      if (!dir || selected.size === 0) return;
      try {
        const re = /^rating:[1-5]$/;
        const paths = Array.from(selected);
        await Promise.all(
          paths.map(async (p) => {
            const curr = (tagsMap?.[p] || []).filter((t) => !re.test(t));
            const next = rating === 0 ? curr : [...curr, `rating:${rating}`];
            await apiSetTags(dir, p, next);
          })
        );
        uiActions.setNote(
          rating === 0
            ? `Cleared rating for ${selected.size}`
            : `Set rating ${rating} for ${selected.size}`
        );
        await loadTags();
      } catch (e) {
        uiActions.setNote(
          e instanceof Error ? e.message : "Rating update failed"
        );
      }
    },
    [dir, selected, tagsMap, loadTags, uiActions]
  );

  // Helper function to compare layout rows
  const rowsEqual = useCallback(
    (a: number[][], b: number[][]) =>
      a.length === b.length &&
      a.every(
        (r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j])
      ),
    []
  );

  // Initial data load when directory changes. TanStack Query handles this automatically.

  // Infinite scroll sentinel moved to top-level component

  // Reset focus when results change - depend on length only
  useEffect(() => {
    const len = results?.length ?? 0;
    setFocusIdx((prev) => {
      const next =
        len > 0 ? (prev === null ? 0 : Math.min(prev, len - 1)) : null;
      return Object.is(prev, next) ? prev : next;
    });
  }, [results?.length]);

  // Results context keyboard shortcuts
  useResultsShortcuts({
    enabled: currentView === "results",
    anyOverlayOpen: showFilters || anyModalOpen,
    results: (results || []).map((r) => ({ path: r.path })),
    dir,
    fav,
    focusIdx,
    setFocusIdx,
    layoutRowsRef,
    detailIdx,
    setDetailIdx,
    navDetail,
    toggleSelect,
    loadFav,
  });

  // Ensure focused tile is visible
  useEffect(() => {
    if (focusIdx === null) return;
    const container = document.getElementById("modern-results-grid");
    const el = container?.querySelector(
      `[data-photo-idx="${focusIdx}"]`
    ) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focusIdx]);

  const layoutProps = useMemo(
    () => ({
      isMobile,
      showModernSidebar,
      setShowModernSidebar,
      handleSwipeLeft,
      handleSwipeRight,
      handlePullToRefresh,
      accessibilitySettings,
      showAccessibilityPanel,
      setShowAccessibilityPanel,
      prefersReducedMotion: Boolean(prefersReducedMotion),
      themeMode,
      setThemeMode: (mode: string) =>
        setThemeMode(mode as "light" | "dark" | "auto"),
      highContrast,
    }),
    [
      isMobile,
      showModernSidebar,
      handleSwipeLeft,
      handleSwipeRight,
      handlePullToRefresh,
      accessibilitySettings,
      showAccessibilityPanel,
      prefersReducedMotion,
      themeMode,
      setThemeMode,
      highContrast,
    ]
  );

  const onboardingProps = useMemo(
    () => ({
      showWelcome,
      enableDemoLibrary: enableDemoLibrary || false,
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
      completeOnboardingStep: (stepId: string) =>
        completeOnboardingStep(stepId as OnboardingStep),
      showContextualHelp,
      setShowContextualHelp,
      showOnboardingChecklist,
      setShowOnboardingChecklist: (value: boolean) =>
        setShowOnboardingChecklist(value),
    }),
    [
      showWelcome,
      enableDemoLibrary,
      handleWelcomeStartDemo,
      showOnboarding,
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
    ]
  );

  const viewStateProps = useMemo(
    () => ({
      searchText,
      setSearchText,
      selected,
      setSelected,
      toggleSelect,
      gridSize,
      setGridSize,
      resultView,
      setResultView: handleSetResultView,
      timelineBucket,
      setTimelineBucket: handleSetTimelineBucket,
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
      currentView,
    }),
    [
      searchText,
      selected,
      toggleSelect,
      gridSize,
      resultView,
      handleSetResultView,
      timelineBucket,
      handleSetTimelineBucket,
      currentFilter,
      showFilters,
      dateFrom,
      dateTo,
      ratingMin,
      detailIdx,
      focusIdx,
      layoutRows,
      showRecentActivity,
      showSearchHistory,
      bottomNavTab,
      authRequired,
      authTokenInput,
      currentView,
    ]
  );

  const dataProps = useMemo(
    () => ({
      dir: dir ?? undefined,
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
      allTags: tagsQuery.data?.all || allTags,
      needsHf,
      needsOAI,
      results,
      query,
      fav: favoritesQuery.data?.favorites || fav,
      favOnly,
      topK,
      saved: savedSearchesQuery.data?.saved || saved,
      collections,
      smart,
      library,
      libHasMore: _libHasMore,
      tagsMap: tagsQuery.data?.tags || tagsMap,
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
      highContrast,
      isConnected,
      items,
      hasAnyFilters,
      indexCoverage: _indexCoverage,
    }),
    [
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
      tagsQuery.data?.all,
      allTags,
      needsHf,
      needsOAI,
      results,
      query,
      favoritesQuery.data?.favorites,
      fav,
      favOnly,
      topK,
      savedSearchesQuery.data?.saved,
      saved,
      collections,
      smart,
      library,
      _libHasMore,
      tagsQuery.data?.tags,
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
      highContrast,
      isConnected,
      items,
      hasAnyFilters,
      _indexCoverage,
    ]
  );

  const actionProps = useMemo(
    () => ({
      handleAccessibilitySettingsChange,
      doSearchImmediate: async (text?: string) => {
        await doSearchImmediate(text ?? "");
      },
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
      exportSelected: _exportSelected,
      handlePhotoOpen,
      handlePhotoAction: _handlePhotoAction,
      setRatingSelected: _setRatingSelected,
      rowsEqual,
    }),
    [
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
      _exportSelected,
      handlePhotoOpen,
      _handlePhotoAction,
      _setRatingSelected,
      rowsEqual,
    ]
  );

  const contextProps = useMemo(
    () => ({
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
      loadPreset: (preset: FilterPreset) => loadPreset(preset),
      deletePreset,
    }),
    [
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
    ]
  );

  const refProps = {
    scrollContainerRef,
    layoutRowsRef,
    toastTimerRef,
    activeToastRef,
  };

  return (
    <LayoutProvider value={layoutProps}>
      <ViewStateProvider value={viewStateProps}>
        <DataProvider value={dataProps}>
          <ActionsProvider value={actionProps}>
            <ModalDataBridgeProvider>
              <OnboardingProvider value={onboardingProps}>
                {/* Temporary cast: contextProps type mismatch (workspaceActions.setWorkspace signature). */}
                <AppChrome
                  location={location}
                  navigate={navigate}
                  // Type shim: workspaceActions.setWorkspace signature divergence; narrow cast to unknown then ContextProps
                  context={
                    contextProps as unknown as Parameters<
                      typeof AppChrome
                    >[0]["context"]
                  }
                  refs={refProps}
                />
              </OnboardingProvider>
            </ModalDataBridgeProvider>
          </ActionsProvider>
        </DataProvider>
      </ViewStateProvider>
    </LayoutProvider>
  );
}

export default AppWithModalControls;
