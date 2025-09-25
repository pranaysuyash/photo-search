/**
 * LayoutContext - Provides layout-related state and settings
 * This context manages mobile responsiveness, sidebar state, accessibility settings,
 * and theme preferences to reduce prop drilling in layout components.
 */
import type React from "react";
import { createContext, useContext } from "react";
import type { AccessibilitySettings } from "../components/AccessibilityPanel";

// Define the shape of our layout context
interface LayoutContextType {
	// Mobile and responsive state
	isMobile: boolean;

	// Sidebar state
	showModernSidebar: boolean;
	setShowModernSidebar: (value: boolean) => void;

	// Swipe gestures
	handleSwipeLeft: () => void;
	handleSwipeRight: () => void;
	handlePullToRefresh: () => void;

	// Accessibility
	accessibilitySettings: AccessibilitySettings | null;
	showAccessibilityPanel: boolean;
	setShowAccessibilityPanel: (value: boolean) => void;
	prefersReducedMotion: boolean;

	// Theme
	themeMode: string;
	setThemeMode: (mode: string) => void;
	highContrast: boolean;
}

// Create the context with a default value
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

// Provider component
interface LayoutProviderProps {
	children: React.ReactNode;
	value: LayoutContextType;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({
	children,
	value,
}) => {
	return (
		<LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
	);
};

// Hook to consume the context
export const useLayoutContext = (): LayoutContextType => {
	const context = useContext(LayoutContext);
	if (context === undefined) {
		throw new Error("useLayoutContext must be used within a LayoutProvider");
	}
	return context;
};

// Selector hooks for specific layout state
export const useMobileState = (): Pick<LayoutContextType, "isMobile"> => {
	const context = useLayoutContext();
	return {
		isMobile: context.isMobile,
	};
};

export const useSidebarState = (): Pick<
	LayoutContextType,
	"showModernSidebar" | "setShowModernSidebar"
> => {
	const context = useLayoutContext();
	return {
		showModernSidebar: context.showModernSidebar,
		setShowModernSidebar: context.setShowModernSidebar,
	};
};

export const useSwipeGestures = (): Pick<
	LayoutContextType,
	"handleSwipeLeft" | "handleSwipeRight" | "handlePullToRefresh"
> => {
	const context = useLayoutContext();
	return {
		handleSwipeLeft: context.handleSwipeLeft,
		handleSwipeRight: context.handleSwipeRight,
		handlePullToRefresh: context.handlePullToRefresh,
	};
};

export const useAccessibility = (): Pick<
	LayoutContextType,
	| "accessibilitySettings"
	| "showAccessibilityPanel"
	| "setShowAccessibilityPanel"
	| "prefersReducedMotion"
> => {
	const context = useLayoutContext();
	return {
		accessibilitySettings: context.accessibilitySettings,
		showAccessibilityPanel: context.showAccessibilityPanel,
		setShowAccessibilityPanel: context.setShowAccessibilityPanel,
		prefersReducedMotion: context.prefersReducedMotion,
	};
};

export const useTheme = (): Pick<
	LayoutContextType,
	"themeMode" | "setThemeMode" | "highContrast"
> => {
	const context = useLayoutContext();
	return {
		themeMode: context.themeMode,
		setThemeMode: context.setThemeMode,
		highContrast: context.highContrast,
	};
};

export default LayoutContext;
