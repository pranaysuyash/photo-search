/**
 * OnboardingContext - Provides onboarding and tutorial state management
 * This context manages welcome screens, onboarding tours, help hints, and
 * progressive disclosure features to guide users through the application.
 */
import type React from "react";
import { createContext, useContext } from "react";

// Define the shape of our onboarding context
interface OnboardingContextType {
	// Welcome and initial setup
	showWelcome: boolean;
	enableDemoLibrary: boolean;
	handleWelcomeStartDemo: () => Promise<void>;

	// Onboarding flow
	showOnboarding: boolean;
	setShowOnboarding: (value: boolean) => void;
	handleFirstRunQuickStart: (paths: string[]) => Promise<void>;
	handleFirstRunCustom: () => void;
	handleFirstRunDemo: () => Promise<void>;
	handleOnboardingComplete: () => void;

	// Tour and guidance
	showOnboardingTour: boolean;
	setShowOnboardingTour: (value: boolean) => void;

	// Help and hints
	showHelpHint: boolean;
	dismissHelpHint: () => void;
	showContextualHelp: boolean;
	setShowContextualHelp: (value: boolean) => void;
	showOnboardingChecklist: boolean;
	setShowOnboardingChecklist: (value: boolean) => void;

	// Progress tracking
	userActions: unknown;
	onboardingSteps: unknown;
	completeOnboardingStep: (stepId: string) => void;
}

// Create the context with a default value
const OnboardingContext = createContext<OnboardingContextType | undefined>(
	undefined,
);

// Provider component
interface OnboardingProviderProps {
	children: React.ReactNode;
	value: OnboardingContextType;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
	children,
	value,
}) => {
	return (
		<OnboardingContext.Provider value={value}>
			{children}
		</OnboardingContext.Provider>
	);
};

// Hook to consume the context
export const useOnboardingContext = (): OnboardingContextType => {
	const context = useContext(OnboardingContext);
	if (context === undefined) {
		throw new Error(
			"useOnboardingContext must be used within an OnboardingProvider",
		);
	}
	return context;
};

// Selector hooks for specific onboarding state
export const useWelcomeState = (): Pick<
	OnboardingContextType,
	"showWelcome" | "enableDemoLibrary" | "handleWelcomeStartDemo"
> => {
	const context = useOnboardingContext();
	return {
		showWelcome: context.showWelcome,
		enableDemoLibrary: context.enableDemoLibrary,
		handleWelcomeStartDemo: context.handleWelcomeStartDemo,
	};
};

export const useOnboardingFlow = (): Pick<
	OnboardingContextType,
	| "showOnboarding"
	| "setShowOnboarding"
	| "handleFirstRunQuickStart"
	| "handleFirstRunCustom"
	| "handleFirstRunDemo"
	| "handleOnboardingComplete"
> => {
	const context = useOnboardingContext();
	return {
		showOnboarding: context.showOnboarding,
		setShowOnboarding: context.setShowOnboarding,
		handleFirstRunQuickStart: context.handleFirstRunQuickStart,
		handleFirstRunCustom: context.handleFirstRunCustom,
		handleFirstRunDemo: context.handleFirstRunDemo,
		handleOnboardingComplete: context.handleOnboardingComplete,
	};
};

export const useTourState = (): Pick<
	OnboardingContextType,
	"showOnboardingTour" | "setShowOnboardingTour"
> => {
	const context = useOnboardingContext();
	return {
		showOnboardingTour: context.showOnboardingTour,
		setShowOnboardingTour: context.setShowOnboardingTour,
	};
};

export const useHelpState = (): Pick<
	OnboardingContextType,
	| "showHelpHint"
	| "dismissHelpHint"
	| "showContextualHelp"
	| "setShowContextualHelp"
	| "showOnboardingChecklist"
	| "setShowOnboardingChecklist"
> => {
	const context = useOnboardingContext();
	return {
		showHelpHint: context.showHelpHint,
		dismissHelpHint: context.dismissHelpHint,
		showContextualHelp: context.showContextualHelp,
		setShowContextualHelp: context.setShowContextualHelp,
		showOnboardingChecklist: context.showOnboardingChecklist,
		setShowOnboardingChecklist: context.setShowOnboardingChecklist,
	};
};

export const useOnboardingProgress = (): Pick<
	OnboardingContextType,
	"userActions" | "onboardingSteps" | "completeOnboardingStep"
> => {
	const context = useOnboardingContext();
	return {
		userActions: context.userActions,
		onboardingSteps: context.onboardingSteps,
		completeOnboardingStep: context.completeOnboardingStep,
	};
};

export default OnboardingContext;
