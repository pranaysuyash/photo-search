import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";

interface RankingAdjustment {
	photoPath: string;
	originalScore: number;
	adjustedScore: number;
	feedback: "positive" | "negative";
	timestamp: number;
}

interface SearchFeedbackState {
	searchId: string | null;
	query: string;
	rankingAdjustments: RankingAdjustment[];
	feedbackSubmitted: Set<string>; // photo paths that have received feedback
}

interface SearchFeedbackActions {
	setSearchInfo: (searchId: string | null, query: string) => void;
	addFeedback: (
		photoPath: string,
		feedback: "positive" | "negative",
		originalScore: number,
	) => void;
	getAdjustedScore: (photoPath: string, originalScore: number) => number;
	hasFeedback: (photoPath: string) => boolean;
	resetFeedback: () => void;
	getFeedbackSummary: () => { positive: number; negative: number };
}

const SearchFeedbackContext = createContext<{
	state: SearchFeedbackState;
	actions: SearchFeedbackActions;
} | null>(null);

export function SearchFeedbackProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [state, setState] = useState<SearchFeedbackState>({
		searchId: null,
		query: "",
		rankingAdjustments: [],
		feedbackSubmitted: new Set(),
	});

	const setSearchInfo = useCallback(
		(searchId: string | null, query: string) => {
			setState((prev) => ({
				...prev,
				searchId,
				query,
				// Reset adjustments when search changes
				rankingAdjustments: [],
				feedbackSubmitted: new Set(),
			}));
		},
		[],
	);

	const addFeedback = useCallback(
		(
			photoPath: string,
			feedback: "positive" | "negative",
			originalScore: number,
		) => {
			setState((prev) => {
				// Check if feedback already exists for this photo
				if (prev.feedbackSubmitted.has(photoPath)) {
					return prev;
				}

				const adjustment: RankingAdjustment = {
					photoPath,
					originalScore,
					adjustedScore: calculateAdjustedScore(originalScore, feedback),
					feedback,
					timestamp: Date.now(),
				};

				return {
					...prev,
					rankingAdjustments: [...prev.rankingAdjustments, adjustment],
					feedbackSubmitted: new Set([...prev.feedbackSubmitted, photoPath]),
				};
			});
		},
		[],
	);

	const getAdjustedScore = useCallback(
		(photoPath: string, originalScore: number) => {
			const adjustment = state.rankingAdjustments.find(
				(adj) => adj.photoPath === photoPath,
			);
			return adjustment?.adjustedScore ?? originalScore;
		},
		[state.rankingAdjustments],
	);

	const hasFeedback = useCallback(
		(photoPath: string) => {
			return state.feedbackSubmitted.has(photoPath);
		},
		[state.feedbackSubmitted],
	);

	const resetFeedback = useCallback(() => {
		setState((prev) => ({
			...prev,
			rankingAdjustments: [],
			feedbackSubmitted: new Set(),
		}));
	}, []);

	const getFeedbackSummary = useCallback(() => {
		const positive = state.rankingAdjustments.filter(
			(adj) => adj.feedback === "positive",
		).length;
		const negative = state.rankingAdjustments.filter(
			(adj) => adj.feedback === "negative",
		).length;
		return { positive, negative };
	}, [state.rankingAdjustments]);

	const actions: SearchFeedbackActions = {
		setSearchInfo,
		addFeedback,
		getAdjustedScore,
		hasFeedback,
		resetFeedback,
		getFeedbackSummary,
	};

	return (
		<SearchFeedbackContext.Provider value={{ state, actions }}>
			{children}
		</SearchFeedbackContext.Provider>
	);
}

export function useSearchFeedback() {
	const context = useContext(SearchFeedbackContext);
	if (!context) {
		throw new Error(
			"useSearchFeedback must be used within SearchFeedbackProvider",
		);
	}
	return context;
}

// Helper function to calculate adjusted scores
function calculateAdjustedScore(
	originalScore: number,
	feedback: "positive" | "negative",
): number {
	if (feedback === "positive") {
		// Boost relevant results (max 20% increase)
		return Math.min(1.0, originalScore * 1.2);
	} else {
		// Penalize irrelevant results (max 30% decrease)
		return Math.max(0.0, originalScore * 0.7);
	}
}

// Hook to sort results with feedback adjustments
export function useFeedbackAdjustedResults(
	results: Array<{ path: string; score: number }>,
) {
	const { actions } = useSearchFeedback();

	return results
		.map((result) => ({
			...result,
			adjustedScore: actions.getAdjustedScore(result.path, result.score),
		}))
		.sort((a, b) => b.adjustedScore - a.adjustedScore);
}

// Hook to check if feedback should be shown (only after user has interacted with results)
export function useShowFeedbackPanel(
	results: Array<{ path: string; score: number }>,
) {
	const { state, actions } = useSearchFeedback();
	const [showPanel, setShowPanel] = useState(false);

	// Show feedback panel after user has viewed some results
	const hasInteracted = results.length > 0 && state.query.length > 0;

	return {
		showPanel: hasInteracted && showPanel,
		setShowPanel,
		feedbackSummary: actions.getFeedbackSummary(),
		hasFeedback: state.rankingAdjustments.length > 0,
	};
}
