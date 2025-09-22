/**
 * Platform detection utilities
 */

/**
 * Detects the user's operating system
 * @returns 'macOS', 'Windows', 'Linux', or 'Unknown'
 */
export function detectOS(): "macOS" | "Windows" | "Linux" | "Unknown" {
	if (typeof window === "undefined" || !window.navigator) {
		return "Unknown";
	}

	const userAgent = window.navigator.userAgent.toLowerCase();

	if (userAgent.includes("mac")) {
		return "macOS";
	} else if (userAgent.includes("win")) {
		return "Windows";
	} else if (userAgent.includes("linux")) {
		return "Linux";
	}

	return "Unknown";
}

/**
 * Returns the appropriate modifier key symbol for the user's OS
 * @returns The modifier key symbol (⌘ for macOS, Ctrl for Windows/Linux)
 */
export function getModifierKeySymbol(): string {
	const os = detectOS();

	switch (os) {
		case "macOS":
			return "⌘";
		case "Windows":
		case "Linux":
		default:
			return "Ctrl";
	}
}

/**
 * Returns the appropriate modifier key for keyboard events based on OS
 * @returns The modifier key (metaKey for macOS, ctrlKey for Windows/Linux)
 */
export function getModifierKeyEvent(): "metaKey" | "ctrlKey" {
	const os = detectOS();

	switch (os) {
		case "macOS":
			return "metaKey";
		case "Windows":
		case "Linux":
		default:
			return "ctrlKey";
	}
}

/**
 * Formats a keyboard shortcut for display based on the user's OS
 * @param shortcut The shortcut string (e.g., "mod+k" where mod represents the modifier key)
 * @returns Formatted shortcut string with OS-specific modifier key
 */
export function formatShortcut(shortcut: string): string {
	const modifierSymbol = getModifierKeySymbol();

	// Replace common shortcut patterns
	return shortcut
		.replace(/\bmod\b/gi, modifierSymbol)
		.replace(/\bcmd\b/gi, modifierSymbol)
		.replace(/\bctrl\b/gi, "Ctrl")
		.replace(/\bshift\b/gi, "⇧")
		.replace(/\balt\b/gi, "⌥")
		.replace(/\benter\b/gi, "↵")
		.replace(/\bescape\b/gi, "Esc")
		.replace(/\bspace\b/gi, "Space")
		.replace(/\btab\b/gi, "⇥")
		.replace(/\bbackspace\b/gi, "⌫");
}
