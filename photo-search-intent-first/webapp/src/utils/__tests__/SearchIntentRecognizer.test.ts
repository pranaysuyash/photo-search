/**
 * Test suite for SearchIntentRecognizer
 */

import { describe, expect, test } from "vitest";
import { SearchIntentRecognizer } from "../../services/SearchIntentRecognizer";

describe("SearchIntentRecognizer", () => {
	describe("recognizeIntent", () => {
		test("should recognize discovery intent", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("show me some photos");
			expect(intent.primary).toBe("discovery");
			expect(intent.confidence).toBeGreaterThan(0.5);
		});

		test("should recognize temporal intent", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("photos from today");
			expect(intent.primary).toBe("temporal");
			expect(intent.context.timeFrame?.type).toBe("recent");
		});

		test("should recognize location intent", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("photos from home");
			expect(intent.primary).toBe("location");
			expect(intent.context.location?.type).toBe("specific");
		});

		test("should recognize person intent", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("photos with mom");
			expect(intent.primary).toBe("person");
			expect(intent.context.people?.relationship).toBe("mom");
		});

		test("should recognize emotional intent", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("happy photos");
			expect(intent.primary).toBe("emotional");
			expect(intent.context.mood?.emotion).toBe("happy");
			expect(intent.context.mood?.valence).toBe("positive");
		});

		test("should recognize technical intent", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("photos shot at f/2.8");
			expect(intent.primary).toBe("technical");
			expect(intent.context.technical?.settings?.aperture).toBe("f/2.8");
		});

		test("should handle empty query", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("");
			expect(intent.primary).toBe("discovery");
			expect(intent.confidence).toBe(0.5);
		});

		test("should generate relevant suggestions", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("beach photos");
			expect(intent.suggestedQueries).toContain("recent photos");
			expect(intent.suggestedQueries.length).toBeGreaterThan(0);
		});

		test("should extract context correctly", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("family photos from last summer");
			expect(intent.context.people?.relationship).toBe("family");
			expect(intent.context.timeFrame?.type).toBe("seasonal");
		});

		test("should handle modifiers", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("beach photos not sunset");
			expect(intent.modifiers).toHaveLength(1);
			expect(intent.modifiers[0].type).toBe("exclusion");
			expect(intent.modifiers[0].value).toBe("sunset");
		});
	});

	describe("getTypingSuggestions", () => {
		test("should provide initial suggestions for empty query", () => {
			const suggestions = SearchIntentRecognizer.getTypingSuggestions("");
			expect(suggestions).toContain("recent photos");
			expect(suggestions).toContain("family photos");
		});

		test("should provide contextual suggestions for partial query", () => {
			const suggestions = SearchIntentRecognizer.getTypingSuggestions("beach");
			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions.some(s => s.toLowerCase().includes("beach"))).toBe(true);
		});

		test("should use intent history for better suggestions", () => {
			const intentHistory = [
				SearchIntentRecognizer.recognizeIntent("beach photos"),
				SearchIntentRecognizer.recognizeIntent("family vacation"),
			];

			const suggestions = SearchIntentRecognizer.getTypingSuggestions(
				"beach",
				intentHistory
			);

			expect(suggestions.length).toBeGreaterThan(0);
		});
	});

	describe("Edge cases", () => {
		test("should handle very short queries", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("a");
			expect(intent.primary).toBe("unknown");
		});

		test("should handle very long queries", () => {
			const longQuery = "photos of happy people at the beach during sunset with family and friends on vacation last summer";
			const intent = SearchIntentRecognizer.recognizeIntent(longQuery);
			expect(intent.complexity).toBe("complex");
		});

		test("should handle mixed case queries", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("BeAcH pHoToS");
			expect(intent.primary).toBe("location");
		});

		test("should handle queries with numbers", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("photos from 2023");
			expect(intent.context.timeFrame?.type).toBe("specific");
		});

		test("should handle queries with punctuation", () => {
			const intent = SearchIntentRecognizer.recognizeIntent("beach photos, sunset");
			expect(intent.primary).toBe("location");
		});
	});

	describe("Context integration", () => {
		test("should use available context for better recognition", () => {
			const context = {
				availableTags: ["beach", "sunset", "family"],
				availablePeople: ["John", "Mary"],
				availableLocations: ["Home", "Beach House"],
			};

			const intent = SearchIntentRecognizer.recognizeIntent("beach photos", context);
			expect(intent.suggestedQueries.length).toBeGreaterThan(0);
		});

		test("should prioritize context in suggestions", () => {
			const context = {
				availableLocations: ["Paris", "London"],
			};

			const intent = SearchIntentRecognizer.recognizeIntent("photos", context);
			const hasContextSuggestions = intent.suggestedQueries.some(s =>
				context.availableLocations.some(loc => s.toLowerCase().includes(loc.toLowerCase()))
			);
			expect(hasContextSuggestions).toBe(true);
		});
	});
});