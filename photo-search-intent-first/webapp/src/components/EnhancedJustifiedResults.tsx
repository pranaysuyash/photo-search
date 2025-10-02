import { motion } from "framer-motion";
import React, { memo, useCallback } from "react";
import { useSearchFeedback } from "../contexts/SearchFeedbackContext";
import JustifiedResults from "./JustifiedResults";
import RelevanceFeedback from "./RelevanceFeedback";

type Item = { path: string; score?: number };

interface EnhancedJustifiedResultsProps {
	dir: string;
	engine: string;
	items: Item[];
	gap?: number;
	targetRowHeight?: number;
	scrollContainerRef: React.RefObject<HTMLDivElement>;
	selected: Set<string>;
	onToggleSelect: (path: string) => void;
	onOpen: (path: string) => void;
	focusIndex?: number | null;
	onLayout?: (rows: number[][]) => void;
	ratingMap?: Record<string, number>;
	showInfoOverlay?: boolean;
	searchId?: string | null;
	query?: string;
}

const EnhancedJustifiedResults = memo(function EnhancedJustifiedResults({
	dir,
	engine,
	items,
	gap,
	targetRowHeight,
	scrollContainerRef,
	selected,
	onToggleSelect,
	onOpen,
	focusIndex,
	onLayout,
	ratingMap,
	showInfoOverlay,
	searchId = null,
	query = "",
}: EnhancedJustifiedResultsProps) {
	const { actions: feedbackActions } = useSearchFeedback();

	// Update search feedback context with current search info
	React.useEffect(() => {
		if (searchId && query) {
			feedbackActions.setSearchInfo(searchId, query);
		}
	}, [searchId, query, feedbackActions.setSearchInfo]);

	// Handle feedback submission
	const handleFeedbackGiven = useCallback(
		(photoPath: string, isPositive: boolean) => {
			const item = items.find((item) => item.path === photoPath);
			if (item && typeof item.score === "number") {
				feedbackActions.addFeedback(photoPath, isPositive, item.score);
			}
		},
		[items, feedbackActions.addFeedback],
	);

	// Handle ranking adjustment
	const handleRankingAdjustment = useCallback(
		(photoPath: string, adjustment: number) => {
			// The ranking adjustment is already handled in the context
			// This callback can be used for additional UI updates if needed
			console.log(`Ranking adjusted for ${photoPath}: ${adjustment}`);
		},
		[],
	);

	// Apply feedback adjustments to items
	const adjustedItems = items
		.map((item) => {
			const adjustedScore = feedbackActions.getAdjustedScore(
				item.path,
				item.score || 0,
			);
			return {
				...item,
				score: adjustedScore,
			};
		})
		.sort((a, b) => (b.score || 0) - (a.score || 0)); // Sort by adjusted score

	// Custom overlay renderer that includes feedback buttons
	const renderCustomOverlay = useCallback(
		(
			item: Item,
			base: string,
			isSel: boolean,
			globalIdx: number | undefined,
		) => {
			const hasFeedback = feedbackActions.hasFeedback(item.path);

			return (
				<>
					{/* Existing selection indicator */}
					{isSel && (
						<div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
							<svg
								aria-label="Selected"
								className="w-4 h-4 text-white"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<title>Selected</title>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
					)}

					{/* Feedback indicator */}
					{hasFeedback && (
						<div className="absolute top-2 left-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
							<svg
								aria-label="Feedback given"
								className="w-4 h-4 text-white"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<title>Feedback given</title>
								<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
								<path
									fillRule="evenodd"
									d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100-4h2a1 1 0 100-2 2 2 0 00-2 2v11a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H6zm2 4a1 1 0 011-1h2a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h2a1 1 0 100-2H7z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
					)}

					{/* Relevance feedback buttons (shown on hover) */}
					<div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
						<RelevanceFeedback
							searchId={searchId}
							query={query}
							photoPath={item.path}
							onFeedbackGiven={handleFeedbackGiven}
							onRankingAdjustment={handleRankingAdjustment}
							compact={true}
							className="bg-black/60 backdrop-blur-sm rounded-lg p-1"
						/>
					</div>
				</>
			);
		},
		[
			searchId,
			query,
			feedbackActions.hasFeedback,
			handleFeedbackGiven,
			handleRankingAdjustment,
		],
	);

	return (
		<div className="relative">
			{/* Feedback summary indicator */}
			{searchId && query && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className="absolute top-0 right-0 z-10 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-2 mb-2"
				>
					<div className="text-xs text-gray-600 dark:text-gray-400">
						<span className="font-medium">Help improve results:</span> Use the
						👍/👎 buttons on photos to boost relevant results and hide
						irrelevant ones.
					</div>
				</motion.div>
			)}

			{/* Enhanced justified results with feedback integration */}
			<JustifiedResults
				dir={dir}
				engine={engine}
				items={adjustedItems}
				gap={gap}
				targetRowHeight={targetRowHeight}
				scrollContainerRef={scrollContainerRef}
				selected={selected}
				onToggleSelect={onToggleSelect}
				onOpen={onOpen}
				focusIndex={focusIndex}
				onLayout={onLayout}
				ratingMap={ratingMap}
				showInfoOverlay={showInfoOverlay}
			/>

			{/* Feedback panel at the bottom of results */}
			{items.length > 5 && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5 }}
					className="mt-4"
				>
					<RelevanceFeedback
						searchId={searchId}
						query={query}
						photoPath="" // This will be handled differently for the general feedback panel
						onFeedbackGiven={() => {}}
						onRankingAdjustment={() => {}}
						compact={false}
						className="mx-auto max-w-md"
					/>
				</motion.div>
			)}
		</div>
	);
});

EnhancedJustifiedResults.displayName = "EnhancedJustifiedResults";

export default EnhancedJustifiedResults;
