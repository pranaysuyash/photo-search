// Enhanced onboarding components and hooks
export { EnhancedFirstRunOnboarding } from './EnhancedFirstRunOnboarding';

// Hooks
export {
	useOnboardingProgress,
	useWelcomeState,
	useContextualHints,
} from '../../hooks/useOnboardingProgress';

// Types
export interface OnboardingSetupData {
	directory?: string;
	includeVideos: boolean;
	enableDemo: boolean;
	completedSteps: string[];
}

export interface OnboardingStep {
	id: string;
	title: string;
	description: string;
	type: 'welcome' | 'directory' | 'options' | 'demo' | 'complete';
}

// Context integration
import OnboardingContextDefault, { useOnboardingContext } from '../../contexts/OnboardingContext';
export { useOnboardingContext };
export { OnboardingContextDefault as OnboardingContext };

// Legacy components (for backward compatibility)
export { default as FirstRunSetup } from '../modals/FirstRunSetup';
export { OnboardingTour, ContextualHint } from '../OnboardingTour';
export { Welcome } from '../Welcome';