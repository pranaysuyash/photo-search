import { useCallback, useEffect, useState } from "react";
import { useHintTriggers } from "../components/HintSystem";
import type { View } from "../utils/router";

export type OnboardingStep =
	| "select_directory"
	| "index_photos"
	| "first_search"
	| "explore_features";

export type OnboardingFlow =
	| "first-time-user"
	| "returning-user"
	| "feature-discovery";

type UserAction = "searched" | "selected_directory" | "indexed";

interface UseOnboardingFlowsArgs {
	hasCompletedTour: boolean;
	currentView: View;
	dir?: string | null;
	library?: Array<unknown> | null;
	searchText: string;
}

interface UseOnboardingFlowsResult {
	showOnboardingTour: boolean;
	setShowOnboardingTour: (value: boolean) => void;
	showHelpHint: boolean;
	dismissHelpHint: () => void;
	userActions: UserAction[];
	onboardingSteps: OnboardingStep[];
	completeOnboardingStep: (step: OnboardingStep) => void;
	showContextualHelp: boolean;
	setShowContextualHelp: (value: boolean) => void;
	showOnboardingChecklist: boolean;
	setShowOnboardingChecklist: (value: boolean) => void;
	// Enhanced flow management
	currentFlow: OnboardingFlow | null;
	startFlow: (flow: OnboardingFlow) => void;
	triggerHint: (hintId: string) => void;
	showTour: () => void;
	showChecklist: () => void;
	showContextualHelpForContext: (context: string) => void;
}

const HELP_HINT_KEY = "ps_hint_help_seen";
const USER_ACTIONS_KEY = "userActions";
const ONBOARDING_STEPS_KEY = "onboardingSteps";
const ONBOARDING_COMPLETE_KEY = "onboardingComplete";

