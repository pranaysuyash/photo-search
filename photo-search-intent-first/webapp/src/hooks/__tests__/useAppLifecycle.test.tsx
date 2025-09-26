/**
 * Integration tests for useAppLifecycle hook
 */
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { useAppLifecycle } from "../useAppLifecycle";

// Mock all the dependencies
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("../contexts/LibraryContext", () => ({
  useLibraryContext: () => ({
    library: [],
    loadLibrary: vi.fn(),
    currentDir: null,
    collections: [],
    tags: [],
    saved: [],
  }),
}));

vi.mock("../useAppState", () => ({
  useAppState: () => ({
    localState: { resultView: "grid", timelineBucket: "day" },
    viewState: { dir: null, library: [], results: [] },
    actions: { setSearchText: vi.fn() },
    currentView: "search",
    hasSearchResults: false,
    hasSelection: false,
    isLoading: false,
    derivedState: {},
  }),
}));

vi.mock("../useDemoLibraryHandlers", () => ({
  useDemoLibraryHandlers: () => ({
    handleFirstRunDemo: vi.fn(),
  }),
}));

vi.mock("../useModalControls", () => ({
  useModalControls: () => ({
    openModal: vi.fn(),
    closeModal: vi.fn(),
    toggleModal: vi.fn(),
    closeAll: vi.fn(),
    isOpen: vi.fn(),
    openFolder: vi.fn(),
    openHelp: vi.fn(),
    openSearch: vi.fn(),
    openJobs: vi.fn(),
    openTheme: vi.fn(),
    openDiagnostics: vi.fn(),
    openShareManager: vi.fn(),
    canOpenShare: vi.fn(),
    canOpenExport: vi.fn(),
    canOpenCollections: vi.fn(),
    hasSelectedItems: vi.fn(),
  }),
}));

vi.mock("../useModalStatus", () => ({
  useModalStatus: () => ({ anyOpen: false }),
}));

vi.mock("../stores/settingsStore", () => ({
  useDir: () => null,
  useEnableDemoLibrary: () => false,
}));

vi.mock("../useConnectivityAndAuth", () => ({
  useConnectivityAndAuth: () => ({
    isOnline: true,
    authRequired: false,
  }),
}));

// Mock lifecycle hooks
vi.mock("../lifecycle/useMountFlag", () => ({
  useMountFlag: () => ({
    isMounted: true,
    skipToContentRef: { current: null },
    skipToContent: vi.fn(),
  }),
}));

vi.mock("../lifecycle/useDeviceUX", () => ({
  useDeviceUX: () => ({
    isMobile: false,
    hapticFeedback: vi.fn(),
  }),
}));

vi.mock("../lifecycle/useConnectivityGate", () => ({
  useConnectivityGate: () => ({
    isOnline: true,
    isAuthenticated: true,
  }),
}));

vi.mock("../lifecycle/useOcrStatus", () => ({
  useOcrStatus: () => ({
    ocrAvailable: true,
    ocrError: null,
  }),
}));

vi.mock("../lifecycle/useUrlSync", () => ({
  useUrlSync: () => ({
    syncToUrl: vi.fn(),
  }),
}));

vi.mock("../lifecycle/useDemoBootstrap", () => ({
  useDemoBootstrap: () => ({
    isDemoLoaded: false,
  }),
}));

vi.mock("../lifecycle/useAdvancedSearchApply", () => ({
  useAdvancedSearchApply: () => ({
    handleAdvancedSearchApply: vi.fn(),
  }),
}));

vi.mock("../lifecycle/useGlobalShortcutsBridge", () => ({
  useGlobalShortcutsBridge: () => ({
    shortcuts: {},
  }),
}));

vi.mock("../../api", () => ({
  apiOcrStatus: vi.fn().mockResolvedValue({ ready: false, count: 0 }),
}));

vi.mock("../../components/MobileOptimizations", () => ({
  useMobileDetection: () => ({
    isMobile: false,
    isTablet: false,
    screenSize: "desktop",
  }),
  useHapticFeedback: () => ({
    trigger: vi.fn(),
  }),
}));

vi.mock("../useGlobalShortcuts", () => ({
  useGlobalShortcuts: vi.fn(),
}));

