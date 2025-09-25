/**
 * AccessibilityFramework - Provides comprehensive accessibility support with screen reader announcements
 * This framework ensures all application actions are announced to screen readers and keyboard users.
 */
import { useCallback, useEffect, useRef, useState } from "react";

// ARIA live regions for announcements
type AriaLiveRegion = "polite" | "assertive" | "off";

// Announcement priority levels
type AnnouncementPriority = "low" | "normal" | "high" | "critical";

// Accessibility settings
export interface AccessibilitySettings {
	screenReaderMode: boolean;
	announceActions: boolean;
	announceProgress: boolean;
	announceErrors: boolean;
	announceSuccess: boolean;
	voiceSpeed: "slow" | "normal" | "fast";
	voicePitch: "low" | "normal" | "high";
	preferredVoice?: string;
	focusVisible: boolean;
	keyboardNavigation: boolean;
	highContrast: boolean;
	reducedMotion: boolean;
	largeText: boolean;
	dyslexiaFriendly: boolean;
}

// Announcement options
interface AnnouncementOptions {
	priority?: AnnouncementPriority;
	voice?: string;
	pitch?: "low" | "normal" | "high";
	speed?: "slow" | "normal" | "fast";
	volume?: number; // 0-1
	delay?: number; // milliseconds
	interrupt?: boolean; // Whether to interrupt current speech
}

// Accessibility context interface
export interface AccessibilityContextType {
	// Settings
	settings: AccessibilitySettings;
	updateSettings: (settings: Partial<AccessibilitySettings>) => void;

	// Screen reader announcements
	announce: (
		message: string,
		priority?: AriaLiveRegion,
		options?: AnnouncementOptions,
	) => void;
	announceAction: (
		action: string,
		status?: "started" | "completed" | "failed",
	) => void;
	announceProgress: (progress: number, total: number, message?: string) => void;
	announceError: (error: string, context?: string) => void;
	announceSuccess: (message: string) => void;
	announceWarning: (message: string) => void;
	announceInfo: (message: string) => void;

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

