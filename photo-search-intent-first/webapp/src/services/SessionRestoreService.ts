/**
 * Enhanced Session Restore Service
 *
 * Provides comprehensive session state persistence and restoration
 * for improved user experience across browser sessions.
 */

import type {
	ResultView,
	TimelineBucket,
} from "../contexts/ResultsConfigContext";

export type SessionState = {
	// View preferences
	viewPreferences: {
		resultView?: ResultView;
		timelineBucket?: TimelineBucket;
		gridSize?: "small" | "medium" | "large";
	};

	// Navigation state
	navigation: {
		currentView?: string;
		lastVisitedViews?: string[];
		viewHistory?: Array<{
			view: string;
			timestamp: number;
			searchQuery?: string;
		}>;
	};

	// Search state
	search: {
		lastSearchQuery?: string;
		recentSearches?: Array<{
			query: string;
			timestamp: number;
			resultCount?: number;
		}>;
		activeFilters?: {
			favOnly?: boolean;
			tagFilter?: string;
			place?: string;
			camera?: string;
			dateFrom?: string;
			dateTo?: string;
			ratingMin?: number;
		};
	};

	// UI state
	ui: {
		selectedPhotos?: string[];
		sidebarState?: {
			showFilters?: boolean;
			showRecentActivity?: boolean;
			showSearchHistory?: boolean;
		};
		modalStates?: {
			lastOpenModal?: string;
			onboardingCompleted?: boolean;
		};
	};

	// Library state
	library: {
		lastAccessedDirectory?: string;
		preferredEngine?: string;
		scrollPositions?: Record<string, number>;
	};

	// Timestamps
	timestamps: {
		lastSession?: number;
		lastActivity?: number;
		sessionDuration?: number;
	};
};

const STORAGE_KEY = "photo-session-state-v2";
const MAX_RECENT_SEARCHES = 10;
const MAX_VIEW_HISTORY = 20;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Sanitization helpers
const RESULT_VIEW_VALUES: ResultView[] = ["grid", "film", "timeline", "map"];
const TIMELINE_BUCKET_VALUES: TimelineBucket[] = ["day", "week", "month"];
const GRID_SIZE_VALUES = ["small", "medium", "large"] as const;
const VALID_VIEWS = [
	"results",
	"library",
	"people",
	"map",
	"collections",
	"smart",
	"trips",
	"saved",
	"memories",
	"tasks",
	"videos",
];

const isBrowser = typeof window !== "undefined";

