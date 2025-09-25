/**
 * useAccessibility - Custom hook for managing accessibility features
 * This hook provides a convenient way to access and manage accessibility
 * features throughout the application.
 */
import { useCallback, useEffect, useState } from "react";
import { useAccessibilityContext } from "../framework/AccessibilityFramework";

// Hook return type
interface UseAccessibilityReturn {
	// Settings
	settings: AccessibilitySettings;
	updateSettings: (settings: Partial<AccessibilitySettings>) => void;

	// Announcements
	announce: (
		message: string,
		priority?: "polite" | "assertive" | "off",
		options?: AnnouncementOptions,
	) => void;
	announceAction: (
		action: string,
		status?: "started" | "completed" | "failed",
	) => void;
	announceProgress: (progress: number, total: number, message?: string) => void;
	announceError: (error: string, context?: string) => void;

	// Focus management
	focusNext: () => void;
	focusPrevious: () => void;
	focusFirst: () => void;
	focusLast: () => void;
	trapFocus: (container: HTMLElement) => (() => void) | undefined;

	// Keyboard navigation
	enableKeyboardNavigation: () => void;
	disableKeyboardNavigation: () => void;
	isKeyboardNavigationEnabled: boolean;

	// High contrast
	isHighContrast: boolean;
	toggleHighContrast: () => void;

	// Reduced motion
	isReducedMotion: boolean;
	toggleReducedMotion: () => void;

	// Skip links
	skipToMainContent: () => void;
	skipToSearch: () => void;
	skipToNavigation: () => void;

	// Landmark navigation
	goToLandmark: (landmark: LandmarkType) => void;

	// ARIA attributes
	getAriaAttributes: (element: ElementType) => React.AriaAttributes;
}

// Use accessibility hook
export const useAccessibility = (): UseAccessibilityReturn => {
	const context = useAccessibilityContext();

	return {
		// Settings
		settings: context.settings,
		updateSettings: context.updateSettings,

		// Announcements
		announce: context.announce,
		announceAction: context.announceAction,
		announceProgress: context.announceProgress,
		announceError: context.announceError,

		// Focus management
		focusNext: context.focusNext,
		focusPrevious: context.focusPrevious,
		focusFirst: context.focusFirst,
		focusLast: context.focusLast,
		trapFocus: context.trapFocus,

		// Keyboard navigation
		enableKeyboardNavigation: context.enableKeyboardNavigation,
		disableKeyboardNavigation: context.disableKeyboardNavigation,
		isKeyboardNavigationEnabled: context.isKeyboardNavigationEnabled,

		// High contrast
		isHighContrast: context.isHighContrast,
		toggleHighContrast: context.toggleHighContrast,

		// Reduced motion
		isReducedMotion: context.isReducedMotion,
		toggleReducedMotion: context.toggleReducedMotion,

		// Skip links
		skipToMainContent: context.skipToMainContent,
		skipToSearch: context.skipToSearch,
		skipToNavigation: context.skipToNavigation,

		// Landmark navigation
		goToLandmark: context.goToLandmark,

		// ARIA attributes
		getAriaAttributes: context.getAriaAttributes,
	};
};

// Hook for managing focus traps
export const useFocusTrap = (
	isActive: boolean,
): [(element: HTMLElement | null) => void, boolean] => {
	const [focusTrapCleanup, setFocusTrapCleanup] = useState<
		(() => void) | undefined
	>();
	const [trapActive, setTrapActive] = useState(false);
	const [trapElement, setTrapElement] = useState<HTMLElement | null>(null);
	const { trapFocus } = useAccessibilityContext();

	const setElementRef = useCallback((element: HTMLElement | null) => {
		setTrapElement(element);
	}, []);

	useEffect(() => {
		if (isActive && trapElement) {
			const cleanup = trapFocus(trapElement);
			setFocusTrapCleanup(() => cleanup);
			setTrapActive(true);

			return () => {
				if (cleanup) cleanup();
				setTrapActive(false);
			};
		} else {
			if (focusTrapCleanup) focusTrapCleanup();
			setTrapActive(false);
		}
	}, [isActive, trapElement, focusTrapCleanup, trapFocus]);

	return [setElementRef, trapActive];
};