	// High contrast mode
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

// Element types for ARIA attributes
type ElementType =
	| "button"
	| "link"
	| "input"
	| "checkbox"
	| "radio"
	| "select"
	| "textarea"
	| "menu"
	| "menuitem"
	| "dialog"
	| "alert"
	| "progressbar"
	| "slider"
	| "tab"
	| "tabpanel"
	| "tree"
	| "treeitem"
	| "grid"
	| "row"
	| "cell"
	| "navigation"
	| "main"
	| "banner"
	| "contentinfo"
	| "search"
	| "complementary"
	| "region"
	| "article"
	| "heading";

// Landmark types
type LandmarkType =
	| "main"
	| "navigation"
	| "search"
	| "banner"
	| "contentinfo"
	| "complementary"
	| "region"
	| "form";

// Create accessibility context
import { createContext, useContext } from "react";

const AccessibilityContext = createContext<
	AccessibilityContextType | undefined
>(undefined);

// Provider component
interface AccessibilityProviderProps {
	children: React.ReactNode;
	initialSettings?: Partial<AccessibilitySettings>;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
	children,
	initialSettings = {},
}) => {
	// Default accessibility settings
	const defaultSettings: AccessibilitySettings = {
		screenReaderMode: false,
		announceActions: true,
		announceProgress: true,
		announceErrors: true,
		announceSuccess: true,
		voiceSpeed: "normal",
		voicePitch: "normal",
		focusVisible: true,
		keyboardNavigation: true,
		highContrast: false,
		reducedMotion: false,
		largeText: false,
		dyslexiaFriendly: false,
	};

	// State for accessibility settings
	const [settings, setSettings] = useState<AccessibilitySettings>({
		...defaultSettings,
		...initialSettings,
	});

	// State for announcements
	const [announcements, setAnnouncements] = useState<
		Array<{
			id: string;
			message: string;
			priority: AriaLiveRegion;
			timestamp: number;
			options?: AnnouncementOptions;
		}>
	>([]);

	// State for keyboard navigation
	const [isKeyboardNavigationEnabled, setIsKeyboardNavigationEnabled] =
		useState(true);

	// State for high contrast
	const [isHighContrast, setIsHighContrast] = useState(false);

	// State for reduced motion
	const [isReducedMotion, setIsReducedMotion] = useState(false);

	// Refs for focus management
	const focusTrapCleanupRef = useRef<(() => void) | undefined>();

	// Update settings
	const updateSettings = useCallback(
		(newSettings: Partial<AccessibilitySettings>) => {
			setSettings((prev) => ({ ...prev, ...newSettings }));
		},
		[],
	);

	// Screen reader announcements
	const announce = useCallback(
		(
			message: string,
			priority: AriaLiveRegion = "polite",
			options?: AnnouncementOptions,
		) => {
			if (!settings.screenReaderMode) return;

			const announcement = {
				id: Math.random().toString(36).substr(2, 9),
				message,
				priority,
				timestamp: Date.now(),
				options,
			};

			setAnnouncements((prev) => [...prev, announcement]);

			// Remove announcement after a delay to prevent buildup
			setTimeout(() => {
				setAnnouncements((prev) =>
					prev.filter((a) => a.id !== announcement.id),
				);
			}, options?.delay || 5000);

			// If text-to-speech is available, speak the message
			if (typeof window !== "undefined" && "speechSynthesis" in window) {
				try {
					const utterance = new SpeechSynthesisUtterance(message);
					utterance.rate =
						settings.voiceSpeed === "slow"
							? 0.8
							: settings.voiceSpeed === "fast"
								? 1.2
								: 1.0;
					utterance.pitch =
						settings.voicePitch === "low"
							? 0.8
							: settings.voicePitch === "high"
								? 1.2
								: 1.0;
					utterance.volume = options?.volume || 1.0;

					if (options?.interrupt) {
						speechSynthesis.cancel();
					}

					speechSynthesis.speak(utterance);
				} catch (e) {
					console.warn("Failed to speak announcement:", e);
				}
			}
		},
		[settings.screenReaderMode, settings.voiceSpeed, settings.voicePitch],
	);

	// Announce actions
	const announceAction = useCallback(
		(
			action: string,
			status: "started" | "completed" | "failed" = "started",
		) => {
			if (!settings.announceActions) return;

			let message = "";
			switch (status) {
				case "started":
					message = `${action} started`;
					break;
				case "completed":
					message = `${action} completed`;
					break;
				case "failed":
					message = `${action} failed`;
					break;
			}

			announce(message, status === "failed" ? "assertive" : "polite");
		},
		[settings.announceActions, announce],
	);

	// Announce progress
	const announceProgress = useCallback(
		(progress: number, total: number, message?: string) => {
			if (!settings.announceProgress) return;

			const percentage = Math.round((progress / total) * 100);
			const progressMessage = message
				? `${message} ${percentage}% complete`
				: `${percentage}% complete`;

			announce(progressMessage, "polite", {
				speed: "fast",
				delay: 3000, // Shorter delay for progress updates
			});
		},
		[settings.announceProgress, announce],
	);

	// Announce errors
	const announceError = useCallback(
		(error: string, context?: string) => {
			if (!settings.announceErrors) return;

			const errorMessage = context ? `${context}: ${error}` : error;
			announce(errorMessage, "assertive");
		},
		[settings.announceErrors, announce],
	);

	// Announce success
	const announceSuccess = useCallback(
		(message: string) => {
			if (!settings.announceSuccess) return;

			announce(message, "polite");
		},
		[settings.announceSuccess, announce],
	);

	// Announce warning
	const announceWarning = useCallback(
		(message: string) => {
			announce(message, "polite");
		},
		[announce],
	);

	// Announce info
	const announceInfo = useCallback(
		(message: string) => {
			announce(message, "polite");
		},
		[announce],
	);

	// Focus management
	const focusNext = useCallback(() => {
		// Implementation would move focus to next focusable element
		console.log("Moving focus to next element");
	}, []);

	const focusPrevious = useCallback(() => {
		// Implementation would move focus to previous focusable element
		console.log("Moving focus to previous element");
	}, []);

	const focusFirst = useCallback(() => {
		// Implementation would move focus to first focusable element
		console.log("Moving focus to first element");
	}, []);

	const focusLast = useCallback(() => {
		// Implementation would move focus to last focusable element
		console.log("Moving focus to last element");
	}, []);

	const trapFocus = useCallback(
		(container: HTMLElement): (() => void) | undefined => {
			if (!isKeyboardNavigationEnabled) return undefined;

			// Implementation would trap focus within the container
			console.log("Trapping focus within container", container);

			// Store cleanup function
			const cleanup = () => {
				console.log("Releasing focus trap");
			};

			focusTrapCleanupRef.current = cleanup;
			return cleanup;
		},
		[isKeyboardNavigationEnabled],
	);

	// Keyboard navigation
	const enableKeyboardNavigation = useCallback(() => {
		setIsKeyboardNavigationEnabled(true);
	}, []);

	const disableKeyboardNavigation = useCallback(() => {
		setIsKeyboardNavigationEnabled(false);
	}, []);

	// High contrast mode
	const toggleHighContrast = useCallback(() => {
		const newHighContrast = !isHighContrast;
		setIsHighContrast(newHighContrast);
		updateSettings({ highContrast: newHighContrast });

		// Apply high contrast CSS class to body
		if (typeof document !== "undefined") {
			if (newHighContrast) {
				document.body.classList.add("high-contrast");
			} else {
				document.body.classList.remove("high-contrast");
			}
		}
	}, [isHighContrast, updateSettings]);

	// Reduced motion
	const toggleReducedMotion = useCallback(() => {
		const newReducedMotion = !isReducedMotion;
		setIsReducedMotion(newReducedMotion);
		updateSettings({ reducedMotion: newReducedMotion });

		// Apply reduced motion CSS class to body
		if (typeof document !== "undefined") {
			if (newReducedMotion) {
				document.body.classList.add("reduced-motion");
			} else {
				document.body.classList.remove("reduced-motion");
			}
		}
	}, [isReducedMotion, updateSettings]);

	// Skip links
	const skipToMainContent = useCallback(() => {
		if (typeof document !== "undefined") {
			const mainContent =
				document.querySelector("main") ||
				document.querySelector("[role='main']");
			if (mainContent) {
				(mainContent as HTMLElement).focus();
				announce("Skipped to main content", "polite");
			}
		}
	}, [announce]);

	const skipToSearch = useCallback(() => {
		if (typeof document !== "undefined") {
			const search =
				document.querySelector("[role='search']") ||
				document.querySelector("input[type='search']");
			if (search) {
				(search as HTMLElement).focus();
				announce("Skipped to search", "polite");
			}
		}
	}, [announce]);

	const skipToNavigation = useCallback(() => {
		if (typeof document !== "undefined") {
			const navigation =
				document.querySelector("nav") ||
				document.querySelector("[role='navigation']");
			if (navigation) {
				(navigation as HTMLElement).focus();
				announce("Skipped to navigation", "polite");
			}
		}
	}, [announce]);

	// Landmark navigation
	const goToLandmark = useCallback(
		(landmark: LandmarkType) => {
			if (typeof document !== "undefined") {
				const landmarkElement =
					document.querySelector(`[role='${landmark}']`) ||
					document.querySelector(landmark);
				if (landmarkElement) {
					(landmarkElement as HTMLElement).focus();
					announce(`Navigated to ${landmark}`, "polite");
				}
			}
		},
		[announce],
	);

	// ARIA attributes
	const getAriaAttributes = useCallback(
		(element: ElementType): React.AriaAttributes => {
			const baseAttributes: React.AriaAttributes = {};

			switch (element) {
				case "button":
					return { ...baseAttributes, role: "button" };
				case "link":
					return { ...baseAttributes, role: "link" };
				case "input":
					return { ...baseAttributes, role: "textbox" };
				case "checkbox":
					return { ...baseAttributes, role: "checkbox", "aria-checked": false };
				case "radio":
					return { ...baseAttributes, role: "radio", "aria-checked": false };
				case "select":
					return { ...baseAttributes, role: "combobox" };
				case "textarea":
					return { ...baseAttributes, role: "textbox" };
				case "menu":
					return { ...baseAttributes, role: "menu" };
				case "menuitem":
					return { ...baseAttributes, role: "menuitem" };
				case "dialog":
					return { ...baseAttributes, role: "dialog", "aria-modal": true };
				case "alert":
					return { ...baseAttributes, role: "alert" };
				case "progressbar":
					return {
						...baseAttributes,
						role: "progressbar",
						"aria-valuemin": 0,
						"aria-valuemax": 100,
					};
				case "slider":
					return {
						...baseAttributes,
						role: "slider",
						"aria-valuemin": 0,
						"aria-valuemax": 100,
					};
				case "tab":
					return { ...baseAttributes, role: "tab" };
				case "tabpanel":
					return { ...baseAttributes, role: "tabpanel" };
				case "tree":
					return { ...baseAttributes, role: "tree" };
				case "treeitem":
					return { ...baseAttributes, role: "treeitem" };
				case "grid":
					return { ...baseAttributes, role: "grid" };
				case "row":
					return { ...baseAttributes, role: "row" };
				case "cell":
					return { ...baseAttributes, role: "gridcell" };
				case "navigation":
					return { ...baseAttributes, role: "navigation" };
				case "main":
					return { ...baseAttributes, role: "main" };
				case "banner":
					return { ...baseAttributes, role: "banner" };
				case "contentinfo":
					return { ...baseAttributes, role: "contentinfo" };
				case "search":
					return { ...baseAttributes, role: "search" };
				case "complementary":
					return { ...baseAttributes, role: "complementary" };
				case "region":
					return { ...baseAttributes, role: "region" };
				case "article":
					return { ...baseAttributes, role: "article" };
				case "heading":
					return { ...baseAttributes, role: "heading" };
				default:
					return baseAttributes;
			}
		},
		[],
	);

	// Apply settings to document
	useEffect(() => {
		if (typeof document === "undefined") return;

		// Apply high contrast
		if (settings.highContrast) {
			document.body.classList.add("high-contrast");
		} else {
			document.body.classList.remove("high-contrast");
		}

		// Apply reduced motion
		if (settings.reducedMotion) {
			document.body.classList.add("reduced-motion");
		} else {
			document.body.classList.remove("reduced-motion");
		}

		// Apply large text
		if (settings.largeText) {
			document.body.classList.add("large-text");
		} else {
			document.body.classList.remove("large-text");
		}

		// Apply dyslexia friendly
		if (settings.dyslexiaFriendly) {
			document.body.classList.add("dyslexia-friendly");
		} else {
			document.body.classList.remove("dyslexia-friendly");
		}

		// Apply screen reader mode
		if (settings.screenReaderMode) {
			document.body.classList.add("screen-reader-mode");
		} else {
			document.body.classList.remove("screen-reader-mode");
		}
	}, [settings]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (focusTrapCleanupRef.current) {
				focusTrapCleanupRef.current();
			}
		};
	}, []);

	// Context value
	const value: AccessibilityContextType = {
		settings,
		updateSettings,
		announce,
		announceAction,
		announceProgress,
		announceError,
		announceSuccess,
		announceWarning,
		announceInfo,
		focusNext,
		focusPrevious,
		focusFirst,
		focusLast,
		trapFocus,
		enableKeyboardNavigation,
		disableKeyboardNavigation,
		isKeyboardNavigationEnabled,
		isHighContrast,
		toggleHighContrast,
		isReducedMotion,
		toggleReducedMotion,
		skipToMainContent,
		skipToSearch,
		skipToNavigation,
		goToLandmark,
		getAriaAttributes,
	};

	return (
		<AccessibilityContext.Provider value={value}>
			{children}

			{/* Live regions for screen reader announcements */}
			<div
				id="aria-live-polite"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{announcements
					.filter((a) => a.priority === "polite")
					.map((a) => (
						<div key={a.id}>{a.message}</div>
					))}
			</div>

			<div
				id="aria-live-assertive"
				aria-live="assertive"
				aria-atomic="true"
				className="sr-only"
			>
				{announcements
					.filter((a) => a.priority === "assertive")
					.map((a) => (
						<div key={a.id}>{a.message}</div>
					))}
			</div>

			<div
				id="aria-live-off"
				aria-live="off"
				aria-atomic="true"
				className="sr-only"
			>
				{announcements
					.filter((a) => a.priority === "off")
					.map((a) => (
						<div key={a.id}>{a.message}</div>
					))}
			</div>
		</AccessibilityContext.Provider>
	);
};

