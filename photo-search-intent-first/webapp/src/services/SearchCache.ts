/**
 * Search Performance Optimization
 * Query caching, suggestion history, and performance monitoring
 */

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	hits: number;
	query: string;
}

interface SearchSuggestion {
	query: string;
	frequency: number;
	lastUsed: number;
	results: number;
	category?: "recent" | "popular" | "ai-suggested";
}

interface PerformanceMetrics {
	cacheHitRate: number;
	averageResponseTime: number;
	totalQueries: number;
	cacheSize: number;
	cacheSizeBytes: number;
}

export class SearchCache {
	private static cache = new Map<string, CacheEntry<any>>();
	private static suggestions = new Map<string, SearchSuggestion>();
	private static queryHistory: string[] = [];
	private static metrics = {
		hits: 0,
		misses: 0,
		totalTime: 0,
		queries: 0,
	};

	// Configuration
	private static readonly MAX_CACHE_SIZE = 100; // entries
	private static readonly MAX_CACHE_AGE = 5 * 60 * 1000; // 5 minutes
	private static readonly MAX_SUGGESTIONS = 50;
	private static readonly MAX_HISTORY = 100;

	/**
	 * Get cached search results
	 */
	static get<T>(query: string): T | null {
		const key = SearchCache.getCacheKey(query);
		const entry = SearchCache.cache.get(key);

		if (!entry) {
			SearchCache.metrics.misses++;
			return null;
		}

		// Check if cache is still valid
		const age = Date.now() - entry.timestamp;
		if (age > SearchCache.MAX_CACHE_AGE) {
			SearchCache.cache.delete(key);
			SearchCache.metrics.misses++;
			return null;
		}

		// Update hit count and return data
		entry.hits++;
		SearchCache.metrics.hits++;
		return entry.data;
	}

	/**
	 * Store search results in cache
	 */
	static set<T>(query: string, data: T): void {
		const key = SearchCache.getCacheKey(query);

		// Implement LRU eviction if cache is full
		if (SearchCache.cache.size >= SearchCache.MAX_CACHE_SIZE) {
			SearchCache.evictOldest();
		}

		SearchCache.cache.set(key, {
			data,
			timestamp: Date.now(),
			hits: 0,
			query,
		});

		// Update search history and suggestions
		SearchCache.updateHistory(query);
		SearchCache.updateSuggestions(query, data);
	}

	/**
	 * Perform cached search with timing
	 */
	static async cachedSearch<T>(
		query: string,
		searchFn: () => Promise<T>,
	): Promise<{ data: T; cached: boolean; responseTime: number }> {
		const startTime = performance.now();

		// Try cache first
		const cached = SearchCache.get<T>(query);
		if (cached) {
			const responseTime = performance.now() - startTime;
			SearchCache.updateMetrics(responseTime);
			return { data: cached, cached: true, responseTime };
		}

		// Perform actual search
		const data = await searchFn();
		const responseTime = performance.now() - startTime;

		// Cache the results
		SearchCache.set(query, data);
		SearchCache.updateMetrics(responseTime);

		return { data, cached: false, responseTime };
	}

	/**
	 * Get search suggestions based on history and patterns
	 */
	static getSuggestions(
		prefix: string,
		limit: number = 10,
	): SearchSuggestion[] {
		const lowerPrefix = prefix.toLowerCase();
		const suggestions: SearchSuggestion[] = [];

		// Find matching suggestions
		for (const [query, suggestion] of SearchCache.suggestions) {
			if (query.toLowerCase().startsWith(lowerPrefix)) {
				suggestions.push(suggestion);
			}
		}

		// Sort by relevance (frequency * recency)
		suggestions.sort((a, b) => {
			const scoreA = a.frequency * (1 / (Date.now() - a.lastUsed + 1));
			const scoreB = b.frequency * (1 / (Date.now() - b.lastUsed + 1));
			return scoreB - scoreA;
		});

		return suggestions.slice(0, limit);
	}

	/**
	 * Get autocomplete suggestions with categories
	 */
	static getAutocomplete(prefix: string): {
		recent: string[];
		popular: string[];
		suggested: string[];
	} {
		const suggestions = SearchCache.getSuggestions(prefix, 20);

		return {
			recent: suggestions
				.filter((s) => s.category === "recent")
				.slice(0, 5)
				.map((s) => s.query),
			popular: suggestions
				.filter((s) => s.category === "popular")
				.slice(0, 5)
				.map((s) => s.query),
			suggested: suggestions
				.filter((s) => s.category === "ai-suggested")
				.slice(0, 5)
				.map((s) => s.query),
		};
	}

