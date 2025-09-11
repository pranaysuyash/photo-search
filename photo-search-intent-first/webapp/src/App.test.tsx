import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { render } from "./test/test-utils";

// Mock the API module
vi.mock("./api", () => ({
	apiSearch: vi.fn(),
	apiSetFavorite: vi.fn(),
	apiSetTags: vi.fn(),
	apiExport: vi.fn(),
	apiDelete: vi.fn(),
	apiUndoDelete: vi.fn(),
	apiGetFavorites: vi.fn(),
	apiGetSaved: vi.fn(),
	apiGetTags: vi.fn(),
	apiLibrary: vi.fn(),
	thumbUrl: vi.fn(),
}));

import {
	apiDelete,
	apiExport,
	apiGetFavorites,
	apiGetSaved,
	apiGetTags,
	apiLibrary,
	apiSearch,
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
const mockDiag = { engines: [{ count: 100 }], free_gb: 10 };

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
	}),
}));

// Mock window.location
const mockLocation = {
	href: "http://localhost:3000",
	search: "",
	pathname: "/",
};
Object.defineProperty(window, "location", {
	value: mockLocation,
	writable: true,
});

describe("App Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock API calls
		vi.mocked(apiSearch).mockResolvedValue(mockApiData);
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

		// Mock thumbUrl function
		vi.mocked(thumbUrl).mockReturnValue(
			"http://localhost:3000/thumbnail/test.jpg",
		);

		// Mock window.confirm
		global.confirm = vi.fn(() => true);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Basic Rendering", () => {
		it("should render without crashing", () => {
			expect(() => render(<App />)).not.toThrow();
		});

		it("should render the error boundary fallback when there are errors", () => {
			render(<App />);

			// Check if the error boundary is rendered
			expect(
				screen.getByText("Oops! Something unexpected happened"),
			).toBeInTheDocument();
		});

		it("should show the error boundary with proper styling", () => {
			render(<App />);

			// Check for error boundary elements
			expect(
				screen.getByText("Oops! Something unexpected happened"),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"Don't worry - your photos are safe. Let's get you back on track.",
				),
			).toBeInTheDocument();
		});
	});

	describe("Error Boundary Functionality", () => {
		it("should display Try again button", () => {
			render(<App />);

			const tryAgainButton = screen.getByText("Try again");
			expect(tryAgainButton).toBeInTheDocument();
		});

		it("should display Reload page button", () => {
			render(<App />);

			const reloadButton = screen.getByText("Reload page");
			expect(reloadButton).toBeInTheDocument();
		});

		it("should display Go to home button", () => {
			render(<App />);

			const homeButton = screen.getByText("Go to home");
			expect(homeButton).toBeInTheDocument();
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
