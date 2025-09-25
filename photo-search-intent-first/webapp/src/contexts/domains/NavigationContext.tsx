/**
 * NavigationContext - Provides navigation and routing operations
 * This context encapsulates all navigation functionality including detail views,
 * routing management, and navigation state.
 */
import type React from "react";
import { createContext, useContext, useMemo } from "react";

// Define the shape of our navigation context
interface NavigationContextType {
	// Navigation operations
	openDetailByPath: (path: string) => void;
	navDetail: (delta: number) => void;
	navigateToView: (view: string, params?: Record<string, unknown>) => void;
	navigateBack: () => void;
	navigateForward: () => void;

	// Navigation state
	currentView: string;
	currentPath: string;
	navigationHistory: string[];
	canGoBack: boolean;
	canGoForward: boolean;

	// Navigation setters
	setCurrentView: (view: string) => void;
	setCurrentPath: (path: string) => void;
	setNavigationHistory: (history: string[]) => void;
	setCanGoBack: (canGoBack: boolean) => void;
	setCanGoForward: (canGoForward: boolean) => void;

	// Detail view operations
	detailPath: string;
	detailIndex: number;
	detailTotal: number;
	isDetailViewOpen: boolean;
	setDetailPath: (path: string) => void;
	setDetailIndex: (index: number) => void;
	setDetailTotal: (total: number) => void;
	setIsDetailViewOpen: (isOpen: boolean) => void;
	closeDetailView: () => void;

	// Routing utilities
	generateRoute: (view: string, params?: Record<string, unknown>) => string;
	parseRoute: (route: string) => {
		view: string;
		params: Record<string, unknown>;
	};
}

// Create the context with a default value
const NavigationContext = createContext<NavigationContextType | undefined>(
	undefined,
);

// Provider component props
interface NavigationProviderProps {
	children: React.ReactNode;
	value: NavigationContextType;
}

// Provider component
export const NavigationProvider: React.FC<NavigationProviderProps> = ({
	children,
	value,
}) => {
	return (
		<NavigationContext.Provider value={value}>
			{children}
		</NavigationContext.Provider>
	);
};

// Hook to consume the context
export const useNavigationContext = (): NavigationContextType => {
	const context = useContext(NavigationContext);
	if (context === undefined) {
		throw new Error(
			"useNavigationContext must be used within a NavigationProvider",
		);
	}
	return context;
};

// Selector hooks for specific navigation operations
export const useNavigationOperations = (): Pick<
	NavigationContextType,
	| "openDetailByPath"
	| "navDetail"
	| "navigateToView"
	| "navigateBack"
	| "navigateForward"
> => {
	const context = useNavigationContext();
	return useMemo(
		() => ({
			openDetailByPath: context.openDetailByPath,
			navDetail: context.navDetail,
			navigateToView: context.navigateToView,
			navigateBack: context.navigateBack,
			navigateForward: context.navigateForward,
		}),
		[
			context.openDetailByPath,
			context.navDetail,
			context.navigateToView,
			context.navigateBack,
			context.navigateForward,
		],
	);
};

export const useNavigationState = (): Pick<
	NavigationContextType,
	| "currentView"
	| "currentPath"
	| "navigationHistory"
	| "canGoBack"
	| "canGoForward"
	| "setCurrentView"
	| "setCurrentPath"
	| "setNavigationHistory"
	| "setCanGoBack"
	| "setCanGoForward"
> => {
	const context = useNavigationContext();
	return useMemo(
		() => ({
			currentView: context.currentView,
			currentPath: context.currentPath,
			navigationHistory: context.navigationHistory,
			canGoBack: context.canGoBack,
			canGoForward: context.canGoForward,
			setCurrentView: context.setCurrentView,
			setCurrentPath: context.setCurrentPath,
			setNavigationHistory: context.setNavigationHistory,
			setCanGoBack: context.setCanGoBack,
			setCanGoForward: context.setCanGoForward,
		}),
		[
			context.currentView,
			context.currentPath,
			context.navigationHistory,
			context.canGoBack,
			context.canGoForward,
			context.setCurrentView,
			context.setCurrentPath,
			context.setNavigationHistory,
			context.setCanGoBack,
			context.setCanGoForward,
		],
	);
};

export const useDetailViewOperations = (): Pick<
	NavigationContextType,
	| "detailPath"
	| "detailIndex"
	| "detailTotal"
	| "isDetailViewOpen"
	| "setDetailPath"
	| "setDetailIndex"
	| "setDetailTotal"
	| "setIsDetailViewOpen"
	| "closeDetailView"
> => {
	const context = useNavigationContext();
	return useMemo(
		() => ({
			detailPath: context.detailPath,
			detailIndex: context.detailIndex,
			detailTotal: context.detailTotal,
			isDetailViewOpen: context.isDetailViewOpen,
			setDetailPath: context.setDetailPath,
			setDetailIndex: context.setDetailIndex,
			setDetailTotal: context.setDetailTotal,
			setIsDetailViewOpen: context.setIsDetailViewOpen,
			closeDetailView: context.closeDetailView,
		}),
		[
			context.detailPath,
			context.detailIndex,
			context.detailTotal,
			context.isDetailViewOpen,
			context.setDetailPath,
			context.setDetailIndex,
			context.setDetailTotal,
			context.setIsDetailViewOpen,
			context.closeDetailView,
		],
	);
};

export const useRoutingUtilities = (): Pick<
	NavigationContextType,
	"generateRoute" | "parseRoute"
> => {
	const context = useNavigationContext();
	return useMemo(
		() => ({
			generateRoute: context.generateRoute,
			parseRoute: context.parseRoute,
		}),
		[context.generateRoute, context.parseRoute],
	);
};

export default NavigationContext;