function sanitizeSessionState(raw: unknown): Partial<SessionState> {
	if (!raw || typeof raw !== "object") return {};

	try {
		const state = raw as Partial<SessionState>;
		const sanitized: Partial<SessionState> = {};

		// Sanitize view preferences
		if (state.viewPreferences && typeof state.viewPreferences === "object") {
			const prefs = state.viewPreferences;
			const viewPrefs: SessionState["viewPreferences"] = {};

			if (prefs.resultView && RESULT_VIEW_VALUES.includes(prefs.resultView)) {
				viewPrefs.resultView = prefs.resultView;
			}
			if (
				prefs.timelineBucket &&
				TIMELINE_BUCKET_VALUES.includes(prefs.timelineBucket)
			) {
				viewPrefs.timelineBucket = prefs.timelineBucket;
			}
			if (prefs.gridSize && GRID_SIZE_VALUES.includes(prefs.gridSize)) {
				viewPrefs.gridSize = prefs.gridSize;
			}

			if (Object.keys(viewPrefs).length > 0) {
				sanitized.viewPreferences = viewPrefs;
			}
		}

		// Sanitize navigation state
		if (state.navigation && typeof state.navigation === "object") {
			const nav = state.navigation;
			const navigation: SessionState["navigation"] = {};

			if (
				nav.currentView &&
				typeof nav.currentView === "string" &&
				VALID_VIEWS.includes(nav.currentView)
			) {
				navigation.currentView = nav.currentView;
			}

			if (Array.isArray(nav.lastVisitedViews)) {
				navigation.lastVisitedViews = nav.lastVisitedViews
					.filter((v) => typeof v === "string" && VALID_VIEWS.includes(v))
					.slice(0, 10);
			}

			if (Array.isArray(nav.viewHistory)) {
				navigation.viewHistory = nav.viewHistory
					.filter(
						(item) =>
							item &&
							typeof item === "object" &&
							typeof item.view === "string" &&
							VALID_VIEWS.includes(item.view) &&
							typeof item.timestamp === "number" &&
							item.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000, // Only last 7 days
					)
					.sort((a, b) => b.timestamp - a.timestamp)
					.slice(0, MAX_VIEW_HISTORY);
			}

			if (Object.keys(navigation).length > 0) {
				sanitized.navigation = navigation;
			}
		}

		// Sanitize search state
		if (state.search && typeof state.search === "object") {
			const search = state.search;
			const searchState: SessionState["search"] = {};

			if (
				search.lastSearchQuery &&
				typeof search.lastSearchQuery === "string" &&
				search.lastSearchQuery.trim()
			) {
				searchState.lastSearchQuery = search.lastSearchQuery.trim();
			}

			if (Array.isArray(search.recentSearches)) {
				searchState.recentSearches = search.recentSearches
					.filter(
						(item) =>
							item &&
							typeof item === "object" &&
							typeof item.query === "string" &&
							item.query.trim() &&
							typeof item.timestamp === "number" &&
							item.timestamp > Date.now() - 30 * 24 * 60 * 60 * 1000, // Only last 30 days
					)
					.sort((a, b) => b.timestamp - a.timestamp)
					.slice(0, MAX_RECENT_SEARCHES);
			}

			if (search.activeFilters && typeof search.activeFilters === "object") {
				const filters = search.activeFilters;
				const activeFilters: SessionState["search"]["activeFilters"] = {};

				if (typeof filters.favOnly === "boolean") {
					activeFilters.favOnly = filters.favOnly;
				}
				if (typeof filters.tagFilter === "string" && filters.tagFilter.trim()) {
					activeFilters.tagFilter = filters.tagFilter.trim();
				}
				if (typeof filters.place === "string" && filters.place.trim()) {
					activeFilters.place = filters.place.trim();
				}
				if (typeof filters.camera === "string" && filters.camera.trim()) {
					activeFilters.camera = filters.camera.trim();
				}
				if (typeof filters.dateFrom === "string" && filters.dateFrom.trim()) {
					activeFilters.dateFrom = filters.dateFrom.trim();
				}
				if (typeof filters.dateTo === "string" && filters.dateTo.trim()) {
					activeFilters.dateTo = filters.dateTo.trim();
				}
				if (
					typeof filters.ratingMin === "number" &&
					filters.ratingMin >= 0 &&
					filters.ratingMin <= 5
				) {
					activeFilters.ratingMin = filters.ratingMin;
				}

				if (Object.keys(activeFilters).length > 0) {
					searchState.activeFilters = activeFilters;
				}
			}

			if (Object.keys(searchState).length > 0) {
				sanitized.search = searchState;
			}
		}

		// Sanitize UI state
		if (state.ui && typeof state.ui === "object") {
			const ui = state.ui;
			const uiState: SessionState["ui"] = {};

			if (Array.isArray(ui.selectedPhotos)) {
				uiState.selectedPhotos = ui.selectedPhotos
					.filter((p) => typeof p === "string")
					.slice(0, 100);
			}

			if (ui.sidebarState && typeof ui.sidebarState === "object") {
				const sidebar = ui.sidebarState;
				const sidebarState: SessionState["ui"]["sidebarState"] = {};

				if (typeof sidebar.showFilters === "boolean") {
					sidebarState.showFilters = sidebar.showFilters;
				}
				if (typeof sidebar.showRecentActivity === "boolean") {
					sidebarState.showRecentActivity = sidebar.showRecentActivity;
				}
				if (typeof sidebar.showSearchHistory === "boolean") {
					sidebarState.showSearchHistory = sidebar.showSearchHistory;
				}

				if (Object.keys(sidebarState).length > 0) {
					uiState.sidebarState = sidebarState;
				}
			}

			if (ui.modalStates && typeof ui.modalStates === "object") {
				const modals = ui.modalStates;
				const modalStates: SessionState["ui"]["modalStates"] = {};

				if (
					typeof modals.lastOpenModal === "string" &&
					modals.lastOpenModal.trim()
				) {
					modalStates.lastOpenModal = modals.lastOpenModal.trim();
				}
				if (typeof modals.onboardingCompleted === "boolean") {
					modalStates.onboardingCompleted = modals.onboardingCompleted;
				}

				if (Object.keys(modalStates).length > 0) {
					uiState.modalStates = modalStates;
				}
			}

			if (Object.keys(uiState).length > 0) {
				sanitized.ui = uiState;
			}
		}

		// Sanitize library state
		if (state.library && typeof state.library === "object") {
			const lib = state.library;
			const libState: SessionState["library"] = {};

			if (
				typeof lib.lastAccessedDirectory === "string" &&
				lib.lastAccessedDirectory.trim()
			) {
				libState.lastAccessedDirectory = lib.lastAccessedDirectory.trim();
			}
			if (
				typeof lib.preferredEngine === "string" &&
				lib.preferredEngine.trim()
			) {
				libState.preferredEngine = lib.preferredEngine.trim();
			}
			if (lib.scrollPositions && typeof lib.scrollPositions === "object") {
				const scrollPositions: Record<string, number> = {};
				Object.entries(lib.scrollPositions).forEach(([key, value]) => {
					if (
						typeof key === "string" &&
						typeof value === "number" &&
						value >= 0
					) {
						scrollPositions[key] = value;
					}
				});
				if (Object.keys(scrollPositions).length > 0) {
					libState.scrollPositions = scrollPositions;
				}
			}

			if (Object.keys(libState).length > 0) {
				sanitized.library = libState;
			}
		}

		// Sanitize timestamps
		if (state.timestamps && typeof state.timestamps === "object") {
			const ts = state.timestamps;
			const timestamps: SessionState["timestamps"] = {};

			if (typeof ts.lastSession === "number" && ts.lastSession > 0) {
				timestamps.lastSession = ts.lastSession;
			}
			if (
				typeof ts.lastActivity === "number" &&
				ts.lastActivity > Date.now() - 7 * 24 * 60 * 60 * 1000
			) {
				timestamps.lastActivity = ts.lastActivity;
			}
			if (
				typeof ts.sessionDuration === "number" &&
				ts.sessionDuration > 0 &&
				ts.sessionDuration < 24 * 60 * 60 * 1000
			) {
				timestamps.sessionDuration = ts.sessionDuration;
			}

			if (Object.keys(timestamps).length > 0) {
				sanitized.timestamps = timestamps;
			}
		}

		return sanitized;
	} catch (error) {
		console.warn("Failed to sanitize session state:", error);
		return {};
	}
}

