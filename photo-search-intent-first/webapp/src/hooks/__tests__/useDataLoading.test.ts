import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api";
import { networkErrors } from "../../utils/errors";
import { useDataLoading } from "../useDataLoading";

// Mock the API module
vi.mock("../../api", () => ({
	apiGetFavorites: vi.fn(),
	apiGetSaved: vi.fn(),
	apiGetPresets: vi.fn(),
	apiGetTags: vi.fn(),
	apiDiagnostics: vi.fn(),
	apiFacesClusters: vi.fn(),
	apiMap: vi.fn(),
	apiLibrary: vi.fn(),
	apiGetMetadata: vi.fn(),
	apiWatchStatus: vi.fn(),
	apiWatchStart: vi.fn(),
}));

// Mock the errors utility
let mockSetNote: ((message: string) => void) | undefined;

vi.mock("../../utils/errors", () => ({
	_withErrorHandling: vi.fn(async (fn, options) => {
		try {
			return await fn();
		} catch (error) {
			// Simulate the actual error handling behavior
			if (options?.fallbackMessage) {
				console.error(options.fallbackMessage, error);
				// Call the mock setNote function if available
				if (mockSetNote) {
					mockSetNote(options.fallbackMessage);
				}
			}
			return null;
		}
	}),
	networkErrors: {
		isOffline: vi.fn(() => false),
	},
}));

