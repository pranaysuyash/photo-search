/**
 * Smart Search Service
 * Integrates intent recognition with enhanced search capabilities
 */

import { apiSearch } from "../api";
import { SearchIntentRecognizer, type SearchIntent, type SearchFilters } from "./SearchIntentRecognizer";
import { searchHistoryService } from "./SearchHistoryService";
import { expandSynonyms } from "../utils/searchSynonyms";

export interface SmartSearchOptions {
	dir: string;
	query: string;
	engine: string;
	topK?: number;
	enableIntentRecognition?: boolean;
	enableQueryExpansion?: boolean;
	enableSmartFilters?: boolean;
	context?: {
		availableTags?: string[];
		availablePeople?: string[];
		availableLocations?: string[];
		availableCameras?: string[];
	};
}

export interface SmartSearchResult {
	originalQuery: string;
	processedQuery: string;
	intent?: SearchIntent;
	appliedFilters: SearchFilters;
	expandedQuery?: string;
	results: any[];
	searchId: string;
	processingTime: number;
	suggestions: string[];
	confidence: number;
}

export class SmartSearchService {
	private static readonly DEFAULT_OPTIONS = {
		enableIntentRecognition: true,
		enableQueryExpansion: true,
		enableSmartFilters: true,
		topK: 24,
	};

	/**
	 * Perform smart search with intent recognition and enhancement
	 */
	static async smartSearch(options: SmartSearchOptions): Promise<SmartSearchResult> {
		const startTime = Date.now();
		const {
			dir,
			query,
			engine,
			topK = this.DEFAULT_OPTIONS.topK,
			enableIntentRecognition = this.DEFAULT_OPTIONS.enableIntentRecognition,
			enableQueryExpansion = this.DEFAULT_OPTIONS.enableQueryExpansion,
			enableSmartFilters = this.DEFAULT_OPTIONS.enableSmartFilters,
			context = {},
		} = options;

		if (!query?.trim()) {
			throw new Error("Search query is required");
		}

		let intent: SearchIntent | undefined;
		let expandedQuery: string | undefined;
		let appliedFilters: SearchFilters = {};
		let processedQuery = query.trim();
		const suggestions: string[] = [];

		// Step 1: Recognize search intent
		if (enableIntentRecognition) {
			intent = SearchIntentRecognizer.recognizeIntent(processedQuery, {
				recentSearches: searchHistoryService.getHistory().slice(0, 5).map(h => h.query),
				...context,
			});

			// Add intent-based suggestions
			suggestions.push(...intent.suggestedQueries);

			// Apply smart filters based on intent
			if (enableSmartFilters && intent.filters) {
				appliedFilters = { ...appliedFilters, ...intent.filters };
			}
		}

		// Step 2: Apply query expansion
		if (enableQueryExpansion) {
			const expanded = expandSynonyms(processedQuery);
			if (expanded && expanded !== processedQuery) {
				expandedQuery = expanded;
				processedQuery = expanded;
			}
		}

		// Step 3: Apply any additional smart filters
		if (enableSmartFilters && intent) {
			const smartFilters = this.generateSmartFilters(processedQuery, intent);
			appliedFilters = { ...appliedFilters, ...smartFilters };
		}

		// Step 4: Execute search
		const searchResult = await apiSearch(dir, processedQuery, engine, topK, appliedFilters);

		const processingTime = Date.now() - startTime;

		// Step 5: Track search history with enhanced metadata
		searchHistoryService.addToHistory({
			query: query.trim(),
			resultCount: searchResult.results.length,
			timestamp: Date.now(),
			filters: appliedFilters,
		});

		// Step 6: Generate post-search suggestions
		const postSearchSuggestions = this.generatePostSearchSuggestions(
			processedQuery,
			searchResult.results,
			intent,
			context
		);
		suggestions.push(...postSearchSuggestions);

		return {
			originalQuery: query.trim(),
			processedQuery,
			intent,
			appliedFilters,
			expandedQuery,
			results: searchResult.results,
			searchId: searchResult.search_id,
			processingTime,
			suggestions: [...new Set(suggestions)], // Remove duplicates
			confidence: intent?.confidence || 0.5,
		};
	}

