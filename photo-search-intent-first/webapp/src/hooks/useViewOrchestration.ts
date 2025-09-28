import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useEnableDemoLibrary } from "../stores/settingsStore";
import { useAppLifecycle } from "./useAppLifecycle.tsx";
import { useDemoLibraryHandlers } from "./useDemoLibraryHandlers";
import { useModalControls } from "./useModalControls";
import { useOnboardingFlows } from "./useOnboardingFlows";
import { useQueryParamFilters } from "./useQueryParamFilters";

export interface ViewConfig {
	id: string;
	title: string;
	path: string;
	icon?: string;
	showInNavigation?: boolean;
	requiresAuth?: boolean;
	requiresData?: boolean;
}

export interface ViewState {
	currentView: string;
	previousView?: string;
	viewHistory: string[];
	availableViews: ViewConfig[];
	canNavigateBack: boolean;
}

export interface ViewActions {
	navigateTo: (viewId: string, options?: { replace?: boolean }) => void;
	navigateBack: () => void;
	refreshCurrentView: () => void;
	shouldShowView: (viewId: string) => boolean;
	getViewTitle: (viewId: string) => string;
}

export function useViewOrchestration() {
	const navigate = useNavigate();
	const { appState, contexts, lifecycleState } = useAppLifecycle();
	const modalControls = useModalControls();
	const enableDemoLibrary = useEnableDemoLibrary();

	// Define all available views
	const availableViews: ViewConfig[] = useMemo(
		() => [
			{
				id: "search",
				title: "Search",
				path: "/",
				icon: "search",
				showInNavigation: true,
			},
			{
				id: "library",
				title: "Library",
				path: "/library",
				icon: "folder",
				showInNavigation: true,
				requiresData: true,
			},
			{
				id: "collections",
				title: "Collections",
				path: "/collections",
				icon: "collection",
				showInNavigation: true,
				requiresData: true,
			},
			{
				id: "people",
				title: "People",
				path: "/people",
				icon: "people",
				showInNavigation: true,
				requiresData: true,
			},
			{
				id: "map",
				title: "Map",
				path: "/map",
				icon: "map",
				showInNavigation: true,
				requiresData: true,
			},
			{
				id: "trips",
				title: "Trips",
				path: "/trips",
				icon: "trip",
				showInNavigation: false, // TODO: implement trips
				requiresData: true,
			},
			{
				id: "settings",
				title: "Settings",
				path: "/settings",
				icon: "settings",
				showInNavigation: true,
			},
			{
				id: "workspace",
				title: "Workspace",
				path: "/workspace",
				icon: "workspace",
				showInNavigation: false,
			},
		],
		[],
	);

	// Setup query param filters (from original App.tsx line 788)
	useQueryParamFilters({
		location: appState.location,
		searchText: appState.localState.searchText,
		setSearchText: appState.actions.setSearchText,
		setDateFrom: appState.actions.setDateFrom,
		setDateTo: appState.actions.setDateTo,
		setRatingMin: appState.actions.setRatingMin,
		setResultViewLocal: appState.actions.setResultView,
		setTimelineBucketLocal: appState.actions.setTimelineBucket,
		photoActions: {
			setFavOnly: appState.stateActions.photoActions.setFavOnly,
			setTagFilter: appState.stateActions.photoActions.setTagFilter,
		},
		settingsActions: {
			setPlace: appState.stateActions.settingsActions.setPlace,
			setHasText: appState.stateActions.settingsActions.setHasText,
			setCamera: appState.stateActions.settingsActions.setCamera,
			setIsoMin: appState.stateActions.settingsActions.setIsoMin,
			setIsoMax: appState.stateActions.settingsActions.setIsoMax,
			setFMin: appState.stateActions.settingsActions.setFMin,
			setFMax: appState.stateActions.settingsActions.setFMax,
			setUseFast: appState.stateActions.settingsActions.setUseFast,
			setFastKind: appState.stateActions.settingsActions.setFastKind,
			setUseCaps: appState.stateActions.settingsActions.setUseCaps,
			setUseOcr: appState.stateActions.settingsActions.setUseOcr,
			setResultView: appState.stateActions.settingsActions.setResultView,
			setTimelineBucket:
				appState.stateActions.settingsActions.setTimelineBucket,
		},
		workspaceActions: {
			setPersons: appState.stateActions.workspaceActions.setPersons,
		},
	});

	// Setup onboarding flows (from original App.tsx line 428)
	const {
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
	} = useOnboardingFlows({
		hasCompletedTour: false, // TODO: get from store
		currentView: appState.currentView,
		dir: appState.viewState.dir,
		library: appState.viewState.library,
		searchText: appState.localState.searchText,
	});

	// Setup demo library handlers (from original App.tsx line 385)
	const {
		handleWelcomeStartDemo,
		handleFirstRunQuickStart,
		handleFirstRunCustom,
		handleFirstRunDemo,
	} = useDemoLibraryHandlers({
		enableDemoLibrary,
		modalControls,
		engine: appState.viewState.engine,
		needsHf: appState.viewState.needsHf,
		hfToken: appState.viewState.hfToken,
		needsOAI: appState.viewState.needsOAI,
		openaiKey: appState.viewState.openaiKey,
		setShowOnboarding: () => {}, // TODO: implement
	});

	// View state
	const viewState: ViewState = useMemo(
		() => ({
			currentView: appState.currentView,
			availableViews,
			canNavigateBack: false, // TODO: implement view history
			viewHistory: [appState.currentView],
		}),
		[appState.currentView, availableViews],
	);

	// Navigation actions
	const navigateTo = useCallback(
		(viewId: string, options?: { replace?: boolean }) => {
			const view = availableViews.find((v) => v.id === viewId);
			if (!view) return;

			// Check if view can be accessed
			if (!shouldShowView(viewId)) {
				console.warn(`Cannot navigate to ${viewId}: requirements not met`);
				return;
			}

			if (options?.replace) {
				navigate(view.path, { replace: true });
			} else {
				navigate(view.path);
			}
		},
		[availableViews, navigate, shouldShowView],
	);

	const navigateBack = useCallback(() => {
		// TODO: implement proper view history
		navigateTo("search");
	}, [navigateTo]);

	const refreshCurrentView = useCallback(() => {
		// TODO: implement view refresh logic
		window.location.reload();
	}, []);

	// View validation
	const shouldShowView = useCallback(
		(viewId: string) => {
			const view = availableViews.find((v) => v.id === viewId);
			if (!view) return false;

			// Check auth requirement
			if (view.requiresAuth && !contexts.connectivity.isAuthenticated) {
				return false;
			}

			// Check data requirement
			if (view.requiresData && !appState.viewState.library.length) {
				return false;
			}

			return true;
		},
		[
			availableViews,
			contexts.connectivity.isAuthenticated,
			appState.viewState.library.length,
		],
	);

	const getViewTitle = useCallback(
		(viewId: string) => {
			const view = availableViews.find((v) => v.id === viewId);
			return view?.title || viewId;
		},
		[availableViews],
	);

	// Determine which components to show based on current view
	const shouldShowSearchBar = useMemo(() => {
		return ["search", "library", "collections"].includes(appState.currentView);
	}, [appState.currentView]);

	const shouldShowResultsPanel = useMemo(() => {
		return appState.currentView === "search" && appState.hasSearchResults;
	}, [appState.currentView, appState.hasSearchResults]);

	const shouldShowSidebar = useMemo(() => {
		return ["search", "library", "collections", "people"].includes(
			appState.currentView,
		);
	}, [appState.currentView]);

	const shouldShowFilters = useMemo(() => {
		return appState.currentView === "search" && appState.hasSearchResults;
	}, [appState.currentView, appState.hasSearchResults]);

	const shouldShowLightbox = useMemo(() => {
		return appState.localState.selected.size > 0;
	}, [appState.localState.selected.size]);

	// View-specific titles
	const getPageTitle = useMemo(() => {
		const viewTitle = getViewTitle(appState.currentView);

		if (appState.currentView === "search" && appState.viewState.query) {
			return `${appState.viewState.query} - ${viewTitle}`;
		}

		if (
			appState.currentView === "collections" &&
			appState.localState.currentFilter !== "all"
		) {
			return `${appState.localState.currentFilter} Collections - ${viewTitle}`;
		}

		return viewTitle;
	}, [
		appState.currentView,
		appState.viewState.query,
		appState.localState.currentFilter,
		getViewTitle,
	]);

	const viewActions: ViewActions = {
		navigateTo,
		navigateBack,
		refreshCurrentView,
		shouldShowView,
		getViewTitle,
	};

	return {
		// State
		viewState,

		// Actions
		viewActions,

		// Derived UI flags
		shouldShowSearchBar,
		shouldShowResultsPanel,
		shouldShowSidebar,
		shouldShowFilters,
		shouldShowLightbox,

		// Onboarding state
		onboarding: {
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
		},

		// Demo handlers
		demoHandlers: {
			handleWelcomeStartDemo,
			handleFirstRunQuickStart,
			handleFirstRunCustom,
			handleFirstRunDemo,
		},

		// Helpers
		getPageTitle,
		getCurrentViewConfig: () =>
			availableViews.find((v) => v.id === appState.currentView),
		getNavigationViews: () =>
			availableViews.filter((v) => v.showInNavigation && shouldShowView(v.id)),
	};
}
