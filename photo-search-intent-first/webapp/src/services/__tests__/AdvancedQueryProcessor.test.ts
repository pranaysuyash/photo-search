import { describe, expect, it } from "vitest";
import { queryProcessor } from "../AdvancedQueryProcessor";

describe("AdvancedQueryProcessor", () => {
	describe("Basic Query Processing", () => {
		it("should process simple queries", () => {
			const result = queryProcessor.processQuery("beach");

			expect(result.original).toBe("beach");
			expect(result.terms).toHaveLength(1);
			expect(result.terms[0].text).toBe("beach");
			expect(result.terms[0].type).toBe("required");
			expect(result.intent).toBe("simple");
		});

		it("should handle empty queries", () => {
			const result = queryProcessor.processQuery("");

			expect(result.original).toBe("");
			expect(result.terms).toHaveLength(0);
			expect(result.expandedTerms).toHaveLength(0);
		});
	});

	describe("Boolean Operators", () => {
		it("should parse AND operators", () => {
			const result = queryProcessor.processQuery("beach AND sunset");

			expect(result.terms).toHaveLength(2);
			expect(result.terms[0].text).toBe("beach");
			expect(result.terms[1].text).toBe("sunset");
			expect(result.booleanExpression).toBe("beach AND sunset");
			expect(result.intent).toBe("boolean");
		});

		it("should parse OR operators", () => {
			const result = queryProcessor.processQuery("family OR friends");

			expect(result.terms).toHaveLength(2);
			expect(result.terms[0].text).toBe("family");
			expect(result.terms[1].text).toBe("friends");
			expect(result.booleanExpression).toBe("family OR friends");
			expect(result.intent).toBe("boolean");
		});

		it("should parse NOT operators", () => {
			const result = queryProcessor.processQuery("beach NOT night");

			expect(result.terms).toHaveLength(2);
			expect(result.terms[0].text).toBe("beach");
			expect(result.terms[0].type).toBe("required");
			expect(result.terms[1].text).toBe("night");
			expect(result.terms[1].type).toBe("excluded");
			expect(result.intent).toBe("negative");
		});

		it("should handle complex boolean expressions", () => {
			const result = queryProcessor.processQuery(
				"family AND (birthday OR wedding) AND recent",
			);

			expect(result.terms.length).toBeGreaterThan(2);
			expect(result.intent).toBe("advanced");
		});
	});

	describe("Synonym Expansion", () => {
		it("should expand terms with synonyms", () => {
			const result = queryProcessor.processQuery("beach");

			expect(result.expandedTerms.length).toBeGreaterThan(1);
			expect(result.expandedTerms).toContain("beach");
			expect(
				result.expandedTerms.some((term) =>
					["shore", "coast", "seaside", "ocean", "sand"].includes(term),
				),
			).toBe(true);
		});

		it("should expand family-related terms", () => {
			const result = queryProcessor.processQuery("family");

			expect(result.expandedTerms).toContain("family");
			expect(
				result.expandedTerms.some((term) =>
					["relatives", "kin", "loved ones", "household"].includes(term),
				),
			).toBe(true);
		});

		it("should not expand unknown terms", () => {
			const result = queryProcessor.processQuery("unknown_term_xyz");

			expect(result.expandedTerms).toEqual(["unknown_term_xyz"]);
		});
	});

	describe("Filter Extraction", () => {
		it("should extract date filters", () => {
			const result = queryProcessor.processQuery("photos before 2023");

			expect(result.filters).toHaveLength(1);
			expect(result.filters[0].type).toBe("date");
			expect(result.filters[0].operator).toBe("before");
			expect(result.filters[0].value).toBe("2023");
		});

		it("should extract location filters", () => {
			const result = queryProcessor.processQuery("photos in Paris");

			expect(result.filters).toHaveLength(1);
			expect(result.filters[0].type).toBe("location");
			expect(result.filters[0].operator).toBe("contains");
			expect(result.filters[0].value).toBe("Paris");
		});

		it("should extract tag filters", () => {
			const result = queryProcessor.processQuery(
				"tagged as favorite, vacation",
			);

			expect(result.filters).toHaveLength(1);
			expect(result.filters[0].type).toBe("tag");
			expect(result.filters[0].operator).toBe("equals");
			expect(result.filters[0].value).toEqual(["favorite", "vacation"]);
		});

		it("should extract file type filters", () => {
			const result = queryProcessor.processQuery("photos .jpg");

			expect(result.filters).toHaveLength(1);
			expect(result.filters[0].type).toBe("filetype");
			expect(result.filters[0].operator).toBe("equals");
			expect(result.filters[0].value).toBe("jpg");
		});
	});

	describe("Query Intent Detection", () => {
		it("should detect simple intent", () => {
			const result = queryProcessor.processQuery("beach");
			expect(result.intent).toBe("simple");
		});

		it("should detect boolean intent", () => {
			const result = queryProcessor.processQuery("beach AND sunset");
			expect(result.intent).toBe("boolean");
		});

		it("should detect negative intent", () => {
			const result = queryProcessor.processQuery("beach NOT night");
			expect(result.intent).toBe("negative");
		});

		it("should detect advanced intent", () => {
			const result = queryProcessor.processQuery(
				"beach AND sunset NOT night before 2023",
			);
			expect(result.intent).toBe("advanced");
		});
	});

	describe("Suggestion Generation", () => {
		it("should generate suggestions for simple queries", () => {
			const suggestions = queryProcessor.generateSuggestions("beach", 5);

			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions).toContain("beach AND beautiful");
			expect(suggestions).toContain("beach AND recent");
			expect(suggestions).toContain("beach NOT blurry");
		});

		it("should generate appropriate suggestions for negative queries", () => {
			const suggestions = queryProcessor.generateSuggestions(
				"beach NOT night",
				3,
			);

			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions.some((s) => s.includes("beautiful"))).toBe(true);
		});

		it("should suggest filter additions", () => {
			const suggestions = queryProcessor.generateSuggestions("family", 5);

			expect(suggestions).toContain("family before 2023");
			expect(suggestions).toContain("family tagged as favorite");
		});
	});

	describe("Query Explanation", () => {
		it("should explain simple queries", () => {
			const explanation = queryProcessor.explainQuery("beach");
			expect(explanation).toContain("Query intent: Simple keyword search");
		});

		it("should explain boolean queries", () => {
			const explanation = queryProcessor.explainQuery("beach AND sunset");
			expect(explanation).toContain("Using boolean operators");
			expect(explanation).toContain("Multi-term search with implicit AND");
		});

		it("should explain advanced queries with filters", () => {
			const explanation = queryProcessor.explainQuery(
				"beach AND sunset before 2023",
			);
			expect(explanation).toContain("Applied 1 filter(s): date");
		});

		it("should explain synonym expansion", () => {
			const explanation = queryProcessor.explainQuery("beach");
			expect(explanation).toContain("Expanded 1 term(s) with synonyms");
		});
	});

	describe("Contextual Expansions", () => {
		it("should expand vacation-related terms", () => {
			const result = queryProcessor.processQuery("vacation");

			expect(
				result.expandedTerms.some((term) =>
					["travel", "trip", "journey", "adventure", "getaway"].includes(term),
				),
			).toBe(true);
		});

		it("should expand celebration-related terms", () => {
			const result = queryProcessor.processQuery("birthday");

			expect(
				result.expandedTerms.some((term) =>
					["celebration", "gathering", "festivity", "event"].includes(term),
				),
			).toBe(true);
		});

		it("should expand temporal terms", () => {
			const result = queryProcessor.processQuery("recent");

			expect(
				result.expandedTerms.some((term) =>
					["last week", "this month", "lately", "newly"].includes(term),
				),
			).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("should handle mixed case queries", () => {
			const result = queryProcessor.processQuery("BEACH AND SUNSET");

			expect(result.terms[0].text).toBe("beach");
			expect(result.terms[1].text).toBe("sunset");
		});

		it("should handle extra whitespace", () => {
			const result = queryProcessor.processQuery("  beach   AND   sunset  ");

			expect(result.terms[0].text).toBe("beach");
			expect(result.terms[1].text).toBe("sunset");
		});

		it("should handle special characters in terms", () => {
			const result = queryProcessor.processQuery("photo_2023");

			expect(result.terms[0].text).toBe("photo_2023");
			expect(result.expandedTerms).toContain("photo_2023");
		});

		it("should handle empty results gracefully", () => {
			const suggestions = queryProcessor.generateSuggestions("", 5);
			expect(suggestions).toEqual([]);

			const explanation = queryProcessor.explainQuery("");
			expect(explanation).toBe("");
		});
	});

	describe("Performance", () => {
		it("should process queries quickly", () => {
			const start = performance.now();

			for (let i = 0; i < 1000; i++) {
				queryProcessor.processQuery("beach AND sunset NOT night");
			}

			const end = performance.now();
			const avgTime = (end - start) / 1000;

			expect(avgTime).toBeLessThan(1); // Should process queries in under 1ms on average
		});

		it("should handle large expanded term sets efficiently", () => {
			const result = queryProcessor.processQuery(
				"family AND vacation AND celebration",
			);

			expect(result.expandedTerms.length).toBeGreaterThan(5);
			expect(result.expandedTerms.length).toBeLessThan(50); // Reasonable limit
		});
	});
});