describe("useDataLoading", () => {
	const mockDir = "/test/photos";
	const mockEngine = "local";
	const mockUiActions = {
		setBusy: vi.fn(),
		setNote: vi.fn(),
	};
	const mockPhotoActions = {
		setFavorites: vi.fn(),
		setSaved: vi.fn(),
		setPresets: vi.fn(),
		setTagsMap: vi.fn(),
		setAllTags: vi.fn(),
		setCollections: vi.fn(),
		setSmart: vi.fn(),
		setLibrary: vi.fn(),
		appendLibrary: vi.fn(),
		setLibHasMore: vi.fn(),
		setResults: vi.fn(),
		setSearchId: vi.fn(),
		setTopK: vi.fn(),
		setFavOnly: vi.fn(),
		setTagFilter: vi.fn(),
	};
	const mockWorkspaceActions = {
		setDiag: vi.fn(),
		setClusters: vi.fn(),
		setPoints: vi.fn(),
		setPersons: vi.fn(),
	};
	const mockSettingsActions = {
		setPlace: vi.fn(),
		setCamera: vi.fn(),
		setIsoMin: vi.fn(),
		setIsoMax: vi.fn(),
		setFMin: vi.fn(),
		setFMax: vi.fn(),
		setHasText: vi.fn(),
		setUseCaps: vi.fn(),
		setUseOcr: vi.fn(),
		setResultView: vi.fn(),
		setTimelineBucket: vi.fn(),
		setShowInfoOverlay: vi.fn(),
		setCameras: vi.fn(),
		setPlaces: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Set up the mock setNote function for error handling
		mockSetNote = mockUiActions.setNote;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const createTestHook = (overrides = {}) => {
		return renderHook(() =>
			useDataLoading({
				dir: mockDir,
				engine: mockEngine,
				needsHf: false,
				needsOAI: false,
				hfToken: "",
				openaiKey: "",
				uiActions: mockUiActions,
				photoActions: mockPhotoActions,
				workspaceActions: mockWorkspaceActions,
				settingsActions: mockSettingsActions,
				...overrides,
			}),
		);
	};

	describe("loadFavorites", () => {
		it("should load favorites successfully", async () => {
			const mockFavorites = ["/path/photo1.jpg", "/path/photo2.jpg"];
			vi.mocked(api.apiGetFavorites).mockResolvedValue({
				favorites: mockFavorites,
			});

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadFavorites();
			});

			expect(api.apiGetFavorites).toHaveBeenCalledWith(mockDir);
			expect(mockPhotoActions.setFavorites).toHaveBeenCalledWith(mockFavorites);
			expect(mockUiActions.setNote).not.toHaveBeenCalled();
		});

		it("should handle offline state", async () => {
			vi.mocked(networkErrors.isOffline).mockReturnValue(true);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadFavorites();
			});

			expect(api.apiGetFavorites).not.toHaveBeenCalled();
			expect(mockUiActions.setNote).toHaveBeenCalledWith(
				"Cannot load favorites: No internet connection",
			);
		});

		it("should handle API errors gracefully", async () => {
			const mockError = new Error("Network error");
			vi.mocked(api.apiGetFavorites).mockRejectedValue(mockError);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadFavorites();
			});

			expect(api.apiGetFavorites).toHaveBeenCalledWith(mockDir);
			expect(mockPhotoActions.setFavorites).not.toHaveBeenCalled();
			expect(mockUiActions.setNote).toHaveBeenCalledWith(
				"Failed to load favorites",
			);
		});

		it("should not load when directory is not set", async () => {
			const { result } = createTestHook({ dir: "" });

			await act(async () => {
				await result.current.loadFavorites();
			});

			expect(api.apiGetFavorites).not.toHaveBeenCalled();
		});
	});

	describe("loadSavedSearches", () => {
		it("should load saved searches successfully", async () => {
			const mockSaved = [
				{ name: "Vacation Photos", query: "beach sunset", topK: 24 },
				{ name: "Family", query: "family dinner", topK: 12 },
			];
			vi.mocked(api.apiGetSaved).mockResolvedValue({ saved: mockSaved });

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadSavedSearches();
			});

			expect(api.apiGetSaved).toHaveBeenCalledWith(mockDir);
			expect(mockPhotoActions.setSaved).toHaveBeenCalledWith(mockSaved);
		});

		it("should handle empty saved searches", async () => {
			vi.mocked(api.apiGetSaved).mockResolvedValue({ saved: [] });

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadSavedSearches();
			});

			expect(mockPhotoActions.setSaved).toHaveBeenCalledWith([]);
		});
	});

	describe("loadPresets", () => {
		it("should load presets successfully", async () => {
			const mockPresets = [
				{ name: "High Quality", query: "rating:>=4" },
				{ name: "Recent", query: "mtime:>1672531200" },
			];
			vi.mocked(api.apiGetPresets).mockResolvedValue({ presets: mockPresets });

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadPresets();
			});

			expect(api.apiGetPresets).toHaveBeenCalledWith(mockDir);
			expect(mockPhotoActions.setPresets).toHaveBeenCalledWith(mockPresets);
		});
	});

	describe("loadTags", () => {
		it("should load tags successfully", async () => {
			const mockTags = {
				tags: {
					"/path/photo1.jpg": ["family", "vacation"],
					"/path/photo2.jpg": ["portrait"],
				},
				all: ["family", "vacation", "portrait"],
			};
			vi.mocked(api.apiGetTags).mockResolvedValue(mockTags);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadTags();
			});

			expect(api.apiGetTags).toHaveBeenCalledWith(mockDir);
			expect(mockPhotoActions.setTagsMap).toHaveBeenCalledWith(mockTags.tags);
			expect(mockPhotoActions.setAllTags).toHaveBeenCalledWith(mockTags.all);
		});
	});

	describe("loadDiagnostics", () => {
		it("should load diagnostics successfully", async () => {
			const mockDiag = {
				folder: "/test/photos",
				engines: [{ key: "local", index_dir: "/tmp/index", count: 1234 }],
				free_gb: 50,
				os: "macOS",
			};
			vi.mocked(api.apiDiagnostics).mockResolvedValue(mockDiag);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadDiagnostics();
			});

			expect(api.apiDiagnostics).toHaveBeenCalledWith(
				mockDir,
				mockEngine,
				undefined,
				undefined,
			);
			expect(mockWorkspaceActions.setDiag).toHaveBeenCalledWith(mockDiag);
		});

		it("should include API keys when needed", async () => {
			const mockDiag = {
				folder: "/test/photos",
				engines: [],
				free_gb: 50,
				os: "macOS",
			};
			vi.mocked(api.apiDiagnostics).mockResolvedValue(mockDiag);

			const { result } = createTestHook({
				needsOAI: true,
				openaiKey: "sk-test",
				needsHf: true,
				hfToken: "hf-test",
			});

			await act(async () => {
				await result.current.loadDiagnostics();
			});

			expect(api.apiDiagnostics).toHaveBeenCalledWith(
				mockDir,
				mockEngine,
				"sk-test",
				"hf-test",
			);
		});
	});

	describe("loadFaces", () => {
		it("should load face clusters successfully", async () => {
			const mockClusters = [
				{
					id: "cluster1",
					name: "Alice",
					size: 45,
					examples: [["/path/photo1.jpg", 0.95] as [string, number]],
				},
				{
					id: "cluster2",
					name: "Bob",
					size: 32,
					examples: [["/path/photo2.jpg", 0.88] as [string, number]],
				},
			];
			vi.mocked(api.apiFacesClusters).mockResolvedValue({
				clusters: mockClusters,
			});

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadFaces();
			});

			expect(api.apiFacesClusters).toHaveBeenCalledWith(mockDir);
			expect(mockWorkspaceActions.setClusters).toHaveBeenCalledWith(
				mockClusters,
			);
		});

		it("should handle empty clusters", async () => {
			vi.mocked(api.apiFacesClusters).mockResolvedValue({ clusters: [] });

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadFaces();
			});

			expect(mockWorkspaceActions.setClusters).toHaveBeenCalledWith([]);
		});
	});

	describe("loadMap", () => {
		it("should load map data successfully", async () => {
			const mockPoints = [
				{ lat: 40.7128, lon: -74.006 },
				{ lat: 51.5074, lon: -0.1278 },
			];
			vi.mocked(api.apiMap).mockResolvedValue({ points: mockPoints });

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadMap();
			});

			expect(api.apiMap).toHaveBeenCalledWith(mockDir);
			expect(mockWorkspaceActions.setPoints).toHaveBeenCalledWith(mockPoints);
		});
	});

	describe("loadLibrary", () => {
		it("should load library successfully", async () => {
			const mockLibrary = {
				paths: ["/path/photo1.jpg", "/path/photo2.jpg", "/path/photo3.jpg"],
				total: 100,
				offset: 0,
				limit: 120,
			};
			vi.mocked(api.apiLibrary).mockResolvedValue(mockLibrary);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadLibrary(120, 0);
			});

			expect(api.apiLibrary).toHaveBeenCalledWith(mockDir, mockEngine, 120, 0, {
				openaiKey: undefined,
				hfToken: undefined,
			});
			expect(mockPhotoActions.setLibrary).toHaveBeenCalledWith(
				mockLibrary.paths,
			);
			expect(mockPhotoActions.setLibHasMore).toHaveBeenCalledWith(false);
		});

		it("should append library when specified", async () => {
			const mockLibrary = {
				paths: ["/path/photo4.jpg", "/path/photo5.jpg"],
				total: 100,
				offset: 120,
				limit: 120,
			};
			vi.mocked(api.apiLibrary).mockResolvedValue(mockLibrary);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadLibrary(120, 120, true);
			});

			expect(mockPhotoActions.setLibrary).not.toHaveBeenCalled();
			expect(mockPhotoActions.appendLibrary).toHaveBeenCalledWith(
				mockLibrary.paths,
			);
			expect(mockPhotoActions.setLibHasMore).toHaveBeenCalledWith(false);
		});

		it("should include API keys when needed", async () => {
			vi.mocked(api.apiLibrary).mockResolvedValue({
				paths: [],
				total: 0,
				offset: 0,
				limit: 120,
			});

			const { result } = createTestHook({
				needsOAI: true,
				openaiKey: "sk-test",
				needsHf: true,
				hfToken: "hf-test",
			});

			await act(async () => {
				await result.current.loadLibrary(120, 0);
			});

			expect(api.apiLibrary).toHaveBeenCalledWith(mockDir, mockEngine, 120, 0, {
				openaiKey: "sk-test",
				hfToken: "hf-test",
			});
		});
	});

	describe("loadMetadata", () => {
		it("should load metadata successfully", async () => {
			const mockMetadata = {
				cameras: ["iPhone 14", "Canon EOS R5"],
				places: ["New York", "Paris", "Tokyo"],
			};
			vi.mocked(api.apiGetMetadata).mockResolvedValue(mockMetadata);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.loadMetadata();
			});

			expect(api.apiGetMetadata).toHaveBeenCalledWith(mockDir);
			expect(mockSettingsActions.setCameras).toHaveBeenCalledWith(
				mockMetadata.cameras,
			);
			expect(mockSettingsActions.setPlaces).toHaveBeenCalledWith(
				mockMetadata.places,
			);
		});
	});

	describe("setupFileWatcher", () => {
		it("should setup file watcher when available", async () => {
			vi.mocked(api.apiWatchStatus).mockResolvedValue({ available: true });
			vi.mocked(api.apiWatchStart).mockResolvedValue(undefined);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.setupFileWatcher();
			});

			expect(api.apiWatchStatus).toHaveBeenCalled();
			expect(api.apiWatchStart).toHaveBeenCalledWith(
				mockDir,
				mockEngine,
				1500,
				12,
			);
		});

		it("should not setup watcher when unavailable", async () => {
			vi.mocked(api.apiWatchStatus).mockResolvedValue({ available: false });

			const { result } = createTestHook();

			await act(async () => {
				await result.current.setupFileWatcher();
			});

			expect(api.apiWatchStatus).toHaveBeenCalled();
			expect(api.apiWatchStart).not.toHaveBeenCalled();
		});

		it("should handle watcher setup errors gracefully", async () => {
			vi.mocked(api.apiWatchStatus).mockResolvedValue({ available: true });
			vi.mocked(api.apiWatchStart).mockRejectedValue(
				new Error("Permission denied"),
			);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.setupFileWatcher();
			});

			expect(api.apiWatchStatus).toHaveBeenCalled();
			expect(api.apiWatchStart).toHaveBeenCalled();
			expect(mockUiActions.setNote).toHaveBeenCalledWith(
				"Failed to setup file watcher",
			);
		});
	});

	describe("refreshAll", () => {
		it("should refresh all data sources", async () => {
			vi.mocked(api.apiGetFavorites).mockResolvedValue({ favorites: [] });
			vi.mocked(api.apiGetSaved).mockResolvedValue({ saved: [] });
			vi.mocked(api.apiGetTags).mockResolvedValue({ tags: {}, all: [] });
			vi.mocked(api.apiDiagnostics).mockResolvedValue({
				folder: "/test/photos",
				engines: [],
				free_gb: 50,
				os: "macOS",
			});
			vi.mocked(api.apiFacesClusters).mockResolvedValue({ clusters: [] });
			vi.mocked(api.apiGetMetadata).mockResolvedValue({
				cameras: [],
				places: [],
			});
			vi.mocked(api.apiLibrary).mockResolvedValue({
				paths: [],
				total: 0,
				offset: 0,
				limit: 120,
			});

			const { result } = createTestHook();

			await act(async () => {
				await result.current.refreshAll();
			});

			expect(api.apiGetFavorites).toHaveBeenCalled();
			expect(api.apiGetSaved).toHaveBeenCalled();
			expect(api.apiGetTags).toHaveBeenCalled();
			expect(api.apiDiagnostics).toHaveBeenCalled();
			expect(api.apiFacesClusters).toHaveBeenCalled();
			expect(api.apiGetMetadata).toHaveBeenCalled();
			expect(api.apiLibrary).toHaveBeenCalled();
		});

		it("should handle partial failures gracefully", async () => {
			vi.mocked(api.apiGetFavorites).mockRejectedValue(
				new Error("Favorites failed"),
			);
			vi.mocked(api.apiGetSaved).mockResolvedValue({ saved: [] });
			vi.mocked(api.apiGetTags).mockResolvedValue({ tags: {}, all: [] });
			vi.mocked(api.apiDiagnostics).mockResolvedValue({
				folder: "/test/photos",
				engines: [],
				free_gb: 50,
				os: "macOS",
			});
			vi.mocked(api.apiFacesClusters).mockResolvedValue({ clusters: [] });
			vi.mocked(api.apiLibrary).mockResolvedValue({
				paths: [],
				total: 0,
				offset: 0,
				limit: 120,
			});
			vi.mocked(api.apiGetMetadata).mockResolvedValue({
				cameras: [],
				places: [],
			});

			const { result } = createTestHook();

			await act(async () => {
				await result.current.refreshAll();
			});

			expect(api.apiGetFavorites).toHaveBeenCalled();
			expect(api.apiGetSaved).toHaveBeenCalled();
			expect(api.apiGetTags).toHaveBeenCalled();
			expect(api.apiDiagnostics).toHaveBeenCalled();
			expect(api.apiFacesClusters).toHaveBeenCalled();
			expect(api.apiLibrary).toHaveBeenCalled();
			expect(api.apiGetMetadata).toHaveBeenCalled();
			// Should continue even after favorites failure
		});
	});
});
