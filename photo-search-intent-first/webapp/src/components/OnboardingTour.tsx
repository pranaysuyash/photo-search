import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	FolderOpen,
	Lightbulb,
	Pause,
	Play,
	Search,
	Settings,
	Star,
	Upload,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface OnboardingTourProps {
	isActive: boolean;
	onComplete: () => void;
	onSkip: () => void;
	currentStep?: number;
	userActions?: string[];
}

interface TourStep {
	id: string;
	title: string;
	description: string;
	content: React.ReactNode;
	target?: string; // CSS selector for highlighting
	position: "top" | "bottom" | "left" | "right" | "center";
	showNext?: boolean;
	showPrev?: boolean;
	canSkip?: boolean;
	actionRequired?: boolean;
	autoAdvance?: number; // Auto advance after X seconds
}

const tourSteps: TourStep[] = [
	{
		id: "welcome",
		title: "Welcome to Photo Search!",
		description:
			"Let's take a quick tour to help you get started with your photo library.",
		content: (
			<div className="space-y-4">
				<div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<Star className="w-6 h-6 text-blue-500" />
					<div>
						<div className="font-medium text-blue-900 dark:text-blue-100">
							AI-Powered Search
						</div>
						<div className="text-sm text-blue-700 dark:text-blue-300">
							Find photos using natural language
						</div>
					</div>
				</div>
				<div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<Zap className="w-6 h-6 text-green-500" />
					<div>
						<div className="font-medium text-green-900 dark:text-green-100">
							Smart Organization
						</div>
						<div className="text-sm text-green-700 dark:text-green-300">
							Auto-categorize and tag your photos
						</div>
					</div>
				</div>
			</div>
		),
		position: "center",
		showNext: true,
		canSkip: true,
	},
	{
		id: "search-bar",
		title: "Smart Search Bar",
		description: "Use natural language to find your photos instantly.",
		content: (
			<div className="space-y-3">
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Try searching for things like:
				</p>
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-sm">
						<Search className="w-4 h-4 text-gray-400" />
						<span>"beach sunset with palm trees"</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<Search className="w-4 h-4 text-gray-400" />
						<span>"family photos from last summer"</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<Search className="w-4 h-4 text-gray-400" />
						<span>"red car in city"</span>
					</div>
				</div>
			</div>
		),
		target: '[data-tour="search-bar"]',
		position: "bottom",
		showNext: true,
		showPrev: true,
		canSkip: true,
	},
	{
		id: "sidebar",
		title: "Navigation Sidebar",
		description: "Access different sections of your photo library.",
		content: (
			<div className="space-y-3">
				<div className="grid grid-cols-2 gap-3">
					<div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<FolderOpen className="w-4 h-4 text-blue-500" />
						<span className="text-sm font-medium">Browse</span>
					</div>
					<div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<Settings className="w-4 h-4 text-green-500" />
						<span className="text-sm font-medium">Organize</span>
					</div>
				</div>
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Use the sidebar to navigate between different views and manage your
					photos.
				</p>
			</div>
		),
		target: '[data-tour="sidebar"]',
		position: "right",
		showNext: true,
		showPrev: true,
		canSkip: true,
	},
	{
		id: "upload",
		title: "Add Your Photos",
		description: "Import photos from your computer or cloud storage.",
		content: (
			<div className="space-y-3">
				<div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
					<Upload className="w-6 h-6 text-purple-500" />
					<div>
						<div className="font-medium text-purple-900 dark:text-purple-100">
							Import Photos
						</div>
						<div className="text-sm text-purple-700 dark:text-purple-300">
							Drag & drop or browse your files
						</div>
					</div>
				</div>
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Supported formats: JPG, PNG, GIF, WebP, HEIC, and more.
				</p>
			</div>
		),
		// Align with tests: point to the Select Library control
		target: '[data-tour="select-library"]',
		position: "top",
		showNext: true,
		showPrev: true,
		canSkip: true,
	},
	{
		id: "filters",
		title: "Refine With Filters",
		description:
			"Open the filters panel to narrow results by camera, date, or more.",
		content: (
			<div className="space-y-3">
				<div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<Settings className="w-6 h-6 text-blue-500" />
					<div>
						<div className="font-medium text-blue-900 dark:text-blue-100">
							Filters
						</div>
						<div className="text-sm text-blue-700 dark:text-blue-300">
							Open the panel to refine your search
						</div>
					</div>
				</div>
			</div>
		),
		target: '[data-tour="filters-toggle"]',
		position: "bottom",
		showNext: true,
		showPrev: true,
		canSkip: true,
	},
	{
		id: "advanced",
		title: "Advanced Search",
		description: "Open the advanced search to build complex queries.",
		content: (
			<div className="space-y-3">
				<div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
					<Search className="w-6 h-6 text-indigo-500" />
					<div>
						<div className="font-medium text-indigo-900 dark:text-indigo-100">
							Advanced Search
						</div>
						<div className="text-sm text-indigo-700 dark:text-indigo-300">
							Combine fields like camera:, place:, person:, rating:
						</div>
					</div>
				</div>
			</div>
		),
		target: '[data-tour="advanced-button"]',
		position: "bottom",
		showNext: true,
		showPrev: true,
		canSkip: true,
	},
	{
		id: "shortcuts",
		title: "Keyboard Shortcuts",
		description: "Speed up your workflow with keyboard shortcuts.",
		content: (
			<div className="space-y-3">
				<div className="grid grid-cols-2 gap-2 text-sm">
					<div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span>Open search</span>
						<kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
							Ctrl+K
						</kbd>
					</div>
					<div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span>Select all</span>
						<kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
							Ctrl+A
						</kbd>
					</div>
					<div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span>Delete selected</span>
						<kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
							Del
						</kbd>
					</div>
					<div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
						<span>Focus sidebar</span>
						<kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
							Ctrl+B
						</kbd>
					</div>
				</div>
			</div>
		),
		position: "center",
		showNext: true,
		showPrev: true,
		canSkip: true,
	},
	{
		id: "complete",
		title: "You're All Set!",
		description: "Start exploring your photo library with AI-powered search.",
		content: (
			<div className="space-y-4 text-center">
				<CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
				<p className="text-gray-600 dark:text-gray-400">
					You can always access this tour again from the help menu, or get
					contextual hints as you use the app.
				</p>
				<div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-500">
					<Lightbulb className="w-4 h-4" />
					<span>Pro tip: Try searching for "sunset" to see AI in action!</span>
				</div>
			</div>
		),
		position: "center",
		showNext: false,
		showPrev: true,
		canSkip: false,
	},
];

