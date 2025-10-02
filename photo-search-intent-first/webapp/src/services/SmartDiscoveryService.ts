/**
 * Smart Photo Discovery & Recommendation Engine
 * Provides intelligent photo discovery through multiple algorithms and user behavior analysis
 */

export interface DiscoveryOptions {
	userId?: string;
	limit?: number;
	includeViewed?: boolean;
	sessionId?: string;
	algorithm?: DiscoveryAlgorithm;
	context?: DiscoveryContext;
}

export interface DiscoveryContext {
	timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
	dayOfWeek?: 'weekday' | 'weekend';
	season?: 'spring' | 'summer' | 'fall' | 'winter';
	currentMood?: 'nostalgic' | 'creative' | 'organized' | 'exploratory';
	recentSearches?: string[];
	recentlyViewed?: string[];
	favoriteCategories?: string[];
}

export interface DiscoveryResult {
	id: string;
	path: string;
	thumbnail: string;
	score: number;
	reason: DiscoveryReason;
	metadata: PhotoMetadata;
	personalizedScore?: number;
	diversityScore?: number;
	serendipityScore?: number;
}

export interface PhotoMetadata {
	dateTaken?: string;
	location?: string;
	camera?: string;
	tags?: string[];
	people?: string[];
	description?: string;
	rating?: number;
	favorite?: boolean;
	viewCount?: number;
	lastViewed?: string;
	fileSize?: number;
	dimensions?: { width: number; height: number };
	colorProfile?: string;
	aiGenerated?: boolean;
}

export interface DiscoveryReason {
	type: DiscoveryReasonType;
	title: string;
	description: string;
	confidence: number;
	factors: string[];
}

export type DiscoveryReasonType =
	| 'similar_to_recently_viewed'
	| 'trending_in_library'
	| 'forgotten_gems'
	| 'diversity_fill'
	| 'time_based'
	| 'location_based'
	| 'people_based'
	| 'mood_based'
	| 'quality_highlights'
	| 'serendipity'
	| 'seasonal'
	| 'anniversary'
	| 'technical_excellence'
	| 'social_connections';

export type DiscoveryAlgorithm =
	| 'collaborative_filtering'
	| 'content_based'
	| 'hybrid'
	| 'serendipity'
	| 'time_decay'
	| 'diversity_focused'
	| 'quality_focused'
	| 'context_aware';

export interface DiscoveryPatterns {
	morningPatterns: string[];
	weekendPatterns: string[];
	seasonalPatterns: Record<string, string[]>;
	moodPatterns: Record<string, string[]>;
}

export interface UserBehavior {
	viewHistory: Array<{
		photoId: string;
		timestamp: string;
		duration: number;
		action: 'view' | 'favorite' | 'share' | 'edit';
	}>;
	searchHistory: Array<{
		query: string;
		timestamp: string;
		resultsCount: number;
		clickedResults: string[];
	}>;
	preferences: {
		favoritePeople: string[];
		favoriteLocations: string[];
		favoriteTags: string[];
		preferredTimeRanges: string[];
		qualityPreferences: string[];
	};
}

export interface DiscoveryInsights {
	totalPhotos: number;
	discoveredPhotos: number;
	categoriesCovered: string[];
	timeRangeCovered: { start: string; end: string };
	diversityScore: number;
	serendipityScore: number;
	personalizationScore: number;
	userEngagementPrediction: number;
}

/**
 * Main Smart Discovery Service
 */
export class SmartDiscoveryService {
	private static instance: SmartDiscoveryService;
	private userBehavior: Map<string, UserBehavior> = new Map();
	private discoveryCache: Map<string, { results: DiscoveryResult[]; timestamp: number }> = new Map();
	private patterns: DiscoveryPatterns;

	private constructor() {
		this.patterns = this.initializeDiscoveryPatterns();
		this.loadPersistedBehavior();
	}

	static getInstance(): SmartDiscoveryService {
		if (!SmartDiscoveryService.instance) {
			SmartDiscoveryService.instance = new SmartDiscoveryService();
		}
		return SmartDiscoveryService.instance;
	}

