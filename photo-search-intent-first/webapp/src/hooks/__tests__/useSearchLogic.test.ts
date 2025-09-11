import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api";
import { networkErrors } from "../../utils/errors";
import { useSearchLogic } from "../useSearchLogic";

// Mock the API module
vi.mock("../../api", () => ({
	apiSearchLike: vi.fn(),
	apiSetFavorite: vi.fn(),
	apiOpen: vi.fn(),
}));

// Mock the errors utility
vi.mock("../../utils/errors", () => ({
	_withErrorHandling: vi.fn(async (fn, options) => {
		try {
			return await fn();
		} catch (error) {
			if (options?.fallbackMessage) {
				console.error(options.fallbackMessage, error);
			}
			throw error;
		}
	}),
	networkErrors: {
		isOffline: vi.fn(() => false),
	},
}));

// Mock URL and URLSearchParams properly
class MockURLSearchParams {
	private params: Map<string, string> = new Map();

	constructor(init?: string | Record<string, string>) {
		if (typeof init === "string") {
			// Parse query string
			const pairs = init.split("&");
			for (const pair of pairs) {
				const [key, value] = pair.split("=");
				if (key) {
					this.params.set(
						decodeURIComponent(key),
						value ? decodeURIComponent(value) : "",
					);
				}
			}
		} else if (init) {
			Object.entries(init).forEach(([key, value]) => {
				this.params.set(key, value);
			});
		}
	}

	set(key: string, value: string): void {
		this.params.set(key, value);
	}

	get(key: string): string | null {
		return this.params.get(key);
	}

	has(key: string): boolean {
		return this.params.has(key);
	}

	getAll(key: string): string[] {
		const value = this.params.get(key);
		return value ? [value] : [];
	}

	toString(): string {
		const pairs: string[] = [];
		this.params.forEach((value, key) => {
			pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
		});
		return pairs.join("&");
	}
}

// Mock URL
global.URL = vi.fn().mockImplementation((url: string) => ({
	href: url,
	searchParams: new MockURLSearchParams(),
})) as unknown;

global.URLSearchParams = MockURLSearchParams as unknown;