	/**
	 * Generate intelligent search suggestions based on results and context
	 */
	static generateSmartSuggestions(
		query: string,
		context?: {
			recentSearches?: string[];
			availableTags?: string[];
			availablePeople?: string[];
			availableLocations?: string[];
		}
	): string[] {
		const suggestions: string[] = [];

		// Get intent-based suggestions
		const intent = SearchIntentRecognizer.recognizeIntent(query, context);
		suggestions.push(...intent.suggestedQueries);

		// Add context-aware suggestions
		if (context?.availableTags?.length > 0) {
			const matchingTags = context.availableTags.filter(tag =>
				tag.toLowerCase().includes(query.toLowerCase())
			);
			suggestions.push(...matchingTags.slice(0, 3));
		}

		if (context?.availablePeople?.length > 0) {
			const matchingPeople = context.availablePeople.filter(person =>
				person.toLowerCase().includes(query.toLowerCase())
			);
			suggestions.push(...matchingPeople.slice(0, 2));
		}

		if (context?.availableLocations?.length > 0) {
			const matchingLocations = context.availableLocations.filter(location =>
				location.toLowerCase().includes(query.toLowerCase())
			);
			suggestions.push(...matchingLocations.slice(0, 2));
		}

		// Add popular searches
		const popularSearches = searchHistoryService.getPopularSearches(5);
		suggestions.push(...popularSearches);

		return [...new Set(suggestions)].slice(0, 8);
	}

	/**
	 * Generate smart filters based on intent and query
	 */
	private static generateSmartFilters(query: string, intent: SearchIntent): SearchFilters {
		const filters: SearchFilters = {};

		// Time-based filters
		if (intent.context.timeFrame) {
			switch (intent.context.timeFrame.type) {
				case "recent":
					filters.dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
						.toISOString().split('T')[0];
					break;
				case "specific":
					// Parse specific date logic would go here
					break;
				case "seasonal":
					// Add seasonal date ranges
					const currentYear = new Date().getFullYear();
					const season = intent.context.timeFrame.value;
					if (season === "summer") {
						filters.dateFrom = `${currentYear}-06-01`;
						filters.dateTo = `${currentYear}-08-31`;
					} else if (season === "winter") {
						filters.dateFrom = `${currentYear}-12-01`;
						filters.dateTo = `${currentYear}-02-28`;
					}
					break;
			}
		}

		// Location filters
		if (intent.context.location?.value) {
			filters.place = intent.context.location.value;
		}

		// Person filters
		if (intent.context.people?.value) {
			filters.person = intent.context.people.value;
		}

		// Quality filters
		if (intent.context.quality?.type === "professional") {
			filters.ratingMin = 4;
		} else if (intent.context.quality?.type === "favorite") {
			filters.favoritesOnly = true;
		}

		// Technical filters
		if (intent.context.technical?.camera) {
			filters.camera = intent.context.technical.camera;
		}

		// Mood-based filters (using tags)
		if (intent.context.mood?.valence === "positive") {
			filters.tags = [...(filters.tags || []), "happy", "joy", "celebration"];
		}

		return filters;
	}

	/**
	 * Generate suggestions after getting search results
	 */
	private static generatePostSearchSuggestions(
		query: string,
		results: any[],
		intent?: SearchIntent,
		context?: any
	): string[] {
		const suggestions: string[] = [];

		if (results.length === 0) {
			// No results - provide alternative suggestions
			suggestions.push(...this.getNoResultsSuggestions(query, intent, context));
		} else if (results.length < 5) {
			// Few results - suggest broadening the search
			suggestions.push(...this.getBroadeningSuggestions(query, intent));
		} else if (results.length > 20) {
			// Many results - suggest refining the search
			suggestions.push(...this.getRefiningSuggestions(query, intent, results));
		}

		// Add contextual suggestions based on results
		if (results.length > 0) {
			suggestions.push(...this.getResultBasedSuggestions(results, intent));
		}

		return suggestions;
	}

