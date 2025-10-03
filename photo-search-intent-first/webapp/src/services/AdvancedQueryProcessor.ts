// Advanced Query Processor for enhanced search understanding
// Supports boolean operators, negations, synonym expansion, and context awareness

interface ParsedQuery {
	original: string;
	terms: QueryTerm[];
	booleanExpression?: string;
	expandedTerms: string[];
	filters: SearchFilter[];
	intent: "simple" | "boolean" | "advanced" | "negative";
}

interface QueryTerm {
	text: string;
	type: "required" | "excluded" | "optional";
	weight: number;
	synonyms: string[];
	expanded: boolean;
}

interface SearchFilter {
	type: "date" | "location" | "tag" | "person" | "filetype";
	operator: "equals" | "contains" | "before" | "after" | "between";
	value: string | string[];
}

// Synonym database for common photo-related terms
const SYNONYM_DATABASE: Record<string, string[]> = {
	// Nature terms
	beach: ["shore", "coast", "seaside", "ocean", "sand", "waves"],
	sunset: ["dusk", "golden hour", "evening", "twilight", "sundown"],
	mountain: ["hills", "peak", "summit", "range", "highland"],
	forest: ["woods", "trees", "jungle", "grove", "woodland"],
	flower: ["bloom", "blossom", "floral", "petals", "garden"],

	// People terms
	family: ["relatives", "kin", "loved ones", "household"],
	friends: ["companions", "buddies", "pals", "mates"],
	children: ["kids", "youngsters", "youth", "little ones"],
	birthday: ["celebration", "party", "anniversary", "special day"],
	wedding: ["marriage", "ceremony", "reception", "nuptials"],

	// Activities
	vacation: ["holiday", "trip", "travel", "getaway", "journey"],
	dinner: ["meal", "feast", "supper", "eating", "food"],
	party: ["celebration", "gathering", "event", "festivity"],
	sports: ["game", "match", "competition", "athletics", "exercise"],
	cooking: ["preparing food", "making meal", "culinary", "kitchen"],

	// Descriptive terms
	beautiful: ["pretty", "gorgeous", "stunning", "lovely", "attractive"],
	old: ["vintage", "ancient", "aged", "historic", "classic"],
	new: ["recent", "fresh", "latest", "modern", "current"],
	big: ["large", "huge", "enormous", "massive", "giant"],
	small: ["tiny", "little", "mini", "compact", "petite"],
};

// Context patterns for query expansion
const CONTEXT_PATTERNS = [
	{
		pattern: /(\w+)\s+(with|and|plus)\s+(\w+)/i,
		expansion: "$1 AND $2 AND $3",
		intent: "combination",
	},
	{
		pattern: /(\w+)\s+(but|except|without)\s+(\w+)/i,
		expansion: "$1 NOT $3",
		intent: "exclusion",
	},
	{
		pattern: /(all|every)\s+(\w+)/i,
		expansion: "$2 AND comprehensive AND complete",
		intent: "comprehensive",
	},
	{
		pattern: /(\w+)\s+(or|or maybe)\s+(\w+)/i,
		expansion: "($1 OR $2 OR $3)",
		intent: "alternative",
	},
];

export class AdvancedQueryProcessor {
	private static instance: AdvancedQueryProcessor;

	public static getInstance(): AdvancedQueryProcessor {
		if (!AdvancedQueryProcessor.instance) {
			AdvancedQueryProcessor.instance = new AdvancedQueryProcessor();
		}
		return AdvancedQueryProcessor.instance;
	}

	/**
	 * Parse and enhance a user query with boolean operators and synonyms
	 */
	public processQuery(query: string): ParsedQuery {
		const normalized = query.toLowerCase().trim();

		// Parse boolean operators
		const parsed = this.parseBooleanOperators(normalized);

		// Extract filters
		const filters = this.extractFilters(normalized);

		// Determine query intent
		const intent = this.determineIntent(parsed, filters);

		// Expand terms with synonyms
		const expandedTerms = this.expandTerms(parsed.terms);

		return {
			original: query,
			terms: parsed.terms,
			booleanExpression: parsed.booleanExpression,
			expandedTerms,
			filters,
			intent,
		};
	}

