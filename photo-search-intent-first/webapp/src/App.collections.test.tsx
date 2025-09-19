import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { fireEvent, render, screen, waitFor } from "./test/test-utils";

// Ensure ThemeProvider and other global test mocks are applied
// by importing the shared test utilities (polyfills, providers, mocks)
import "./test/test-utils";

// Mock stores with the same shape App expects
vi.mock("./stores/useStores", () => {
  const mockFavorites: string[] = [];
  const mockTags: string[] = [];
  const mockTagsMap: Record<string, string[]> = {};
  const mockCollections: Record<string, string[]> = {};
  const mockSmartCollections: Record<
    string,
    { query: string; count?: number }
  > = {};
  const mockLibrary: string[] = [];
  const mockDiag = {
    engines: [] as Array<{ key: string; index_dir: string; count: number }>,
    free_gb: 100,
    os: "test",
    folder: "/test",
  };

  const photoActions = {
    setCollections: vi.fn((c: Record<string, string[]>) => {
      Object.assign(mockCollections, c);
    }),
    setResults: vi.fn(),
    setSearchId: vi.fn(),
    setQuery: vi.fn(),
    setTopK: vi.fn(),
    setFavorites: vi.fn(),
    setFavOnly: vi.fn(),
    setAllTags: vi.fn(),
    setTagsMap: vi.fn(),
    setTagFilter: vi.fn(),
    setSaved: vi.fn(),
    setSmart: vi.fn(),
    setLibrary: vi.fn(),
    setLibHasMore: vi.fn(),
    appendLibrary: vi.fn(),
    resetSearch: vi.fn(),
  };

  return {
    // Settings selectors
    useDir: () => "/d",
    useEngine: () => "local",
    useHfToken: () => "",
    useOpenaiKey: () => "",
    useNeedsHf: () => false,
    useNeedsOAI: () => false,
    useCamera: () => "",
    useIsoMin: () => 0,
    useIsoMax: () => 25600,
    useFMin: () => 0.7,
    useFMax: () => 32,
    usePlace: () => "",
    useShowInfoOverlay: () => false,
    useResultViewSetting: () => "grid",
    useTimelineBucketSetting: () => "day",
    useIncludeVideosSetting: () => true,
    useCaptionsEnabled: () => false,
    useOcrEnabled: () => false,
    useHasText: () => false,
    useFastIndexEnabled: () => false,
    useFastKind: () => "faiss",
    useOsTrashEnabled: () => false,

    // Photo selectors
    useSearchResults: () => [],
    useSearchId: () => "",
    useSearchQuery: () => "",
    useTopK: () => 24,
    useFavorites: () => mockFavorites,
    useFavOnly: () => false,
    useTagFilter: () => "",
    useAllTags: () => mockTags,
    useTagsMap: () => mockTagsMap,
    useSavedSearches: () => [],
    useCollections: () => mockCollections,
    useSmartCollections: () => mockSmartCollections,
    useLibrary: () => mockLibrary,
    useLibHasMore: () => false,

    // UI selectors
    useBusy: () => "",
    useNote: () => "",
    useViewMode: () => "grid",
    useShowWelcome: () => false,
    useShowHelp: () => false,

    // Workspace selectors
    useWorkspace: () => "",
    useWsToggle: () => false,
    usePersons: () => [],
    useClusters: () => [],
    useGroups: () => [],
    usePoints: () => [],
    useDiag: () => mockDiag,

    // Actions
    useSettingsActions: () => ({
      setDir: vi.fn(),
      setEngine: vi.fn(),
      setHfToken: vi.fn(),
      setOpenaiKey: vi.fn(),
      setUseFast: vi.fn(),
      setFastKind: vi.fn(),
      setUseCaps: vi.fn(),
      setVlmModel: vi.fn(),
      setUseOcr: vi.fn(),
      setHasText: vi.fn(),
      setUseOsTrash: vi.fn(),
      setCamera: vi.fn(),
      setIsoMin: vi.fn(),
      setIsoMax: vi.fn(),
      setFMin: vi.fn(),
      setFMax: vi.fn(),
      setPlace: vi.fn(),
      setShowInfoOverlay: vi.fn(),
      setResultView: vi.fn(),
      setTimelineBucket: vi.fn(),
      setIncludeVideos: vi.fn(),
      setShowExplain: vi.fn(),
      setHighContrast: vi.fn(),
    }),
    usePhotoActions: () => photoActions,
    useUIActions: () => ({
      setBusy: vi.fn(),
      setNote: vi.fn(),
      setViewMode: vi.fn(),
      setShowWelcome: vi.fn(),
      setShowHelp: vi.fn(),
    }),
    useWorkspaceActions: () => ({
      setWorkspace: vi.fn(),
      setWsToggle: vi.fn(),
      setPersons: vi.fn(),
      setClusters: vi.fn(),
      setGroups: vi.fn(),
      setPoints: vi.fn(),
      setDiag: vi.fn(),
    }),
  };
});

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    apiAuthStatus: vi.fn(async () => ({ auth_required: false })),
    apiPing: vi.fn(async () => true),
    apiGetCollections: vi.fn(async () => ({
      collections: { Summer: ["/a.jpg"] },
    })),
    apiWorkspaceList: vi.fn(async () => ({ folders: [] })),
    apiGetTags: vi.fn(async () => ({ tags: {}, all: [] })),
    apiGetFavorites: vi.fn(async () => ({ favorites: [] })),
    apiGetSaved: vi.fn(async () => ({ saved: [] })),
    apiDiagnostics: vi.fn(async () => ({
      folder: "/d",
      engines: [],
      free_gb: 100,
      os: "macOS",
    })),
    apiLibrary: vi.fn(async () => ({
      total: 0,
      offset: 0,
      limit: 120,
      paths: [],
    })),
  };
});

describe("App Collections wiring (mocked stores)", () => {
  it("refreshes collections via App", async () => {
    window.history.pushState({}, "", "/collections");
    const { apiGetCollections } = await import("./api");
    const { usePhotoActions } = await import("./stores/useStores");
    render(<App />);
    // Click the Collections Refresh button
    const refreshBtn = await screen.findByRole("button", { name: "Refresh" });
    fireEvent.click(refreshBtn);
    await waitFor(() =>
      expect(vi.mocked(apiGetCollections).mock.calls.length).toBeGreaterThan(0)
    );
    // setCollections was called on actions
    const actions = usePhotoActions();
    expect(actions.setCollections).toHaveBeenCalled();
  });
});
