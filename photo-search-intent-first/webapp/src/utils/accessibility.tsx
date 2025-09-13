/**
 * Accessibility utilities for the photo search application
 */

import type React from "react";
import { useEffect, useRef, useState } from "react";

/**
 * Props for the FocusTrap component
 */
interface FocusTrapProps {
	children: React.ReactNode;
	onEscape?: () => void;
	autoFocus?: boolean;
	restoreFocus?: boolean;
}

/**
 * FocusTrap component for modal dialogs and tour elements
 * Manages focus within a container and handles keyboard navigation
 *
 * @example
 * <FocusTrap onEscape={() => setShowModal(false)}>
 *   <ModalContent />
 * </FocusTrap>
 */
export const FocusTrap: React.FC<FocusTrapProps> = ({
	children,
	onEscape,
	autoFocus = true,
	restoreFocus = true,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Store the currently focused element
		if (restoreFocus) {
			previousFocusRef.current = document.activeElement as HTMLElement;
		}

		// Get all focusable elements within the container
		const focusableElements = container.querySelectorAll<HTMLElement>(
			'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])',
		);

		const focusables = Array.from(focusableElements).filter(
			(el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"),
		);

		if (focusables.length === 0) return;

		// Focus the first focusable element or the container
		if (autoFocus) {
			const elementToFocus =
				focusables.find((el) => el.getAttribute("tabindex") !== "-1") ||
				focusables[0];
			elementToFocus.focus();
		} else {
			container.setAttribute("tabindex", "-1");
			container.focus();
		}

		// Handle keyboard navigation
		const handleKeyDown = (_e: KeyboardEvent) => {
			if (_e.key === "Escape") {
				_e.stopPropagation();
				_e.preventDefault();
				onEscape?.();
				return;
			}

			if (_e.key === "Tab") {
				if (focusables.length === 0) return;

				const currentFocus = document.activeElement as HTMLElement;
				const currentIndex = focusables.indexOf(currentFocus);

				const direction = _e.shiftKey ? -1 : 1;
				let nextIndex = currentIndex + direction;

				// Wrap around logic
				if (nextIndex < 0) nextIndex = focusables.length - 1;
				if (nextIndex >= focusables.length) nextIndex = 0;

				_e.preventDefault();
				focusables[nextIndex].focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);

			// Restore focus to the previously focused element
			if (restoreFocus && previousFocusRef.current) {
				previousFocusRef.current.focus();
			}
		};
	}, [onEscape, autoFocus, restoreFocus]);

	return <div ref={containerRef}>{children}</div>;
};

/**
 * Props for the SkipLink component
 */
interface SkipLinkProps {
	targetId: string;
	text?: string;
	className?: string;
}

/**
 * Skip link component for keyboard navigation
 * Allows users to skip to main content
 *
 * @example
 * <SkipLink targetId="main-content" text="Skip to main content" />
 */