	/**
	 * Parse boolean operators AND, OR, NOT
	 */
	private parseBooleanOperators(query: string): {
		terms: QueryTerm[];
		booleanExpression?: string;
	} {
		const terms: QueryTerm[] = [];
		const booleanExpression = query;

		// Handle NOT operators (negation)
		const notPattern =
			/\b(?:not|without|except|no|without)\s+([a-zA-Z0-9\s]+)/gi;
		const notMatches = [...query.matchAll(notPattern)];

		// Handle AND operators
		const andPattern = /\b(?:and|\+|&)\s+/gi;
		let processedQuery = query.replace(andPattern, " AND ");

		// Handle OR operators
		const orPattern = /\b(?:or|\||\|)\s+/gi;
		processedQuery = processedQuery.replace(orPattern, " OR ");

		// Extract individual terms and their types
		const termMatches = processedQuery.split(/\s+(?:AND|OR)\s+/gi);

		termMatches.forEach((term, index) => {
			const cleanTerm = term.replace(/^(?:NOT\s+)/i, "").trim();
			const isNegated = term.match(/^NOT\s+/i);

			if (cleanTerm) {
				terms.push({
					text: cleanTerm,
					type: isNegated ? "excluded" : "required",
					weight: 1.0,
					synonyms: [],
					expanded: false,
				});
			}
		});

		return {
			terms,
			booleanExpression: processedQuery !== query ? processedQuery : undefined,
		};
	}