	/**
	 * Get performance metrics
	 */
	static getMetrics(): PerformanceMetrics {
		const hitRate =
			SearchCache.metrics.hits /
				(SearchCache.metrics.hits + SearchCache.metrics.misses) || 0;
		const avgResponseTime =
			SearchCache.metrics.totalTime / SearchCache.metrics.queries || 0;

		// Calculate cache size in bytes (rough estimate)
		let cacheBytes = 0;
		for (const entry of SearchCache.cache.values()) {
			cacheBytes += JSON.stringify(entry).length * 2; // UTF-16 chars
		}

		return {
			cacheHitRate: hitRate,
			averageResponseTime: avgResponseTime,
			totalQueries: SearchCache.metrics.queries,
			cacheSize: SearchCache.cache.size,
			cacheSizeBytes: cacheBytes,
		};
	}

	/**
	 * Clear cache and reset metrics
	 */
	static clear(): void {
		SearchCache.cache.clear();
		SearchCache.suggestions.clear();
		SearchCache.queryHistory = [];
		SearchCache.metrics = {
			hits: 0,
			misses: 0,
			totalTime: 0,
			queries: 0,
		};
	}

	/**
	 * Invalidate cache entries matching pattern
	 */
	static invalidate(pattern?: string): void {
		if (!pattern) {
			SearchCache.cache.clear();
			return;
		}

		const regex = new RegExp(pattern);
		for (const [key] of SearchCache.cache) {
			if (regex.test(key)) {
				SearchCache.cache.delete(key);
			}
		}
	}

	/**
	 * Preload cache with common queries
	 */
	static async preload(
		queries: string[],
		searchFn: (query: string) => Promise<any>,
	): Promise<void> {
		const promises = queries.map(async (query) => {
			const cached = SearchCache.get(query);
			if (!cached) {
				const data = await searchFn(query);
				SearchCache.set(query, data);
			}
		});

		await Promise.all(promises);
	}

	// Private helper methods

	private static getCacheKey(query: string): string {
		// Normalize query for consistent caching
		return query.toLowerCase().trim().replace(/\s+/g, " ");
	}

	private static evictOldest(): void {
		let oldestKey: string | null = null;
		let oldestTime = Date.now();

		// Find least recently used entry
		for (const [key, entry] of SearchCache.cache) {
			const lastAccess = entry.timestamp + entry.hits * 60000; // Boost for frequently accessed
			if (lastAccess < oldestTime) {
				oldestTime = lastAccess;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			SearchCache.cache.delete(oldestKey);
		}
	}

	private static updateHistory(query: string): void {
		// Remove if already in history
		const index = SearchCache.queryHistory.indexOf(query);
		if (index > -1) {
			SearchCache.queryHistory.splice(index, 1);
		}

		// Add to front
		SearchCache.queryHistory.unshift(query);

		// Trim history
		if (SearchCache.queryHistory.length > SearchCache.MAX_HISTORY) {
			SearchCache.queryHistory.pop();
		}
	}

	private static updateSuggestions(query: string, data: any): void {
		const existing = SearchCache.suggestions.get(query);

		if (existing) {
			existing.frequency++;
			existing.lastUsed = Date.now();
			existing.results = Array.isArray(data) ? data.length : 1;
		} else {
			SearchCache.suggestions.set(query, {
				query,
				frequency: 1,
				lastUsed: Date.now(),
				results: Array.isArray(data) ? data.length : 1,
				category: "recent",
			});
		}

		// Update categories based on frequency
		for (const [_q, suggestion] of SearchCache.suggestions) {
			if (suggestion.frequency > 10) {
				suggestion.category = "popular";
			} else if (Date.now() - suggestion.lastUsed < 3600000) {
				// 1 hour
				suggestion.category = "recent";
			}
		}

		// Trim suggestions
		if (SearchCache.suggestions.size > SearchCache.MAX_SUGGESTIONS) {
			// Remove least used
			const sorted = Array.from(SearchCache.suggestions.entries()).sort(
				(a, b) => a[1].frequency - b[1].frequency,
			);
			SearchCache.suggestions.delete(sorted[0][0]);
		}
	}

	private static updateMetrics(responseTime: number): void {
		SearchCache.metrics.queries++;
		SearchCache.metrics.totalTime += responseTime;
	}

	/**
	 * Export cache statistics for monitoring
	 */
	static exportStats(): {
		cacheEntries: Array<{ query: string; hits: number; age: number }>;
		topQueries: string[];
		performanceMetrics: PerformanceMetrics;
	} {
		const now = Date.now();
		const cacheEntries = Array.from(SearchCache.cache.entries()).map(
			([_key, entry]) => ({
				query: entry.query,
				hits: entry.hits,
				age: now - entry.timestamp,
			}),
		);

		const topQueries = Array.from(SearchCache.suggestions.entries())
			.sort((a, b) => b[1].frequency - a[1].frequency)
			.slice(0, 10)
			.map(([query]) => query);

		return {
			cacheEntries,
			topQueries,
			performanceMetrics: SearchCache.getMetrics(),
		};
	}
}