describe("useSearchLogic", () => {
	const mockDir = "/test/photos";
	const mockEngine = "local";
	const mockTopK = 24;
	const mockUiActions = {
		setBusy: vi.fn(),
		setNote: vi.fn(),
	};
	const mockPhotoActions = {
		setResults: vi.fn(),
		setQuery: vi.fn(),
		setTopK: vi.fn(),
		setFavOnly: vi.fn(),
		setTagFilter: vi.fn(),
		setSearchId: vi.fn(),
	};
	const mockSettingsActions = {
		setPlace: vi.fn(),
		setCamera: vi.fn(),
		setIsoMin: vi.fn(),
		setIsoMax: vi.fn(),
		setFMin: vi.fn(),
		setFMax: vi.fn(),
		setHasText: vi.fn(),
		setResultView: vi.fn(),
		setTimelineBucket: vi.fn(),
	};
	const mockWorkspaceActions = {
		setPersons: vi.fn(),
	};
	const mockFav = ["/path/photo1.jpg", "/path/photo2.jpg"];
	const mockLoadFav = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const createTestHook = (overrides = {}) => {
		return renderHook(() =>
			useSearchLogic({
				dir: mockDir,
				engine: mockEngine,
				topK: mockTopK,
				uiActions: mockUiActions,
				photoActions: mockPhotoActions,
				settingsActions: mockSettingsActions,
				workspaceActions: mockWorkspaceActions,
				fav: mockFav,
				loadFav: mockLoadFav,
				...overrides,
			}),
		);
	};

	describe("searchLikeThis", () => {
		it("should search for similar photos successfully", async () => {
			const mockResults = [
				{ path: "/path/similar1.jpg", score: 0.95 },
				{ path: "/path/similar2.jpg", score: 0.87 },
			];
			vi.mocked(api.apiSearchLike).mockResolvedValue({ results: mockResults });

			const { result } = createTestHook();

			await act(async () => {
				await result.current.searchLikeThis("/path/photo.jpg");
			});

			expect(mockUiActions.setBusy).toHaveBeenCalledWith("Searching similar…");
			expect(api.apiSearchLike).toHaveBeenCalledWith(
				mockDir,
				"/path/photo.jpg",
				mockEngine,
				mockTopK,
			);
			expect(mockPhotoActions.setResults).toHaveBeenCalledWith(mockResults);
			expect(mockUiActions.setBusy).toHaveBeenCalledWith("");
		});

		it("should handle offline state", async () => {
			vi.mocked(networkErrors.isOffline).mockReturnValue(true);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.searchLikeThis("/path/photo.jpg");
			});

			expect(api.apiSearchLike).not.toHaveBeenCalled();
			expect(mockUiActions.setNote).toHaveBeenCalledWith(
				"Cannot search: No internet connection",
			);
		});

		it("should handle API errors gracefully", async () => {
			const mockError = new Error("Network error");
			vi.mocked(api.apiSearchLike).mockRejectedValue(mockError);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.searchLikeThis("/path/photo.jpg");
			});

			expect(api.apiSearchLike).toHaveBeenCalled();
			expect(mockPhotoActions.setResults).not.toHaveBeenCalled();
			// Hook logs error; does not set UI note directly
			expect(mockUiActions.setNote).not.toHaveBeenCalled();
			expect(mockUiActions.setBusy).toHaveBeenCalledWith("");
		});

		it("should not search when directory is not set", async () => {
			const { result } = createTestHook({ dir: "" });

			await act(async () => {
				await result.current.searchLikeThis("/path/photo.jpg");
			});

			expect(api.apiSearchLike).not.toHaveBeenCalled();
		});
	});

	describe("toggleFavorite", () => {
		it("should add photo to favorites when not already favorited", async () => {
			vi.mocked(api.apiSetFavorite).mockResolvedValue(undefined);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.toggleFavorite("/path/new-photo.jpg");
			});

			expect(api.apiSetFavorite).toHaveBeenCalledWith(
				mockDir,
				"/path/new-photo.jpg",
				true,
			);
			expect(mockLoadFav).toHaveBeenCalled();
		});

		it("should remove photo from favorites when already favorited", async () => {
			vi.mocked(api.apiSetFavorite).mockResolvedValue(undefined);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.toggleFavorite("/path/photo1.jpg");
			});

			expect(api.apiSetFavorite).toHaveBeenCalledWith(
				mockDir,
				"/path/photo1.jpg",
				false,
			);
			expect(mockLoadFav).toHaveBeenCalled();
		});

		it("should handle favorite toggle errors", async () => {
			const mockError = new Error("Database error");
			vi.mocked(api.apiSetFavorite).mockRejectedValue(mockError);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.toggleFavorite("/path/photo.jpg");
			});

			expect(api.apiSetFavorite).toHaveBeenCalled();
			// Should not throw error, just log it
		});
	});

	describe("revealPhoto", () => {
		it("should reveal photo successfully", async () => {
			vi.mocked(api.apiOpen).mockResolvedValue(undefined);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.revealPhoto("/path/photo.jpg");
			});

			expect(api.apiOpen).toHaveBeenCalledWith(mockDir, "/path/photo.jpg");
		});

		it("should handle reveal errors gracefully", async () => {
			const mockError = new Error("Permission denied");
			vi.mocked(api.apiOpen).mockRejectedValue(mockError);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.revealPhoto("/path/photo.jpg");
			});

			expect(api.apiOpen).toHaveBeenCalled();
			// Should not throw error
		});
	});

	describe("URL building and parsing", () => {
		describe("buildSearchUrl", () => {
			it("should build basic search URL", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("sunset beach", {});

				expect(url.startsWith("?")).toBe(true);
				expect(url).toContain("q=sunset%20beach");
			});

			it("should include favorites filter", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("family", { favOnly: true });

				expect(url).toContain("fav=1");
			});

			it("should include tag filter", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("vacation", {
					tagFilter: "travel,summer",
				});

				expect(url).toContain("tags=travel%2Csummer");
			});

			it("should include date filters", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("christmas", {
					dateFrom: "2023-12-01",
					dateTo: "2023-12-31",
				});

				expect(url).toContain("date_from=2023-12-01");
				expect(url).toContain("date_to=2023-12-31");
			});

			it("should include camera filter", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("portrait", {
					camera: "Canon EOS R5",
				});

				expect(url).toContain("camera=Canon%20EOS%20R5");
			});

			it("should include numeric filters", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("low light", {
					isoMin: 1600,
					isoMax: 6400,
					fMin: 1.4,
					fMax: 2.8,
				});

				expect(url).toContain("iso_min=1600");
				expect(url).toContain("iso_max=6400");
				expect(url).toContain("f_min=1.4");
				expect(url).toContain("f_max=2.8");
			});

			it("should include place filter", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("paris", {
					place: "Paris, France",
				});

				expect(url).toContain("place=Paris%2C%20France");
			});

			it("should include has_text filter", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("document", {
					hasText: true,
				});

				expect(url).toContain("has_text=1");
			});

			it("should include single person filter", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("alice", {
					persons: ["Alice"],
				});

				expect(url).toContain("person=Alice");
			});

			it("should include multiple persons filter", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("family", {
					persons: ["Alice", "Bob"],
				});

				expect(url).toContain("persons=Alice%2CBob");
			});

			it("should include result view and timeline bucket", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("recent", {
					resultView: "timeline",
					timelineBucket: "week",
				});

				expect(url).toContain("rv=timeline");
				expect(url).toContain("tb=week");
			});

			it("should handle complex combination of filters", () => {
				const { result } = createTestHook();

				const url = result.current.buildSearchUrl("professional photos", {
					favOnly: true,
					tagFilter: "portrait,studio",
					camera: "Canon EOS R5",
					isoMin: 100,
					isoMax: 800,
					fMin: 1.4,
					fMax: 5.6,
					resultView: "grid",
					timelineBucket: "day",
				});

				expect(url).toContain("q=professional%20photos");
				expect(url).toContain("fav=1");
				expect(url).toContain("tags=portrait%2Cstudio");
				expect(url).toContain("camera=Canon%20EOS%20R5");
				expect(url).toContain("iso_min=100");
				expect(url).toContain("iso_max=800");
				expect(url).toContain("f_min=1.4");
				expect(url).toContain("f_max=5.6");
				expect(url).toContain("rv=grid");
				expect(url).toContain("tb=day");
			});
		});

		describe("parseSearchParams", () => {
			it("should parse basic search query", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams("q=beach sunset");
				const parsed = result.current.parseSearchParams(params);

				expect(parsed.query).toBe("beach sunset");
				expect(parsed.filters).toEqual({});
			});

			it("should parse favorites filter", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams("q=family&fav=1");
				const parsed = result.current.parseSearchParams(params);

				expect(parsed.filters.favOnly).toBe(true);
			});

			it("should parse tag filter", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams("q=vacation&tags=travel,summer");
				const parsed = result.current.parseSearchParams(params);

				expect(parsed.filters.tagFilter).toBe("travel,summer");
			});

			it("should parse date filters", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams(
					"q=christmas&date_from=2023-12-01&date_to=2023-12-31",
				);
				const parsed = result.current.parseSearchParams(params);

				expect(parsed.filters.dateFrom).toBe("2023-12-01");
				expect(parsed.filters.dateTo).toBe("2023-12-31");
			});

			it("should parse camera filter", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams(
					"q=portrait&camera=Canon%20EOS%20R5",
				);
				const parsed = result.current.parseSearchParams(params);

				expect(parsed.filters.camera).toBe("Canon EOS R5");
			});

			it("should parse numeric filters", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams(
					"q=low%20light&iso_min=1600&iso_max=6400&f_min=1.4&f_max=2.8",
				);
				const parsed = result.current.parseSearchParams(params);

				expect(parsed.filters.isoMin).toBe(1600);
				expect(parsed.filters.isoMax).toBe(6400);
				expect(parsed.filters.fMin).toBe(1.4);
				expect(parsed.filters.fMax).toBe(2.8);
			});

			it("should parse place filter", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams("q=paris&place=Paris%2C%20France");
				const parsed = result.current.parseSearchParams(params);

				expect(parsed.filters.place).toBe("Paris, France");
			});

			it("should parse has_text filter", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams("q=document&has_text=1");
				const parsed = result.current.parseSearchParams(params);

				expect(parsed.filters.hasText).toBe(true);
			});

			it("should parse single person filter", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams("q=alice&person=Alice");
				const parsed = result.current.parseSearchParams(params);

				expect(parsed.filters.persons).toEqual(["Alice"]);
			});

			it("should parse multiple persons filter", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams("q=family&persons=Alice%2CBob");
				const parsed = result.current.parseSearchParams(params);

				expect(parsed.filters.persons).toEqual(["Alice", "Bob"]);
			});

			it("should parse result view and timeline bucket", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams("q=recent&rv=timeline&tb=week");
        const filters = result.current.parseSearchParams(params);
        expect(filters.resultView).toBe("timeline");
        expect(filters.timelineBucket).toBe("week");
			});

			it("should handle complex combination of parameters", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams(
					"q=professional%20photos&fav=1&tags=portrait%2Cstudio&camera=Canon%20EOS%20R5&iso_min=100&iso_max=800&f_min=1.4&f_max=5.6&rv=grid&tb=day",
				);
        const filters = result.current.parseSearchParams(params);
        expect(filters.favOnly).toBe(true);
        expect(filters.tagFilter).toBe("portrait,studio");
        expect(filters.camera).toBe("Canon EOS R5");
        expect(filters.isoMin).toBe(100);
        expect(filters.isoMax).toBe(800);
        expect(filters.fMin).toBe(1.4);
        expect(filters.fMax).toBe(5.6);
        expect(filters.resultView).toBe("grid");
        expect(filters.timelineBucket).toBe("day");
			});

			it("should handle empty parameters gracefully", () => {
				const { result } = createTestHook();

				const params = new URLSearchParams("");
        const filters = result.current.parseSearchParams(params);
        expect(filters).toEqual({});
			});
		});
	});

// The hook no longer exposes clearSearch/performSearch; those behaviors
// have moved to higher-level components (e.g., App/TopBar flows).
});