// Hook for managing keyboard shortcuts
export const useKeyboardShortcuts = (isEnabled: boolean = true): void => {
	const {
		skipToMainContent,
		skipToSearch,
		skipToNavigation,
		toggleHighContrast,
		toggleReducedMotion,
	} = useAccessibilityContext();

	useEffect(() => {
		if (!isEnabled) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Ctrl+Alt+A - Toggle accessibility panel
			if (e.ctrlKey && e.altKey && e.key === "a") {
				e.preventDefault();
				window.dispatchEvent(new CustomEvent("open-accessibility-panel"));
			}

			// Ctrl+Alt+S - Skip to main content
			if (e.ctrlKey && e.altKey && e.key === "s") {
				e.preventDefault();
				skipToMainContent();
			}

			// Ctrl+Alt+N - Skip to navigation
			if (e.ctrlKey && e.altKey && e.key === "n") {
				e.preventDefault();
				skipToNavigation();
			}

			// Ctrl+Alt+F - Skip to search
			if (e.ctrlKey && e.altKey && e.key === "f") {
				e.preventDefault();
				skipToSearch();
			}

			// Ctrl+Alt+R - Toggle reduced motion
			if (e.ctrlKey && e.altKey && e.key === "r") {
				e.preventDefault();
				toggleReducedMotion();
			}

			// Ctrl+Alt+C - Toggle high contrast
			if (e.ctrlKey && e.altKey && e.key === "c") {
				e.preventDefault();
				toggleHighContrast();
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [
		isEnabled,
		skipToMainContent,
		skipToSearch,
		skipToNavigation,
		toggleHighContrast,
		toggleReducedMotion,
	]);
};

// Hook for announcing component lifecycle events
export const useLifecycleAnnouncer = (
	componentName: string,
	announceMount: boolean = true,
	announceUnmount: boolean = false,
): void => {
	const { announce } = useAccessibilityContext();

	useEffect(() => {
		if (announceMount) {
			announce(`${componentName} mounted`, "polite");
		}

		return () => {
			if (announceUnmount) {
				announce(`${componentName} unmounted`, "polite");
			}
		};
	}, [componentName, announceMount, announceUnmount, announce]);
};

// Hook for announcing loading states
export const useLoadingAnnouncer = (
	isLoading: boolean,
	loadingMessage: string = "Loading...",
	loadedMessage: string = "Loaded",
	errorMessage?: string,
): void => {
	const { announce } = useAccessibilityContext();

	useEffect(() => {
		if (isLoading) {
			announce(loadingMessage, "polite");
		} else if (errorMessage) {
			announce(errorMessage, "assertive");
		} else {
			announce(loadedMessage, "polite");
		}
	}, [isLoading, loadingMessage, loadedMessage, errorMessage, announce]);
};

// Hook for managing screen reader only content
export const useScreenReaderOnly = (): {
	srOnlyClass: string;
	srOnlyStyles: React.CSSProperties;
} => {
	return {
		srOnlyClass: "sr-only",
		srOnlyStyles: {
			position: "absolute",
			width: "1px",
			height: "1px",
			padding: 0,
			margin: "-1px",
			overflow: "hidden",
			clip: "rect(0, 0, 0, 0)",
			whiteSpace: "nowrap",
			border: 0,
		},
	};
};

// Hook for managing ARIA live regions
export const useLiveRegion = (
	initialMessages: string[] = [],
	regionType: "polite" | "assertive" = "polite",
): {
	messages: string[];
	addMessage: (message: string) => void;
	removeMessage: (index: number) => void;
	clearMessages: () => void;
	liveRegionProps: {
		"aria-live": "polite" | "assertive" | "off";
		"aria-atomic": boolean;
	};
} => {
	const [messages, setMessages] = useState<string[]>(initialMessages);

	const addMessage = useCallback((message: string) => {
		setMessages((prev) => [...prev, message]);
	}, []);

	const removeMessage = useCallback((index: number) => {
		setMessages((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, []);

	return {
		messages,
		addMessage,
		removeMessage,
		clearMessages,
		liveRegionProps: {
			"aria-live": regionType,
			"aria-atomic": true,
		},
	};
};

// Hook for managing focus visibility
export const useFocusVisibility = (): {
	enableFocusOutline: () => void;
	disableFocusOutline: () => void;
	focusVisibleClass: string;
} => {
	const [focusVisible, setFocusVisible] = useState(false);

	const enableFocusOutline = useCallback(() => {
		setFocusVisible(true);
		document.body.classList.add("keyboard-nav");
	}, []);

	const disableFocusOutline = useCallback(() => {
		setFocusVisible(false);
		document.body.classList.remove("keyboard-nav");
	}, []);

	useEffect(() => {
		const handleKeyDown = () => {
			enableFocusOutline();
		};

		const handleMouseDown = () => {
			disableFocusOutline();
		};

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handleMouseDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleMouseDown);
		};
	}, [enableFocusOutline, disableFocusOutline]);

	return {
		enableFocusOutline,
		disableFocusOutline,
		focusVisibleClass: focusVisible ? "keyboard-nav" : "",
	};
};

export default useAccessibility;