export class SessionRestoreService {
	private static instance: SessionRestoreService;
	private sessionStartTime: number;
	private lastActivityTime: number;
	private currentSessionState: Partial<SessionState> = {};

	private constructor() {
		this.sessionStartTime = Date.now();
		this.lastActivityTime = Date.now();
		this.loadSessionState();
	}

	public static getInstance(): SessionRestoreService {
		if (!SessionRestoreService.instance) {
			SessionRestoreService.instance = new SessionRestoreService();
		}
		return SessionRestoreService.instance;
	}

	/**
	 * Load session state from localStorage
	 */
	private loadSessionState(): Partial<SessionState> {
		if (!isBrowser) return {};

		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return {};

			const parsed = JSON.parse(raw) as unknown;
			this.currentSessionState = sanitizeSessionState(parsed);

			// Update session start time and clean old data
			this.sessionStartTime = Date.now();
			this.cleanupOldData();

			return this.currentSessionState;
		} catch (error) {
			console.warn("Failed to load session state:", error);
			return {};
		}
	}

	/**
	 * Save current session state to localStorage
	 */
	private saveSessionState(): void {
		if (!isBrowser) return;

		try {
			const state: Partial<SessionState> = {
				...this.currentSessionState,
				timestamps: {
					...this.currentSessionState.timestamps,
					lastSession: this.sessionStartTime,
					lastActivity: this.lastActivityTime,
					sessionDuration: Date.now() - this.sessionStartTime,
				},
			};

			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch (error) {
			console.warn("Failed to save session state:", error);
		}
	}

	/**
	 * Clean up old data to prevent storage bloat
	 */
	private cleanupOldData(): void {
		// Clean old search history
		if (this.currentSessionState.search?.recentSearches) {
			this.currentSessionState.search.recentSearches =
				this.currentSessionState.search.recentSearches.filter(
					(search) => search.timestamp > Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days
				);
		}

		// Clean old view history
		if (this.currentSessionState.navigation?.viewHistory) {
			this.currentSessionState.navigation.viewHistory =
				this.currentSessionState.navigation.viewHistory
					.filter(
						(view) => view.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days
					)
					.slice(0, MAX_VIEW_HISTORY);
		}

		// Remove expired sessions
		if (this.currentSessionState.timestamps?.lastActivity) {
			const timeSinceLastActivity =
				Date.now() - this.currentSessionState.timestamps.lastActivity;
			if (timeSinceLastActivity > SESSION_TIMEOUT) {
				// Clear most state but keep some preferences
				this.currentSessionState = {
					viewPreferences: this.currentSessionState.viewPreferences,
					library: {
						lastAccessedDirectory:
							this.currentSessionState.library?.lastAccessedDirectory,
						preferredEngine: this.currentSessionState.library?.preferredEngine,
					},
					timestamps: this.currentSessionState.timestamps,
				};
			}
		}
	}

	/**
	 * Update activity timestamp
	 */
	public updateActivity(): void {
		this.lastActivityTime = Date.now();
		this.saveSessionState();
	}

	/**
	 * Get current session state
	 */
	public getSessionState(): Partial<SessionState> {
		return { ...this.currentSessionState };
	}

	/**
	 * Update view preferences
	 */
	public updateViewPreferences(
		preferences: Partial<SessionState["viewPreferences"]>,
	): void {
		this.currentSessionState.viewPreferences = {
			...this.currentSessionState.viewPreferences,
			...preferences,
		};
		this.updateActivity();
	}

	/**
	 * Update navigation state
	 */
	public updateNavigation(
		navigation: Partial<SessionState["navigation"]>,
	): void {
		const currentNav = this.currentSessionState.navigation || {};

		// Update current view
		if (navigation.currentView) {
			currentNav.currentView = navigation.currentView;

			// Update last visited views
			const lastVisited = currentNav.lastVisitedViews || [];
			const updatedLastVisited = [
				navigation.currentView,
				...lastVisited.filter((v) => v !== navigation.currentView),
			].slice(0, 10);
			currentNav.lastVisitedViews = updatedLastVisited;

			// Update view history
			const viewHistory = currentNav.viewHistory || [];
			const historyEntry = {
				view: navigation.currentView,
				timestamp: Date.now(),
				searchQuery: navigation.viewHistory?.[0]?.searchQuery,
			};
			const updatedHistory = [
				historyEntry,
				...viewHistory.filter((h) => h.view !== navigation.currentView),
			].slice(0, MAX_VIEW_HISTORY);
			currentNav.viewHistory = updatedHistory;
		}

		this.currentSessionState.navigation = currentNav;
		this.updateActivity();
	}

	/**
	 * Update search state
	 */
	public updateSearch(search: Partial<SessionState["search"]>): void {
		const currentSearch = this.currentSessionState.search || {};

		// Update last search query
		if (search.lastSearchQuery) {
			currentSearch.lastSearchQuery = search.lastSearchQuery;

			// Add to recent searches
			const recentSearches = currentSearch.recentSearches || [];
			const searchEntry = {
				query: search.lastSearchQuery,
				timestamp: Date.now(),
				resultCount: search.recentSearches?.[0]?.resultCount,
			};
			const updatedRecent = [
				searchEntry,
				...recentSearches.filter((s) => s.query !== search.lastSearchQuery),
			].slice(0, MAX_RECENT_SEARCHES);
			currentSearch.recentSearches = updatedRecent;
		}

		// Update active filters
		if (search.activeFilters) {
			currentSearch.activeFilters = {
				...currentSearch.activeFilters,
				...search.activeFilters,
			};
		}

		this.currentSessionState.search = currentSearch;
		this.updateActivity();
	}

	/**
	 * Update UI state
	 */
	public updateUI(ui: Partial<SessionState["ui"]>): void {
		this.currentSessionState.ui = {
			...this.currentSessionState.ui,
			...ui,
		};
		this.updateActivity();
	}

	/**
	 * Update library state
	 */
	public updateLibrary(library: Partial<SessionState["library"]>): void {
		this.currentSessionState.library = {
			...this.currentSessionState.library,
			...library,
		};
		this.updateActivity();
	}

	/**
	 * Record a search query with results
	 */
	public recordSearch(query: string, resultCount?: number): void {
		if (!query.trim()) return;

		this.updateSearch({
			lastSearchQuery: query.trim(),
			recentSearches: [
				{
					query: query.trim(),
					timestamp: Date.now(),
					resultCount,
				},
			],
		});
	}

	/**
	 * Get view preferences for initialization
	 */
	public getViewPreferences(): SessionState["viewPreferences"] {
		return this.currentSessionState.viewPreferences || {};
	}

	/**
	 * Get last search query
	 */
	public getLastSearchQuery(): string | undefined {
		return this.currentSessionState.search?.lastSearchQuery;
	}

	/**
	 * Get recent searches
	 */
	public getRecentSearches(): Array<{
		query: string;
		timestamp: number;
		resultCount?: number;
	}> {
		return this.currentSessionState.search?.recentSearches || [];
	}

	/**
	 * Get last accessed directory
	 */
	public getLastAccessedDirectory(): string | undefined {
		return this.currentSessionState.library?.lastAccessedDirectory;
	}

	/**
	 * Get scroll position for a view
	 */
	public getScrollPosition(view: string): number {
		return this.currentSessionState.library?.scrollPositions?.[view] || 0;
	}

	/**
	 * Set scroll position for a view
	 */
	public setScrollPosition(view: string, position: number): void {
		const scrollPositions =
			this.currentSessionState.library?.scrollPositions || {};
		scrollPositions[view] = Math.max(0, position);

		this.updateLibrary({
			scrollPositions,
		});
	}

	/**
	 * Clear session state
	 */
	public clearSessionState(): void {
		this.currentSessionState = {
			viewPreferences: this.currentSessionState.viewPreferences, // Keep preferences
		};
		this.saveSessionState();
	}

	/**
	 * Get session analytics
	 */
	public getSessionAnalytics(): {
		sessionDuration: number;
		timeSinceLastActivity: number;
		sessionsCount: number;
		mostUsedViews: Array<{ view: string; count: number }>;
		searchFrequency: number;
	} {
		const sessionDuration = Date.now() - this.sessionStartTime;
		const timeSinceLastActivity = Date.now() - this.lastActivityTime;

		// Calculate most used views
		const viewCounts: Record<string, number> = {};
		this.currentSessionState.navigation?.viewHistory?.forEach((entry) => {
			viewCounts[entry.view] = (viewCounts[entry.view] || 0) + 1;
		});
		const mostUsedViews = Object.entries(viewCounts)
			.map(([view, count]) => ({ view, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		// Calculate search frequency
		const recentSearches =
			this.currentSessionState.search?.recentSearches || [];
		const oldestSearch = recentSearches[recentSearches.length - 1];
		const searchFrequency = oldestSearch
			? recentSearches.length /
				((Date.now() - oldestSearch.timestamp) / (24 * 60 * 60 * 1000))
			: 0;

		return {
			sessionDuration,
			timeSinceLastActivity,
			sessionsCount: 1, // This would need to be stored separately for accurate counting
			mostUsedViews,
			searchFrequency,
		};
	}
}

// Export singleton instance
export const sessionRestoreService = SessionRestoreService.getInstance();
