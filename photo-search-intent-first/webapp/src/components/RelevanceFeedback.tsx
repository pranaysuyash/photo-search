import { motion } from "framer-motion";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useCallback, useState } from "react";
import { apiFeedback } from "../api";

interface RelevanceFeedbackProps {
	searchId: string | null;
	query: string;
	photoPath: string;
	onFeedbackGiven?: (photoPath: string, isPositive: boolean) => void;
	onRankingAdjustment?: (photoPath: string, adjustment: number) => void;
	compact?: boolean;
	className?: string;
}

export function RelevanceFeedback({
	searchId,
	query,
	photoPath,
	onFeedbackGiven,
	onRankingAdjustment,
	compact = false,
	className = "",
}: RelevanceFeedbackProps) {
	const [feedbackGiven, setFeedbackGiven] = useState<
		"positive" | "negative" | null
	>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showThankYou, setShowThankYou] = useState(false);

	const handleFeedback = useCallback(
		async (isPositive: boolean) => {
			if (!searchId || isSubmitting) return;

			setIsSubmitting(true);
			setFeedbackGiven(isPositive ? "positive" : "negative");

			try {
				// Submit feedback to server
				await apiFeedback(
					"",
					searchId,
					query,
					[photoPath],
					isPositive ? "relevant" : "not relevant",
				);

				// Notify parent components
				onFeedbackGiven?.(photoPath, isPositive);

				// Apply immediate ranking adjustment
				const adjustment = isPositive ? 0.2 : -0.3; // Boost relevant, penalize irrelevant
				onRankingAdjustment?.(photoPath, adjustment);

				// Show thank you message
				setShowThankYou(true);
				setTimeout(() => setShowThankYou(false), 2000);

				console.log(
					`Feedback submitted: ${isPositive ? "relevant" : "not relevant"} for ${photoPath}`,
				);
			} catch (error) {
				console.error("Failed to submit feedback:", error);
				// Revert UI state on error
				setFeedbackGiven(null);
			} finally {
				setIsSubmitting(false);
			}
		},
		[
			searchId,
			query,
			photoPath,
			onFeedbackGiven,
			onRankingAdjustment,
			isSubmitting,
		],
	);

	const resetFeedback = useCallback(() => {
		setFeedbackGiven(null);
		setShowThankYou(false);
	}, []);

	if (compact) {
		return (
			<div className={`flex items-center gap-1 ${className}`}>
				{showThankYou ? (
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						className="text-xs text-green-600 font-medium"
					>
						Thanks!
					</motion.div>
				) : (
					<>
						<motion.button
							type="button"
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={() => handleFeedback(true)}
							disabled={isSubmitting || feedbackGiven !== null}
							className={`p-1.5 rounded-full transition-all ${
								feedbackGiven === "positive"
									? "bg-green-100 text-green-600"
									: "bg-gray-100 hover:bg-green-100 text-gray-500 hover:text-green-600"
							} ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
							title="This result is relevant"
							aria-label="Mark as relevant"
						>
							<ThumbsUp className="w-3 h-3" />
						</motion.button>

						<motion.button
							type="button"
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={() => handleFeedback(false)}
							disabled={isSubmitting || feedbackGiven !== null}
							className={`p-1.5 rounded-full transition-all ${
								feedbackGiven === "negative"
									? "bg-red-100 text-red-600"
									: "bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600"
							} ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
							title="This result is not relevant"
							aria-label="Mark as not relevant"
						>
							<ThumbsDown className="w-3 h-3" />
						</motion.button>

						{feedbackGiven && (
							<motion.button
								type="button"
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								onClick={resetFeedback}
								className="p-1 rounded-full text-gray-400 hover:text-gray-600"
								title="Undo feedback"
								aria-label="Undo feedback"
							>
								<X className="w-3 h-3" />
							</motion.button>
						)}
					</>
				)}
			</div>
		);
	}

	return (
		<div
			className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 ${className}`}
		>
			<div className="flex items-center justify-between mb-2">
				<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
					Improve these results?
				</span>
				{feedbackGiven && (
					<motion.button
						type="button"
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						onClick={resetFeedback}
						className="p-1 rounded-full text-gray-400 hover:text-gray-600"
						title="Undo feedback"
						aria-label="Undo feedback"
					>
						<X className="w-3 h-3" />
					</motion.button>
				)}
			</div>

			{showThankYou ? (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center py-2 text-green-600 font-medium"
				>
					Thanks for your feedback! This helps improve future searches.
				</motion.div>
			) : (
				<div className="flex gap-2">
					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => handleFeedback(true)}
						disabled={isSubmitting || feedbackGiven !== null}
						className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
							feedbackGiven === "positive"
								? "bg-green-100 text-green-700 border border-green-200"
								: "bg-gray-50 hover:bg-green-50 text-gray-700 hover:text-green-700 border border-gray-200 hover:border-green-200"
						} ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
						aria-label="This result is relevant"
					>
						<ThumbsUp className="w-4 h-4" />
						<span>Relevant</span>
					</motion.button>

					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => handleFeedback(false)}
						disabled={isSubmitting || feedbackGiven !== null}
						className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
							feedbackGiven === "negative"
								? "bg-red-100 text-red-700 border border-red-200"
								: "bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-700 border border-gray-200 hover:border-red-200"
						} ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
						aria-label="This result is not relevant"
					>
						<ThumbsDown className="w-4 h-4" />
						<span>Not relevant</span>
					</motion.button>
				</div>
			)}

			{isSubmitting && (
				<div className="text-xs text-gray-500 text-center mt-2">
					Submitting feedback...
				</div>
			)}
		</div>
	);
}

export default RelevanceFeedback;
