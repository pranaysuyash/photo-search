import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "./useAppState";
import { useLibraryContext } from "../contexts/LibraryContext";
import { useConnectivityAndAuth } from "./useConnectivityAndAuth";
import { useDemoLibraryHandlers } from "./useDemoLibraryHandlers";
import { useGlobalShortcuts } from "./useGlobalShortcuts";
import { useResultsShortcuts } from "./useResultsShortcuts";
import { useMobileDetection } from "../components/MobileOptimizations";
import { useHapticFeedback } from "../components/MobileOptimizations";
import { useThemeStore } from "../stores/settingsStore";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

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
  const {
    isMobile,
    isTablet,
    screenSize,
  } = useMobileDetection();
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
  } = useAppState();

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
  const showToast = useCallback((message: string, variant: "default" | "destructive" = "default") => {
    toast({
      title: message,
      variant,
      action: variant === "destructive" ? (
        <ToastAction>Dismiss</ToastAction>
      ) : undefined,
    });
  }, [toast]);

  // Initialize demo library if needed
  useEffect(() => {
    if (!viewState.dir && !viewState.library.length) {
      // Auto-enable demo mode for first-time users
      demoHandlers.handleEnableDemoLibrary();
      showToast("Demo library enabled. Try searching for 'mountain' or 'beach'", "default");
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

  return {
    // State
    lifecycleState,

    // Actions
    lifecycleActions,

    // Combined state for easy access
    appState: {
      localState,
      viewState,
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

    // Refs
    skipToContentRef,
  };
}