	/**
	 * Get suggestions when no results are found
	 */
	private static getNoResultsSuggestions(
		query: string,
		intent?: SearchIntent,
		context?: any
	): string[] {
		const suggestions: string[] = [];

		// General suggestions
		suggestions.push("recent photos", "favorite photos", "all photos");

		// Intent-based suggestions
		if (intent) {
			switch (intent.primary) {
				case "location":
					suggestions.push("home", "vacation", "outdoor photos");
					break;
				case "person":
					suggestions.push("family", "friends", "people");
					break;
				case "activity":
					suggestions.push("party", "celebration", "events");
					break;
				case "temporal":
					suggestions.push("today", "this week", "this month");
					break;
			}
		}

		// Spelling corrections
		const allTerms = [
			...(context?.availableTags || []),
			...(context?.availablePeople || []),
			...(context?.availableLocations || []),
		];

		// This would use the didYouMean function from searchSynonyms
		// For now, just add some common corrections
		const commonMisspellings: Record<string, string[]> = {
			"vacation": ["vacation", "holiday", "trip"],
			"family": ["family", "fam", "relatives"],
			"birthday": ["birthday", "bday", "b-day"],
		};

		for (const [correct, misspellings] of Object.entries(commonMisspellings)) {
			if (misspellings.some(misspelling => query.toLowerCase().includes(misspelling))) {
				suggestions.push(correct);
				break;
			}
		}

		return suggestions.slice(0, 5);
	}

	/**
	 * Get suggestions to broaden search when few results
	 */
	private static getBroadeningSuggestions(query: string, intent?: SearchIntent): string[] {
		const suggestions: string[] = [];

		// Remove specific terms
		const words = query.split(' ').filter(w => w.length > 2);
		if (words.length > 1) {
			// Suggest searches with fewer terms
			for (let i = 0; i < words.length; i++) {
				const broadened = words.filter((_, index) => index !== i).join(' ');
				if (broadened) {
					suggestions.push(broadened);
				}
			}
		}

		// Add general category suggestions
		if (intent) {
			switch (intent.primary) {
				case "specific":
					suggestions.push(words[0], "related photos");
					break;
				case "technical":
					suggestions.push("high quality photos", "professional photos");
					break;
				case "emotional":
					suggestions.push("happy photos", "beautiful moments");
					break;
			}
		}

		return suggestions.slice(0, 4);
	}

	/**
	 * Get suggestions to refine search when many results
	 */
	private static getRefiningSuggestions(
		query: string,
		intent?: SearchIntent,
		results?: any[]
	): string[] {
		const suggestions: string[] = [];

		// Add time-based refinements
		suggestions.push(`${query} from this week`, `${query} from this month`);

		// Add quality refinements
		suggestions.push(`best ${query}`, `favorite ${query}`);

		// Add intent-specific refinements
		if (intent) {
			switch (intent.primary) {
				case "discovery":
					suggestions.push(`${query} favorites`, `${query} high quality`);
					break;
				case "location":
					suggestions.push(`${query} sunset`, `${query} people`);
					break;
				case "activity":
					suggestions.push(`${query} with family`, `${query} celebration`);
					break;
			}
		}

		return suggestions.slice(0, 4);
	}

	/**
	 * Get suggestions based on actual search results
	 */
	private static getResultBasedSuggestions(results: any[], intent?: SearchIntent): string[] {
		const suggestions: string[] = [];

		// Extract common themes from results
		// This would analyze the actual results and suggest related terms
		// For now, provide some general suggestions

		if (results.length > 0) {
			suggestions.push("similar photos", "more like this");
		}

		return suggestions;
	}

	/**
	 * Get search analytics and insights
	 */
	static getSearchInsights(): {
		totalSearches: number;
		popularQueries: string[];
		averageResults: number;
		recentIntents: Array<{ intent: string; count: number }>;
	} {
		const history = searchHistoryService.getHistory();

		const popularQueries = searchHistoryService.getPopularSearches(5);
		const averageResults = history.length > 0
			? history.reduce((sum, entry) => sum + entry.resultCount, 0) / history.length
			: 0;

		// Analyze intent patterns from recent searches
		const intentCounts = new Map<string, number>();
		const recentSearches = history.slice(0, 20);

		for (const entry of recentSearches) {
			const intent = SearchIntentRecognizer.recognizeIntent(entry.query);
			intentCounts.set(intent.primary, (intentCounts.get(intent.primary) || 0) + 1);
		}

		const recentIntents = Array.from(intentCounts.entries())
			.map(([intent, count]) => ({ intent, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		return {
			totalSearches: history.length,
			popularQueries,
			averageResults: Math.round(averageResults),
			recentIntents,
		};
	}
}

export default SmartSearchService;