function readStringArray(key: string): string[] {
	try {
		const stored = localStorage.getItem(key);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

export function useOnboardingFlows({
	hasCompletedTour,
	currentView,
	dir,
	library,
	searchText,
}: UseOnboardingFlowsArgs): UseOnboardingFlowsResult {
	const [showOnboardingTour, setShowOnboardingTour] = useState(
		() => !hasCompletedTour,
	);
	useEffect(() => {
		if (hasCompletedTour) {
			setShowOnboardingTour(false);
		}
	}, [hasCompletedTour]);

	const [showHelpHint, setShowHelpHint] = useState(() => {
		try {
			const seen = localStorage.getItem(HELP_HINT_KEY);
			return !seen;
		} catch {
			return true;
		}
	});

	const dismissHelpHint = useCallback(() => {
		setShowHelpHint(false);
		try {
			localStorage.setItem(HELP_HINT_KEY, "1");
		} catch {}
	}, []);

	const [userActions, setUserActions] = useState<UserAction[]>(
		() => readStringArray(USER_ACTIONS_KEY) as UserAction[],
	);
	const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>(
		() => readStringArray(ONBOARDING_STEPS_KEY) as OnboardingStep[],
	);

	const completeOnboardingStep = useCallback((step: OnboardingStep) => {
		const prerequisites: Record<OnboardingStep, OnboardingStep[]> = {
			select_directory: [],
			index_photos: ["select_directory"],
			first_search: ["index_photos"],
			explore_features: ["first_search"],
		};
		setOnboardingSteps((prev) => {
			if (prev.includes(step)) return prev;
			const required = prerequisites[step] || [];
			if (!required.every((s) => prev.includes(s))) return prev;
			const next = [...prev, step];
			try {
				localStorage.setItem(ONBOARDING_STEPS_KEY, JSON.stringify(next));
			} catch {}
			return next;
		});
	}, []);

	useEffect(() => {
		if (!searchText?.trim()) return;
		setUserActions((prev) => {
			if (prev.includes("searched")) return prev;
			const next = [...prev, "searched"];
			try {
				localStorage.setItem(USER_ACTIONS_KEY, JSON.stringify(next));
			} catch {}
			return next;
		});
	}, [searchText]);

	useEffect(() => {
		if (!dir) return;
		setUserActions((prev) => {
			if (prev.includes("selected_directory")) return prev;
			const next = [...prev, "selected_directory"];
			try {
				localStorage.setItem(USER_ACTIONS_KEY, JSON.stringify(next));
			} catch {}
			return next;
		});
		completeOnboardingStep("select_directory");
	}, [dir, completeOnboardingStep]);

	useEffect(() => {
		if (!library || library.length === 0) return;
		setUserActions((prev) => {
			if (prev.includes("indexed")) return prev;
			const next = [...prev, "indexed"];
			try {
				localStorage.setItem(USER_ACTIONS_KEY, JSON.stringify(next));
			} catch {}
			return next;
		});
	}, [library]);

	useEffect(() => {
		const exploringViews: View[] = [
			"collections",
			"saved",
			"smart",
			"trips",
			"videos",
			"people",
			"map",
		];
		if (exploringViews.includes(currentView)) {
			completeOnboardingStep("explore_features");
		}
	}, [currentView, completeOnboardingStep]);

	const [showContextualHelp, setShowContextualHelp] = useState(false);
	useEffect(() => {
		const shouldShowHelp = () => {
			// Show help for new users who haven't completed basic onboarding
			if (userActions.length === 0 && !hasCompletedTour) return true;

			// Show contextual help based on current view and user progress
			if (currentView === "results" && !userActions.includes("searched")) {
				return true; // Help with search results
			}
			if (
				currentView === "library" &&
				dir &&
				!userActions.includes("searched")
			) {
				return true; // Help with library navigation
			}
			if (
				currentView === "collections" &&
				!onboardingSteps.includes("explore_features")
			) {
				return true; // Help with collections
			}
			if (
				currentView === "map" &&
				!onboardingSteps.includes("explore_features")
			) {
				return true; // Help with map view
			}

			// Show help for advanced features if user is experienced but hasn't explored
			const isExperiencedUser = userActions.length >= 3;
			if (isExperiencedUser) {
				if (
					currentView === "results" &&
					searchText &&
					!onboardingSteps.includes("first_search")
				) {
					return true; // Help with advanced search
				}
			}

			return false;
		};
		setShowContextualHelp(shouldShowHelp());
	}, [
		currentView,
		dir,
		userActions,
		hasCompletedTour,
		onboardingSteps,
		searchText,
	]);

	const [showOnboardingChecklist, setShowOnboardingChecklist] = useState(false);
	useEffect(() => {
		const hasCompleted = (() => {
			try {
				return Boolean(localStorage.getItem(ONBOARDING_COMPLETE_KEY));
			} catch {
				return false;
			}
		})();
		const shouldShow =
			!hasCompleted && Boolean(dir) && Boolean(library?.length);
		setShowOnboardingChecklist(shouldShow);
	}, [dir, library]);

	const [currentFlow, setCurrentFlow] = useState<OnboardingFlow | null>(null);

	const startFlow = useCallback((flow: OnboardingFlow) => {
		setCurrentFlow(flow);
	}, []);

	const { triggerHint: triggerHintFromContext } = useHintTriggers();

	const triggerHint = useCallback(
		(hintId: string, context?: unknown) => {
			triggerHintFromContext(hintId, context);
		},
		[triggerHintFromContext],
	);

	const showTour = useCallback(() => {
		setShowOnboardingTour(true);
	}, []);

	const showChecklist = useCallback(() => {
		setShowOnboardingChecklist(true);
	}, []);

	const showContextualHelpForContext = useCallback(
		(context: string) => {
			setShowContextualHelp(true);
			// Trigger context-specific hints based on the provided context
			if (context === "search") {
				triggerHint("search-success");
			} else if (context === "collections") {
				triggerHint("first-collection-created");
			} else if (context === "map") {
				triggerHint("feature-discovery", { feature: "map", view: currentView });
			}
		},
		[triggerHint, currentView],
	);

	return {
		showOnboardingTour,
		setShowOnboardingTour,
		showHelpHint,
		dismissHelpHint,
		userActions,
		onboardingSteps,
		completeOnboardingStep,
		showContextualHelp,
		setShowContextualHelp,
		showOnboardingChecklist,
		setShowOnboardingChecklist,
		// Enhanced flow management
		currentFlow,
		startFlow,
		triggerHint,
		showTour,
		showChecklist,
		showContextualHelpForContext,
	};
}

export default useOnboardingFlows;
