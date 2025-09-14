import clsx from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import type React from "react";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
	API_BASE,
	apiAuthCheck,
	apiAuthStatus,
	apiBuildFast,
	apiBuildMetadata,
	apiBuildOCR,
	apiDemoDir,
	apiDiagnostics,
	apiExport,
	apiFacesClusters,
	apiGetFavorites,
	apiGetMetadata,
	apiGetSaved,
	apiGetTags,
	apiIndex,
	apiLibrary,
	apiMap,
	apiPing,
	apiSearch,
	apiSearchWorkspace,
	apiSetFavorite,
	apiWorkspaceAdd,
	type SearchResult,
	thumbUrl,
} from "./api";
import type { AccessibilitySettings } from "./components/AccessibilityPanel";
// Modern UX Components Integration
import { AccessibilityPanel } from "./components/AccessibilityPanel";
import { BottomNavigation } from "./components/BottomNavigation";
import Collections from "./components/Collections";
import type { ModalKey } from "./contexts/ModalContext";
import type { SettingsActions } from "./stores/types";


import {
	QuickActions,
	SampleSearchSuggestions,
} from "./components/EmptyStates";
import { EnhancedEmptyState } from "./components/EnhancedEmptyState";
import {
	ErrorBoundary,
	SectionErrorBoundary,
} from "./components/ErrorBoundary";
import { FilterPanel } from "./components/FilterPanel";
import { HintManager, HintProvider, useHintTriggers } from "./components/HintSystem";
import { JobsCenter } from "./components/JobsCenter";
import { useJobsContext } from "./contexts/JobsContext";
import { useModalContext } from "./contexts/ModalContext";

// Drawers handled via ModalManager

// Reuse existing feature components
import JustifiedResults from "./components/JustifiedResults";
import LibraryBrowser from "./components/LibraryBrowser";
import { Lightbox } from "./components/Lightbox";
import { LoadingSpinner } from "./components/LoadingSpinner";
import MapView from "./components/MapView";
import {
	MobileOptimizations,
	useHapticFeedback,
	useMobileDetection,
} from "./components/MobileOptimizations";
import MobilePWATest from "./components/MobilePWATest";
import ModernSidebar from "./components/ModernSidebar"; // kept for now, but replaced by AppShell usage
import { AppShell } from "./components/AppShell";
import { ResultsView } from "./views/ResultsView";
import { LibraryView as LibraryContainer } from "./views/LibraryView";
import { PeopleViewContainer } from "./views/PeopleViewContainer";
import { CollectionsViewContainer } from "./views/CollectionsViewContainer";
import { ResultsUIProvider } from "./contexts/ResultsUIContext";
import { ResultsConfigProvider } from "./contexts/ResultsConfigContext";
import { viewToPath, pathToView, isSharePath } from "./utils/router";
import { SavedViewContainer } from "./views/SavedViewContainer";
import { useOnboardingActions } from "./hooks/useOnboardingActions";
// Modals: still referenced below; keep named imports to satisfy JSX usage
import {
    CollectionModal,
    ExportModal,
    FolderModal,
    LikePlusModal,
    RemoveCollectionModal,
    SaveModal,
    TagModal,
} from "./components/modals";

// AdvancedSearchModal and EnhancedSharingModal handled via ModalManager

import FirstRunSetup from "./components/modals/FirstRunSetup";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { OnboardingTour, useOnboarding } from "./components/OnboardingTour";
import PeopleView from "./components/PeopleView";
import PerformanceMonitor from "./components/PerformanceMonitor";
import {
	ContextualHelp,
	OnboardingChecklist,
} from "./components/ProgressiveOnboarding";
import SavedSearches from "./components/SavedSearches";
import ShareViewer from "./components/ShareViewer";
import SmartCollections from "./components/SmartCollections";
import { StatsBar } from "./components/StatsBar";
import { StatusBar } from "./components/StatusBar";
// TasksView removed (developer-only)
import { ThemeProvider } from "./components/ThemeProvider";

// ThemeSettingsModal handled via ModalManager

import TimelineResults from "./components/TimelineResults";
import { TopBar } from "./components/TopBar";

// SearchOverlay handled via ModalManager

import ToastPortal from "./components/ToastPortal";
import { ModalManager } from "./components/ModalManager";
import { OverlayLayer } from "./components/OverlayLayer";
import TripsView from "./components/TripsView";
import { VideoLightbox } from "./components/VideoLightbox";
import { VideoManager } from "./components/VideoManager";
import { Welcome } from "./components/Welcome";
import { useLibraryContext } from "./contexts/LibraryContext";
import { useDebouncedCallback } from "./hooks/useDebounce";
import { useConnectivityAndAuth } from "./hooks/useConnectivityAndAuth";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useResultsShortcuts } from "./hooks/useResultsShortcuts";
import { ShareManager } from "./modules/ShareManager";
import { VideoService } from "./services/VideoService";
import { useAltSearch } from "./stores";
import {
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
	useOsTrashEnabled,
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
	useShowHelp,
	useShowInfoOverlay,
	useShowWelcome,
	useSmartCollections,
	useTagFilter,
	useTagsMap,
	useTopK,
	useUIActions,
	useWorkspaceActions,
	useWsToggle,
} from "./stores/useStores";

const basename = (p: string) => p.split("/").pop() || p;

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
type _IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;
type ViewType = "results" | "library" | "map" | "people" | "tasks" | "trips";

import { FocusTrap } from "./utils/accessibility";
import { handleError } from "./utils/errors";

// (Removed) Local ScrollLoader in favor of shared utils/loading ScrollLoader

