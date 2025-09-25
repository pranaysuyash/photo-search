/**
 * AccessibilityWrapper - Global accessibility wrapper for the application
 * This wrapper provides global accessibility features and manages
 * accessibility settings across the entire application.
 */
import type React from "react";
import { useEffect, useState } from "react";
import {
	AccessibilityProvider,
	useAccessibilityContext,
} from "../framework/AccessibilityFramework";

// Accessibility wrapper props
interface AccessibilityWrapperProps {
	children: React.ReactNode;
}

// Accessibility wrapper component
export const AccessibilityWrapper: React.FC<AccessibilityWrapperProps> = ({
	children,
}) => {
	const [initialSettings, setInitialSettings] = useState({});

	// Load accessibility settings from localStorage on mount
	useEffect(() => {
		try {
			const savedSettings = localStorage.getItem("accessibility-settings");
			if (savedSettings) {
				setInitialSettings(JSON.parse(savedSettings));
			}
		} catch (error) {
			console.warn(
				"Failed to load accessibility settings from localStorage:",
				error,
			);
		}
	}, []);

	return (
		<AccessibilityProvider initialSettings={initialSettings}>
			<AccessibilityManager>{children}</AccessibilityManager>
		</AccessibilityProvider>
	);
};

// Accessibility manager component
const AccessibilityManager: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { settings } = useAccessibilityContext();

	// Apply accessibility classes to body when settings change
	useEffect(() => {
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

		// Return cleanup function
		return () => {
			document.body.classList.remove(
				"high-contrast",
				"reduced-motion",
				"large-text",
				"dyslexia-friendly",
				"screen-reader-mode",
			);
		};
	}, [
		settings.highContrast,
		settings.reducedMotion,
		settings.largeText,
		settings.dyslexiaFriendly,
		settings.screenReaderMode,
	]);

	// Add keyboard shortcuts for accessibility
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ctrl+Alt+A - Toggle accessibility panel
			if (e.ctrlKey && e.altKey && e.key === "a") {
				e.preventDefault();
				// Dispatch custom event to open accessibility panel
				window.dispatchEvent(new CustomEvent("open-accessibility-panel"));
			}

			// Ctrl+Alt+S - Skip to main content
			if (e.ctrlKey && e.altKey && e.key === "s") {
				e.preventDefault();
				const mainContent =
					document.querySelector("main") ||
					document.querySelector("[role='main']");
				if (mainContent) {
					(mainContent as HTMLElement).focus();
				}
			}

			// Ctrl+Alt+N - Skip to navigation
			if (e.ctrlKey && e.altKey && e.key === "n") {
				e.preventDefault();
				const navigation =
					document.querySelector("nav") ||
					document.querySelector("[role='navigation']");
				if (navigation) {
					(navigation as HTMLElement).focus();
				}
			}

			// Ctrl+Alt+R - Toggle reduced motion
			if (e.ctrlKey && e.altKey && e.key === "r") {
				e.preventDefault();
				// Dispatch custom event to toggle reduced motion
				window.dispatchEvent(new CustomEvent("toggle-reduced-motion"));
			}

			// Ctrl+Alt+C - Toggle high contrast
			if (e.ctrlKey && e.altKey && e.key === "c") {
				e.preventDefault();
				// Dispatch custom event to toggle high contrast
				window.dispatchEvent(new CustomEvent("toggle-high-contrast"));
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	return <>{children}</>;
};

export default AccessibilityWrapper;
