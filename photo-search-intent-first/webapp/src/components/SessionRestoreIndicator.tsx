/**
 * Session Restore Indicator
 *
 * Small component that shows when session state has been restored
 * and provides access to session information.
 */

import { useEffect, useState } from "react";
import { sessionRestoreService } from "../services/SessionRestoreService";

export function SessionRestoreIndicator() {
	const [showRestoreInfo, setShowRestoreInfo] = useState(false);
	const [sessionInfo, setSessionInfo] = useState({
		hasRestoredState: false,
		lastSearchQuery: "",
		recentSearchesCount: 0,
		lastSessionTime: "",
	});

	useEffect(() => {
		// Check if we have any restored session state
		const sessionState = sessionRestoreService.getSessionState();
		const lastSearch = sessionRestoreService.getLastSearchQuery();
		const recentSearches = sessionRestoreService.getRecentSearches();
		const analytics = sessionRestoreService.getSessionAnalytics();

		const hasRestoredState = Boolean(
			sessionState.viewPreferences?.resultView ||
				sessionState.search?.lastSearchQuery ||
				sessionState.navigation?.lastVisitedViews?.length ||
				recentSearches.length > 0,
		);

		const lastSessionTime = sessionState.timestamps?.lastSession
			? new Date(sessionState.timestamps.lastSession).toLocaleDateString()
			: "";

		setSessionInfo({
			hasRestoredState,
			lastSearchQuery: lastSearch || "",
			recentSearchesCount: recentSearches.length,
			lastSessionTime,
		});

		// Show restore notification briefly if state was restored
		if (hasRestoredState) {
			const timer = setTimeout(() => {
				setShowRestoreInfo(false);
			}, 5000);

			setShowRestoreInfo(true);
			return () => clearTimeout(timer);
		}
	}, []);

	if (!showRestoreInfo || !sessionInfo.hasRestoredState) {
		return null;
	}

	return (
		<div className="fixed bottom-4 right-4 z-50 max-w-sm">
			<div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700 rounded-lg p-3 shadow-lg">
				<div className="flex items-start space-x-2">
					<div className="flex-shrink-0">
						<svg
							className="h-5 w-5 text-green-600 dark:text-green-400"
							fill="none"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div className="flex-1">
						<p className="text-sm font-medium text-green-800 dark:text-green-200">
							Session Restored
						</p>
						<div className="mt-1 text-xs text-green-700 dark:text-green-300">
							{sessionInfo.lastSearchQuery && (
								<div>Last search: "{sessionInfo.lastSearchQuery}"</div>
							)}
							{sessionInfo.recentSearchesCount > 0 && (
								<div>{sessionInfo.recentSearchesCount} recent searches</div>
							)}
							{sessionInfo.lastSessionTime && (
								<div>Last session: {sessionInfo.lastSessionTime}</div>
							)}
						</div>
					</div>
					<button
						type="button"
						onClick={() => setShowRestoreInfo(false)}
						className="flex-shrink-0 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
					>
						<svg
							className="h-4 w-4"
							fill="none"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
}

export default SessionRestoreIndicator;
