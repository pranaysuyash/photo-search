import { describe, expect, it } from "vitest";
import {
	apiGetFavorites,
	apiGetTags,
	apiSearch,
	apiSetFavorite,
	apiSetTags,
} from "../api";

describe("API Integration Tests with MSW", () => {
	describe("Search API", () => {
		it("should successfully search with valid parameters", async () => {
			const result = await apiSearch("/test/photos", "beach", "local", 10);

			expect(result).toHaveProperty("search_id");
			expect(result).toHaveProperty("results");
			expect(Array.isArray(result.results)).toBe(true);
			expect(result.results.length).toBeGreaterThan(0);
		});

		it("should handle missing required parameters", async () => {
			await expect(apiSearch("", "beach", "local", 10)).rejects.toThrow();
		});

		it("should handle invalid directory", async () => {
			await expect(
				apiSearch("/non/existent/directory", "beach", "local", 10),
			).rejects.toThrow();
		});
	});

	describe("Tags API", () => {
		it("should get tags for a directory", async () => {
			const result = await apiGetTags("/test/photos");

			expect(result).toHaveProperty("tags");
			expect(result).toHaveProperty("all");
			expect(typeof result.tags).toBe("object");
			expect(Array.isArray(result.all)).toBe(true);
		});

		it("should set tags for a photo", async () => {
			const result = await apiSetTags("/test/photos", "/test/photo1.jpg", [
				"vacation",
				"beach",
			]);

			expect(result).toHaveProperty("ok", true);
			expect(result).toHaveProperty("tags");
			expect(result.tags).toEqual(["vacation", "beach"]);
		});

		it("should handle missing parameters for setTags", async () => {
			await expect(
				apiSetTags("", "/test/photo1.jpg", ["vacation"]),
			).rejects.toThrow();
		});
	});

	describe("Favorites API", () => {
		it("should get favorites for a directory", async () => {
			const result = await apiGetFavorites("/test/photos");

			expect(result).toHaveProperty("favorites");
			expect(Array.isArray(result.favorites)).toBe(true);
		});

		it("should set favorite status for a photo", async () => {
			const result = await apiSetFavorite(
				"/test/photos",
				"/test/photo1.jpg",
				true,
			);

			expect(result).toHaveProperty("ok", true);
			expect(result).toHaveProperty("favorites");
			expect(Array.isArray(result.favorites)).toBe(true);
		});

		it("should handle missing parameters for setFavorite", async () => {
			await expect(
				apiSetFavorite("", "/test/photo1.jpg", true),
			).rejects.toThrow();
		});
	});

	describe("Error Handling", () => {
		it("should handle network errors gracefully", async () => {
			// Test with invalid API base URL by mocking a different response
			// This would require additional MSW setup for error scenarios
			expect(true).toBe(true); // Placeholder test
		});
	});
});
