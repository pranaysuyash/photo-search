import { useEffect, useState } from 'react';

interface OnboardingProgress {
	completedSteps: string[];
	currentStep: number;
	skipCount: number;
	lastInteraction: number;
	flowType: 'quick-start' | 'custom' | 'demo' | 'none';
	preferences: {
		includeVideos: boolean;
		enableFaceRecognition: boolean;
		enableAutoIndex: boolean;
	};
	completedAt?: number;
	version: string;
}

const ONBOARDING_VERSION = '1.0.0';
const STORAGE_KEY = 'photosearch-onboarding-progress';

// Helper function to get default progress - moved before hook to avoid TDZ
const getDefaultProgress = (): OnboardingProgress => ({
	completedSteps: [],
	currentStep: 0,
	skipCount: 0,
	lastInteraction: Date.now(),
	flowType: 'none',
	preferences: {
		includeVideos: false,
		enableFaceRecognition: true,
		enableAutoIndex: true,
	},
	version: ONBOARDING_VERSION,
});

interface UseOnboardingProgressReturn {
	progress: OnboardingProgress;
	markStepComplete: (stepId: string) => void;
	setCurrentStep: (step: number) => void;
	skipOnboarding: () => void;
	resetOnboarding: () => void;
	isStepCompleted: (stepId: string) => boolean;
	getCompletionPercentage: () => number;
	hasCompletedOnboarding: boolean;
	canShowWelcome: boolean;
	shouldShowOnboarding: boolean;
}

export const useOnboardingProgress = (): UseOnboardingProgressReturn => {
	const [progress, setProgress] = useState<OnboardingProgress>(() => {
		// Load from localStorage on mount
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Migration: handle old versions
				if (parsed.version !== ONBOARDING_VERSION) {
					return getDefaultProgress();
				}
				return parsed;
			}
		} catch (error) {
			console.debug('Failed to load onboarding progress:', error);
		}
		return getDefaultProgress();
	});

	const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

	// Check completion status
	useEffect(() => {
		const completed = localStorage.getItem('onboarding-completed') === 'true';
		setHasCompletedOnboarding(completed);
	}, []);

	const saveProgress = (newProgress: OnboardingProgress) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
		} catch (error) {
			console.debug('Failed to save onboarding progress:', error);
		}
	};

	const markStepComplete = (stepId: string) => {
		const newProgress: OnboardingProgress = {
			...progress,
			completedSteps: [...new Set([...progress.completedSteps, stepId])],
			lastInteraction: Date.now(),
		};
		setProgress(newProgress);
		saveProgress(newProgress);
	};

	const setCurrentStep = (step: number) => {
		const newProgress: OnboardingProgress = {
			...progress,
			currentStep: step,
			lastInteraction: Date.now(),
		};
		setProgress(newProgress);
		saveProgress(newProgress);
	};

	const skipOnboarding = () => {
		const newProgress: OnboardingProgress = {
			...progress,
			skipCount: progress.skipCount + 1,
			lastInteraction: Date.now(),
			flowType: 'none',
		};
		setProgress(newProgress);
		saveProgress(newProgress);

		// Mark as completed if skipped multiple times
		if (newProgress.skipCount >= 2) {
			try {
				localStorage.setItem('onboarding-completed', 'true');
			} catch (error) {
				console.debug('Failed to mark onboarding as completed:', error);
			}
		}
	};

	const resetOnboarding = () => {
		const newProgress = getDefaultProgress();
		setProgress(newProgress);
		saveProgress(newProgress);

		try {
			localStorage.removeItem('onboarding-completed');
		} catch (error) {
			console.debug('Failed to remove onboarding completion:', error);
		}
	};

	const isStepCompleted = (stepId: string): boolean => {
		return progress.completedSteps.includes(stepId);
	};

	const getCompletionPercentage = (): number => {
		const totalSteps = 5; // welcome, directory, options, demo, complete
		return (progress.completedSteps.length / totalSteps) * 100;
	};

	const canShowWelcome = (): boolean => {
		// Show welcome if user hasn't completed onboarding and hasn't skipped too many times
		return !hasCompletedOnboarding && progress.skipCount < 2;
	};

	const shouldShowOnboarding = (): boolean => {
		// Show onboarding if:
		// 1. User hasn't completed it
		// 2. It's been more than 1 day since last interaction
		// 3. User hasn't skipped it too many times
		if (hasCompletedOnboarding) return false;
		if (progress.skipCount >= 2) return false;

		const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
		return progress.lastInteraction < oneDayAgo;
	};

	return {
		progress,
		markStepComplete,
		setCurrentStep,
		skipOnboarding,
		resetOnboarding,
		isStepCompleted,
		getCompletionPercentage,
		hasCompletedOnboarding,
		canShowWelcome: canShowWelcome(),
		shouldShowOnboarding: shouldShowOnboarding(),
	};
};