export function OnboardingTour({
	isActive,
	onComplete,
	onSkip,
	currentStep = 0,
	userActions: _userActions = [],
}: OnboardingTourProps) {
	const [step, setStep] = useState(currentStep);
	const [isPaused, setIsPaused] = useState(false);
	const [_completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
	const timeoutRef = useRef<NodeJS.Timeout>();

	const currentTourStep = tourSteps[step];
	const totalSteps = tourSteps.length || 1;
	const progressPercent = Math.min(
		100,
		Math.max(0, ((step + 1) / totalSteps) * 100),
	);
	const roundedProgress = Math.round(progressPercent);
	const progressStyle = {
		"--onboarding-progress": `${progressPercent}%`,
	} as React.CSSProperties;

	// Auto-advance logic
	useEffect(() => {
		if (!isActive || isPaused || !currentTourStep?.autoAdvance) return;

		timeoutRef.current = setTimeout(() => {
			if (step < tourSteps.length - 1) {
				setStep(step + 1);
			}
		}, currentTourStep.autoAdvance * 1000);

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [step, isActive, isPaused, currentTourStep]);

	// Highlight target element
	useEffect(() => {
		if (!currentTourStep?.target) return;

		const element = document.querySelector(currentTourStep.target);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" });
			element.setAttribute("data-tour-highlight", "true");

			return () => {
				element.removeAttribute("data-tour-highlight");
			};
		}
	}, [currentTourStep]);

	const handleNext = () => {
		if (step < tourSteps.length - 1) {
			setCompletedSteps((prev) => new Set([...prev, step]));
			setStep(step + 1);
		} else {
			handleComplete();
		}
	};

	const handlePrev = () => {
		if (step > 0) {
			setStep(step - 1);
		}
	};

	// Auto-advance the "search-bar" step when user types in the search input
	useEffect(() => {
		if (!isActive) return;
		const st = tourSteps[step];
		if (!st || st.id !== "search-bar") return;
		const el = document.querySelector(
			'[data-tour="search-bar"]',
		) as HTMLElement | null;
		if (!el) return;
		let advanced = false;
		const onInput = () => {
			if (advanced) return;
			advanced = true;
			if (step < tourSteps.length - 1) setStep(step + 1);
		};
		el.addEventListener("input", onInput, true);
		el.addEventListener("keydown", onInput, true);
		return () => {
			el.removeEventListener("input", onInput, true);
			el.removeEventListener("keydown", onInput, true);
		};
	}, [isActive, step]);

	const handleComplete = () => {
		setCompletedSteps((prev) => new Set([...prev, step]));
		onComplete();
	};

	const handleSkip = () => {
		onSkip();
	};

	const togglePause = () => {
		setIsPaused(!isPaused);
	};

	const getActionEventForStep = (stepId: string): string | null => {
		switch (stepId) {
			case "upload":
				return "tour-action-select-library";
			case "filters":
				return "tour-action-open-filters";
			case "advanced":
				return "tour-action-open-advanced";
			default:
				return null;
		}
	};

	// Ensure the target is scrolled into view when step/target changes
	useEffect(() => {
		if (!isActive) return;
		const targetSel = currentTourStep?.target;
		if (!targetSel) return;
		try {
			const el = document.querySelector(targetSel) as HTMLElement | null;
			if (el) {
				el.scrollIntoView({
					behavior: "smooth",
					block: "center",
					inline: "center",
				});
			}
		} catch {}
	}, [isActive, currentTourStep?.target]);

	// If a step references a missing target for a while, auto-advance to avoid confusion
	useEffect(() => {
		if (!isActive) return;
		const targetSel = currentTourStep?.target;
		if (!targetSel) return;
		let t: number | undefined;
		try {
			const el = document.querySelector(targetSel) as HTMLElement | null;
			if (!el) {
				t = window.setTimeout(() => {
					try {
						if (step < tourSteps.length - 1) setStep(step + 1);
						else onSkip();
					} catch {}
				}, 1200) as unknown as number;
			}
		} catch {}
		return () => {
			if (t) window.clearTimeout(t);
		};
	}, [isActive, currentTourStep?.target, step, onSkip]);

	const prefersReducedMotion = useReducedMotion();

	if (!isActive) return null;
	return (
		<AnimatePresence mode="wait">
			<motion.div
				initial={prefersReducedMotion ? undefined : { opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={prefersReducedMotion ? undefined : { opacity: 0 }}
				className="fixed inset-0 z-50 pointer-events-none"
			>
				{/* Highlight animation CSS (scoped) */}
				<style>{`
          @keyframes tourPulse {
            0% { box-shadow: 0 0 0 3px rgba(255,255,255,0.8), 0 0 0 0 rgba(59,130,246,0.6); }
            70% { box-shadow: 0 0 0 3px rgba(255,255,255,0.8), 0 0 0 8px rgba(59,130,246,0.0); }
            100% { box-shadow: 0 0 0 3px rgba(255,255,255,0.8), 0 0 0 0 rgba(59,130,246,0.0); }
          }
          .tour-highlight { animation: tourPulse 1.2s ease-in-out infinite; }
        `}</style>
				{/* Backdrop */}
				<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

				{/* Highlight overlay for target element */}
				{currentTourStep?.target && (
					<div className="absolute inset-0 pointer-events-none">
						{(() => {
							const targetSel = currentTourStep?.target;
							const rect = targetSel ? getTargetRect(targetSel) : null;
							const padding = 8;
							if (!rect) return null;
							return (
								<div
									className="absolute rounded-lg tour-highlight"
									style={{
										left: rect.left - padding,
										top: rect.top - padding,
										width: rect.width + padding * 2,
										height: rect.height + padding * 2,
										border: "2px solid rgba(59,130,246,0.9)",
										boxShadow: "0 0 0 3px rgba(255,255,255,0.8)",
									}}
								/>
							);
						})()}
					</div>
				)}

				{/* Tour Card */}
				<motion.div
					key={step}
					initial={
						prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9, y: 20 }
					}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={
						prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9, y: 20 }
					}
					transition={{ duration: 0.2, ease: "easeOut" }}
					className={clsx("absolute pointer-events-auto max-w-md")}
					style={getCardPositionStyle(
						currentTourStep?.position || "center",
						currentTourStep?.target,
					)}
				>
					<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
									<Lightbulb className="w-4 h-4 text-white" />
								</div>
								<div>
									<h3 className="font-semibold text-gray-900 dark:text-white">
										{currentTourStep?.title}
									</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										{currentTourStep?.description}
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={handleSkip}
								className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
								aria-label="Skip tour"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Content */}
						<div className="p-4">{currentTourStep?.content}</div>

					{/* Progress Bar */}
					<div className="px-4 pb-2">
						<div
							className="onboarding-progress-track w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"
							role="progressbar"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={roundedProgress}
							aria-label={`Onboarding progress ${roundedProgress}%`}
							style={progressStyle}
						>
							<div
								className={clsx(
									"onboarding-progress-fill bg-blue-500 h-1.5 rounded-full",
									!prefersReducedMotion && "transition-all duration-300",
								)}
							/>
						</div>
						<div className="onboarding-progress-summary flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
							<span>
								{step + 1} of {tourSteps.length}
							</span>
							<span className="onboarding-progress-percent" aria-live="polite">
								{roundedProgress}% complete
							</span>
						</div>
					</div>

						{/* Actions */}
						<div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
							<div className="flex items-center gap-2">
								{currentTourStep?.showPrev && step > 0 && (
									<button
										type="button"
										onClick={handlePrev}
										className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
									>
										<ChevronLeft className="w-4 h-4" />
										Previous
									</button>
								)}

								{currentTourStep?.autoAdvance && (
									<button
										type="button"
										onClick={togglePause}
										className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
										aria-label={
											isPaused ? "Resume auto-advance" : "Pause auto-advance"
										}
									>
										{isPaused ? (
											<Play className="w-4 h-4" />
										) : (
											<Pause className="w-4 h-4" />
										)}
									</button>
								)}
							</div>

							<div className="flex items-center gap-2">
								{currentTourStep?.canSkip && step < tourSteps.length - 1 && (
									<button
										type="button"
										onClick={handleSkip}
										className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
									>
										Skip Tour
									</button>
								)}

								{/* Contextual action: Do it for me */}
								{(() => {
									const ev = getActionEventForStep(currentTourStep?.id || "");
									if (!ev) return null;
									return (
										<button
											type="button"
											onClick={() => {
												try {
													window.dispatchEvent(new CustomEvent(ev));
												} catch {}
												// Delay closing the tour to allow the modal to open first
												setTimeout(() => {
													try {
														onSkip();
													} catch {}
												}, 100);
											}}
											className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
											aria-label="Do it for me"
										>
											Do it for me
										</button>
									);
								})()}

								{currentTourStep?.showNext && (
									<button
										type="button"
										onClick={handleNext}
										className="flex items-center gap-1 px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
									>
										{step === tourSteps.length - 1 ? "Get Started" : "Next"}
										{step < tourSteps.length - 1 && (
											<ChevronRight className="w-4 h-4" />
										)}
									</button>
								)}
							</div>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}

// Helper function to get highlight clip path
function getTargetRect(selector: string): DOMRect | null {
	const element = document.querySelector(selector) as HTMLElement | null;
	if (!element) return null;
	return element.getBoundingClientRect();
}

// Helper function to get position classes
function getCardPositionStyle(
	position: string,
	target?: string,
): React.CSSProperties {
	if (!target || position === "center") {
		return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
	}
	const rect = getTargetRect(target);
	if (!rect) {
		return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
	}
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;
	const placements: Record<string, React.CSSProperties> = {
		top: { left: centerX, top: rect.top - 20, transform: "translateX(-50%)" },
		bottom: {
			left: centerX,
			top: rect.bottom + 20,
			transform: "translateX(-50%)",
		},
		left: { left: rect.left - 20, top: centerY, transform: "translateY(-50%)" },
		right: {
			left: rect.right + 20,
			top: centerY,
			transform: "translateY(-50%)",
		},
	};
	return (
		placements[position] ?? {
			top: "50%",
			left: "50%",
			transform: "translate(-50%, -50%)",
		}
	);
}

// Helper to map a position to Tailwind classes (target is currently ignored)
function getPositionClasses(
	position: "top" | "bottom" | "left" | "right" | "center",
	_target?: string,
): string {
	const classes: Record<typeof position, string> = {
		top: "top-4 left-1/2 -translate-x-1/2",
		bottom: "bottom-4 left-1/2 -translate-x-1/2",
		left: "left-4 top-1/2 -translate-y-1/2",
		right: "right-4 top-1/2 -translate-y-1/2",
		center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
	};
	return classes[position] ?? classes.center;
}

// Contextual Hint Component
interface ContextualHintProps {
	message: string;
	action?: string;
	position: "top" | "bottom" | "left" | "right" | "center";
	target?: string;
	onDismiss?: () => void;
	autoHide?: number;
}

export function ContextualHint({
	message,
	action,
	position,
	target,
	onDismiss,
	autoHide,
}: ContextualHintProps) {
	const [isVisible, setIsVisible] = useState(true);
	const prefersReducedMotion = useReducedMotion();

	useEffect(() => {
		if (autoHide) {
			const timer = setTimeout(() => {
				setIsVisible(false);
				onDismiss?.();
			}, autoHide * 1000);

			return () => clearTimeout(timer);
		}
	}, [autoHide, onDismiss]);

	// Auto-dismiss when user interacts with the target (focus/type/click)
	useEffect(() => {
		if (!target) return;
		const el = document.querySelector(target) as HTMLElement | null;
		if (!el) return;
		const dismiss = () => {
			setIsVisible(false);
			onDismiss?.();
		};
		el.addEventListener("focus", dismiss, true);
		el.addEventListener("input", dismiss, true);
		el.addEventListener("click", dismiss, true);
		return () => {
			el.removeEventListener("focus", dismiss, true);
			el.removeEventListener("input", dismiss, true);
			el.removeEventListener("click", dismiss, true);
		};
	}, [target, onDismiss]);

	if (!isVisible) return null;

	return (
		<motion.div
			initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
			className={clsx(
				"absolute z-40 pointer-events-auto",
				getPositionClasses(position, target),
			)}
		>
			<div className="bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-xs">
				<div className="flex items-start gap-3">
					<Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
					<div className="flex-1">
						<p className="text-sm font-medium">{message}</p>
						{action && <p className="text-xs opacity-90 mt-1">{action}</p>}
					</div>
					{onDismiss && (
						<button
							type="button"
							onClick={() => {
								setIsVisible(false);
								onDismiss();
							}}
							className="flex-shrink-0 p-1 hover:bg-blue-600 rounded transition-colors"
							aria-label="Dismiss hint"
						>
							<X className="w-3 h-3" />
						</button>
					)}
				</div>
			</div>
		</motion.div>
	);
}

// Hook for managing onboarding state
export function useOnboarding() {
	const [hasCompletedTour, setHasCompletedTour] = useState(false);
	const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
	const [currentTourStep, setCurrentTourStep] = useState(0);

	useEffect(() => {
		const completed = localStorage.getItem("onboarding-completed");
		const dismissed = localStorage.getItem("dismissed-hints");

		if (completed === "true") {
			setHasCompletedTour(true);
		}

		if (dismissed) {
			try {
				setDismissedHints(new Set(JSON.parse(dismissed)));
			} catch (e) {
				console.warn("Failed to parse dismissed hints:", e);
			}
		}
	}, []);

	const completeTour = () => {
		setHasCompletedTour(true);
		localStorage.setItem("onboarding-completed", "true");
	};

	const dismissHint = (hintId: string) => {
		const newDismissed = new Set([...dismissedHints, hintId]);
		setDismissedHints(newDismissed);
		localStorage.setItem("dismissed-hints", JSON.stringify([...newDismissed]));
	};

	const shouldShowHint = (hintId: string) => {
		return !dismissedHints.has(hintId);
	};

	return {
		hasCompletedTour,
		currentTourStep,
		setCurrentTourStep,
		completeTour,
		dismissHint,
		shouldShowHint,
	};
}