export default function App() {
	// Skip to content link for keyboard users
	const _skipToContentRef = useRef<HTMLAnchorElement>(null);

	// Safety check to prevent infinite loops on initial render
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
		return () => setIsMounted(false);
	}, []);

	// Modern UX Integration - Mobile detection and haptic feedback
	const {
		isMobile,
		isTablet: _isTablet,
		screenSize: _screenSize,
	} = useMobileDetection();
	const { trigger: hapticTrigger } = useHapticFeedback();

	// Modern UX Integration - Onboarding and hints
	const { hasCompletedTour, completeTour } = useOnboarding();
	// const { triggerHint } = useHintTriggers(); // Moved inside provider context

	// Modern UX Integration - New state for enhanced features
	const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);
	const [showOnboardingTour, setShowOnboardingTour] = useState(
		!hasCompletedTour,
	);
	const [showModernSidebar, setShowModernSidebar] = useState(false);
	const [_useAnimatedGrid, _setUseAnimatedGrid] = useState(true);
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
	const useOsTrash = useOsTrashEnabled();
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
	const _savedSearches = saved; // alias for compatibility
	const collections = useCollections();
	const smart = useSmartCollections();
	const _trips: Array<{
		id: string;
		name: string;
		startDate: string;
		endDate: string;
		photos: string[];
	}> = []; // TODO: implement trips
	const library = useLibrary();
	const _libHasMore = useLibHasMore();
	const tagsMap = useTagsMap();

	// Individual hooks for UI
	const busy = useBusy();
	const note = useNote();
	// const viewMode = useViewMode()
	const showWelcome = useShowWelcome();
	const _showHelp = useShowHelp();

	// Individual hooks for workspace
	// const workspace = useWorkspace()
	const wsToggle = useWsToggle();
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
	const [searchText, setSearchText] = useState("");

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [gridSize, setGridSize] = useState<GridSize>("medium");
	const [resultView, _setResultView] = useState<"grid" | "timeline">("grid");
	const [timelineBucket, _setTimelineBucket] = useState<
		"day" | "week" | "month"
	>("day");
	const [currentFilter, setCurrentFilter] = useState<string>("all");
	const [showFilters, setShowFilters] = useState(false);
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [showShortcuts, setShowShortcuts] = useState(false);
	const { state: modalState, actions: modal } = useModalContext();
	const [detailIdx, setDetailIdx] = useState<number | null>(null);
	const [focusIdx, setFocusIdx] = useState<number | null>(null);
	const [layoutRows, setLayoutRows] = useState<number[][]>([]);
	const layoutRowsRef = useRef(layoutRows);
	const [_isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [bottomNavTab, setBottomNavTab] = useState<
		"home" | "search" | "favorites" | "settings"
	>("home");

	useEffect(() => {
		layoutRowsRef.current = layoutRows;
	}, [layoutRows]);

	// Modern UX Integration - Enhanced handlers
	const handleAccessibilitySettingsChange = useCallback(
		(settings: AccessibilitySettings) => {
			setAccessibilitySettings(settings);
			// Apply accessibility settings to the app
			console.log("Accessibility settings changed:", settings);
		},
		[],
	);

	const handleOnboardingComplete = useCallback(() => {
		setShowOnboardingTour(false);
		completeTour();
		uiActions.setNote("Welcome to Photo Search! 🎉");
	}, [completeTour, uiActions]);

	// Placeholder for swipe handlers - will be defined after function declarations
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [meta, setMeta] = useState<{ cameras: string[]; places?: string[] }>({
		cameras: [],
		places: [],
	});

	const [showOnboarding, setShowOnboarding] = useState(false);
	const { state: jobsState, actions: jobsActions } = useJobsContext();
	const jobs = jobsState.jobs;
	// Library state and actions (indexing, etc.)
	const { state: libState, actions: lib } = useLibraryContext();
	// Indexing state moved to LibraryProvider
	const [ocrReady, setOcrReady] = useState<boolean>(false);
	const [ratingMin, setRatingMin] = useState(0);
	const [toast, setToast] = useState<null | {
		message: string;
		actionLabel?: string;
		onAction?: () => void;
	}>(null);
	const [showHelpHint, setShowHelpHint] = useState(() => {
		try {
			const seen = localStorage.getItem("ps_hint_help_seen");
			return !seen;
		} catch {
			return true;
		}
	});
	const [presets, setPresets] = useState<{ name: string; query: string }[]>([]);
	const altSearch = useAltSearch();

	// Search Command Center
	const searchCommandCenter = useSearchCommandCenter();
	const toastTimerRef = useRef<number | null>(null);

	// Onboarding and user action tracking
	const [userActions, setUserActions] = useState<string[]>(() => {
		try {
			const stored = localStorage.getItem("userActions");
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	});
	const [onboardingSteps, setOnboardingSteps] = useState<string[]>(() => {
		try {
			const stored = localStorage.getItem("onboardingSteps");
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	});
	// Event-based onboarding completion helper with prerequisites
	const completeOnboardingStep = useCallback(
		(
			step:
				| "select_directory"
				| "index_photos"
				| "first_search"
				| "explore_features",
		) => {
			const prereq: Record<string, string[]> = {
				select_directory: [],
				index_photos: ["select_directory"],
				first_search: ["index_photos"],
				explore_features: ["first_search"],
			};
			setOnboardingSteps((prev) => {
				if (prev.includes(step)) return prev;
				const req = prereq[step] || [];
				if (!req.every((s) => prev.includes(s))) return prev; // don't skip ahead
				const next = [...prev, step];
				try {
					localStorage.setItem("onboardingSteps", JSON.stringify(next));
				} catch {}
				return next;
			});
		},
		[],
	);
	const [showContextualHelp, setShowContextualHelp] = useState(false);
	const [showOnboardingChecklist, setShowOnboardingChecklist] = useState(false);
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
		} catch {}
	}, []);

	const highContrast = useHighContrast();
	const showInfoOverlay = useShowInfoOverlay();

	// Onboarding tour action listeners ("Do it for me")
	useOnboardingActions({ openModal: modal.open, openFilters: () => setShowFilters(true) });

	// Connectivity and auth requirement
	useConnectivityAndAuth({ setIsConnected, setAuthRequired });

	// Global keyboard shortcuts
	useGlobalShortcuts({
		anyModalOpen: Boolean(Object.values(modalState || {}).some(Boolean)),
		openModal: modal.open,
		toggleModal: modal.toggle,
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
			camera || isoMin || isoMax || fMin || fMax || place,
		);
		const anyDate = Boolean(dateFrom && dateTo);
		const anyPeople = Array.isArray(persons) && persons.length > 0;
		const anyTags = Boolean(tagFilter?.trim());
		const anyQuality = ratingMin > 0 || hasText;
		return Boolean(
			favOnly || anyExif || anyDate || anyPeople || anyTags || anyQuality,
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

	// Read search query + filters from URL for deep linking
	useEffect(() => {
		if (!isMounted) return;
		const sp = new URLSearchParams(location.search);
		const q = sp.get("q") || "";
		if (q && q !== searchText) setSearchText(q);
		// Parse optional filters from URL
		try {
			const fav = sp.get("fav");
			if (fav === "1") photoActions.setFavOnly(true);
			const tagsCSV = sp.get("tags") || "";
			if (tagsCSV) photoActions.setTagFilter(tagsCSV);
			const df = sp.get("date_from");
			const dt = sp.get("date_to");
			if (df) setDateFrom(df);
			if (dt) setDateTo(dt);
			const plc = sp.get("place");
			if (plc) settingsActions.setPlace(plc);
			const ht = sp.get("has_text");
			if (ht === "1") settingsActions.setHasText(true);
			const cam = sp.get("camera");
			if (cam) settingsActions.setCamera(cam);
			const isoMinP = sp.get("iso_min");
			if (isoMinP) settingsActions.setIsoMin(parseFloat(isoMinP));
			const isoMaxP = sp.get("iso_max");
			if (isoMaxP) settingsActions.setIsoMax(parseFloat(isoMaxP));
			const fmin = sp.get("f_min");
			if (fmin) settingsActions.setFMin(parseFloat(fmin));
			const fmax = sp.get("f_max");
			if (fmax) settingsActions.setFMax(parseFloat(fmax));
			// Rating filter
			const rmin = sp.get("rating_min");
			if (rmin) setRatingMin(Math.max(0, Math.min(5, parseInt(rmin, 10) || 0)));
			const person = sp.get("person");
			const personsCSV = sp.get("persons");
			if (personsCSV)
				workspaceActions.setPersons(
					personsCSV
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean),
				);
			else if (person) workspaceActions.setPersons([person]);
			// Engine/search behavior flags
			const fast = sp.get("fast");
			if (fast === "1") settingsActions.setUseFast(true);
			const fastk = sp.get("fast_kind");
			if (fastk) settingsActions.setFastKind(fastk);
			const caps = sp.get("caps");
			if (caps === "1") settingsActions.setUseCaps(true);
			const ocrq = sp.get("ocr");
			if (ocrq === "1") settingsActions.setUseOcr(true);
            const rv = sp.get("rv") as "grid" | "timeline" | "map" | null;
            if (rv && settingsActions.setResultView) {
                settingsActions.setResultView(rv);
                if (rv === "grid" || rv === "timeline") _setResultView(rv);
            }
            const tb = sp.get("tb") as "day" | "week" | "month" | "year" | null;
            if (tb && settingsActions.setTimelineBucket) {
                settingsActions.setTimelineBucket(tb);
                if (tb === "day" || tb === "week" || tb === "month") _setTimelineBucket(tb);
            }
		} catch {}
	}, [
		location.search,
		isMounted,
		searchText,
		photoActions,
		settingsActions,
		workspaceActions,
	]);

	// Track user actions for contextual help
	useEffect(() => {
		if (searchText?.trim()) {
			setUserActions((prev) => {
				if (!prev.includes("searched")) {
					const newActions = [...prev, "searched"];
					try {
						localStorage.setItem("userActions", JSON.stringify(newActions));
					} catch {}
					return newActions;
				}
				return prev;
			});
		}
	}, [searchText]);

	useEffect(() => {
		if (dir) {
			setUserActions((prev) => {
				if (!prev.includes("selected_directory")) {
					const newActions = [...prev, "selected_directory"];
					try {
						localStorage.setItem("userActions", JSON.stringify(newActions));
					} catch {}
					return newActions;
				}
				return prev;
			});
			// Complete onboarding step when a real directory is set
			completeOnboardingStep("select_directory");
		}
	}, [dir, completeOnboardingStep]);

	useEffect(() => {
		if (library && library.length > 0) {
			setUserActions((prev) => {
				if (!prev.includes("indexed")) {
					const newActions = [...prev, "indexed"];
					try {
						localStorage.setItem("userActions", JSON.stringify(newActions));
					} catch {}
					return newActions;
				}
				return prev;
			});
		}
	}, [library]);

	// Complete "Explore Features" once user navigates to Collections or other feature areas (after prior steps)
	useEffect(() => {
		const exploringViews: Array<View> = [
			"collections",
			"saved",
			"smart",
			"trips",
			"videos",
			"people",
			"map",
		];
		if (exploringViews.includes(currentView as View)) {
			completeOnboardingStep("explore_features");
		}
	}, [currentView, completeOnboardingStep]);

	// Show contextual help based on context and user actions
	useEffect(() => {
		const shouldShowHelp = () => {
			// Show help for first-time users
			if (userActions.length === 0) return true;

			// Show help when user hasn't searched yet but is on search view
			if (currentView === "results" && !userActions.includes("searched"))
				return true;

			// Show help when user has photos but hasn't searched
			if (
				currentView === "library" &&
				dir &&
				!userActions.includes("searched")
			)
				return true;

			return false;
		};

		setShowContextualHelp(shouldShowHelp());
	}, [currentView, userActions, dir]);

	// Show onboarding checklist for new users
	useEffect(() => {
		const hasCompletedOnboarding = localStorage.getItem("onboardingComplete");
		const shouldShowChecklist =
			!hasCompletedOnboarding && dir && library && library.length > 0;

		setShowOnboardingChecklist(shouldShowChecklist || false);
	}, [dir, library]);
	const [_libOffset, _setLibOffset] = useState(0);
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
		} catch {}
	}, [dir, photoActions]);

	const loadSaved = useCallback(async () => {
		if (!dir) return;
		try {
			const r = await apiGetSaved(dir);
			photoActions.setSaved(r.saved || []);
		} catch {}
	}, [dir, photoActions]);
	const loadPresets = useCallback(async () => {
		if (!dir) return;
		try {
			const { apiGetPresets } = await import("./api");
			const r = await apiGetPresets(dir);
			setPresets(r.presets || []);
		} catch {}
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
		} catch {}
	}, [dir, photoActions]);

	const loadDiag = useCallback(async () => {
		if (!dir) return;
		try {
			const r = await apiDiagnostics(
				dir,
				engine,
				needsOAI ? openaiKey : undefined,
				needsHf ? hfToken : undefined,
			);
			workspaceActions.setDiag(r);
		} catch {}
	}, [dir, engine, needsOAI, openaiKey, needsHf, hfToken, workspaceActions]);

	const loadFaces = useCallback(async () => {
		if (!dir) return;
		try {
			const r = await apiFacesClusters(dir);
			workspaceActions.setClusters(r.clusters || []);
		} catch {}
	}, [dir, workspaceActions]);

	const loadMap = useCallback(async () => {
		if (!dir) return;
		try {
			const r = await apiMap(dir);
			workspaceActions.setPoints(r.points || []);
		} catch {}
	}, [dir, workspaceActions]);

	const loadLibrary = useCallback(
		async (limit = 120, offset = 0, append = false) => {
			try {
				if (!dir) return;
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
			} catch {}
		},
		[dir, engine, needsOAI, openaiKey, needsHf, hfToken, photoActions],
	);

	const loadMetadata = useCallback(async () => {
		try {
			if (!dir) return;
			const r = await apiGetMetadata(dir);
			setMeta({ cameras: r.cameras || [], places: r.places || [] });
		} catch {}
	}, [dir]);

	// One-time OCR status check per directory
	useEffect(() => {
		let cancelled = false;
		const run = async () => {
			if (!dir) {
				setOcrReady(false);
				return;
			}
			try {
				const { apiOcrStatus } = await import("./api");
				const r = await apiOcrStatus(dir);
				if (!cancelled) setOcrReady(!!r.ready);
			} catch {
				if (!cancelled) setOcrReady(false);
			}
		};
		run();
		return () => {
			cancelled = true;
		};
	}, [dir]);

	// Actions migrated: indexing managed by LibraryProvider

	const doSearchImmediate = useCallback(
		async (text?: string) => {
			const q = (text ?? searchText ?? "").trim();
			if (!q) return;
			// If no directory is selected, automatically load the demo library
			if (!dir) {
				try {
					const demoPath = await apiDemoDir();
					if (!demoPath) {
						uiActions.setNote("Demo library not available.");
						return;
					}
					settingsActions.setDir(demoPath);
					uiActions.setNote("Loading demo library… indexing will run once.");
					try {
						await apiWorkspaceAdd(demoPath);
					} catch {}
					await lib.index({ dir: demoPath, provider: engine });
					await loadLibrary(120, 0);
				} catch {}
			}
			photoActions.setQuery(q);
			// Push URL state for deep linking including filters
			try {
				const sp = new URLSearchParams();
				sp.set("q", q);
				if (favOnly) sp.set("fav", "1");
				if (tagFilter?.trim()) sp.set("tags", tagFilter);
				if (dateFrom && dateTo) {
					sp.set("date_from", dateFrom);
					sp.set("date_to", dateTo);
				}
				if (place?.trim()) sp.set("place", place);
				if (hasText) sp.set("has_text", "1");
				if (camera?.trim()) sp.set("camera", camera);
				if (isoMin) sp.set("iso_min", String(isoMin));
				if (isoMax) sp.set("iso_max", String(isoMax));
				if (fMin) sp.set("f_min", String(fMin));
				if (fMax) sp.set("f_max", String(fMax));
				if (ratingMin > 0) sp.set("rating_min", String(ratingMin));
				const ppl = persons.filter(Boolean);
				if (ppl.length === 1) sp.set("person", ppl[0]);
				if (ppl.length > 1) sp.set("persons", ppl.join(","));
				// Engine/search behavior flags
				if (useFast) sp.set("fast", "1");
				if (fastKind) sp.set("fast_kind", fastKind);
				if (useCaps) sp.set("caps", "1");
                if (useOcr) sp.set("ocr", "1");
                // UI state for result presentation
                try {
                    if (resultView) sp.set("rv", resultView);
                    if (timelineBucket) sp.set("tb", timelineBucket);
                } catch {}
				navigate(
					{ pathname: "/search", search: `?${sp.toString()}` },
					{ replace: false },
				);
			} catch {}
			uiActions.setBusy("Searching…");
			uiActions.setNote("");
            try {
                const tagList = tagFilter
					.split(",")
					.map((s: string) => s.trim())
					.filter(Boolean);
				const ppl = persons.filter(Boolean);
				let r: { results?: SearchResult[]; search_id?: string };
				const df = dateFrom
					? Math.floor(new Date(dateFrom).getTime() / 1000)
					: undefined;
				const dt = dateTo
					? Math.floor(new Date(dateTo).getTime() / 1000)
					: undefined;
				if (wsToggle) {
					r = await apiSearchWorkspace(dir, q, engine, topK, {
						favoritesOnly: favOnly,
						tags: tagList,
						dateFrom: df,
						dateTo: dt,
						place: place || undefined,
						hasText,
						...(ppl.length === 1
							? { person: ppl[0] }
							: ppl.length > 1
								? { persons: ppl }
								: {}),
					});
				} else {
					r = await apiSearch(dir, q, engine, topK, {
						hfToken: needsHf ? hfToken : undefined,
						openaiKey: needsOAI ? openaiKey : undefined,
						favoritesOnly: favOnly,
						tags: tagList,
						dateFrom: df,
						dateTo: dt,
						...(useFast
							? { useFast: true, fastKind: fastKind || undefined }
							: {}),
						useCaptions: useCaps,
						useOcr,
						camera: camera || undefined,
						isoMin: isoMin || undefined,
						isoMax: isoMax || undefined,
						fMin: fMin || undefined,
						fMax: fMax || undefined,
						place: place || undefined,
						hasText: hasText || undefined,
						...(ppl.length === 1
							? { person: ppl[0] }
							: ppl.length > 1
								? { persons: ppl }
								: {}),
					});
				}
				let res = r.results || [];
				if (ratingMin > 0) {
					res = res.filter((it) => (ratingMap[it.path] || 0) >= ratingMin);
				}
				photoActions.setResults(res);
				photoActions.setSearchId(r.search_id || "");
				uiActions.setNote(`Found ${r.results?.length || 0} results.`);
				await Promise.all([loadFav(), loadSaved(), loadTags(), loadDiag()]);
				// Mark onboarding: first search completed
				completeOnboardingStep("first_search");
            } catch (e) {
                uiActions.setNote(e instanceof Error ? e.message : "Search failed");
                handleError(e, {
                    logToConsole: true,
                    logToServer: true,
                    context: { action: "search", component: "App.doSearchImmediate", dir },
                });
            } finally {
                uiActions.setBusy("");
            }
		},
		[
			searchText,
			photoActions,
			navigate,
			uiActions,
			persons,
			dateFrom,
			dateTo,
			wsToggle,
			dir,
			engine,
			topK,
			favOnly,
			place,
			hasText,
			needsHf,
			hfToken,
			needsOAI,
			openaiKey,
			useFast,
			fastKind,
			useCaps,
			useOcr,
			camera,
			isoMin,
			isoMax,
			fMin,
			fMax,
			ratingMin,
			ratingMap,
			loadFav,
			loadSaved,
			loadTags,
			loadDiag,
			completeOnboardingStep,
			loadLibrary,
			settingsActions.setDir,
			tagFilter,
			lib.index,
		],
	);

	// Debounced search for better performance
	const doSearch = useDebouncedCallback(doSearchImmediate, 300);

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
		window.addEventListener("advanced-search-apply", onApply as EventListener);
		return () => window.removeEventListener("advanced-search-apply", onApply as EventListener);
	}, [doSearchImmediate]);

	const prepareFast = useCallback(
		async (kind: "annoy" | "faiss" | "hnsw") => {
			uiActions.setBusy(`Preparing ${kind.toUpperCase()}…`);
			try {
				await apiBuildFast(
					dir,
					kind,
					engine,
					needsHf ? hfToken : undefined,
					needsOAI ? openaiKey : undefined,
				);
				uiActions.setNote(`${kind.toUpperCase()} ready`);
    } catch (e) {
        uiActions.setNote(
            e instanceof Error ? e.message : "Failed to build index",
        );
        handleError(e, { logToServer: true, context: { action: "build_fast", component: "App.buildFast", dir } });
    } finally {
        uiActions.setBusy("");
    }
		},
		[dir, engine, needsHf, hfToken, needsOAI, openaiKey, uiActions],
	);

	const buildOCR = useCallback(async () => {
		uiActions.setBusy("Extracting text (OCR)…");
		try {
			const r = await apiBuildOCR(
				dir,
				engine,
				["en"],
				needsHf ? hfToken : undefined,
				needsOAI ? openaiKey : undefined,
			);
			uiActions.setNote(`OCR updated ${r.updated} images`);
			await loadTags();
    } catch (e) {
        uiActions.setNote(e instanceof Error ? e.message : "OCR failed");
        handleError(e, { logToServer: true, context: { action: "build_ocr", component: "App.buildOCR", dir } });
    } finally {
        uiActions.setBusy("");
    }
	}, [dir, engine, needsHf, hfToken, needsOAI, openaiKey, loadTags, uiActions]);

	const buildMetadata = useCallback(async () => {
		uiActions.setBusy("Building metadata…");
		try {
			const r = await apiBuildMetadata(
				dir,
				engine,
				needsHf ? hfToken : undefined,
				needsOAI ? openaiKey : undefined,
			);
			uiActions.setNote(`Metadata ready (${r.updated})`);
    } catch (e) {
        uiActions.setNote(
            e instanceof Error ? e.message : "Metadata build failed",
        );
        handleError(e, { logToServer: true, context: { action: "build_metadata", component: "App.buildMetadata", dir } });
    } finally {
        uiActions.setBusy("");
    }
	}, [dir, engine, needsHf, hfToken, needsOAI, openaiKey, uiActions]);

	// Poll analytics when busy to surface progress notes
	useEffect(() => {
		if (!busy || !dir) return;
		let t: number;
		let last = "";
		const summarize = (e: {
			type?: string;
			updated?: number;
			ok?: boolean;
			kind?: string;
			made?: number;
			trips?: number;
			copied?: number;
			skipped?: number;
		}) => {
			switch (e?.type) {
				case "ocr_build":
					return `OCR updated ${e.updated}`;
				case "captions_build":
					return `Captions updated ${e.updated}`;
				case "fast_build":
					return `${String(e.kind).toUpperCase()} ${e.ok ? "ready" : "failed"}`;
				case "thumbs_build":
					return `Thumbs made ${e.made}`;
				case "trips_build":
					return `Trips ${e.trips}`;
				case "metadata_build":
					return `Metadata updated ${e.updated}`;
				case "export":
					return `Exported ${e.copied}, skipped ${e.skipped}`;
				default:
					return "";
			}
		};
		const tick = async () => {
			try {
				const { apiAnalytics } = await import("./api");
				const r = await apiAnalytics(dir, 10);
				const ev = (r.events || []).slice(-1)[0];
				if (ev && ev.time !== last) {
					last = ev.time;
					const msg = summarize(ev);
					if (msg) uiActions.setNote(msg);
				}
			} catch {}
			t = window.setTimeout(tick, 2000);
		};
		tick();
		return () => {
			if (t) window.clearTimeout(t);
		};
	}, [busy, dir, uiActions]);

	// Index status polling moved to LibraryProvider

	// Keep URL in sync with resultView/timelineBucket (when in results view)
	useEffect(() => {
		try {
			const sp = new URLSearchParams(location.search);
			sp.set("rv", resultView);
			sp.set("tb", timelineBucket);
			navigate(
				{ pathname: location.pathname, search: `?${sp.toString()}` },
				{ replace: true },
			);
		} catch {}
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
					false,
				);
				uiActions.setNote(
					`Exported ${r.copied}, skipped ${r.skipped}, errors ${r.errors} → ${r.dest}`,
				);
			} catch (e) {
				uiActions.setNote(e instanceof Error ? e.message : "Export failed");
			}
		},
		[dir, selected, uiActions],
	);

	// Lightbox helpers
	const openDetailByPath = useCallback(
		(p: string) => {
			const idx = (results || []).findIndex((r) => r.path === p);
			if (idx >= 0) setDetailIdx(idx);
		},
		[results],
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
		[results],
	);

	const tagSelected = useCallback(
		async (tagText: string) => {
			if (!dir || selected.size === 0) return;
			const tagList = tagText
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			try {
				const { apiSetTags } = await import("./api");
				await Promise.all(
					Array.from(selected).map((p) => apiSetTags(dir, p, tagList)),
				);
				uiActions.setNote(`Updated tags for ${selected.size} photos`);
				await loadTags();
			} catch (e) {
				uiActions.setNote(e instanceof Error ? e.message : "Tag update failed");
			}
		},
		[dir, selected, loadTags, uiActions],
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
		(action: string, photo: { path: string } & Partial<import("./models/PhotoMeta").PhotoMeta>) => {
			switch (action) {
				case "favorite":
					// Toggle favorite with haptic feedback
					if (photo.path) {
						apiSetFavorite(dir, photo.path, !fav.includes(photo.path))
							.then(loadFav)
							.catch(() => {});
					}
					hapticTrigger("light");
					break;
				case "rate":
					// Update rating
					if (photo.path) {
						const rating = photo.rating || 1;
						// Implementation would go here
						console.log(`Rate photo ${photo.path} with ${rating} stars`);
					}
					break;
				case "delete":
					// Delete photo
					if (photo.path) {
						setSelected(new Set([photo.path]));
						// Implementation would go here
						console.log(`Delete photo ${photo.path}`);
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
					} else {
						// Fallback share implementation
						console.log(`Share photo ${photo.path}`);
					}
					break;
				default:
					console.log(`Action ${action} on photo ${photo.path || photo.id}`);
			}
		},
		[dir, fav, loadFav, hapticTrigger, uiActions, isMobile],
	);

	const _setRatingSelected = useCallback(
		async (rating: 1 | 2 | 3 | 4 | 5 | 0) => {
			if (!dir || selected.size === 0) return;
			try {
				const { apiSetTags } = await import("./api");
				const re = /^rating:[1-5]$/;
				const paths = Array.from(selected);
				await Promise.all(
					paths.map(async (p) => {
						const curr = (tagsMap?.[p] || []).filter((t) => !re.test(t));
						const next = rating === 0 ? curr : [...curr, `rating:${rating}`];
						await apiSetTags(dir, p, next);
					}),
				);
				uiActions.setNote(
					rating === 0
						? `Cleared rating for ${selected.size}`
						: `Set rating ${rating} for ${selected.size}`,
				);
				await loadTags();
			} catch (e) {
				uiActions.setNote(
					e instanceof Error ? e.message : "Rating update failed",
				);
			}
		},
		[dir, selected, tagsMap, loadTags, uiActions],
	);

	// Helper function to compare layout rows
	const rowsEqual = useCallback(
		(a: number[][], b: number[][]) =>
			a.length === b.length &&
			a.every(
				(r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j]),
			),
		[],
	);

	// Initial data load when directory changes. Keep deps minimal to avoid render loops.
	useEffect(() => {
		if (!dir) return;
		(async () => {
			try {
				await Promise.all([
					loadFav(),
					loadSaved(),
					loadTags(),
					loadDiag(),
					loadFaces(),
					loadMetadata(),
					loadPresets(),
				]);
				await loadLibrary(libLimit, 0);
			} catch {}
		})();
	}, [
		dir,
		loadDiag,
		loadFaces,
		loadFav,
		loadLibrary,
		loadMetadata,
		loadPresets,
		loadSaved,
		loadTags,
	]);

	// Infinite scroll sentinel moved to top-level component

	// Reset focus when results change - depend on length only
	useEffect(() => {
		if (!isMounted) return;
		const len = results?.length ?? 0;
		setFocusIdx((prev) => {
			const next =
				len > 0 ? (prev === null ? 0 : Math.min(prev, len - 1)) : null;
			return Object.is(prev, next) ? prev : next;
		});
	}, [results?.length, isMounted]);

	// Results context keyboard shortcuts
	useResultsShortcuts({
    enabled: currentView === "results",
		anyOverlayOpen:
			Boolean(showShortcuts) || Boolean(showFilters) || Boolean(Object.values(modalState || {}).some(Boolean)),
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
			`[data-photo-idx="${focusIdx}"]`,
		) as HTMLElement | null;
		if (el) el.scrollIntoView({ block: "nearest", inline: "nearest" });
	}, [focusIdx]);

	// UI building blocks
	const LibraryView = () => {
		// Show empty state if no directory selected
		if (!dir) {
			return (
				<div className="p-4">
					<EnhancedEmptyState
						type="no-directory"
						onAction={() => modal.open("folder")}
						onDemoAction={async () => {
							try {
								const demoPath = await apiDemoDir();
								if (!demoPath) {
									uiActions.setNote(
										"Demo library not available on this install.",
									);
									return;
								}
								settingsActions.setDir(demoPath);
								await lib.index();
								uiActions.setNote(
									"Demo library loaded! Try 'beach sunset' or 'family photos'",
								);
							} catch (error) {
								console.error("Failed to setup demo:", error);
								uiActions.setNote(
									error instanceof Error
										? error.message
										: "Failed to setup demo",
								);
							}
						}}
						onOpenHelp={() => modal.open("help")}
						onStartTour={() => modal.open("help")}
						sampleQueries={[
							"beach sunset",
							"birthday cake",
							"mountain hike",
							"red car",
						]}
						onRunSample={(q) => doSearchImmediate(q)}
					/>
					<QuickActions
						onSelectDirectory={() => modal.open("folder")}
						onImport={() => {
							/* TODO: Implement import */
						}}
						onHelp={() => modal.open("help")}
					/>
				</div>
			);
		}

		// Show indexing state if starting from empty library and indexing is active
		if (library && library.length === 0 && libState.isIndexing) {
			return (
				<div className="p-4">
					<EnhancedEmptyState
						type="indexing"
						indexingProgress={Math.round((libState.progressPct || 0) * 100)}
						estimatedTime={
							typeof libState.etaSeconds === "number" &&
							Number.isFinite(libState.etaSeconds)
								? `~${Math.max(1, Math.ceil((libState.etaSeconds || 0) / 60))}m`
								: undefined
						}
					/>
				</div>
			);
		}

		// Show empty state if directory has no photos
		if (library && library.length === 0) {
			return (
				<div className="p-4">
					<EnhancedEmptyState
						type="no-photos"
						onAction={() => modal.open("folder")}
						onOpenHelp={() => modal.open("help")}
					/>
				</div>
			);
		}

		return (
			<div className="p-4">
				<LibraryBrowser
					dir={dir}
					engine={engine}
					library={library}
					onLoadLibrary={loadLibrary}
					selected={selected}
					onToggleSelect={toggleSelect}
					onOpen={(path) => {
						// Open photo in lightbox/detail view
						const results = [{ path, score: 0 }];
						photoActions.setResults(results);
						setDetailIdx(0);
						navigate(viewToPath("results"));
					}}
					tagsMap={tagsMap}
				/>
				{!searchText && (
					<div className="mt-4">
						<div className="text-sm text-gray-700 font-medium mb-2">
							Try these searches
						</div>
						<SampleSearchSuggestions onSearch={doSearchImmediate} />
					</div>
				)}
			</div>
		);
	};

	interface AppWithHintsProps {
		searchText: string;
		selected: Set<string>;
		showAccessibilityPanel: boolean;
		setShowAccessibilityPanel: (v: boolean) => void;
		handleAccessibilitySettingsChange: (
			settings: AccessibilitySettings,
		) => void;
		showOnboardingTour: boolean;
		handleOnboardingComplete: () => void;
		setShowOnboardingTour: (v: boolean) => void;
	}

	function AppWithHints(props: AppWithHintsProps) {
		const {
			searchText,
			selected,
			showAccessibilityPanel,
			setShowAccessibilityPanel,
			handleAccessibilitySettingsChange,
			showOnboardingTour: _showOnboardingTour,
			handleOnboardingComplete: _handleOnboardingComplete,
			setShowOnboardingTour: _setShowOnboardingTour,
		} = props;
		const { triggerHint } = useHintTriggers();

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
		}, [selected.size, triggerHint]);

		return (
			<>
				{/* Modern UX Integration - Accessibility Panel */}
				{showAccessibilityPanel && (
					<AccessibilityPanel
						isOpen={showAccessibilityPanel}
						onClose={() => setShowAccessibilityPanel(false)}
						onSettingsChange={handleAccessibilitySettingsChange}
					/>
				)}

				{/* Hint System is already provided by HintProvider in the main tree */}
			</>
		);
	}

	// Component that uses hint triggers within provider context

	return (
		<ErrorBoundary>
			<ThemeProvider>
				{/* Modern UX Integration - Wrap with modern providers */}
				<HintProvider>
						{!Object.values(modalState || {}).some(Boolean) ? (
						<HintManager>
							<MobileOptimizations
								onSwipeLeft={handleSwipeLeft}
								onSwipeRight={handleSwipeRight}
								onSwipeUp={() => setShowModernSidebar(!showModernSidebar)}
								enableSwipeGestures={isMobile}
								enablePullToRefresh={true}
								onPullToRefresh={handlePullToRefresh}
							>
                                {/* Dedicated share viewer route (full screen, minimal chrome) */}
                                {isSharePath(location.pathname) && (
                                    <ShareViewer />
                                )}
								{(location.pathname || "").startsWith("/mobile-test") && (
									<MobilePWATest />
								)}
								<div
									className={clsx(
										"flex h-screen bg-white dark:bg-gray-950 dark:text-gray-100",
										{
											"high-contrast": accessibilitySettings?.highContrast,
											"large-text": accessibilitySettings?.largeText,
                                    hidden:
                                        isSharePath(location.pathname) ||
                                        (location.pathname || "").startsWith("/mobile-test"),
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
											onStartDemo={async () => {
												// Set demo photos directory and close welcome
												const demoPath = await apiDemoDir();
												if (!demoPath) {
													uiActions.setNote(
														"Demo data is not available on this system.",
													);
													return;
												}
												settingsActions.setDir(demoPath);
												uiActions.setShowWelcome(false);

												// Add demo path to workspace and index it
												try {
													await apiWorkspaceAdd(demoPath);
													await lib.index();
												} catch (error) {
													console.error(
														"Failed to add demo path or index:",
														error,
													);
													uiActions.setNote(
														error instanceof Error
															? error.message
															: "Failed to setup demo",
													);
												}
											}}
											onSelectFolder={() => {
												modal.open("folder");
												uiActions.setShowWelcome(false);
											}}
											onClose={() => uiActions.setShowWelcome(false)}
										/>
									)}

									{/* First-run setup */}
									<FirstRunSetup
										open={!dir && showOnboarding}
										onClose={() => {
											setShowOnboarding(false);
											localStorage.setItem("hasSeenOnboarding", "true");
										}}
										onQuickStart={async (paths) => {
											try {
												// Add each path to workspace; set first as current dir; index each
												const existing: string[] = [];
												for (const p of paths) {
													try {
														const st = await fetch(`${API_BASE}/scan_count`, {
															method: "POST",
															headers: { "Content-Type": "application/json" },
															body: JSON.stringify([p]),
														});
														if (st.ok) {
															const js = await st.json();
															if (js.items?.[0]?.exists) existing.push(p);
														}
													} catch {}
												}
												if (existing.length === 0) {
													setShowOnboarding(false);
													localStorage.setItem("hasSeenOnboarding", "true");
													return;
												}
												settingsActions.setDir(existing[0]);
												// Kick off background indexing without blocking
												for (const p of existing) {
													try {
														await apiWorkspaceAdd(p);
													} catch {}
													(async () => {
														try {
															await apiIndex(
																p,
																engine,
																24,
																needsHf ? hfToken : undefined,
																needsOAI ? openaiKey : undefined,
															);
														} catch {}
													})();
												}
												setShowOnboarding(false);
												localStorage.setItem("hasSeenOnboarding", "true");
											} catch (e) {
												uiActions.setNote(
													e instanceof Error ? e.message : "Quick start failed",
												);
											}
										}}
										onCustom={() => {
											modal.open("folder");
											setShowOnboarding(false);
											localStorage.setItem("hasSeenOnboarding", "true");
										}}
										onDemo={async () => {
											try {
												const demoPath = await apiDemoDir();
												if (!demoPath) {
													uiActions.setNote(
														"Demo data is not available on this system.",
													);
													setShowOnboarding(false);
													localStorage.setItem("hasSeenOnboarding", "true");
													return;
												}
												settingsActions.setDir(demoPath);
												await apiWorkspaceAdd(demoPath);
												await lib.index();
											} catch (e) {
												uiActions.setNote(
													e instanceof Error ? e.message : "Demo setup failed",
												);
											}
											setShowOnboarding(false);
											localStorage.setItem("hasSeenOnboarding", "true");
										}}
										onTour={() => {
											modal.open("help");
										}}
									/>

									{/* App shell with sidebar + header */}
    <AppShell
										showModernSidebar={true}
										isMobile={isMobile}
										sidebarStats={{
											totalPhotos: library?.length || 0,
											collections: Object.keys(collections || {}).length,
											people: (clusters || []).length,
											favorites: fav.length,
										}}
										darkMode={themeMode === "dark"}
										onDarkModeToggle={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
            onSettingsClick={() => setShowAccessibilityPanel(true)}
            selectedView={currentView}
                                onViewChange={(view: string) => {
                                    switch (view) {
                                        case "results":
                                            navigate(viewToPath("results"));
                                            break;
                                        case "library":
                                            navigate(viewToPath("library"));
                                            break;
                                        case "people":
                                            navigate(viewToPath("people"));
                                            break;
                                        case "collections":
                                            navigate(viewToPath("collections"));
                                            break;
                                        case "saved":
                                            navigate(viewToPath("saved"));
                                            break;
                                        case "map":
                                            navigate(viewToPath("map"));
                                            break;
                                        case "smart":
                                            navigate(viewToPath("smart"));
                                            break;
                                        case "trips":
                                            navigate(viewToPath("trips"));
                                            break;
                                        case "videos":
                                            navigate(viewToPath("videos"));
                                            break;
                                        default:
                                            navigate(viewToPath("library"));
                                    }
                                }}
										onSelectLibrary={() => modal.open("folder")}
										topBarProps={{
											searchText,
											setSearchText,
											onSearch: doSearchImmediate,
											clusters: clusters || [],
											allTags: allTags || [],
											meta: meta || { cameras: [], places: [] },
											busy: !!busy,
											gridSize,
											setGridSize,
                                selectedView: (currentView as ViewType),
                                setSelectedView: (v) => navigate(viewToPath(String(v))),
											currentFilter,
											setCurrentFilter,
											ratingMin,
											setRatingMin,
											setModal: (m: { kind: string } | null) => (m ? modal.open(m.kind as ModalKey) : undefined),
											setIsMobileMenuOpen,
											setShowFilters,
											selected,
											setSelected,
											dir,
											engine,
											topK,
											useOsTrash,
											showInfoOverlay,
											onToggleInfoOverlay: () =>
												settingsActions.setShowInfoOverlay ? settingsActions.setShowInfoOverlay(!showInfoOverlay) : undefined,
											resultView: resultView as "grid" | "timeline",
											onChangeResultView: (view) => settingsActions.setResultView?.(view),
											timelineBucket,
											onChangeTimelineBucket: (b) => settingsActions.setTimelineBucket?.(b),
											photoActions,
											uiActions,
											toastTimerRef,
											setToast,
											isIndexing: libState.isIndexing,
											onIndex: () => lib.index(),
											activeJobs: jobs.filter((j) => j.status === "running").length,
											onOpenJobs: () => modal.open("jobs"),
											progressPct: libState.progressPct,
											etaSeconds: libState.etaSeconds,
											paused: libState.paused,
											tooltip: libState.tip,
											ocrReady,
											onOpenSearchOverlay: () => modal.open("search"),
											onPause: async () => { try { await lib.pause?.(dir); } catch {} },
											onResume: async () => { try { await lib.resume?.(dir); } catch {} },
											onOpenThemeModal: () => modal.open("theme"),
											onOpenDiagnostics: () => modal.open("diagnostics"),
										}}
									>
										{/* Modern UX Integration - Accessibility Button */}
										<div className="px-4 pt-2 flex items-center gap-2">
											<motion.button
												{...(prefersReducedMotion
													? {}
													: {
															whileHover: { scale: 1.05 },
															whileTap: { scale: 0.95 },
														})}
												onClick={() => setShowAccessibilityPanel(true)}
												className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
												aria-label="Accessibility settings"
											>
												<span className="text-sm">♿</span>
											</motion.button>

											<motion.button
												{...(prefersReducedMotion
													? {}
													: {
															whileHover: { scale: 1.05 },
															whileTap: { scale: 0.95 },
														})}
												onClick={() => setShowOnboardingTour(true)}
												className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
												aria-label="Help and onboarding"
											>
												<span className="text-sm">?</span>
											</motion.button>

											{showHelpHint && (
												<div className="flex-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded px-3 py-1 text-xs flex items-center justify-between">
													<span>
														Press <span className="font-mono">?</span> for help
														and shortcuts
													</span>
													<button
														type="button"
														className="text-yellow-800 hover:text-yellow-900"
														aria-label="Dismiss help hint"
														onClick={() => {
															setShowHelpHint(false);
															try {
																localStorage.setItem("ps_hint_help_seen", "1");
															} catch {}
														}}
													>
														×
													</button>
												</div>
											)}
										</div>
										<main
											id="main-content"
											className="flex-1 overflow-auto"
											ref={scrollContainerRef}
											aria-label="Main content"
										>
											<ResultsConfigProvider
												value={{
													resultView: resultView as "grid" | "timeline",
													setResultView: (v) => {
														_setResultView(v);
														settingsActions.setResultView?.(v);
													},
													timelineBucket,
													setTimelineBucket: (b) => {
														_setTimelineBucket(b);
														settingsActions.setTimelineBucket?.(b);
													},
												}}
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
											{/* Route-mounted feature containers */}
											<Routes>
												<Route path="/people" element={<PeopleViewContainer />} />
												<Route path="/collections" element={<CollectionsViewContainer />} />
												<Route
													path="/library"
													element={
														<LibraryContainer
															dir={dir}
															library={library}
															isIndexing={libState.isIndexing}
															progressPct={libState.progressPct}
															etaSeconds={libState.etaSeconds}
															onSelectLibrary={() => modal.open("folder")}
															onRunDemo={async () => {
															try {
																const demoPath = await apiDemoDir();
																if (!demoPath) {
																	uiActions.setNote("Demo library not available on this install.");
																	return;
																}
																settingsActions.setDir(demoPath);
																await lib.index();
																uiActions.setNote("Demo library loaded! Try 'beach sunset' or 'family photos'");
                                            } catch (error) {
                                                console.error("Failed to setup demo:", error);
                                                uiActions.setNote(error instanceof Error ? error.message : "Failed to setup demo");
                                                handleError(error, { logToServer: true, context: { action: "demo_setup", component: "App.LibraryView.onRunDemo", dir } });
                                            }
														}}
															onOpenHelp={() => modal.open("help")}
														/>
													}
												/>
												<Route
													path="/search"
													element={
														<ResultsView
															dir={dir}
															engine={engine}
															results={(results || []).map((r) => ({ path: r.path, score: r.score }))}
															searchText={searchText}
															altSearch={altSearch}
															ratingMap={ratingMap}
															showInfoOverlay={showInfoOverlay}
															openDetailByPath={openDetailByPath}
															scrollContainerRef={scrollContainerRef}
															setSearchText={setSearchText}
															onSearchNow={doSearchImmediate}
															resultView={resultView as "grid" | "timeline"}
															timelineBucket={timelineBucket}
															onLayout={(rows) => setLayoutRows((prev) => (rowsEqual(prev, rows) ? prev : rows))}
														/>
													}
												/>
												<Route
													path="/map"
													element={
														<div className="p-4">
															<MapView points={points || []} onLoadMap={loadMap} />
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
														/>
													}
												/>
												<Route path="/" element={<Navigate to="/library" replace />} />
											</Routes>
											<StatsBar
												items={items}
												note={note}
												diag={diag}
												engine={engine}
											/>

											{/* Filters panel */}
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
												availableCameras={meta?.cameras || []}
												yearRange={[2020, new Date().getFullYear()]}
												filterPresets={[]}
												onSavePreset={(preset) => {
													// TODO: Implement preset saving
													console.log("Save preset:", preset);
												}}
												onLoadPreset={(preset) => {
													// TODO: Implement preset loading
													console.log("Load preset:", preset);
												}}
												onDeletePreset={(presetId) => {
													// TODO: Implement preset deletion
													console.log("Delete preset:", presetId);
												}}
											/>
											{modalState.shareManage && (
												<div
													role="button"
													tabIndex={0}
													className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
													onKeyDown={(e) => {
														if (e.key === "Escape") modal.close("shareManage");
													}}
												>
													<FocusTrap
														onEscape={() => modal.close("shareManage")}
													>
														<div
															className="bg-white rounded-lg p-4 w-full max-w-2xl"
															role="dialog"
															aria-modal="true"
														>
															<div className="flex items-center justify-between mb-3">
																<div className="font-semibold">
																	Manage Shares
																</div>
																<button
																	type="button"
																	className="px-2 py-1 border rounded"
																	onClick={() => modal.close("shareManage")}
																>
																	Close
																</button>
															</div>
															<ShareManager dir={dir} />
														</div>
													</FocusTrap>
												</div>
											)}

											{/* Centralized modal rendering */}
											<ModalManager
												selected={selected}
												dir={dir}
												engine={engine}
												topK={topK}
												highContrast={highContrast}
												useFast={useFast}
												fastKind={fastKind}
												useCaps={useCaps}
												useOcr={useOcr}
												hasText={hasText}
												useOsTrash={useOsTrash}
												settingsActions={settingsActions as unknown as SettingsActions}
												uiActions={uiActions}
												photoActions={photoActions}
												libIndex={() => lib.index()}
												prepareFast={prepareFast}
												buildOCR={buildOCR}
												buildMetadata={buildMetadata}
												setSelectedView={(v: string) => navigate(viewToPath(v))}
												searchText={searchText}
												query={query}
												collections={collections}
												tagSelected={tagSelected}
												setToast={setToast}
												clusters={clusters}
												allTags={allTags || []}
												meta={meta}
											/>

											{/* Lightbox */}
											{detailIdx !== null &&
												results &&
												results[detailIdx] &&
												(VideoService.isVideoFile(results[detailIdx].path) ? (
													<VideoLightbox
														videoPath={results[detailIdx].path}
														videoUrl={`/api/media/${encodeURIComponent(
															results[detailIdx].path,
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
																const { apiOpen } = await import("./api");
																const p =
																	results && detailIdx !== null
																		? results[detailIdx]?.path
																		: undefined;
																if (p) await apiOpen(dir, p);
															} catch {}
														}}
														onFavorite={async () => {
															try {
																const p =
																	results && detailIdx !== null
																		? results[detailIdx]?.path
																		: undefined;
																if (p) {
																	await apiSetFavorite(
																		dir,
																		p,
																		!fav.includes(p),
																	);
																	await loadFav();
																}
															} catch {}
														}}
														onMoreLikeThis={async () => {
															try {
																const { apiSearchLike } = await import("./api");
																const p =
																	results && detailIdx !== null
																		? results[detailIdx]?.path
																		: undefined;
																if (!p) return;
																uiActions.setBusy("Searching similar…");
																const r = await apiSearchLike(
																	dir,
																	p,
																	engine,
																	topK,
																);
												photoActions.setResults(r.results || []);
												navigate("/search");
															} catch (e) {
																uiActions.setNote(
																	e instanceof Error
																		? e.message
																		: "Search failed",
																);
															} finally {
																uiActions.setBusy("");
															}
														}}
													/>
												))}

											{/* Floating Jobs button + drawer */}
											<button
												type="button"
												onClick={() => modal.open("jobs")}
												className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full shadow px-4 py-2"
												title="Open Jobs"
												aria-label="Open the jobs panel"
											>
												Jobs
											</button>

											{/* Centralized busy + toast overlays */}
											<OverlayLayer busy={busy} note={note} toast={toast} setToast={setToast} toastTimerRef={toastTimerRef} />

											{/* Status Bar */}
											{/* Auth required banner */}
											{authRequired && (
												<div className="bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-2 flex items-center gap-2 border-b border-amber-200 dark:border-amber-800">
													<span className="text-sm">API requires token</span>
													<input
														type="password"
														className="px-2 py-1 text-sm rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900"
														placeholder="Enter token"
														value={authTokenInput}
														onChange={(e) => setAuthTokenInput(e.target.value)}
													/>
													<button
														type="button"
														className="text-sm px-2 py-1 bg-amber-600 text-white rounded"
														onClick={async () => {
															const tok = authTokenInput.trim();
															if (!tok) return;
															try {
																localStorage.setItem("api_token", tok);
															} catch {}
															const ok = await apiAuthCheck(tok);
															if (ok) {
																setAuthRequired(false);
																setAuthTokenInput("");
																uiActions.setNote("Token accepted.");
															} else {
																uiActions.setNote(
																	"Token rejected — check API_TOKEN.",
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
													jobs.filter((j) => j.status === "running").length
												}
											/>

											{/* Jobs Center */}
											<JobsCenter
												jobs={jobs}
												onPause={(jobId) =>
													jobsActions.setStatus(jobId, "paused")
												}
												onResume={(jobId) =>
													jobsActions.setStatus(jobId, "running")
												}
												onCancel={(jobId) =>
													jobsActions.setStatus(jobId, "cancelled")
												}
												onRetry={(jobId) =>
													jobsActions.setStatus(jobId, "queued")
												}
												onClear={(jobId) => jobsActions.remove(jobId)}
												onClearAll={() => jobsActions.clearStopped()}
											/>

											{/* Bottom Navigation */}
											<BottomNavigation
												activeTab={bottomNavTab}
												onTabChange={(tab) => {
													setBottomNavTab(tab);
													// Map bottom nav tabs to main views
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
												onShowUpload={() => modal.open("folder")}
												onShowLibrary={() => modal.open("folder")}
												showSecondaryActions={true}
											/>

											{/* Progressive Onboarding Components */}
											<ContextualHelp
												isVisible={showContextualHelp}
												onDismiss={() => setShowContextualHelp(false)}
												context={
													(currentView === "results"
														? "results"
														: currentView === "library"
														? "library"
														: currentView === "collections"
														? "collections"
														: "search") as
														| "search"
														| "library"
														| "results"
														| "settings"
														| "collections"
												}
												userActions={userActions}
											/>

											<OnboardingChecklist
												isVisible={
													showOnboardingChecklist && !showOnboardingTour
												}
												onComplete={() => {
													setShowOnboardingChecklist(false);
													// Mark onboarding as complete
													try {
														localStorage.setItem("onboardingComplete", "true");
													} catch {}
												}}
												completedSteps={onboardingSteps}
												inProgressStepId={
													libState.isIndexing ? "index_photos" : undefined
												}
												onStepComplete={() => {
													/* no-op: completion is event-based */
												}}
												onStepAction={(step) => {
													// Navigate to the appropriate task/page and keep current completion behavior
													switch (step) {
														case "select_directory": {
															// Open the folder picker and ensure we're on Library
															navigate("/library");
															modal.open("folder");
															break;
														}
														case "index_photos": {
															// Kick off indexing and surface progress UI
															navigate("/library");
															if (!dir) {
																// If no directory yet, prompt to select one first
																modal.open("folder");
															} else {
																lib.index();
															}
															break;
														}
														case "first_search": {
															// Jump to search view; hint with a helpful toast
															navigate("/search");
															setToast({
																message:
																	"Try searching: beach sunset, birthday cake, mountain hike",
															});
															break;
														}
														case "explore_features": {
															// Take users to Collections to explore features
															navigate("/collections");
															setToast({
																message:
																	"Explore collections, favorites, and sharing",
															});
															break;
														}
													}
												}}
											/>

											{/* Removed blocking GuidedIndexingFlow - indexing now runs in background */}

											{/* Performance Monitor for development */}
											<PerformanceMonitor />
											</ResultsUIProvider>
											</ResultsConfigProvider>
										</main>

										</AppShell>

										{/* Close main containers returned by the content layout */}
									</div>

								{/* Modern UX Integration - Accessibility Panel */}
								{showAccessibilityPanel && (
									<AccessibilityPanel
										isOpen={showAccessibilityPanel}
										onClose={() => setShowAccessibilityPanel(false)}
										onSettingsChange={handleAccessibilitySettingsChange}
									/>
								)}

								{/* Modern UX Integration - Onboarding Tour */}
								{showOnboardingTour && (
									<OnboardingTour
										isActive={showOnboardingTour}
										onComplete={handleOnboardingComplete}
										onSkip={() => setShowOnboardingTour(false)}
									/>
								)}

								{/* Modern UX Integration - Hint System is already provided by HintProvider above */}
								<AppWithHints
									searchText={searchText}
									selected={selected}
									showAccessibilityPanel={showAccessibilityPanel}
									setShowAccessibilityPanel={setShowAccessibilityPanel}
									handleAccessibilitySettingsChange={
										handleAccessibilitySettingsChange
									}
									showOnboardingTour={showOnboardingTour}
									handleOnboardingComplete={handleOnboardingComplete}
									setShowOnboardingTour={setShowOnboardingTour}
								/>
							</MobileOptimizations>
						</HintManager>
					) : (
						<MobileOptimizations
							onSwipeLeft={handleSwipeLeft}
							onSwipeRight={handleSwipeRight}
							onSwipeUp={() => setShowModernSidebar(!showModernSidebar)}
							enableSwipeGestures={isMobile}
							enablePullToRefresh={true}
							onPullToRefresh={handlePullToRefresh}
						>
							{/* Render the same main content without HintManager wrapper */}
							<AppWithHints
								searchText={searchText}
								selected={selected}
								showAccessibilityPanel={showAccessibilityPanel}
								setShowAccessibilityPanel={setShowAccessibilityPanel}
								handleAccessibilitySettingsChange={
									handleAccessibilitySettingsChange
								}
								showOnboardingTour={showOnboardingTour}
								handleOnboardingComplete={handleOnboardingComplete}
								setShowOnboardingTour={setShowOnboardingTour}
							/>
						</MobileOptimizations>
					)}
				</HintProvider>
			</ThemeProvider>
		</ErrorBoundary>
	);
}
