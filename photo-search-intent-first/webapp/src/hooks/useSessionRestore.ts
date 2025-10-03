/**
 * Session Restore Hook
 *
 * Provides easy-to-use session persistence and restoration functionality
 * for React components.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	type SessionState,
	sessionRestoreService,
} from "../services/SessionRestoreService";
import { pathToView } from "../utils/router";

export interface UseSessionRestoreOptions {
	autoSave?: boolean;
	restoreOnMount?: boolean;
	debounceMs?: number;
}

export function useSessionRestore(options: UseSessionRestoreOptions = {}) {
	const { autoSave = true, restoreOnMount = true, debounceMs = 1000 } = options;

	const location = useLocation();
	const navigate = useNavigate();
	const timeoutRef = useRef<number | null>(null);

	// Debounced save function
	const debouncedSave = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			sessionRestoreService.updateActivity();
		}, debounceMs) as unknown as number;
	}, [debounceMs]);

	// Initialize session state on mount
	useEffect(() => {
		if (restoreOnMount) {
			sessionRestoreService.loadSessionState();
		}

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [restoreOnMount]);

	// Track navigation changes
	useEffect(() => {
		const currentView = pathToView(location.pathname);
		if (currentView) {
			sessionRestoreService.updateNavigation({
				currentView,
			});
			if (autoSave) {
				debouncedSave();
			}
		}
	}, [location.pathname, autoSave, debouncedSave]);

	// Session state management functions
	const sessionActions = useMemo(
		() => ({
			/**
			 * Update view preferences
			 */
			updateViewPreferences: useCallback(
				(preferences: Partial<SessionState["viewPreferences"]>) => {
					sessionRestoreService.updateViewPreferences(preferences);
					if (autoSave) {
						debouncedSave();
					}
				},
				[autoSave, debouncedSave],
			),

			/**
			 * Record a search query
			 */
			recordSearch: useCallback(
				(query: string, resultCount?: number) => {
					sessionRestoreService.recordSearch(query, resultCount);
					if (autoSave) {
						debouncedSave();
					}
				},
				[autoSave, debouncedSave],
			),

			/**
			 * Update active filters
			 */
			updateFilters: useCallback(
				(filters: SessionState["search"]["activeFilters"]) => {
					sessionRestoreService.updateSearch({
						activeFilters: filters,
					});
					if (autoSave) {
						debouncedSave();
					}
				},
				[autoSave, debouncedSave],
			),

			/**
			 * Update selected photos
			 */
			updateSelectedPhotos: useCallback(
				(selectedPhotos: string[]) => {
					sessionRestoreService.updateUI({
						selectedPhotos,
					});
					if (autoSave) {
						debouncedSave();
					}
				},
				[autoSave, debouncedSave],
			),

			/**
			 * Update sidebar state
			 */
			updateSidebarState: useCallback(
				(sidebarState: SessionState["ui"]["sidebarState"]) => {
					sessionRestoreService.updateUI({
						sidebarState,
					});
					if (autoSave) {
						debouncedSave();
					}
				},
				[autoSave, debouncedSave],
			),

			/**
			 * Update modal state
			 */
			updateModalState: useCallback(
				(modalState: SessionState["ui"]["modalStates"]) => {
					sessionRestoreService.updateUI({
						modalStates: modalState,
					});
					if (autoSave) {
						debouncedSave();
					}
				},
				[autoSave, debouncedSave],
			),

			/**
			 * Update library state
			 */
			updateLibraryState: useCallback(
				(libraryState: Partial<SessionState["library"]>) => {
					sessionRestoreService.updateLibrary(libraryState);
					if (autoSave) {
						debouncedSave();
					}
				},
				[autoSave, debouncedSave],
			),

			/**
			 * Set scroll position for current view
			 */
			setScrollPosition: useCallback(
				(position: number) => {
					const currentView = pathToView(location.pathname);
					if (currentView) {
						sessionRestoreService.setScrollPosition(currentView, position);
						if (autoSave) {
							debouncedSave();
						}
					}
				},
				[location.pathname, autoSave, debouncedSave],
			),

			/**
			 * Get scroll position for current view
			 */
			getScrollPosition: useCallback(() => {
				const currentView = pathToView(location.pathname);
				return currentView
					? sessionRestoreService.getScrollPosition(currentView)
					: 0;
			}, [location.pathname]),

			/**
			 * Navigate to last visited view
			 */
			navigateToLastView: useCallback(() => {
				const lastView =
					sessionRestoreService.getSessionState().navigation
						?.lastVisitedViews?.[1];
				if (lastView && lastView !== pathToView(location.pathname)) {
					navigate(`/${lastView}`);
				}
			}, [navigate, location.pathname]),

			/**
			 * Restore last search
			 */
			restoreLastSearch: useCallback(() => {
				const lastSearch = sessionRestoreService.getLastSearchQuery();
				const filters =
					sessionRestoreService.getSessionState().search?.activeFilters;
				return {
					query: lastSearch || "",
					filters,
				};
			}, []),

			/**
			 * Clear session state
			 */
			clearSession: useCallback(() => {
				sessionRestoreService.clearSessionState();
			}, []),

			/**
			 * Force save session state
			 */
			saveSession: useCallback(() => {
				sessionRestoreService.updateActivity();
			}, []),
		}),
		[autoSave, debouncedSave, location.pathname, navigate],
	);

	// Session state getters
	const sessionState = useMemo(
		() => ({
			/**
			 * Current view preferences
			 */
			viewPreferences: sessionRestoreService.getViewPreferences(),

			/**
			 * Last search query
			 */
			lastSearchQuery: sessionRestoreService.getLastSearchQuery(),

			/**
			 * Recent searches
			 */
			recentSearches: sessionRestoreService.getRecentSearches(),

			/**
			 * Last accessed directory
			 */
			lastAccessedDirectory: sessionRestoreService.getLastAccessedDirectory(),

			/**
			 * Current scroll position
			 */
			currentScrollPosition: sessionRestoreService.getScrollPosition(
				pathToView(location.pathname),
			),

			/**
			 * Full session state
			 */
			fullState: sessionRestoreService.getSessionState(),

			/**
			 * Session analytics
			 */
			analytics: sessionRestoreService.getSessionAnalytics(),
		}),
		[location.pathname],
	);

	return {
		...sessionActions,
		...sessionState,
	};
}

export type UseSessionRestoreReturn = ReturnType<typeof useSessionRestore>;

// Specialized hooks for common use cases
export function useViewPreferences() {
	const { viewPreferences, updateViewPreferences } = useSessionRestore();
	return { viewPreferences, updateViewPreferences };
}

export function useSearchHistory() {
	const { recentSearches, lastSearchQuery, recordSearch } = useSessionRestore();
	return { recentSearches, lastSearchQuery, recordSearch };
}

export function useScrollRestore() {
	const { getScrollPosition, setScrollPosition } = useSessionRestore();
	return { getScrollPosition, setScrollPosition };
}

export function useLibrarySession() {
	const { lastAccessedDirectory, updateLibraryState } = useSessionRestore();
	return { lastAccessedDirectory, updateLibraryState };
}
