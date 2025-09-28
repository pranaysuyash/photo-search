import { Check, Circle, Play, X } from "lucide-react";

interface OnboardingChecklistProps {
	isVisible: boolean;
	onComplete: () => void;
	completedSteps: string[];
	inProgressStepId?: string;
	onStepAction: (step: string) => void;
}

const ONBOARDING_STEPS = [
	{
		id: "select_directory",
		title: "Select Photo Directory",
		description: "Choose a folder containing your photos to get started",
		actionLabel: "Select Folder",
	},
	{
		id: "index_photos",
		title: "Index Your Photos",
		description: "Build a search index to enable fast photo discovery",
		actionLabel: "Start Indexing",
	},
	{
		id: "first_search",
		title: "Try Your First Search",
		description: "Search for photos using natural language or keywords",
		actionLabel: "Try Search",
	},
	{
		id: "explore_features",
		title: "Explore Features",
		description: "Discover collections, favorites, and sharing options",
		actionLabel: "Explore",
	},
];

export function OnboardingChecklist({
	isVisible,
	onComplete,
	completedSteps,
	inProgressStepId,
	onStepAction,
}: OnboardingChecklistProps) {
	if (!isVisible) return null;

	const completedCount = completedSteps.length;
	const totalSteps = ONBOARDING_STEPS.length;
	const isComplete = completedCount === totalSteps;

	return (
		<div className="fixed bottom-4 left-4 z-50 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
			<div className="p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
						Getting Started
					</h3>
					<button
						type="button"
						onClick={onComplete}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
						aria-label="Close checklist"
					>
						<X size={20} />
					</button>
				</div>

				<div className="mb-4">
					<div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
						<span>Progress</span>
						<span>
							{completedCount} of {totalSteps} complete
						</span>
					</div>
					<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
						<div
							className={`bg-blue-600 h-2 rounded-full transition-all duration-300 ${
								completedCount === 0
									? "w-0"
									: completedCount === 1
										? "w-1/4"
										: completedCount === 2
											? "w-2/4"
											: completedCount === 3
												? "w-3/4"
												: "w-full"
							}`}
						/>
					</div>
				</div>

				<div className="space-y-3 max-h-60 overflow-y-auto">
					{ONBOARDING_STEPS.map((step) => {
						const isCompleted = completedSteps.includes(step.id);
						const isInProgress = inProgressStepId === step.id;

						return (
							<div
								key={step.id}
								className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
									isCompleted
										? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
										: isInProgress
											? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
											: "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
								}`}
							>
								<div className="flex-shrink-0 mt-0.5">
									{isCompleted ? (
										<Check
											size={16}
											className="text-green-600 dark:text-green-400"
										/>
									) : isInProgress ? (
										<Circle
											size={16}
											className="text-blue-600 dark:text-blue-400 animate-pulse"
										/>
									) : (
										<Circle size={16} className="text-gray-400" />
									)}
								</div>

								<div className="flex-1 min-w-0">
									<h4
										className={`text-sm font-medium ${
											isCompleted
												? "text-green-900 dark:text-green-100"
												: "text-gray-900 dark:text-gray-100"
										}`}
									>
										{step.title}
									</h4>
									<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
										{step.description}
									</p>

									{!isCompleted && (
										<button
											type="button"
											onClick={() => onStepAction(step.id)}
											className="mt-2 inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900 dark:hover:bg-blue-800 rounded-md transition-colors"
										>
											<Play size={12} className="mr-1" />
											{step.actionLabel}
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>

				{isComplete && (
					<div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
						<div className="text-center">
							<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
								🎉 You're all set! Start exploring your photos.
							</p>
							<button
								type="button"
								onClick={onComplete}
								className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
							>
								Get Started
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
