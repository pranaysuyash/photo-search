import {
	ArrowRight,
	Camera,
	CheckCircle,
	FolderOpen,
	PartyPopper,
	Search,
	Sparkles,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface OnboardingModalProps {
	show: boolean;
	onComplete: () => void;
	onSelectDirectory: () => void;
}

export function OnboardingModal({
	show,
	onComplete,
	onSelectDirectory,
}: OnboardingModalProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

	useEffect(() => {
		// Check if user has seen onboarding
		const seen = localStorage.getItem("hasSeenOnboarding");
		if (seen) {
			setHasSeenOnboarding(true);
			if (show) onComplete();
		}
	}, [show, onComplete]);

	if (!show || hasSeenOnboarding) return null;

	const steps = [
		{
			icon: <Camera className="w-12 h-12" />,
			title: "Find any photo in seconds",
			description:
				"No more endless scrolling! Just describe what you're looking for and we'll find it. Ready to get started?",
			action: null,
			celebration: false,
		},
		{
			icon: <FolderOpen className="w-12 h-12" />,
			title: "First, let's find your photos",
			description:
				"Pick the folder where you keep your photos - we'll help make them searchable.",
			action: {
				label: "Select Directory",
				onClick: onSelectDirectory,
			},
			celebration: false,
		},
		{
			icon: <Sparkles className="w-12 h-12" />,
			title: "We're learning about your photos",
			description:
				"Give us a few minutes to understand what's in your photos so you can search naturally.",
			action: null,
			celebration: false,
		},
		{
			icon: <Search className="w-12 h-12" />,
			title: "You're all set!",
			description:
				"Try searching for anything - like 'that trip to the beach' or 'kids playing in the backyard'. Just type what you remember!",
			action: null,
			celebration: true,
		},
	];

	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			completeOnboarding();
		}
	};

	const handleSkip = () => {
		completeOnboarding();
	};

	const completeOnboarding = () => {
		localStorage.setItem("hasSeenOnboarding", "true");
		setHasSeenOnboarding(true);
		onComplete();
	};

	const currentStepData = steps[currentStep];
	const isLastStep = currentStep === steps.length - 1;
	const hasCelebration = currentStepData.celebration;

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl relative overflow-hidden">
				{/* Celebration animation */}
				{hasCelebration && (
					<div className="absolute inset-0 pointer-events-none">
						<div className="absolute top-4 left-4 text-yellow-400 animate-bounce">
							<PartyPopper className="w-6 h-6" />
						</div>
						<div className="absolute top-8 right-8 text-pink-400 animate-bounce delay-100">
							<PartyPopper className="w-5 h-5" />
						</div>
						<div className="absolute bottom-8 left-8 text-blue-400 animate-bounce delay-200">
							<PartyPopper className="w-4 h-4" />
						</div>
						<div className="absolute bottom-4 right-4 text-green-400 animate-bounce delay-300">
							<PartyPopper className="w-5 h-5" />
						</div>
					</div>
				)}
				{/* Header */}
				<div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
					<div className="flex gap-2">
						{steps.map((_, idx) => (
							<div
								key={`step-${idx}`}
								className={`h-2 rounded-full transition-all ${
									idx === currentStep
										? "w-8 bg-blue-500"
										: idx < currentStep
											? "w-8 bg-green-500"
											: "w-2 bg-gray-300 dark:bg-gray-600"
								}`}
							/>
						))}
					</div>
					<button
						type="button"
						onClick={handleSkip}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-8 text-center">
					{hasCelebration && (
						<div className="mb-4 animate-bounce">
							<CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
						</div>
					)}
					<div className="flex justify-center mb-6 text-blue-500">
						{currentStepData.icon}
					</div>
					<div className="mb-4">
						<span className="text-sm text-gray-500 dark:text-gray-400">
							Step {currentStep + 1} of {steps.length}
						</span>
					</div>
					<h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
						{currentStepData.title}
					</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-8">
						{currentStepData.description}
					</p>

					{/* Custom action button if step has one */}
					{currentStepData.action && (
						<button
							type="button"
							onClick={currentStepData.action.onClick}
							className="mb-4 w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
						>
							<FolderOpen className="w-5 h-5" />
							{currentStepData.action.label}
						</button>
					)}
				</div>

				{/* Footer */}
				<div className="px-8 pb-8 flex justify-between items-center">
					<button
						type="button"
						onClick={handleSkip}
						className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
					>
						{isLastStep ? "Maybe later" : "Skip"}
					</button>
					<button
						type="button"
						onClick={handleNext}
						className={`px-6 py-2 text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2 ${
							isLastStep
								? "bg-green-500 hover:bg-green-600 text-lg px-8 py-3"
								: "bg-blue-500 hover:bg-blue-600"
						}`}
					>
						{isLastStep ? (
							<>
								<span>Let's go! </span>
								<Sparkles className="w-5 h-5" />
							</>
						) : (
							<>
								Next
								<ArrowRight className="w-4 h-4" />
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