// Hook for managing welcome screen state
export const useWelcomeState = () => {
	const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

	useEffect(() => {
		try {
			const seen = localStorage.getItem('welcome-seen') === 'true';
			setHasSeenWelcome(seen);
		} catch (error) {
			console.debug('Failed to load welcome state:', error);
		}
	}, []);

	const markWelcomeSeen = () => {
		try {
			localStorage.setItem('welcome-seen', 'true');
			setHasSeenWelcome(true);
		} catch (error) {
			console.debug('Failed to save welcome state:', error);
		}
	};

	const resetWelcome = () => {
		try {
			localStorage.removeItem('welcome-seen');
			setHasSeenWelcome(false);
		} catch (error) {
			console.debug('Failed to reset welcome state:', error);
		}
	};

	return {
		hasSeenWelcome,
		markWelcomeSeen,
		resetWelcome,
	};
};

// Hook for contextual hints and progressive disclosure
export const useContextualHints = () => {
	const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
	const [hintHistory, setHintHistory] = useState<Array<{ id: string; timestamp: number; action: string }>>([]);

	useEffect(() => {
		try {
			const stored = localStorage.getItem('dismissed-hints');
			if (stored) {
				setDismissedHints(new Set(JSON.parse(stored)));
			}

			const history = localStorage.getItem('hint-history');
			if (history) {
				setHintHistory(JSON.parse(history));
			}
		} catch (error) {
			console.debug('Failed to load hint state:', error);
		}
	}, []);

	const saveHintState = (newDismissed: Set<string>, newHistory: Array<{ id: string; timestamp: number; action: string }>) => {
		try {
			localStorage.setItem('dismissed-hints', JSON.stringify([...newDismissed]));
			localStorage.setItem('hint-history', JSON.stringify(newHistory));
		} catch (error) {
			console.debug('Failed to save hint state:', error);
		}
	};

	const dismissHint = (hintId: string) => {
		const newDismissed = new Set([...dismissedHints, hintId]);
		const newHistory = [...hintHistory, { id: hintId, timestamp: Date.now(), action: 'dismiss' }];
		setDismissedHints(newDismissed);
		setHintHistory(newHistory);
		saveHintState(newDismissed, newHistory);
	};

	const triggerHint = (hintId: string) => {
		const newHistory = [...hintHistory, { id: hintId, timestamp: Date.now(), action: 'trigger' }];
		setHintHistory(newHistory);
		saveHintState(dismissedHints, newHistory);
	};

	const shouldShowHint = (hintId: string): boolean => {
		// Don't show if dismissed
		if (dismissedHints.has(hintId)) return false;

		// Don't show if triggered too recently (within last 5 minutes)
		const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
		const recentTriggers = hintHistory.filter(
			h => h.id === hintId && h.action === 'trigger' && h.timestamp > fiveMinutesAgo
		);

		return recentTriggers.length === 0;
	};

	const resetHints = () => {
		const newDismissed = new Set<string>();
		const newHistory = [...hintHistory, { id: 'reset', timestamp: Date.now(), action: 'reset' }];
		setDismissedHints(newDismissed);
		setHintHistory(newHistory);
		saveHintState(newDismissed, newHistory);
	};

	return {
		dismissedHints,
		hintHistory,
		dismissHint,
		triggerHint,
		shouldShowHint,
		resetHints,
	};
};

export default useOnboardingProgress;