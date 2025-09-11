export interface SearchHistoryEntry {
	query: string;
	timestamp: number;
	resultCount: number;
	filters?: {
		tags?: string[];
		favOnly?: boolean;
		dateFrom?: number;
		dateTo?: number;
		person?: string;
		place?: string;
	};
}

export interface SearchSuggestion {
	query: string;
	type: "history" | "popular" | "similar";
	score: number;
	metadata?: {
		lastUsed?: number;
		useCount?: number;
	};
}

class SearchHistoryService {
	private readonly STORAGE_KEY = "photo_search_history";
	private readonly MAX_HISTORY_ENTRIES = 100;
	private readonly MAX_SUGGESTIONS = 20;

	// Get search history from localStorage
	getHistory(): SearchHistoryEntry[] {
		try {
			const stored = localStorage.getItem(this.STORAGE_KEY);
			if (!stored) return [];
			const parsed = JSON.parse(stored);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}

	// Add a search to history
	addToHistory(entry: SearchHistoryEntry): void {
		try {
			const history = this.getHistory();

			// Remove existing entry with same query (to update timestamp)
			const filtered = history.filter(
				(h) => h.query.toLowerCase() !== entry.query.toLowerCase(),
			);

			// Add new entry at the beginning
			filtered.unshift(entry);

			// Keep only recent entries
			const trimmed = filtered.slice(0, this.MAX_HISTORY_ENTRIES);

			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
		} catch (error) {
			console.warn("Failed to save search history:", error);
		}
	}

	// Get search suggestions based on input
	getSuggestions(input: string): SearchSuggestion[] {
		const query = input.toLowerCase().trim();
		if (!query) return this.getRecentSuggestions();

		const history = this.getHistory();
		const suggestions: SearchSuggestion[] = [];

		// Add history-based suggestions
		history.forEach((entry) => {
			if (entry.query.toLowerCase().includes(query)) {
				suggestions.push({
					query: entry.query,
					type: "history",
					score: this.calculateHistoryScore(entry, query),
					metadata: {
						lastUsed: entry.timestamp,
						useCount: this.getUseCount(entry.query),
					},
				});
			}
		});

		// Add similar query suggestions
		const similarQueries = this.generateSimilarQueries(query, history);
		similarQueries.forEach((similar) => {
			suggestions.push({
				query: similar,
				type: "similar",
				score: this.calculateSimilarityScore(query, similar),
			});
		});

		// Sort by score and limit results
		return suggestions
			.sort((a, b) => b.score - a.score)
			.slice(0, this.MAX_SUGGESTIONS);
	}

	// Get recent searches when no input
	getRecentSuggestions(): SearchSuggestion[] {
		const history = this.getHistory();
		return history.slice(0, 10).map((entry) => ({
			query: entry.query,
			type: "history" as const,
			score: this.calculateRecencyScore(entry),
			metadata: {
				lastUsed: entry.timestamp,
				useCount: this.getUseCount(entry.query),
			},
		}));
	}

	// Calculate score based on recency and frequency
	private calculateHistoryScore(
		entry: SearchHistoryEntry,
		query: string,
	): number {
		const recencyScore = this.calculateRecencyScore(entry);
		const frequencyScore = this.getUseCount(entry.query) / 10; // Normalize to 0-1 range
		const matchScore = this.calculateMatchScore(entry.query, query);

		return recencyScore * 0.3 + frequencyScore * 0.3 + matchScore * 0.4;
	}

	private calculateRecencyScore(entry: SearchHistoryEntry): number {
		const now = Date.now();
		const age = now - entry.timestamp;
		const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

		return Math.max(0, 1 - age / maxAge);
	}

	private calculateMatchScore(historyQuery: string, input: string): number {
		const lower1 = historyQuery.toLowerCase();
		const lower2 = input.toLowerCase();

		if (lower1 === lower2) return 1.0;
		if (lower1.startsWith(lower2)) return 0.9;
		if (lower1.includes(lower2)) return 0.7;

		// Simple word-based matching
		const words1 = lower1.split(/\s+/);
		const words2 = lower2.split(/\s+/);
		const commonWords = words1.filter((word) => words2.includes(word));

		return commonWords.length / Math.max(words1.length, words2.length);
	}

	private calculateSimilarityScore(query: string, similar: string): number {
		return this.calculateMatchScore(similar, query) * 0.6; // Lower than history matches
	}

	private getUseCount(query: string): number {
		const history = this.getHistory();
		return history.filter(
			(entry) => entry.query.toLowerCase() === query.toLowerCase(),
		).length;
	}

	private generateSimilarQueries(
		input: string,
		history: SearchHistoryEntry[],
	): string[] {
		// Generate similar queries based on common patterns
		const words = input.split(/\s+/);
		const similar: string[] = [];

		// Find queries with common words
		history.forEach((entry) => {
			const entryWords = entry.query.toLowerCase().split(/\s+/);
			const commonWords = words.filter((word) =>
				entryWords.some((entryWord) => entryWord.includes(word.toLowerCase())),
			);

			if (
				commonWords.length > 0 &&
				entry.query.toLowerCase() !== input.toLowerCase()
			) {
				similar.push(entry.query);
			}
		});

		return Array.from(new Set(similar)).slice(0, 5);
	}

	// Clear search history
	clearHistory(): void {
		try {
			localStorage.removeItem(this.STORAGE_KEY);
		} catch (error) {
			console.warn("Failed to clear search history:", error);
		}
	}

	// Get popular search terms
	getPopularSearches(limit: number = 10): string[] {
		const history = this.getHistory();
		const queryCount = new Map<string, number>();

		// Count occurrences of each query
		history.forEach((entry) => {
			const query = entry.query.toLowerCase();
			queryCount.set(query, (queryCount.get(query) || 0) + 1);
		});

		// Sort by count and return top queries
		return Array.from(queryCount.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, limit)
			.map(([query]) => query);
	}
}

export const searchHistoryService = new SearchHistoryService();
