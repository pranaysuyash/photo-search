import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api";
import { usePhotoActions } from "../usePhotoActions";

// Mock toast functionality
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
	useToast: () => ({
		toast: mockToast,
	}),
}));

// Mock the API module
vi.mock("../../api", () => ({
	apiSetTags: vi.fn(),
	apiExport: vi.fn(),
	apiDelete: vi.fn(),
	apiUndoDelete: vi.fn(),
	apiSetFavorite: vi.fn(),
}));

describe("usePhotoActions", () => {
	const mockDir = "/test/photos";
	const mockEngine = "local";
	const mockUiActions = {
		setBusy: vi.fn(),
		setNote: vi.fn(),
	};
	const mockPhotoActions = {
		setFavorites: vi.fn(),
		setResults: vi.fn(),
		setSearchId: vi.fn(),
	};
	const mockSettingsActions = {
		setShowInfoOverlay: vi.fn(),
	};
	const mockTagsMap = {
		"/path/photo1.jpg": ["family", "vacation", "rating:4"],
		"/path/photo2.jpg": ["portrait", "rating:5"],
		"/path/photo3.jpg": ["rating:3"],
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const createTestHook = (overrides = {}) => {
		return renderHook(() =>
			usePhotoActions({
				dir: mockDir,
				engine: mockEngine,
				tagsMap: mockTagsMap,
				uiActions: mockUiActions,
				photoActions: mockPhotoActions,
				settingsActions: mockSettingsActions,
				useOsTrash: true,
				...overrides,
			}),
		);
	};

	describe("setRating", () => {
		it("should set rating for selected photos successfully", async () => {
			const selected = new Set(["/path/photo1.jpg", "/path/photo2.jpg"]);
			vi.mocked(api.apiSetTags).mockResolvedValue(undefined);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.setRating(4, selected);
			});

			expect(api.apiSetTags).toHaveBeenCalledTimes(2);
			expect(api.apiSetTags).toHaveBeenCalledWith(mockDir, "/path/photo1.jpg", [
				"family",
				"vacation",
				"rating:4",
			]);
			expect(api.apiSetTags).toHaveBeenCalledWith(mockDir, "/path/photo2.jpg", [
				"portrait",
				"rating:4",
			]);
			expect(mockUiActions.setNote).toHaveBeenCalledWith("Set rating 4 for 2");
		});

		it("should clear rating when rating is 0", async () => {
			const selected = new Set(["/path/photo3.jpg"]);
			vi.mocked(api.apiSetTags).mockResolvedValue(undefined);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.setRating(0, selected);
			});

			expect(api.apiSetTags).toHaveBeenCalledWith(
				mockDir,
				"/path/photo3.jpg",
				[],
			);
			expect(mockUiActions.setNote).toHaveBeenCalledWith(
				"Cleared rating for 1",
			);
		});

		it("should handle empty selection", async () => {
			const selected = new Set();

			const { result } = createTestHook();

			await act(async () => {
				await result.current.setRating(5, selected);
			});

			expect(api.apiSetTags).not.toHaveBeenCalled();
			expect(mockUiActions.setNote).not.toHaveBeenCalled();
		});

		it("should handle API errors gracefully", async () => {
			const selected = new Set(["/path/photo1.jpg"]);
			const mockError = new Error("API error");
			vi.mocked(api.apiSetTags).mockRejectedValue(mockError);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.setRating(5, selected);
			});

			expect(mockUiActions.setNote).toHaveBeenCalledWith("API error");
		});

		it("should handle missing directory", async () => {
			const selected = new Set(["/path/photo1.jpg"]);

			const { result } = createTestHook({ dir: "" });

			await act(async () => {
				await result.current.setRating(5, selected);
			});

			expect(api.apiSetTags).not.toHaveBeenCalled();
			expect(mockUiActions.setNote).not.toHaveBeenCalled();
		});
	});

	describe("setTags", () => {
		it("should set tags for selected photos successfully", async () => {
			const selected = new Set(["/path/photo1.jpg", "/path/photo2.jpg"]);
			const newTags = ["new-tag", "another-tag"];
			vi.mocked(api.apiSetTags).mockResolvedValue(undefined);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.setTags(newTags, selected);
			});

			expect(api.apiSetTags).toHaveBeenCalledTimes(2);
			expect(api.apiSetTags).toHaveBeenCalledWith(
				mockDir,
				"/path/photo1.jpg",
				newTags,
			);
			expect(api.apiSetTags).toHaveBeenCalledWith(
				mockDir,
				"/path/photo2.jpg",
				newTags,
			);
			expect(mockUiActions.setNote).toHaveBeenCalledWith(
				"Updated tags for 2 photos",
			);
		});

		it("should handle empty tags", async () => {
			const selected = new Set(["/path/photo1.jpg"]);
			const newTags: string[] = [];
			vi.mocked(api.apiSetTags).mockResolvedValue(undefined);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.setTags(newTags, selected);
			});

			expect(api.apiSetTags).toHaveBeenCalledWith(
				mockDir,
				"/path/photo1.jpg",
				[],
			);
			expect(mockUiActions.setNote).toHaveBeenCalledWith(
				"Updated tags for 1 photos",
			);
		});

		it("should handle API errors gracefully", async () => {
			const selected = new Set(["/path/photo1.jpg"]);
			const newTags = ["new-tag"];
			const mockError = new Error("Tag update failed");
			vi.mocked(api.apiSetTags).mockRejectedValue(mockError);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.setTags(newTags, selected);
			});

			expect(mockUiActions.setNote).toHaveBeenCalledWith("Tag update failed");
		});
	});

	describe("exportPhotos", () => {
		it("should export photos successfully", async () => {
			const selected = new Set(["/path/photo1.jpg", "/path/photo2.jpg"]);
			const destination = "/export/folder";
			const mockResult = {
				copied: 2,
				skipped: 0,
				errors: 0,
				dest: destination,
			};
			vi.mocked(api.apiExport).mockResolvedValue(mockResult);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.exportPhotos(destination, selected);
			});

			expect(api.apiExport).toHaveBeenCalledWith(
				mockDir,
				Array.from(selected),
				destination,
				"copy",
				false,
				false,
			);
			expect(mockUiActions.setNote).toHaveBeenCalledWith(
				"Exported 2, skipped 0, errors 0 → /export/folder",
			);
		});

		it("should handle export errors", async () => {
			const selected = new Set(["/path/photo1.jpg"]);
			const destination = "/export/folder";
			const mockError = new Error("Export failed");
			vi.mocked(api.apiExport).mockRejectedValue(mockError);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.exportPhotos(destination, selected);
			});

			expect(mockUiActions.setNote).toHaveBeenCalledWith("Export failed");
		});

		it("should not export when no photos selected", async () => {
			const selected = new Set();
			const destination = "/export/folder";

			const { result } = createTestHook();

			await act(async () => {
				await result.current.exportPhotos(destination, selected);
			});

			expect(api.apiExport).not.toHaveBeenCalled();
			expect(mockUiActions.setNote).not.toHaveBeenCalled();
		});

		it("should not export when directory is missing", async () => {
			const selected = new Set(["/path/photo1.jpg"]);
			const destination = "/export/folder";

			const { result } = createTestHook({ dir: "" });

			await act(async () => {
				await result.current.exportPhotos(destination, selected);
			});

			expect(api.apiExport).not.toHaveBeenCalled();
			expect(mockUiActions.setNote).not.toHaveBeenCalled();
		});
	});

	describe("deletePhotos", () => {
		it("should delete photos with confirmation", async () => {
			const selected = new Set(["/path/photo1.jpg", "/path/photo2.jpg"]);
			const mockResult = { moved: 2 };
			vi.mocked(api.apiDelete).mockResolvedValue(mockResult);
			global.confirm = vi.fn(() => true);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.deletePhotos(selected);
			});

			expect(global.confirm).toHaveBeenCalledWith("Move 2 item(s) to Trash?");
			expect(api.apiDelete).toHaveBeenCalledWith(
				mockDir,
				Array.from(selected),
				true,
			);
			expect(mockToast).toHaveBeenCalledWith({
				description: "Moved 2 to OS Trash",
			});
		});

		it("should not delete when user cancels", async () => {
			const selected = new Set(["/path/photo1.jpg"]);
			global.confirm = vi.fn(() => false);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.deletePhotos(selected);
			});

			expect(global.confirm).toHaveBeenCalled();
			expect(api.apiDelete).not.toHaveBeenCalled();
			expect(mockUiActions.setNote).not.toHaveBeenCalled();
		});

		it("should use app trash when useOsTrash is false", async () => {
			const selected = new Set(["/path/photo1.jpg"]);
			const mockResult = { moved: 1 };
			vi.mocked(api.apiDelete).mockResolvedValue(mockResult);
			global.confirm = vi.fn(() => true);

			const { result } = createTestHook({ useOsTrash: false });

			await act(async () => {
				await result.current.deletePhotos(selected);
			});

			expect(api.apiDelete).toHaveBeenCalledWith(
				mockDir,
				Array.from(selected),
				false,
			);
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					description: "Moved 1 to Trash",
					action: expect.any(Object),
				}),
			);
		});

		it("should handle delete errors", async () => {
			const selected = new Set(["/path/photo1.jpg"]);
			const mockError = new Error("Delete failed");
			vi.mocked(api.apiDelete).mockRejectedValue(mockError);
			global.confirm = vi.fn(() => true);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.deletePhotos(selected);
			});

			expect(mockUiActions.setNote).toHaveBeenCalledWith("Delete failed");
		});

		it("should not delete when no photos selected", async () => {
			const selected = new Set();

			const { result } = createTestHook();

			await act(async () => {
				await result.current.deletePhotos(selected);
			});

			expect(global.confirm).not.toHaveBeenCalled();
			expect(api.apiDelete).not.toHaveBeenCalled();
		});
	});

	describe("undoDelete", () => {
		it("should undo delete successfully", async () => {
			const mockResult = { restored: 3 };
			vi.mocked(api.apiUndoDelete).mockResolvedValue(mockResult);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.undoDelete();
			});

			expect(api.apiUndoDelete).toHaveBeenCalledWith(mockDir);
			expect(mockUiActions.setNote).toHaveBeenCalledWith("Restored 3");
		});

		it("should handle undo errors", async () => {
			const mockError = new Error("Undo failed");
			vi.mocked(api.apiUndoDelete).mockRejectedValue(mockError);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.undoDelete();
			});

			expect(mockUiActions.setNote).toHaveBeenCalledWith("Undo failed");
		});

		it("should not undo when directory is missing", async () => {
			const { result } = createTestHook({ dir: "" });

			await act(async () => {
				await result.current.undoDelete();
			});

			expect(api.apiUndoDelete).not.toHaveBeenCalled();
			expect(mockUiActions.setNote).not.toHaveBeenCalled();
		});
	});

	describe("toggleFavorite", () => {
		it("should add photo to favorites", async () => {
			const photoPath = "/path/photo1.jpg";
			vi.mocked(api.apiSetFavorite).mockResolvedValue(undefined);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.toggleFavorite(photoPath);
			});

			expect(api.apiSetFavorite).toHaveBeenCalledWith(mockDir, photoPath, true);
		});

		it("should remove photo from favorites", async () => {
			const photoPath = "/path/photo2.jpg";
			vi.mocked(api.apiSetFavorite).mockResolvedValue(undefined);

			const { result } = createTestHook({
				tagsMap: {
					...mockTagsMap,
					[photoPath]: ["favorite"],
				},
			});

			await act(async () => {
				await result.current.toggleFavorite(photoPath);
			});

			expect(api.apiSetFavorite).toHaveBeenCalledWith(
				mockDir,
				photoPath,
				false,
			);
		});

		it("should handle favorite errors", async () => {
			const photoPath = "/path/photo1.jpg";
			const mockError = new Error("Favorite failed");
			vi.mocked(api.apiSetFavorite).mockRejectedValue(mockError);

			const { result } = createTestHook();

			await act(async () => {
				await result.current.toggleFavorite(photoPath);
			});

			// Should not throw error
		});

		it("should not toggle when directory is missing", async () => {
			const photoPath = "/path/photo1.jpg";

			const { result } = createTestHook({ dir: "" });

			await act(async () => {
				await result.current.toggleFavorite(photoPath);
			});

			expect(api.apiSetFavorite).not.toHaveBeenCalled();
		});
	});
});
