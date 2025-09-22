import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import {
	apiAnalytics,
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
	apiGetPresets,
	apiGetSaved,
	apiGetTags,
	apiLibrary,
	apiMap,
	apiMetadataBatch,
	apiOcrStatus,
	apiOperationStatus,
	apiSetFavorite,
	apiSetTags,
	apiWorkspaceAdd,
} from "../api";
import {
	useHapticFeedback,
	useMobileDetection,
} from "../components/MobileOptimizations";
import { useLibraryContext } from "../contexts/LibraryContext";
import { useThemeStore } from "../stores/settingsStore";
import { pathToView } from "../utils/router";
import { useAppState } from "./useAppState";
import { useConnectivityAndAuth } from "./useConnectivityAndAuth";
import { useDemoLibraryHandlers } from "./useDemoLibraryHandlers";
import { useGlobalShortcuts } from "./useGlobalShortcuts";
import { useModalControls } from "./useModalControls";
import { useModalStatus } from "./useModalStatus";
import { useOnboardingFlows } from "./useOnboardingFlows";
import { useQueryParamFilters } from "./useQueryParamFilters";
import { useResultsShortcuts } from "./useResultsShortcuts";
import { useSearchOperations } from "./useSearchOperations";

export interface AppLifecycleState {
	isMounted: boolean;
	isMobile: boolean;
	isTablet: boolean;
	screenSize: string;
	themeMode: string;
}

export interface AppLifecycleActions {
	skipToContent: () => void;
	triggerHaptic: (type?: "light" | "medium" | "heavy") => void;
	showToast: (message: string, variant?: "default" | "destructive") => void;
}

export interface AppLifecycleData {
	ocrReady: boolean;
	ocrTextCount: number | undefined;
	isConnected: boolean;
	authRequired: boolean;
	authTokenInput: string;
	meta: { cameras: string[]; places?: string[] };
}