	/**
	 * Extract specialized filters from query
	 */
	private extractFilters(query: string): SearchFilter[] {
		const filters: SearchFilter[] = [];

		// Date filters
		const datePatterns = [
			{
				pattern: /before\s+(\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i,
				operator: "before" as const,
			},
			{
				pattern: /after\s+(\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i,
				operator: "after" as const,
			},
			{
				pattern:
					/between\s+(\d{4}|\d{1,2}\/\d{1,2}\/\d{4})\s+and\s+(\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i,
				operator: "between" as const,
			},
		];

		datePatterns.forEach(({ pattern, operator }) => {
			const match = query.match(pattern);
			if (match) {
				filters.push({
					type: "date",
					operator,
					value: match.slice(1),
				});
			}
		});

		// Location filters
		const locationPattern = /(?:in|at|near)\s+([a-zA-Z\s]+)/i;
		const locationMatch = query.match(locationPattern);
		if (locationMatch) {
			filters.push({
				type: "location",
				operator: "contains",
				value: locationMatch[1].trim(),
			});
		}

		// Tag filters
		const tagPattern = /tagged\s+(?:as|with)\s+([a-zA-Z\s,]+)/i;
		const tagMatch = query.match(tagPattern);
		if (tagMatch) {
			filters.push({
				type: "tag",
				operator: "equals",
				value: tagMatch[1].split(",").map((t) => t.trim()),
			});
		}

		// File type filters
		const filetypePattern = /\.(jpg|jpeg|png|gif|bmp|tiff|raw|heic)$/i;
		const filetypeMatch = query.match(filetypePattern);
		if (filetypeMatch) {
			filters.push({
				type: "filetype",
				operator: "equals",
				value: filetypeMatch[1].toLowerCase(),
			});
		}

		return filters;
	}

	/**
	 * Determine query intent based on complexity
	 */
	private determineIntent(
		parsed: { terms: QueryTerm[]; booleanExpression?: string },
		filters: SearchFilter[],
	): "simple" | "boolean" | "advanced" | "negative" {
		const hasNegatives = parsed.terms.some((t) => t.type === "excluded");
		const hasBoolean = parsed.booleanExpression !== undefined;
		const hasFilters = filters.length > 0;
		const termCount = parsed.terms.length;

		if (hasNegatives && termCount <= 2) return "negative";
		if (hasBoolean || hasFilters) return "advanced";
		if (termCount > 1) return "boolean";
		return "simple";
	}

	/**
	 * Expand terms with synonyms and related concepts
	 */
	private expandTerms(terms: QueryTerm[]): string[] {
		const expanded: string[] = [];

		terms.forEach((term) => {
			expanded.push(term.text);

			// Add synonyms if available
			if (SYNONYM_DATABASE[term.text]) {
				const synonyms = SYNONYM_DATABASE[term.text];
				term.synonyms = synonyms;
				term.expanded = true;
				expanded.push(...synonyms.slice(0, 3)); // Limit to top 3 synonyms
			}

			// Add contextual expansions
			const contextualExpansions = this.getContextualExpansions(term.text);
			if (contextualExpansions.length > 0) {
				expanded.push(...contextualExpansions);
			}
		});

		return [...new Set(expanded)]; // Remove duplicates
	}

	/**
	 * Get contextual expansions based on common patterns
	 */
	private getContextualExpansions(term: string): string[] {
		const expansions: string[] = [];

		// Activity-based expansions
		if (term === "vacation" || term === "holiday") {
			expansions.push("travel", "trip", "journey", "adventure", "getaway");
		}

		if (term === "birthday" || term === "party") {
			expansions.push("celebration", "gathering", "festivity", "event");
		}

		// Time-based expansions
		if (term === "recent") {
			expansions.push("last week", "this month", "lately", "newly");
		}

		if (term === "old") {
			expansions.push("vintage", "classic", "historic", "ancient", "years ago");
		}

		// Quality-based expansions
		if (term === "beautiful" || term === "pretty") {
			expansions.push("stunning", "gorgeous", "lovely", "attractive", "nice");
		}

		return expansions;
	}

	/**
	 * Generate search suggestions based on current query
	 */
	public generateSuggestions(
		query: string,
		maxSuggestions: number = 5,
	): string[] {
		const suggestions: string[] = [];
		const processed = this.processQuery(query);

		// If query is simple, suggest boolean combinations
		if (processed.intent === "simple" && processed.terms.length === 1) {
			const term = processed.terms[0].text;

			// Suggest common additions
			suggestions.push(`${term} AND beautiful`);
			suggestions.push(`${term} AND recent`);
			suggestions.push(`${term} NOT blurry`);
			suggestions.push(`family AND ${term}`);
			suggestions.push(`${term} OR vacation`);
		}

		// If query has negations, suggest alternative terms
		if (processed.intent === "negative") {
			const positiveTerm = processed.terms.find(
				(t) => t.type === "required",
			)?.text;
			if (positiveTerm) {
				suggestions.push(positiveTerm.replace(/\b(not|without)\s+/i, ""));
				suggestions.push(`beautiful ${positiveTerm}`);
				suggestions.push(`recent ${positiveTerm}`);
			}
		}

		// Suggest filter additions
		if (processed.filters.length === 0) {
			suggestions.push(`${query} before 2023`);
			suggestions.push(`${query} tagged as favorite`);
			suggestions.push(`${query} in vacation photos`);
		}

		return suggestions.slice(0, maxSuggestions);
	}

	/**
	 * Explain how the query was interpreted
	 */
	public explainQuery(query: string): string {
		const processed = this.processQuery(query);
		const explanations: string[] = [];

		if (processed.booleanExpression) {
			explanations.push(
				`🔗 Using boolean operators: ${processed.booleanExpression}`,
			);
		}

		if (processed.filters.length > 0) {
			explanations.push(
				`🎯 Applied ${processed.filters.length} filter(s): ${processed.filters.map((f) => f.type).join(", ")}`,
			);
		}

		const expandedTerms = processed.terms.filter((t) => t.expanded);
		if (expandedTerms.length > 0) {
			explanations.push(
				`🔍 Expanded ${expandedTerms.length} term(s) with synonyms`,
			);
		}

		if (processed.expandedTerms.length > processed.terms.length) {
			explanations.push(
				`✨ Total search terms: ${processed.expandedTerms.length} (including synonyms)`,
			);
		}

		const intentDescriptions = {
			simple: "Simple keyword search",
			boolean: "Multi-term search with implicit AND",
			advanced: "Advanced search with explicit operators or filters",
			negative: "Search with exclusion terms",
		};

		explanations.push(
			`🎭 Query intent: ${intentDescriptions[processed.intent]}`,
		);

		return explanations.join("\n");
	}
}

// Export singleton instance
export const queryProcessor = AdvancedQueryProcessor.getInstance();
