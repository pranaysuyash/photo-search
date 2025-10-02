// Enhanced onboarding components and hooks

// Hooks
export {
	useContextualHints,
	useOnboardingProgress,
	useWelcomeState,
} from "../../hooks/useOnboardingProgress";
export { EnhancedFirstRunOnboarding } from "./EnhancedFirstRunOnboarding";

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
	type: "welcome" | "directory" | "options" | "demo" | "complete";
}

// Context integration
import OnboardingContextDefault, {
	useOnboardingContext,
} from "../../contexts/OnboardingContext";
export { useOnboardingContext };
export { OnboardingContextDefault as OnboardingContext };

// Legacy components (for backward compatibility)
export { default as FirstRunSetup } from "../modals/FirstRunSetup";
export { ContextualHint, OnboardingTour } from "../OnboardingTour";
export { Welcome } from "../Welcome";
