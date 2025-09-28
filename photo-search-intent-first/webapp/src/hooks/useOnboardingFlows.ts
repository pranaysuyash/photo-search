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
	hasCompletedAllSteps: boolean;
	markOnboardingComplete: () => void;
	resetOnboarding: () => void;
}

const HELP_HINT_KEY = "ps_hint_help_seen";
const USER_ACTIONS_KEY = "userActions";
const ONBOARDING_STEPS_KEY = "onboardingSteps";
const ONBOARDING_COMPLETE_KEY = "onboardingComplete";

const ALL_STEPS: OnboardingStep[] = [
	"select_directory",
	"index_photos",
	"first_search",
	"explore_features",
];

function persistArray<T extends string>(key: string, arr: T[]) {
	try {
		localStorage.setItem(key, JSON.stringify(arr));
	} catch {
		/* noop: storage might be unavailable */
	}
}

function readStringArray(key: string): string[] {
	try {
		const stored = localStorage.getItem(key);
		if (!stored) return [];
		const parsed = JSON.parse(stored);
		return Array.isArray(parsed)
			? parsed.filter((x) => typeof x === "string")
			: [];
	} catch {
		/* noop: parse error or storage unavailable */
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
			/* noop */
			return true;
		}
	});

	const dismissHelpHint = useCallback(() => {
		setShowHelpHint(false);
		try {
			localStorage.setItem(HELP_HINT_KEY, "1");
		} catch {
			/* noop */
		}
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
			persistArray<OnboardingStep>(ONBOARDING_STEPS_KEY, next);
			return next;
		});
	}, []);

	useEffect(() => {
		if (!searchText?.trim()) return;
		setUserActions((prev) => {
			if (prev.includes("searched")) return prev;
			const next: UserAction[] = [...prev, "searched"];
			persistArray<UserAction>(USER_ACTIONS_KEY, next);
			return next;
		});
		completeOnboardingStep("first_search");
	}, [searchText, completeOnboardingStep]);

	useEffect(() => {
		if (!dir) return;
		setUserActions((prev) => {
			if (prev.includes("selected_directory")) return prev;
			const next: UserAction[] = [...prev, "selected_directory"];
			persistArray<UserAction>(USER_ACTIONS_KEY, next);
			return next;
		});
		completeOnboardingStep("select_directory");
	}, [dir, completeOnboardingStep]);

	useEffect(() => {
		if (!library || library.length === 0) return;
		setUserActions((prev) => {
			if (prev.includes("indexed")) return prev;
			const next: UserAction[] = [...prev, "indexed"];
			persistArray<UserAction>(USER_ACTIONS_KEY, next);
			return next;
		});
		completeOnboardingStep("index_photos");
	}, [library, completeOnboardingStep]);

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

	const computeShouldShowHelp = useCallback((): boolean => {
		const rules: Array<() => boolean> = [
			() => userActions.length === 0 && !hasCompletedTour,
			() => currentView === "results" && !userActions.includes("searched"),
			() =>
				currentView === "library" &&
				Boolean(dir) &&
				!userActions.includes("searched"),
			() =>
				["collections", "map"].includes(currentView) &&
				!onboardingSteps.includes("explore_features"),
			() =>
				userActions.length >= 3 &&
				currentView === "results" &&
				Boolean(searchText) &&
				!onboardingSteps.includes("first_search"),
		];
		return rules.some((fn) => fn());
	}, [
		hasCompletedTour,
		currentView,
		dir,
		searchText,
		userActions,
		onboardingSteps,
	]);

	useEffect(() => {
		setShowContextualHelp(computeShouldShowHelp());
	}, [computeShouldShowHelp]);

	const [showOnboardingChecklist, setShowOnboardingChecklist] = useState(false);
	useEffect(() => {
		const hasCompleted = (() => {
			try {
				return Boolean(localStorage.getItem(ONBOARDING_COMPLETE_KEY));
			} catch {
				/* noop */
				return false;
			}
		})();
		const shouldShow =
			!hasCompleted && Boolean(dir) && Boolean(library?.length);
		setShowOnboardingChecklist(shouldShow);
	}, [dir, library]);

	useEffect(() => {
		if (ALL_STEPS.every((s) => onboardingSteps.includes(s))) {
			try {
				localStorage.setItem(ONBOARDING_COMPLETE_KEY, "1");
			} catch {
				/* noop */
			}
		}
	}, [onboardingSteps]);

	useEffect(() => {
		function onStorage(e: StorageEvent) {
			if (!e.key) return;
			if (e.key === USER_ACTIONS_KEY) {
				setUserActions(readStringArray(USER_ACTIONS_KEY) as UserAction[]);
			}
			if (e.key === ONBOARDING_STEPS_KEY) {
				setOnboardingSteps(
					readStringArray(ONBOARDING_STEPS_KEY) as OnboardingStep[],
				);
			}
		}
		try {
			window.addEventListener("storage", onStorage);
			return () => window.removeEventListener("storage", onStorage);
		} catch {
			/* noop */
			return () => {};
		}
	}, []);

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

	const hasCompletedAllSteps = ALL_STEPS.every((s) =>
		onboardingSteps.includes(s),
	);

	const markOnboardingComplete = useCallback(() => {
		try {
			localStorage.setItem(ONBOARDING_COMPLETE_KEY, "1");
		} catch {
			/* noop */
		}
		setShowOnboardingChecklist(false);
	}, []);

	const resetOnboarding = useCallback(() => {
		try {
			localStorage.removeItem(HELP_HINT_KEY);
			localStorage.removeItem(USER_ACTIONS_KEY);
			localStorage.removeItem(ONBOARDING_STEPS_KEY);
			localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
		} catch {
			/* noop */
		}
		setShowHelpHint(true);
		setUserActions([]);
		setOnboardingSteps([]);
		setShowOnboardingTour(true);
		setShowContextualHelp(false);
		setShowOnboardingChecklist(false);
		setCurrentFlow(null);
	}, []);

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
		hasCompletedAllSteps,
		markOnboardingComplete,
		resetOnboarding,
	};
}

export default useOnboardingFlows;
