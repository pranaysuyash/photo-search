import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Mock the API module
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    apiAuthStatus: vi.fn(),
    apiPing: vi.fn(),
    apiSearch: vi.fn(),
    apiSearchCached: vi.fn(),
    apiSearchWorkspace: vi.fn(),
    apiSetFavorite: vi.fn(),
    apiSetTags: vi.fn(),
    apiExport: vi.fn(),
    apiDelete: vi.fn(),
    apiUndoDelete: vi.fn(),
    apiGetFavorites: vi.fn(),
    apiGetSaved: vi.fn(),
    apiGetTags: vi.fn(),
    apiGetPresets: vi.fn(),
    apiFacesClusters: vi.fn(),
    apiMetadataBatch: vi.fn(),
    apiDiagnostics: vi.fn(),
    apiAnalytics: vi.fn(),
    apiOcrStatus: vi.fn(),
    apiOperationStatus: vi.fn(),
    apiLibrary: vi.fn(),
    thumbUrl: vi.fn(),
  };
});

// Theme provider introduces CSS variable side effects that are
// outside the scope of these integration tests. Mock it to a no-op.
vi.mock("./components/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { children: any }) => <>{children}</>,
}));

import App from "./App";
import { render } from "./test/test-utils";

import {
  apiAnalytics,
  apiAuthStatus,
  apiDelete,
  apiDiagnostics,
  apiExport,
  apiFacesClusters,
  apiGetFavorites,
  apiGetPresets,
  apiGetSaved,
  apiGetTags,
  apiLibrary,
  apiMetadataBatch,
  apiOcrStatus,
  apiOperationStatus,
  apiPing,
  apiSearch,
  apiSearchCached,
  apiSearchWorkspace,
  apiSetFavorite,
  apiSetTags,
  apiUndoDelete,
  thumbUrl,
} from "./api";

// Mock data
const mockApiData = {
  search_id: "test-search-123",
  results: [
    { path: "/test/photo1.jpg", score: 0.95 },
    { path: "/test/photo2.jpg", score: 0.87 },
  ],
};

const mockLibraryData = {
  total: 2,
  offset: 0,
  limit: 120,
  paths: ["/test/photo1.jpg", "/test/photo2.jpg"],
};

const mockFavorites = ["/test/photo1.jpg"];
const mockSavedSearches = [{ id: "1", name: "Family Photos", query: "family" }];
const mockTags = ["family", "vacation", "portrait"];
const mockTagsMap = {
  "/test/photo1.jpg": ["tag1"],
  "/test/photo2.jpg": ["tag2"],
};
const mockCollections = { collection1: ["/test/photo1.jpg"] };
const mockSmartCollections = { smart1: { query: "test" } };
const mockDiag = {
  folder: "/test/dir",
  engines: [{ key: "default", index_dir: "./index", count: 100 }],
  free_gb: 10,
  os: "test-os",
};

// Remove conflicting mocks - let SimpleStore handle the state
// The test-utils will provide the SimpleStore with proper initial state
vi.mock("./stores/useStores", () => ({
  useDir: () => "/test/dir",
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
  useSearchResults: () => mockApiData.results,
  useSearchId: () => mockApiData.search_id,
  useSearchQuery: () => "test query",
  useTopK: () => 24,
  useFavorites: () => mockFavorites,
  useFavOnly: () => false,
  useTagFilter: () => "",
  useAllTags: () => mockTags,
  useTagsMap: () => mockTagsMap,
  useSavedSearches: () => mockSavedSearches,
  useCollections: () => mockCollections,
  useSmartCollections: () => mockSmartCollections,
  useLibrary: () => mockLibraryData.paths,
  useLibHasMore: () => true,
  useBusy: () => "",
  useNote: () => "",
  useViewMode: () => "grid",
  useShowWelcome: () => false,
  useShowHelp: () => false,
  useWorkspace: () => "",
  useWsToggle: () => false,
  usePersons: () => [],
  useClusters: () => [],
  useGroups: () => [],
  usePoints: () => [],
  useDiag: () => mockDiag,
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
  usePhotoActions: () => ({
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
    setCollections: vi.fn(),
    setSmart: vi.fn(),
    setLibrary: vi.fn(),
    setLibHasMore: vi.fn(),
    appendLibrary: vi.fn(),
    resetSearch: vi.fn(),
  }),
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
}));