export function useAppLifecycle() {
	const navigate = useNavigate();
	const { toast } = useToast();
	const { setThemeMode } = useThemeStore();

	// Safety check to prevent infinite loops on initial render
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => {
		setIsMounted(true);
		return () => setIsMounted(false);
	}, []);

	// Skip to content link for keyboard users
	const skipToContentRef = useRef<HTMLAnchorElement>(null);
	const skipToContent = useCallback(() => {
		skipToContentRef.current?.click();
	}, []);

	// Modern UX Integration - Mobile detection and haptic feedback
	const { isMobile, isTablet, screenSize } = useMobileDetection();
	const { trigger: hapticTrigger } = useHapticFeedback();

	// Theme controls
	const themeMode = useThemeStore((s) => s.themeMode);

	// App lifecycle and state management
	const {
		localState,
		viewState,
		actions,
		stateActions,
		currentView,
		hasSearchResults,
		hasSelection,
		isLoading,
		derivedState,
	} = useAppState();

	// Additional state from original App.tsx
	const [ocrReady, setOcrReady] = useState<boolean>(false);
	const [ocrTextCount, setOcrTextCount] = useState<number | undefined>(
		undefined,
	);
	const [isConnected, setIsConnected] = useState(true);
	const [authRequired, setAuthRequired] = useState(false);
	const [authTokenInput, setAuthTokenInput] = useState("");
	const [meta, setMeta] = useState<{ cameras: string[]; places?: string[] }>({
		cameras: [],
		places: [],
	});

	// Modal state
	const { anyOpen: anyModalOpen } = useModalStatus();
	const modalControls = useModalControls();

	// Context integrations
	const libraryContext = useLibraryContext();
	const connectivity = useConnectivityAndAuth();
	const demoHandlers = useDemoLibraryHandlers();

	// Global shortcuts
	useGlobalShortcuts({
		onSearch: () => navigate("/"),
		onLibrary: () => navigate("/library"),
		onCollections: () => navigate("/collections"),
		onPeople: () => navigate("/people"),
		onMap: () => navigate("/map"),
		onSettings: () => navigate("/settings"),
		onToggleTheme: () => {
			setThemeMode(themeMode === "dark" ? "light" : "dark");
		},
	});

	// Results shortcuts (only when in search view with results)
	useResultsShortcuts({
		enabled: currentView === "search" && hasSearchResults,
		onGrid: () => actions.setResultView("grid"),
		onFilm: () => actions.setResultView("film"),
		onTimeline: () => actions.setResultView("timeline"),
		onSelectAll: () => {
			const allIds = viewState.results.map((r) => r.path);
			actions.setSelected(new Set(allIds));
		},
		onClearSelection: () => actions.setSelected(new Set()),
	});

	// Toast helper
	const showToast = useCallback(
		(message: string, variant: "default" | "destructive" = "default") => {
			toast({
				title: message,
				variant,
				action: variant === "destructive" ? "Dismiss" : undefined,
			});
		},
		[toast],
	);

	// Initialize demo library if needed
	useEffect(() => {
		if (!viewState.dir && !viewState.library.length) {
			// Auto-enable demo mode for first-time users
			demoHandlers.handleEnableDemoLibrary();
			showToast(
				"Demo library enabled. Try searching for 'mountain' or 'beach'",
				"default",
			);
		}
	}, [viewState.dir, viewState.library.length, demoHandlers, showToast]);

	// Handle connectivity changes
	useEffect(() => {
		if (connectivity.isOnline === false) {
			showToast("You're offline. Some features may be limited.", "default");
		}
	}, [connectivity.isOnline, showToast]);

	// Handle route changes with haptic feedback on mobile
	useEffect(() => {
		if (isMobile) {
			hapticTrigger("light");
		}
	}, [currentView, isMobile, hapticTrigger]);

	// Initialize theme from localStorage (from original App.tsx line 722)
	useEffect(() => {
		try {
			const pref = localStorage.getItem("ps_theme");
			if (pref === "dark") document.documentElement.classList.add("dark");
		} catch {}
	}, []);

	// One-time OCR status check per directory (from original App.tsx line 968)
	useEffect(() => {
		let cancelled = false;
		const run = async () => {
			if (!viewState.dir) {
				setOcrReady(false);
				setOcrTextCount(undefined);
				return;
			}
			try {
				const r = await apiOcrStatus(viewState.dir);
				if (!cancelled) {
					setOcrReady(!!r.ready);
					setOcrTextCount(
						typeof r.count === "number" ? Math.max(0, r.count) : undefined,
					);
				}
			} catch {
				if (!cancelled) {
					setOcrReady(false);
					setOcrTextCount(undefined);
				}
			}
		};
		run();
		return () => {
			cancelled = true;
		};
	}, [viewState.dir]);

	// Advanced search apply events from ModalManager (from original App.tsx line 1046)
	useEffect(() => {
		const onApply = (e: Event) => {
			// @ts-ignore
			const q = e?.detail?.q as string | undefined;
			if (typeof q === "string") {
				actions.setSearchText(q);
			}
		};
		window.addEventListener("advanced-search-apply", onApply as EventListener);
		return () =>
			window.removeEventListener(
				"advanced-search-apply",
				onApply as EventListener,
			);
	}, [actions.setSearchText]);

	// Keep URL in sync with resultView/timelineBucket (from original App.tsx line 1354)
	useEffect(() => {
		try {
			const sp = new URLSearchParams(location.search);
			sp.set("rv", localState.resultView);
			sp.set("tb", localState.timelineBucket);
			navigate(
				{ pathname: location.pathname, search: `?${sp.toString()}` },
				{ replace: true },
			);
		} catch {}
	}, [
		localState.resultView,
		localState.timelineBucket,
		location.pathname,
		location.search,
		navigate,
	]);

	const lifecycleState: AppLifecycleState = {
		isMounted,
		isMobile,
		isTablet,
		screenSize,
		themeMode,
	};

	const lifecycleActions: AppLifecycleActions = {
		skipToContent,
		triggerHaptic: hapticTrigger,
		showToast,
	};

	const lifecycleData: AppLifecycleData = {
		ocrReady,
		ocrTextCount,
		isConnected,
		authRequired,
		authTokenInput,
		meta,
	};

	return {
		// State
		lifecycleState,
		lifecycleData,

		// Actions
		lifecycleActions,

		// Combined state for easy access
		appState: {
			localState,
			viewState,
			derivedState,
			currentView,
			hasSearchResults,
			hasSelection,
			isLoading,
		},

		// Context integrations
		contexts: {
			library: libraryContext,
			connectivity,
			demo: demoHandlers,
		},

		// Modal state
		modalControls,
		anyModalOpen,

		// Refs
		skipToContentRef,
	};
}
