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

export interface SearchHistoryConfig {
	STORAGE_KEY?: string;
	MAX_HISTORY_ENTRIES?: number;
	MAX_SUGGESTIONS?: number;
	DEBOUNCE_DELAY?: number;
	MAX_AGE_DAYS?: number;
	ENABLED?: boolean;
}

class SearchHistoryService {
	private readonly config: Required<SearchHistoryConfig>;
	private readonly defaultConfig: Required<SearchHistoryConfig> = {
		STORAGE_KEY: "photo_search_history",
		MAX_HISTORY_ENTRIES: 100,
		MAX_SUGGESTIONS: 20,
		DEBOUNCE_DELAY: 250,
		MAX_AGE_DAYS: 30,
		ENABLED: true,
	};

	constructor(config: SearchHistoryConfig = {}) {
		this.config = { ...this.defaultConfig, ...config };
	}

	// Get search history from localStorage
	getHistory(): SearchHistoryEntry[] {
		if (!this.config.ENABLED) return [];

		try {
			const stored = localStorage.getItem(this.config.STORAGE_KEY);
			if (!stored) return [];
			const parsed = JSON.parse(stored);
			return Array.isArray(parsed) ? parsed : [];
		} catch (error) {
			this.handleError("Failed to retrieve search history", error);
			return [];
		}
	}

	// Add a search to history
	addToHistory(entry: SearchHistoryEntry): void {
		if (!this.config.ENABLED) return;

		try {
			const history = this.getHistory();

			// Remove existing entry with same query (to update timestamp)
			const filtered = history.filter(
				(h) => h.query.toLowerCase() !== entry.query.toLowerCase(),
			);

			// Add new entry at the beginning
			filtered.unshift(entry);

			// Keep only recent entries
			const trimmed = filtered.slice(0, this.config.MAX_HISTORY_ENTRIES);

			localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(trimmed));
		} catch (error) {
			this.handleError("Failed to save search history", error);
		}
	}

	// Get search suggestions based on input
	getSuggestions(input: string): SearchSuggestion[] {
		if (!this.config.ENABLED) return [];

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
			.slice(0, this.config.MAX_SUGGESTIONS);
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
		const maxAge = this.config.MAX_AGE_DAYS * 24 * 60 * 60 * 1000; // Configurable max age in ms

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
		if (!this.config.ENABLED) return;

		try {
			localStorage.removeItem(this.config.STORAGE_KEY);
		} catch (error) {
			this.handleError("Failed to clear search history", error);
		}
	}

	// Get popular search terms
	getPopularSearches(limit: number = 10): string[] {
		if (!this.config.ENABLED) return [];

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

	// Improved error handling with centralized logging
	private handleError(message: string, error: unknown): void {
		// For now, use console.warn but this could be extended to use a logging service
		console.warn(`${message}:`, error);

		// Could be extended to send errors to a logging service
		// this.loggingService?.logError(message, error);
	}

	// Get service configuration (useful for debugging and privacy features)
	getConfig(): Readonly<Required<SearchHistoryConfig>> {
		return { ...this.config };
	}

	// Check if search history is enabled
	isEnabled(): boolean {
		return this.config.ENABLED;
	}

	// Get storage statistics for privacy awareness
	getStorageStats(): { totalEntries: number; totalSize: number } {
		if (!this.config.ENABLED) return { totalEntries: 0, totalSize: 0 };

		try {
			const history = this.getHistory();
			const data = JSON.stringify(history);
			return {
				totalEntries: history.length,
				totalSize: new Blob([data]).size,
			};
		} catch {
			return { totalEntries: 0, totalSize: 0 };
		}
	}
}

// Default instance with standard configuration
export const searchHistoryService = new SearchHistoryService();

// Factory function for creating configured instances
export function createSearchHistoryService(
	config: SearchHistoryConfig,
): SearchHistoryService {
	return new SearchHistoryService(config);
}