// Mock the settingsStore hooks
vi.mock("./stores/settingsStore", () => ({
  useHighContrast: () => false,
  useSearchCommandCenter: () => false,
  useThemeMode: () => "light",
  useColorScheme: () => "blue",
  useDensity: () => "normal",
  useCustomColors: () => undefined,
  useThemeActions: () => ({
    setThemeMode: vi.fn(),
    setColorScheme: vi.fn(),
    setDensity: vi.fn(),
    setCustomColors: vi.fn(),
    resetTheme: vi.fn(),
  }),
  useThemeStore: () => ({
    themeMode: "light",
    colorScheme: "blue",
    density: "normal",
    customColors: undefined,
    setThemeMode: vi.fn(),
    setColorScheme: vi.fn(),
    setDensity: vi.fn(),
    setCustomColors: vi.fn(),
    resetTheme: vi.fn(),
  }),
  useSettingsStore: () => ({
    dir: "/test/dir",
    engine: "local",
    hfToken: "",
    openaiKey: "",
    useFast: false,
    fastKind: "",
    useCaps: false,
    vlmModel: "Qwen/Qwen2-VL-2B-Instruct",
    useOcr: false,
    hasText: false,
    useOsTrash: false,
    showExplain: false,
    showInfoOverlay: false,
    highContrast: false,
    enableDemoLibrary: false,
    camera: "",
    isoMin: "",
    isoMax: "",
    fMin: "",
    fMax: "",
    place: "",
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
    setShowExplain: vi.fn(),
    setShowInfoOverlay: vi.fn(),
    setHighContrast: vi.fn(),
    setEnableDemoLibrary: vi.fn(),
    setCamera: vi.fn(),
    setIsoMin: vi.fn(),
    setIsoMax: vi.fn(),
    setFMin: vi.fn(),
    setFMax: vi.fn(),
    setPlace: vi.fn(),
  }),
  useDir: () => "/test/dir",
  useEngine: () => "local",
  useHfToken: () => "",
  useOpenaiKey: () => "",
  useFastIndexEnabled: () => false,
  useFastKind: () => "faiss",
  useCaptionsEnabled: () => false,
  useVlmModel: () => "Qwen/Qwen2-VL-2B-Instruct",
  useOcrEnabled: () => false,
  useHasText: () => false,
  useOsTrashEnabled: () => false,
  useShowExplain: () => false,
  useShowInfoOverlay: () => false,
  useEnableDemoLibrary: () => false,
  useCamera: () => "",
  useIsoMin: () => "",
  useIsoMax: () => "",
  useFMin: () => "",
  useFMax: () => "",
  usePlace: () => "",
  useNeedsHf: () => false,
  useNeedsOAI: () => false,
  useExifFilters: () => ({
    camera: "",
    isoMin: "",
    isoMax: "",
    fMin: "",
    fMax: "",
    place: "",
  }),
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
    setEnableDemoLibrary: vi.fn(),
  }),
}));

// Mock window.location
const locationUrl = new URL("http://localhost:3000/");
const mockLocation = {
  ancestorOrigins: [] as unknown,
  href: locationUrl.href,
  origin: locationUrl.origin,
  protocol: locationUrl.protocol,
  host: locationUrl.host,
  hostname: locationUrl.hostname,
  port: locationUrl.port,
  pathname: locationUrl.pathname,
  search: locationUrl.search,
  hash: locationUrl.hash,
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

describe("App component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Ensure connectivity/auth mock resolves sanely
    vi.mocked(apiAuthStatus).mockResolvedValue({ auth_required: false });
    vi.mocked(apiPing).mockResolvedValue(true);

    // Mock API calls
    vi.mocked(apiSearch).mockResolvedValue(mockApiData);
    vi.mocked(apiSearchCached).mockResolvedValue(mockApiData);
    vi.mocked(apiSearchWorkspace).mockResolvedValue(mockApiData);
    vi.mocked(apiSetFavorite).mockResolvedValue({
      ok: true,
      favorites: mockFavorites,
    });
    vi.mocked(apiSetTags).mockResolvedValue({ ok: true, tags: mockTags });
    vi.mocked(apiExport).mockResolvedValue({
      ok: true,
      copied: 2,
      skipped: 0,
      errors: 0,
      dest: "/test/dest",
    });
    vi.mocked(apiDelete).mockResolvedValue({
      ok: true,
      moved: 2,
      undoable: true,
    });
    vi.mocked(apiUndoDelete).mockResolvedValue({ ok: true, restored: 2 });
    vi.mocked(apiLibrary).mockResolvedValue(mockLibraryData);
    vi.mocked(apiGetFavorites).mockResolvedValue({ favorites: mockFavorites });
    vi.mocked(apiGetSaved).mockResolvedValue({ saved: mockSavedSearches });
    vi.mocked(apiGetTags).mockResolvedValue({
      tags: mockTagsMap,
      all: mockTags,
    });
    vi.mocked(apiGetPresets).mockResolvedValue({ presets: [] });
    vi.mocked(apiMetadataBatch).mockResolvedValue({ ok: true, meta: {} });
    vi.mocked(apiAnalytics).mockResolvedValue({ events: [] });
    vi.mocked(apiFacesClusters).mockResolvedValue({ clusters: [] });
    vi.mocked(apiDiagnostics).mockResolvedValue(mockDiag);
    vi.mocked(apiOcrStatus).mockResolvedValue({ ready: false });
    vi.mocked(apiOperationStatus).mockResolvedValue({ state: "idle" });

    // Mock thumbUrl function
    vi.mocked(thumbUrl).mockReturnValue(
      "http://localhost:3000/thumbnail/test.jpg"
    );

    // Mock window.confirm
    global.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render the main layout", async () => {
      render(<App />);

      await waitFor(() =>
        expect(screen.getByLabelText("Main content")).toBeInTheDocument()
      );
    });

    it("should render the search bar placeholder", async () => {
      render(<App />);

      const input = await screen.findByPlaceholderText(
        "What are you looking for? Try 'kids at the park' or 'last summer'"
      );
      expect(input).toBeInTheDocument();
    });
  });

  describe("Initial Load", () => {
    it("should load initial data on mount", async () => {
      render(<App />);

      await waitFor(() => {
        expect(vi.mocked(apiGetFavorites)).toHaveBeenCalled();
        expect(vi.mocked(apiGetSaved)).toHaveBeenCalled();
        expect(vi.mocked(apiGetTags)).toHaveBeenCalled();
      });
    });
  });
});
