/**
 * Handles URL synchronization with result view and timeline bucket
 * SSR-safe, no-churn navigation logic
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { errorFactory } from "../../framework/EnhancedErrorHandling";
import type { ResultView, TimelineBucket } from "../utils/lifecycleTypes";
import { guardBrowser } from "../utils/safeStorage";

export interface UseUrlSyncProps {
	resultView: ResultView;
	timelineBucket: TimelineBucket;
}

export function useUrlSync({
	resultView,
	timelineBucket,
}: UseUrlSyncProps): void {
	const navigate = useNavigate();

	useEffect(() => {
		// Guard for non-browser environments
		if (!guardBrowser()) return;

		try {
			const { pathname, search } = window.location;
			const sp = new URLSearchParams(search);

			const prevRv = sp.get("rv");
			const prevTb = sp.get("tb");

			let changed = false;

			if (prevRv !== resultView) {
				sp.set("rv", resultView);
				changed = true;
			}

			if (prevTb !== timelineBucket) {
				sp.set("tb", timelineBucket);
				changed = true;
			}

			if (changed) {
				navigate({ pathname, search: `?${sp.toString()}` }, { replace: true });
			}
		} catch (error) {
			const appError = errorFactory.unknownError(
				"Failed to synchronize URL with application state",
				{
					context: {
						operation: "url_synchronization",
						resultView,
						timelineBucket,
						error: error,
					},
					severity: "low",
				},
			);
			console.warn(
				"URL synchronization failed:",
				appError.getUserFacingMessage(),
			);
		}
	}, [resultView, timelineBucket, navigate]);
}