export const SkipLink: React.FC<SkipLinkProps> = ({
	targetId,
	text = "Skip to main content",
	className = "",
}) => {
	const handleClick = (_e: React.MouseEvent<HTMLAnchorElement>) => {
		_e.preventDefault();
		const target = document.getElementById(targetId);
		if (target) {
			target.setAttribute("tabindex", "-1");
			target.focus();
			target.scrollIntoView({ behavior: "smooth" });
		}
	};

	return (
		<a
			href={`#${targetId}`}
			className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 ${className}`}
			onClick={handleClick}
		>
			{text}
		</a>
	);
};

/**
 * Props for the AriaLiveRegion component
 */
interface AriaLiveRegionProps {
	message: string;
	priority?: "polite" | "assertive";
	clearAfter?: number;
}

/**
 * ARIA live region for screen reader announcements
 * Used for dynamic content updates
 *
 * @example
 * <AriaLiveRegion message="Search completed" priority="polite" />
 */
export const AriaLiveRegion: React.FC<AriaLiveRegionProps> = ({
	message,
	priority = "polite",
	clearAfter,
}) => {
	const [currentMessage, setCurrentMessage] = useState(message);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
	useEffect(() => {
		setCurrentMessage(message);

		if (clearAfter) {
			const timer = setTimeout(() => {
				setCurrentMessage("");
			}, clearAfter);

			return () => clearTimeout(timer);
		}
	}, [message, clearAfter]);

	return (
		<div
			aria-live={priority as "polite" | "assertive"}
			aria-atomic="true"
			className="sr-only"
		>
			{currentMessage}
		</div>
	);
};

/**
 * Hook to announce changes to screen readers
 *
 * @example
 * const { announce } = useAnnouncer();
 * announce('Search completed with 25 results');
 */
export const useAnnouncer = () => {
	const announce = (
		message: string,
		priority: "polite" | "assertive" = "polite",
	) => {
		const announcement = document.createElement("div");
		announcement.setAttribute("aria-live", priority);
		announcement.setAttribute("aria-atomic", "true");
		announcement.className = "sr-only";
		announcement.textContent = message;

		document.body.appendChild(announcement);

		// Remove after announcement
		setTimeout(() => {
			if (announcement.parentNode) {
				document.body.removeChild(announcement);
			}
		}, 1000);
	};

	return { announce };
};

// Simple helper to announce a message via the global announcer
export function announce(
	message: string,
	priority: "polite" | "assertive" = "polite",
) {
	try {
		window.dispatchEvent(
			new CustomEvent("announce", { detail: { message, priority } }) as unknown,
		);
	} catch {}
}

/**
 * Checks if an element is visible in the viewport
 * @param element - Element to check
 * @param partiallyVisible - Whether partially visible counts as visible
 * @returns True if element is visible
 */
export const _isElementInViewport = (
	element: HTMLElement,
	partiallyVisible = false,
): boolean => {
	const rect = element.getBoundingClientRect();
	const windowHeight =
		window.innerHeight || document.documentElement.clientHeight;
	const windowWidth = window.innerWidth || document.documentElement.clientWidth;

	const vertInView = partiallyVisible
		? (rect.top <= windowHeight && rect.top + rect.height >= 0) ||
			(rect.bottom >= 0 && rect.bottom - rect.height <= windowHeight)
		: rect.top >= 0 && rect.bottom <= windowHeight;

	const horInView = partiallyVisible
		? (rect.left <= windowWidth && rect.left + rect.width >= 0) ||
			(rect.right >= 0 && rect.right - rect.width <= windowWidth)
		: rect.left >= 0 && rect.right <= windowWidth;

	return vertInView && horInView;
};

/**
 * Hook for managing keyboard shortcuts
 *
 * @example
 * useKeyboardShortcut('ctrl+k', () => openSearch(), 'Open search');
 */
export const useKeyboardShortcut = (
	keyCombo: string,
	callback: () => void,
	_description?: string,
	disabled = false,
) => {
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
	useEffect(() => {
		if (disabled) return;

		const handleKeyDown = (_event: KeyboardEvent) => {
			// Skip if typing in input elements
			const target = _event.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			) {
				return;
			}

			// Parse key combo (e.g., "ctrl+k", "shift+?", "alt+f")
			const keys = keyCombo.toLowerCase().split("+");
			const key = keys.pop() || "";
			const modifiers = keys;

			// Check modifiers
			const modifierMatch = modifiers.every((modifier) => {
				switch (modifier) {
					case "ctrl":
						return _event.ctrlKey || _event.metaKey;
					case "shift":
						return _event.shiftKey;
					case "alt":
						return _event.altKey;
					case "meta":
						return _event.metaKey;
					default:
						return false;
				}
			});

			// Check main key
			const keyMatch = _event.key.toLowerCase() === key;

			if (modifierMatch && keyMatch) {
				_event.preventDefault();
				_event.stopPropagation();
				callback();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [keyCombo, callback, disabled]);
};
