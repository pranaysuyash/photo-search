/**
 * Refactored useAppLifecycle - Composes single-purpose sub-hooks
 *
 * Benefits of this approach:
 * - Each sub-hook is testable in isolation
 * - Single responsibility: each hook handles one concern
 * - Stable API: memoized return values prevent unnecessary re-renders
 * - Error boundaries: failures in one area don't affect others
 * - SSR-safe: guards in utilities prevent window/localStorage issues
 */
import { type RefObject, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLibraryContext } from "../contexts/LibraryContext";
import type { ModalKey } from "../contexts/ModalContext";
import { useDir, useEnableDemoLibrary } from "../stores/settingsStore";
import { useAdvancedSearchApply } from "./lifecycle/useAdvancedSearchApply";
import { useConnectivityGate } from "./lifecycle/useConnectivityGate";
import { useDemoBootstrap } from "./lifecycle/useDemoBootstrap";
import { useDeviceUX } from "./lifecycle/useDeviceUX";
import { useGlobalShortcutsBridge } from "./lifecycle/useGlobalShortcutsBridge";
// Import all the sub-hooks
import { useMountFlag } from "./lifecycle/useMountFlag";
import { useOcrStatus } from "./lifecycle/useOcrStatus";
import { useUrlSync } from "./lifecycle/useUrlSync";
import { useAppState } from "./useAppState";
import { useDemoLibraryHandlers } from "./useDemoLibraryHandlers";
import { useModalControls } from "./useModalControls";
import { useModalStatus } from "./useModalStatus";

// Type definitions
import type {
	PhotoResult,
	ResultView,
	ScreenSize,
	ThemeMode,
	TimelineBucket,
} from "./utils/lifecycleTypes";

export interface AppLifecycleState {
	isMounted: boolean;
	isMobile: boolean;
	isTablet: boolean;
	screenSize: ScreenSize;
	themeMode: ThemeMode;
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

export interface AppLifecycleContexts {
	library: ReturnType<typeof useLibraryContext>;
	connectivity: ReturnType<typeof useConnectivityGate>["connectivity"];
	demo: ReturnType<typeof useDemoLibraryHandlers>;
}

export interface AppLifecycleReturn {
	// Stable state objects (memoized)
	lifecycleState: AppLifecycleState;
	lifecycleActions: AppLifecycleActions;
	lifecycleData: AppLifecycleData;

	// App state passthrough
	appState: {
		localState: ReturnType<typeof useAppState>["localState"];
		viewState: ReturnType<typeof useAppState>["viewState"];
		derivedState: ReturnType<typeof useAppState>["derivedState"];
		currentView: string;
		hasSearchResults: boolean;
		hasSelection: boolean;
		isLoading: boolean;
	};

	// Context integrations
	contexts: AppLifecycleContexts;

	// Modal state
	modalControls: ReturnType<typeof useModalControls>;
	anyModalOpen: boolean;