vi.mock("../useResultsShortcuts", () => ({
  useResultsShortcuts: vi.fn(),
}));

// Simple wrapper that provides Router context
function TestWrapper({ children }: { children: ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe("useAppLifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return stable API structure", () => {
    const { result } = renderHook(() => useAppLifecycle(), {
      wrapper: TestWrapper,
    });

    // Check that all expected properties are present
    expect(result.current).toHaveProperty("lifecycleState");
    expect(result.current).toHaveProperty("lifecycleActions");
    expect(result.current).toHaveProperty("lifecycleData");
    expect(result.current).toHaveProperty("appState");
    expect(result.current).toHaveProperty("contexts");
    expect(result.current).toHaveProperty("modalControls");
    expect(result.current).toHaveProperty("anyModalOpen");
    expect(result.current).toHaveProperty("skipToContentRef");
  });

  it("should provide memoized lifecycle state", () => {
    const { result, rerender } = renderHook(() => useAppLifecycle(), {
      wrapper: TestWrapper,
    });

    const firstState = result.current.lifecycleState;

    // Rerender shouldn't change the reference if values are the same
    rerender();

    expect(result.current.lifecycleState).toBe(firstState);
  });

  it("should provide stable lifecycle actions", () => {
    const { result, rerender } = renderHook(() => useAppLifecycle(), {
      wrapper: TestWrapper,
    });

    const firstActions = result.current.lifecycleActions;

    expect(typeof firstActions.skipToContent).toBe("function");
    expect(typeof firstActions.triggerHaptic).toBe("function");
    expect(typeof firstActions.showToast).toBe("function");

    // Rerender shouldn't change the reference
    rerender();

    expect(result.current.lifecycleActions).toBe(firstActions);
  });

  it("should provide memoized lifecycle data", () => {
    const { result, rerender } = renderHook(() => useAppLifecycle(), {
      wrapper: TestWrapper,
    });

    const firstData = result.current.lifecycleData;

    expect(firstData).toHaveProperty("ocrReady");
    expect(firstData).toHaveProperty("ocrTextCount");
    expect(firstData).toHaveProperty("isConnected");
    expect(firstData).toHaveProperty("authRequired");
    expect(firstData).toHaveProperty("authTokenInput");
    expect(firstData).toHaveProperty("meta");

    // Rerender shouldn't change the reference if values are the same
    rerender();

    expect(result.current.lifecycleData).toBe(firstData);
  });

  it("should provide context integrations", () => {
    const { result } = renderHook(() => useAppLifecycle(), {
      wrapper: TestWrapper,
    });

    expect(result.current.contexts).toHaveProperty("library");
    expect(result.current.contexts).toHaveProperty("connectivity");
    expect(result.current.contexts).toHaveProperty("demo");
  });

  it("should provide modal controls and status", () => {
    const { result } = renderHook(() => useAppLifecycle(), {
      wrapper: TestWrapper,
    });

    expect(result.current.modalControls).toBeDefined();
    expect(typeof result.current.anyModalOpen).toBe("boolean");
  });

  it("should provide skip to content ref", () => {
    const { result } = renderHook(() => useAppLifecycle(), {
      wrapper: TestWrapper,
    });

    expect(result.current.skipToContentRef).toBeDefined();
    expect(result.current.skipToContentRef.current).toBeNull();
  });

  it("should maintain reference stability across re-renders", () => {
    const { result, rerender } = renderHook(() => useAppLifecycle(), {
      wrapper: TestWrapper,
    });

    const firstRender = {
      lifecycleState: result.current.lifecycleState,
      lifecycleActions: result.current.lifecycleActions,
      contexts: result.current.contexts,
      skipToContentRef: result.current.skipToContentRef,
    };

    // Force re-render
    rerender();

    // These should maintain the same references due to memoization
    expect(result.current.lifecycleState).toBe(firstRender.lifecycleState);
    expect(result.current.lifecycleActions).toBe(firstRender.lifecycleActions);
    expect(result.current.contexts).toBe(firstRender.contexts);
    expect(result.current.skipToContentRef).toBe(firstRender.skipToContentRef);
  });
});