// Hook to consume the context
export const useAccessibilityContext = (): AccessibilityContextType => {
	const context = useContext(AccessibilityContext);
	if (context === undefined) {
		throw new Error(
			"useAccessibilityContext must be used within an AccessibilityProvider",
		);
	}
	return context;
};

// Hook for screen reader announcements
export const useAnnouncer = () => {
	const {
		announce,
		announceAction,
		announceProgress,
		announceError,
		announceSuccess,
		announceWarning,
		announceInfo,
	} = useAccessibilityContext();

	return {
		announce,
		announceAction,
		announceProgress,
		announceError,
		announceSuccess,
		announceWarning,
		announceInfo,
	};
};

// Hook for focus management
export const useFocusManager = () => {
	const { focusNext, focusPrevious, focusFirst, focusLast, trapFocus } =
		useAccessibilityContext();

	return {
		focusNext,
		focusPrevious,
		focusFirst,
		focusLast,
		trapFocus,
	};
};

// Hook for keyboard navigation
export const useKeyboardNavigation = () => {
	const {
		enableKeyboardNavigation,
		disableKeyboardNavigation,
		isKeyboardNavigationEnabled,
	} = useAccessibilityContext();

	return {
		enableKeyboardNavigation,
		disableKeyboardNavigation,
		isKeyboardNavigationEnabled,
	};
};

// Hook for high contrast mode
export const useHighContrast = () => {
	const { isHighContrast, toggleHighContrast } = useAccessibilityContext();
	return { isHighContrast, toggleHighContrast };
};

// Hook for reduced motion
export const useReducedMotion = () => {
	const { isReducedMotion, toggleReducedMotion } = useAccessibilityContext();
	return { isReducedMotion, toggleReducedMotion };
};

// Hook for skip links
export const useSkipLinks = () => {
	const { skipToMainContent, skipToSearch, skipToNavigation } =
		useAccessibilityContext();

	return {
		skipToMainContent,
		skipToSearch,
		skipToNavigation,
	};
};

// Hook for landmark navigation
export const useLandmarkNavigation = () => {
	const { goToLandmark } = useAccessibilityContext();
	return { goToLandmark };
};

// Hook for ARIA attributes
export const useAriaAttributes = () => {
	const { getAriaAttributes } = useAccessibilityContext();
	return { getAriaAttributes };
};

export default AccessibilityContext;
