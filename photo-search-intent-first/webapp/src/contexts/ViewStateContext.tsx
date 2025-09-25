/**
 * ViewStateContext - Provides view state management for search, selection, and UI state
 * This context manages search text, selected photos, grid settings, filters, and other
 * view-specific state to reduce prop drilling in view components.
 */
import type React from "react";
import { createContext, useContext } from "react";
import type { ResultView } from "./ResultsConfigContext";

// Define the shape of our view state context
interface ViewStateContextType {
	// Search state
	searchText: string;
	setSearchText: (value: string) => void;

	// Selection state
	selected: Set<string>;
	setSelected: (value: Set<string>) => void;
	toggleSelect: (path: string) => void;

	// Grid and view settings
	gridSize: "small" | "medium" | "large";
	setGridSize: (size: "small" | "medium" | "large") => void;
	resultView: ResultView;
	setResultView: (view: ResultView) => void;
	timelineBucket: "day" | "week" | "month";
	setTimelineBucket: (bucket: "day" | "week" | "month") => void;

	// Filter state
	currentFilter: string;
	setCurrentFilter: (value: string) => void;
	showFilters: boolean;
	setShowFilters: (show: boolean | ((prev: boolean) => boolean)) => void;
	dateFrom: string;
	setDateFrom: (value: string) => void;
	dateTo: string;
	setDateTo: (value: string) => void;
	ratingMin: number;
	setRatingMin: (value: number) => void;

	// Detail view state
	detailIdx: number | null;
	setDetailIdx: (value: number | null) => void;
	focusIdx: number | null;
	setFocusIdx: (value: number | null) => void;

	// Layout state
	layoutRows: number[][];
	setLayoutRows: (rows: number[][]) => void;

	// Panel state
	showRecentActivity: boolean;
	setShowRecentActivity: (value: boolean) => void;
	showSearchHistory: boolean;
	setShowSearchHistory: (value: boolean) => void;

	// Navigation state
	bottomNavTab: "home" | "search" | "favorites" | "settings";
	setBottomNavTab: (tab: "home" | "search" | "favorites" | "settings") => void;

	// Authentication state
	authRequired: boolean;
	setAuthRequired: (value: boolean) => void;
	authTokenInput: string;
	setAuthTokenInput: (value: string) => void;

	// Current view (for routing)
	currentView: string;
}

// Create the context with a default value
const ViewStateContext = createContext<ViewStateContextType | undefined>(
	undefined,
);

// Provider component
interface ViewStateProviderProps {
	children: React.ReactNode;
	value: ViewStateContextType;
}

export const ViewStateProvider: React.FC<ViewStateProviderProps> = ({
	children,
	value,
}) => {
	return (
		<ViewStateContext.Provider value={value}>
			{children}
		</ViewStateContext.Provider>
	);
};

// Hook to consume the context
export const useViewStateContext = (): ViewStateContextType => {
	const context = useContext(ViewStateContext);
	if (context === undefined) {
		throw new Error(
			"useViewStateContext must be used within a ViewStateProvider",
		);
	}
	return context;
};

// Selector hooks for specific view state
export const useSearchState = (): Pick<
	ViewStateContextType,
	"searchText" | "setSearchText"
> => {
	const context = useViewStateContext();
	return {
		searchText: context.searchText,
		setSearchText: context.setSearchText,
	};
};

export const useSelectionState = (): Pick<
	ViewStateContextType,
	"selected" | "setSelected" | "toggleSelect"
> => {
	const context = useViewStateContext();
	return {
		selected: context.selected,
		setSelected: context.setSelected,
		toggleSelect: context.toggleSelect,
	};
};

export const useGridState = (): Pick<
	ViewStateContextType,
	| "gridSize"
	| "setGridSize"
	| "resultView"
	| "setResultView"
	| "timelineBucket"
	| "setTimelineBucket"
> => {
	const context = useViewStateContext();
	return {
		gridSize: context.gridSize,
		setGridSize: context.setGridSize,
		resultView: context.resultView,
		setResultView: context.setResultView,
		timelineBucket: context.timelineBucket,
		setTimelineBucket: context.setTimelineBucket,
	};
};

export const useFilterState = (): Pick<
	ViewStateContextType,
	| "currentFilter"
	| "setCurrentFilter"
	| "showFilters"
	| "setShowFilters"
	| "dateFrom"
	| "setDateFrom"
	| "dateTo"
	| "setDateTo"
	| "ratingMin"
	| "setRatingMin"
> => {
	const context = useViewStateContext();
	return {
		currentFilter: context.currentFilter,
		setCurrentFilter: context.setCurrentFilter,
		showFilters: context.showFilters,
		setShowFilters: context.setShowFilters,
		dateFrom: context.dateFrom,
		setDateFrom: context.setDateFrom,
		dateTo: context.dateTo,
		setDateTo: context.setDateTo,
		ratingMin: context.ratingMin,
		setRatingMin: context.setRatingMin,
	};
};

export const useDetailState = (): Pick<
	ViewStateContextType,
	"detailIdx" | "setDetailIdx" | "focusIdx" | "setFocusIdx"
> => {
	const context = useViewStateContext();
	return {
		detailIdx: context.detailIdx,
		setDetailIdx: context.setDetailIdx,
		focusIdx: context.focusIdx,
		setFocusIdx: context.setFocusIdx,
	};
};

export const useLayoutState = (): Pick<
	ViewStateContextType,
	"layoutRows" | "setLayoutRows"
> => {
	const context = useViewStateContext();
	return {
		layoutRows: context.layoutRows,
		setLayoutRows: context.setLayoutRows,
	};
};

export const usePanelState = (): Pick<
	ViewStateContextType,
	| "showRecentActivity"
	| "setShowRecentActivity"
	| "showSearchHistory"
	| "setShowSearchHistory"
> => {
	const context = useViewStateContext();
	return {
		showRecentActivity: context.showRecentActivity,
		setShowRecentActivity: context.setShowRecentActivity,
		showSearchHistory: context.showSearchHistory,
		setShowSearchHistory: context.setShowSearchHistory,
	};
};

export const useNavigationState = (): Pick<
	ViewStateContextType,
	"bottomNavTab" | "setBottomNavTab"
> => {
	const context = useViewStateContext();
	return {
		bottomNavTab: context.bottomNavTab,
		setBottomNavTab: context.setBottomNavTab,
	};
};

export const useAuthState = (): Pick<
	ViewStateContextType,
	"authRequired" | "setAuthRequired" | "authTokenInput" | "setAuthTokenInput"
> => {
	const context = useViewStateContext();
	return {
		authRequired: context.authRequired,
		setAuthRequired: context.setAuthRequired,
		authTokenInput: context.authTokenInput,
		setAuthTokenInput: context.setAuthTokenInput,
	};
};

export default ViewStateContext;
