import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { fireEvent, render, screen, waitFor } from "./test/test-utils";

// Mock stores to match App's expected selector-based API
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

	let mockQuery = "beach";

	const photoActions = {
		setCollections: vi.fn((c: Record<string, string[]>) => {
			Object.assign(mockCollections, c);
		}),
		setResults: vi.fn(),
		setSearchId: vi.fn(),
		setQuery: vi.fn((q: string) => {
			mockQuery = q;
		}),
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
		useSearchQuery: () => mockQuery,
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

// Mock APIs that App triggers
vi.mock("./api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./api")>();
	return {
		...actual,
		apiAuthStatus: vi.fn(async () => ({ auth_required: false })),
		apiPing: vi.fn(async () => true),
		apiIndex: vi.fn(async () => ({ new: 1, updated: 0, total: 1 })),
		apiSearch: vi.fn(async () => ({
			search_id: "s1",
			results: [{ path: "/a.jpg", score: 0.9 }],
		})),
		apiSearchWorkspace: vi.fn(async () => ({ search_id: "w1", results: [] })),
		apiGetFavorites: vi.fn(async () => ({ favorites: [] })),
		apiGetSaved: vi.fn(async () => ({ saved: [] })),
		apiGetTags: vi.fn(async () => ({ tags: {}, all: [] })),
		apiDiagnostics: vi.fn(async () => ({
			folder: "/d",
			engines: [],
			free_gb: 100,
			os: "macOS",
		})),
		apiWorkspaceList: vi.fn(async () => ({ folders: [] })),
		apiLibrary: vi.fn(async () => ({
			total: 0,
			offset: 0,
			limit: 120,
			paths: [],
		})),
		apiFacesClusters: vi.fn(async () => ({ clusters: [] })),
		apiBuildMetadata: vi.fn(async () => ({ updated: 0 })),
		apiBuildFast: vi.fn(async () => ({ ok: true, kind: "faiss" })),
		apiBuildOCR: vi.fn(async () => ({ updated: 0 })),
		apiLookalikes: vi.fn(async () => ({ groups: [] })),
		thumbUrl: (_d: string, _e: string, p: string, _s: number) =>
			`mock://thumb${p}`,
	};
});

// Ensure App sees Search Command Center disabled so the TopBar renders SearchBar input
// Merge with actual to preserve other selectors used by providers
vi.mock("./stores/settingsStore", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("./stores/settingsStore")>();
	return {
		...actual,
		useSearchCommandCenter: () => false,
		useHighContrast: () => false,
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
	};
});

import { apiBuildMetadata, apiIndex, apiSearch } from "./api";

// Avoid DOMException from ThemeProvider classList operations in jsdom; no-op wrapper suffices for smoke
vi.mock("./components/ThemeProvider", () => ({
	ThemeProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));

describe("App smoke tests", () => {
	it("wires search and index actions without crashing", async () => {
		render(<App />);
		// Enter a query in the TopBar search and submit
		const searchInput = screen.getByPlaceholderText(
			"What are you looking for? Try 'kids at the park' or 'last summer'",
		);
		fireEvent.change(searchInput, { target: { value: "beach" } });
		fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });
		// Verify search was dispatched without crashing
		await waitFor(() => expect(vi.mocked(apiSearch)).toHaveBeenCalled());
		// Build Index & Metadata (if present in current UI)
		const buildIndexBtn = screen.queryByText("Build Index");
		if (buildIndexBtn) {
			fireEvent.click(buildIndexBtn);
			expect(vi.mocked(apiIndex)).toHaveBeenCalled();
		}
		const buildMetaBtn = screen.queryByText("Build Metadata");
		if (buildMetaBtn) {
			fireEvent.click(buildMetaBtn);
			expect(vi.mocked(apiBuildMetadata)).toHaveBeenCalled();
		}
		// UI remains rendered (top bar menu still accessible)
		expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
	});
});