	// Refs
	skipToContentRef: RefObject<HTMLAnchorElement>;
}

export function useAppLifecycle(): AppLifecycleReturn {
	const { toast } = useToast();
	const dir = useDir();
	const enableDemoLibrary = useEnableDemoLibrary();

	// Core app state
	const {
		localState,
		viewState,
		actions,
		currentView,
		hasSearchResults,
		hasSelection,
		isLoading,
		derivedState,
	} = useAppState();

	// Context integrations
	const libraryContext = useLibraryContext();
	const { anyOpen: anyModalOpen } = useModalStatus();
	const modalControls = useModalControls();

	// Shared toast function
	const showToast = useCallback(
		(message: string, variant: "default" | "destructive" = "default") => {
			toast({
				title: message,
				variant,
			});
		},
		[toast],
	);

	// 1. Mount flag and skip-to-content
	const { isMounted, skipToContentRef, skipToContent } = useMountFlag();

	// 2. Device UX (mobile detection, haptics, theme)
	const { isMobile, isTablet, screenSize, themeMode, triggerHaptic } =
		useDeviceUX();

	// 3. Connectivity and auth
	const connectivityGate = useConnectivityGate({ showToast });

	// 4. OCR status monitoring
	const { ocrReady, ocrTextCount } = useOcrStatus({
		dir: viewState.dir,
		showToast,
	});

	// 5. URL synchronization
	useUrlSync({
		resultView: localState.resultView as ResultView,
		timelineBucket: localState.timelineBucket as TimelineBucket,
	});

	// Demo library handlers
	const demoHandlers = useDemoLibraryHandlers({
		enableDemoLibrary: enableDemoLibrary || false,
		modalControls: {
			openFolder: () => {
				if (process.env.NODE_ENV !== "production") {
					console.warn("openFolder called but not fully implemented");
				}
			},
		},
		engine: "",
		needsHf: false,
		hfToken: undefined,
		needsOAI: false,
		openaiKey: undefined,
		setShowOnboarding: (show: boolean) => {
			console.log("setShowOnboarding called with:", show);
		},
	});

	// 6. Demo bootstrap
	useDemoBootstrap({
		dir: viewState.dir,
		libraryLength: viewState.library.length,
		demoHandlers,
		showToast,
	});

	// 7. Advanced search events
	useAdvancedSearchApply({
		setSearchText: actions.setSearchText,
	});

	// 8. Global shortcuts bridge
	useGlobalShortcutsBridge({
		anyModalOpen,
		openModal: (key: string) => modalControls.openModal(key as ModalKey),
		toggleModal: (key: string) => modalControls.toggleModal(key as ModalKey),
		searchCommandCenter: false,
		showInfoOverlay: false,
		openFilters: () => {},
		selectedView: currentView,
		resultView: localState.resultView,
		resultsEnabled: currentView === "results",
		resultsShortcutsProps: {
			enabled: currentView === "results",
			anyOverlayOpen: false,
			results: (viewState.results || []).map(
				(r) => ({ path: (r as { path: string }).path }) as PhotoResult,
			),
			dir: dir || "",
			fav: [],
			focusIdx: null,
			setFocusIdx: () => {},
			layoutRowsRef: { current: [] },
			detailIdx: null,
			setDetailIdx: () => {},
			navDetail: () => {},
			toggleSelect: () => {},
			loadFav: () => {},
		},
	});

	// Memoized stable API objects
	const lifecycleState = useMemo(
		(): AppLifecycleState => ({
			isMounted,
			isMobile,
			isTablet,
			screenSize,
			themeMode,
		}),
		[isMounted, isMobile, isTablet, screenSize, themeMode],
	);

	const lifecycleActions = useMemo(
		(): AppLifecycleActions => ({
			skipToContent,
			triggerHaptic,
			showToast,
		}),
		[skipToContent, triggerHaptic, showToast],
	);

	const lifecycleData = useMemo(
		(): AppLifecycleData => ({
			ocrReady,
			ocrTextCount,
			isConnected: connectivityGate.isConnected,
			authRequired: connectivityGate.authRequired,
			authTokenInput: connectivityGate.authTokenInput,
			meta: { cameras: [], places: [] }, // TODO: implement metadata loading
		}),
		[
			ocrReady,
			ocrTextCount,
			connectivityGate.isConnected,
			connectivityGate.authRequired,
			connectivityGate.authTokenInput,
		],
	);

	const contexts = useMemo(
		(): AppLifecycleContexts => ({
			library: libraryContext,
			connectivity: connectivityGate.connectivity,
			demo: demoHandlers,
		}),
		[libraryContext, connectivityGate.connectivity, demoHandlers],
	);

	const appState = useMemo(
		() => ({
			localState,
			viewState,
			derivedState,
			currentView,
			hasSearchResults,
			hasSelection,
			isLoading,
		}),
		[
			localState,
			viewState,
			derivedState,
			currentView,
			hasSearchResults,
			hasSelection,
			isLoading,
		],
	);

	return {
		lifecycleState,
		lifecycleActions,
		lifecycleData,
		appState,
		contexts,
		modalControls,
		anyModalOpen,
		skipToContentRef,
	};
}