	/**
	 * Get personalized photo recommendations
	 */
	async getRecommendations(
		options: DiscoveryOptions = {}
	): Promise<DiscoveryResult[]> {
		const {
			userId = 'default',
			limit = 20,
			includeViewed = false,
			sessionId = 'default',
			algorithm = 'hybrid',
			context = this.getCurrentContext()
		} = options;

		// Check cache first
		const cacheKey = `${userId}-${sessionId}-${algorithm}-${limit}-${JSON.stringify(context)}`;
		const cached = this.discoveryCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
			return cached.results;
		}

		try {
			// Get user behavior data
			const userBehavior = this.getUserBehavior(userId);

			// Generate recommendations based on algorithm
			let results: DiscoveryResult[] = [];

			switch (algorithm) {
				case 'collaborative_filtering':
					results = await this.getCollaborativeFilteringRecommendations(userBehavior, context, limit);
					break;
				case 'content_based':
					results = await this.getContentBasedRecommendations(userBehavior, context, limit);
					break;
				case 'serendipity':
					results = await this.getSerendipityRecommendations(userBehavior, context, limit);
					break;
				case 'time_decay':
					results = await this.getTimeBasedRecommendations(userBehavior, context, limit);
					break;
				case 'diversity_focused':
					results = await this.getDiversityFocusedRecommendations(userBehavior, context, limit);
					break;
				case 'quality_focused':
					results = await this.getQualityFocusedRecommendations(userBehavior, context, limit);
					break;
				case 'context_aware':
					results = await this.getContextAwareRecommendations(userBehavior, context, limit);
					break;
				case 'hybrid':
				default:
					results = await this.getHybridRecommendations(userBehavior, context, limit);
					break;
			}

			// Filter out recently viewed if requested
			if (!includeViewed && userBehavior.viewHistory.length > 0) {
				const recentlyViewedIds = new Set(
					userBehavior.viewHistory
						.slice(-20) // Last 20 views
						.map(view => view.photoId)
				);
				results = results.filter(result => !recentlyViewedIds.has(result.id));
			}

			// Sort by final score and limit
			results = results
				.sort((a, b) => b.score - a.score)
				.slice(0, limit);

			// Cache results
			this.discoveryCache.set(cacheKey, {
				results,
				timestamp: Date.now()
			});

			// Schedule cleanup of old cache entries
			this.scheduleCacheCleanup();

			return results;

		} catch (error) {
			console.error('Failed to get recommendations:', error);
			return this.getFallbackRecommendations(limit);
		}
	}

	/**
	 * Get trending photos in the library
	 */
	async getTrendingPhotos(limit: number = 10): Promise<DiscoveryResult[]> {
		try {
			// This would connect to the backend API
			const response = await fetch('/api/discovery/trending', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ limit })
			});

			if (!response.ok) {
				throw new Error('Failed to fetch trending photos');
			}

			const data = await response.json();
			return data.photos.map((photo: any) => ({
				...photo,
				reason: {
					type: 'trending_in_library' as DiscoveryReasonType,
					title: 'Trending in Your Library',
					description: 'Popular photos based on recent activity and similar users',
					confidence: photo.trendingScore || 0.8,
					factors: ['High engagement', 'Recent views', 'Similar user interest']
				}
			}));

		} catch (error) {
			console.error('Failed to get trending photos:', error);
			return [];
		}
	}

	/**
	 * Get forgotten gems - photos not viewed recently but highly rated
	 */
	async getForgottenGems(limit: number = 10): Promise<DiscoveryResult[]> {
		try {
			const response = await fetch('/api/discovery/forgotten-gems', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ limit })
			});

			if (!response.ok) {
				throw new Error('Failed to fetch forgotten gems');
			}

			const data = await response.json();
			return data.photos.map((photo: any) => ({
				...photo,
				reason: {
					type: 'forgotten_gems' as DiscoveryReasonType,
					title: 'Hidden Gems',
					description: 'Beautiful photos you haven\'t seen in a while',
					confidence: photo.gemScore || 0.7,
					factors: ['High quality', 'Not viewed recently', 'High rating']
				}
			}));

		} catch (error) {
			console.error('Failed to get forgotten gems:', error);
			return [];
		}
	}

	/**
	 * Get time-based recommendations (anniversaries, seasonal, etc.)
	 */
	async getTimeBasedRecommendations(limit: number = 10): Promise<DiscoveryResult[]> {
		const now = new Date();
		const context = this.getCurrentContext();

		try {
			const response = await fetch('/api/discovery/time-based', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					limit,
					context: {
						currentDate: now.toISOString(),
						season: context.season,
						dayOfWeek: context.dayOfWeek,
						timeOfDay: context.timeOfDay
					}
				})
			});

			if (!response.ok) {
				throw new Error('Failed to fetch time-based recommendations');
			}

			const data = await response.json();
			return data.photos.map((photo: any) => ({
				...photo,
				reason: {
					type: 'time_based' as DiscoveryReasonType,
					title: photo.reasonTitle || 'Perfect Timing',
					description: photo.reasonDescription || 'Photos from this time in previous years',
					confidence: photo.timeScore || 0.6,
					factors: photo.factors || ['Seasonal relevance', 'Anniversary', 'Time patterns']
				}
			}));

		} catch (error) {
			console.error('Failed to get time-based recommendations:', error);
			return [];
		}
	}

	/**
	 * Record user interaction with a photo
	 */
	recordInteraction(
		photoId: string,
		action: 'view' | 'favorite' | 'share' | 'edit',
		duration: number = 0,
		userId: string = 'default'
	): void {
		const userBehavior = this.getUserBehavior(userId);

		userBehavior.viewHistory.push({
			photoId,
			timestamp: new Date().toISOString(),
			duration,
			action
		});

		// Keep only last 500 interactions
		if (userBehavior.viewHistory.length > 500) {
			userBehavior.viewHistory = userBehavior.viewHistory.slice(-500);
		}

		this.persistUserBehavior(userId);
	}

	/**
	 * Record search interaction
	 */
	recordSearch(
		query: string,
		resultsCount: number,
		clickedResults: string[] = [],
		userId: string = 'default'
	): void {
		const userBehavior = this.getUserBehavior(userId);

		userBehavior.searchHistory.push({
			query,
			timestamp: new Date().toISOString(),
			resultsCount,
			clickedResults
		});

		// Keep only last 200 searches
		if (userBehavior.searchHistory.length > 200) {
			userBehavior.searchHistory = userBehavior.searchHistory.slice(-200);
		}

		this.persistUserBehavior(userId);
	}

	/**
	 * Get discovery insights and analytics
	 */
	async getDiscoveryInsights(userId: string = 'default'): Promise<DiscoveryInsights> {
		const userBehavior = this.getUserBehavior(userId);

		// Calculate insights from user behavior
		const viewedPhotos = new Set(userBehavior.viewHistory.map(v => v.photoId));
		const uniqueLocations = new Set<string>();
		const uniquePeople = new Set<string>();
		const dateRange = { start: '', end: '' };

		// This would normally fetch from backend
		const totalPhotos = 1000; // placeholder

		return {
			totalPhotos,
			discoveredPhotos: viewedPhotos.size,
			categoriesCovered: Array.from(new Set(userBehavior.preferences.favoriteTags)),
			timeRangeCovered: dateRange,
			diversityScore: this.calculateDiversityScore(userBehavior),
			serendipityScore: this.calculateSerendipityScore(userBehavior),
			personalizationScore: this.calculatePersonalizationScore(userBehavior),
			userEngagementPrediction: this.predictEngagement(userBehavior)
		};
	}

	// Private helper methods

	private getUserBehavior(userId: string): UserBehavior {
		if (!this.userBehavior.has(userId)) {
			this.userBehavior.set(userId, {
				viewHistory: [],
				searchHistory: [],
				preferences: {
					favoritePeople: [],
					favoriteLocations: [],
					favoriteTags: [],
					preferredTimeRanges: [],
					qualityPreferences: []
				}
			});
		}
		return this.userBehavior.get(userId)!;
	}

	private getCurrentContext(): DiscoveryContext {
		const now = new Date();
		const dayOfWeek = now.getDay() >= 6 ? 'weekend' : 'weekday';
		const hour = now.getHours();
		let timeOfDay: DiscoveryContext['timeOfDay'];

		if (hour >= 5 && hour < 12) timeOfDay = 'morning';
		else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
		else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
		else timeOfDay = 'night';

		const month = now.getMonth();
		let season: DiscoveryContext['season'];
		if (month >= 2 && month <= 4) season = 'spring';
		else if (month >= 5 && month <= 7) season = 'summer';
		else if (month >= 8 && month <= 10) season = 'fall';
		else season = 'winter';

		return {
			timeOfDay,
			dayOfWeek,
			season,
			recentSearches: [],
			recentlyViewed: [],
			favoriteCategories: []
		};
	}

	private async getHybridRecommendations(
		userBehavior: UserBehavior,
		context: DiscoveryContext,
		limit: number
	): Promise<DiscoveryResult[]> {
		const allResults: DiscoveryResult[] = [];

		// Mix different recommendation strategies
		const [contentBased, collaborative, serendipity, timeBased] = await Promise.all([
			this.getContentBasedRecommendations(userBehavior, context, Math.floor(limit * 0.3)),
			this.getCollaborativeFilteringRecommendations(userBehavior, context, Math.floor(limit * 0.25)),
			this.getSerendipityRecommendations(userBehavior, context, Math.floor(limit * 0.25)),
			this.getTimeBasedRecommendations(userBehavior, context, Math.floor(limit * 0.2))
		]);

		allResults.push(...contentBased, ...collaborative, ...serendipity, ...timeBased);

		// Remove duplicates and balance the mix
		const uniqueResults = this.deduplicateAndBalance(allResults, limit);

		return uniqueResults;
	}

	private async getContentBasedRecommendations(
		userBehavior: UserBehavior,
		context: DiscoveryContext,
		limit: number
	): Promise<DiscoveryResult[]> {
		// Analyze user's recent views and preferences
		const recentPhotos = userBehavior.viewHistory.slice(-10);
		const preferences = userBehavior.preferences;

		try {
			const response = await fetch('/api/discovery/content-based', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					recentPhotos: recentPhotos.map(v => v.photoId),
					preferences,
					context,
					limit
				})
			});

			if (!response.ok) {
				throw new Error('Failed to fetch content-based recommendations');
			}

			const data = await response.json();
			return data.photos.map((photo: any) => ({
				...photo,
				reason: {
					type: 'similar_to_recently_viewed' as DiscoveryReasonType,
					title: 'Similar to Your Recent Views',
					description: 'Photos similar to what you\'ve been looking at',
					confidence: photo.similarityScore || 0.7,
					factors: ['Visual similarity', 'Recent viewing history', 'Content patterns']
				}
			}));

		} catch (error) {
			console.error('Failed to get content-based recommendations:', error);
			return [];
		}
	}

	private async getCollaborativeFilteringRecommendations(
		userBehavior: UserBehavior,
		context: DiscoveryContext,
		limit: number
	): Promise<DiscoveryResult[]> {
		// This would use collaborative filtering algorithms
		// For now, return trending as a placeholder
		return this.getTrendingPhotos(limit);
	}

	private async getSerendipityRecommendations(
		userBehavior: UserBehavior,
		context: DiscoveryContext,
		limit: number
	): Promise<DiscoveryResult[]> {
		try {
			const response = await fetch('/api/discovery/serendipity', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userHistory: userBehavior.viewHistory.slice(-20),
					context,
					limit
				})
			});

			if (!response.ok) {
				throw new Error('Failed to fetch serendipity recommendations');
			}

			const data = await response.json();
			return data.photos.map((photo: any) => ({
				...photo,
				reason: {
					type: 'serendipity' as DiscoveryReasonType,
					title: 'Discover Something New',
					description: 'Unexpected photos that might surprise and delight you',
					confidence: photo.serendipityScore || 0.6,
					factors: ['Unexpected connections', 'Novel content', 'Discovery potential']
				}
			}));

		} catch (error) {
			console.error('Failed to get serendipity recommendations:', error);
			return [];
		}
	}

	private async getDiversityFocusedRecommendations(
		userBehavior: UserBehavior,
		context: DiscoveryContext,
		limit: number
	): Promise<DiscoveryResult[]> {
		// Ensure diverse recommendations across time, location, people, etc.
		const allResults = await Promise.all([
			this.getTimeBasedRecommendations(Math.floor(limit * 0.3)),
			this.getForgottenGems(Math.floor(limit * 0.3)),
			this.getTrendingPhotos(Math.floor(limit * 0.4))
		]);

		return this.balanceByDiversity(allResults.flat(), limit);
	}

	private async getQualityFocusedRecommendations(
		userBehavior: UserBehavior,
		context: DiscoveryContext,
		limit: number
	): Promise<DiscoveryResult[]> {
		try {
			const response = await fetch('/api/discovery/quality-focused', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ limit })
			});

			if (!response.ok) {
				throw new Error('Failed to fetch quality-focused recommendations');
			}

			const data = await response.json();
			return data.photos.map((photo: any) => ({
				...photo,
				reason: {
					type: 'quality_highlights' as DiscoveryReasonType,
					title: 'Technical Excellence',
					description: 'Outstanding photos with exceptional technical qualities',
					confidence: photo.qualityScore || 0.8,
					factors: ['High resolution', 'Great composition', 'Technical excellence']
				}
			}));

		} catch (error) {
			console.error('Failed to get quality-focused recommendations:', error);
			return [];
		}
	}

	private async getContextAwareRecommendations(
		userBehavior: UserBehavior,
		context: DiscoveryContext,
		limit: number
	): Promise<DiscoveryResult[]> {
		const recommendations: DiscoveryResult[] = [];

		// Add time-based recommendations
		const timeRecs = await this.getTimeBasedRecommendations(Math.floor(limit * 0.4));
		recommendations.push(...timeRecs);

		// Add mood-based recommendations if mood is set
		if (context.currentMood) {
			const moodRecs = await this.getMoodBasedRecommendations(context.currentMood, Math.floor(limit * 0.3));
			recommendations.push(...moodRecs);
		}

		// Fill remaining with diverse content
		const remaining = limit - recommendations.length;
		if (remaining > 0) {
			const diverseRecs = await this.getDiversityFocusedRecommendations(userBehavior, context, remaining);
			recommendations.push(...diverseRecs);
		}

		return recommendations.slice(0, limit);
	}

	private async getMoodBasedRecommendations(
		mood: DiscoveryContext['currentMood'],
		limit: number
	): Promise<DiscoveryResult[]> {
		try {
			const response = await fetch('/api/discovery/mood-based', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mood, limit })
			});

			if (!response.ok) {
				throw new Error('Failed to fetch mood-based recommendations');
			}

			const data = await response.json();
			return data.photos.map((photo: any) => ({
				...photo,
				reason: {
					type: 'mood_based' as DiscoveryReasonType,
					title: `${mood?.charAt(0).toUpperCase()}${mood?.slice(1)} Vibes`,
					description: `Photos that match your ${mood} mood`,
					confidence: photo.moodScore || 0.6,
					factors: ['Mood alignment', 'Emotional content', 'Atmosphere']
				}
			}));

		} catch (error) {
			console.error('Failed to get mood-based recommendations:', error);
			return [];
		}
	}

	private getFallbackRecommendations(limit: number): DiscoveryResult[] {
		// Return basic recommendations when all else fails
		return [];
	}

	private deduplicateAndBalance(results: DiscoveryResult[], limit: number): DiscoveryResult[] {
		const seen = new Set<string>();
		const deduplicated: DiscoveryResult[] = [];

		for (const result of results) {
			if (!seen.has(result.id)) {
				seen.add(result.id);
				deduplicated.push(result);
			}
		}

		return deduplicated.slice(0, limit);
	}

	private balanceByDiversity(results: DiscoveryResult[], limit: number): DiscoveryResult[] {
		// Sort by diversity score and ensure variety
		return results
			.sort((a, b) => (b.diversityScore || 0) - (a.diversityScore || 0))
			.slice(0, limit);
	}

	private initializeDiscoveryPatterns(): DiscoveryPatterns {
		return {
			morningPatterns: ['sunrise', 'breakfast', 'coffee', 'nature', 'morning light'],
			weekendPatterns: ['family', 'friends', 'relaxation', 'activities', 'outings'],
			seasonalPatterns: {
				spring: ['flowers', 'blossoms', 'green', 'outdoor', 'renewal'],
				summer: ['beach', 'vacation', 'sunny', 'outdoor', 'travel'],
				fall: ['autumn', 'leaves', 'warm', 'cozy', 'harvest'],
				winter: ['snow', 'holiday', 'indoor', 'warm', 'celebration']
			},
			moodPatterns: {
				nostalgic: ['family', 'childhood', 'memories', 'old photos', 'history'],
				creative: ['artistic', 'unique', 'colorful', 'abstract', 'inspiring'],
				organized: ['clean', 'structured', 'groups', 'collections', 'sorted'],
				exploratory: ['new', 'unseen', 'different', 'variety', 'discovery']
			}
		};
	}

	private calculateDiversityScore(userBehavior: UserBehavior): number {
		// Calculate how diverse user's interests are
		const uniqueTags = new Set(userBehavior.preferences.favoriteTags).size;
		const uniquePeople = new Set(userBehavior.preferences.favoritePeople).size;
		const uniqueLocations = new Set(userBehavior.preferences.favoriteLocations).size;

		return Math.min(1, (uniqueTags + uniquePeople + uniqueLocations) / 15);
	}

	private calculateSerendipityScore(userBehavior: UserBehavior): number {
		// Calculate how open user is to discoveries
		const recentViews = userBehavior.viewHistory.slice(-20);
		const uniqueCategories = new Set(recentViews.map(v => v.photoId).slice(0, -5)).size;

		return Math.min(1, uniqueCategories / 10);
	}

	private calculatePersonalizationScore(userBehavior: UserBehavior): number {
		// Calculate how well we understand the user
		const totalInteractions = userBehavior.viewHistory.length + userBehavior.searchHistory.length;
		return Math.min(1, totalInteractions / 100);
	}

	private predictEngagement(userBehavior: UserBehavior): number {
		// Predict likely engagement based on patterns
		const recentActivity = userBehavior.viewHistory.slice(-10);
		if (recentActivity.length === 0) return 0.5;

		const avgDuration = recentActivity.reduce((sum, v) => sum + v.duration, 0) / recentActivity.length;
		const favorites = recentActivity.filter(v => v.action === 'favorite').length;

		return Math.min(1, (avgDuration / 30000 + favorites / recentActivity.length) / 2);
	}

	private persistUserBehavior(userId: string): void {
		try {
			const behavior = this.userBehavior.get(userId);
			if (behavior) {
				localStorage.setItem(`discovery-behavior-${userId}`, JSON.stringify(behavior));
			}
		} catch (error) {
			console.error('Failed to persist user behavior:', error);
		}
	}

	private loadPersistedBehavior(): void {
		try {
			const keys = Object.keys(localStorage).filter(key => key.startsWith('discovery-behavior-'));
			keys.forEach(key => {
				const userId = key.replace('discovery-behavior-', '');
				const data = localStorage.getItem(key);
				if (data) {
					this.userBehavior.set(userId, JSON.parse(data));
				}
			});
		} catch (error) {
			console.error('Failed to load persisted behavior:', error);
		}
	}

	private scheduleCacheCleanup(): void {
		// Clean up old cache entries periodically
		setTimeout(() => {
			const now = Date.now();
			for (const [key, value] of this.discoveryCache.entries()) {
				if (now - value.timestamp > 10 * 60 * 1000) { // 10 minutes
					this.discoveryCache.delete(key);
				}
			}
		}, 60 * 1000); // Check every minute
	}
}

export default SmartDiscoveryService;