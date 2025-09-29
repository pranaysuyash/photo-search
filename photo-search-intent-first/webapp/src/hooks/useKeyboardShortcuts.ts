import { useCallback, useEffect } from "react";

export interface KeyboardShortcut {
	key: string;
	ctrl?: boolean;
	alt?: boolean;
	shift?: boolean;
	meta?: boolean;
	description: string;
	action: () => void;
	enabled?: boolean;
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
	{
		key: "D",
		shift: true,
		description: "Toggle dark mode",
		action: () => {
			try {
				const c = document.documentElement.classList;
				const dark = c.toggle("dark");
				localStorage.setItem("ps_theme", dark ? "dark" : "light");
			} catch {}
		},
	},
	{
		key: "/",
		description: "Focus search",
		action: () => {
			const searchInput = document.querySelector(
				'input[placeholder*="Try"]',
			) as HTMLInputElement;
			searchInput?.focus();
		},
	},
	{
		key: "a",
		description: "Open Advanced Search",
		action: () => {
			const btn = document.querySelector(
				'[aria-label*="Open advanced search"]',
			) as HTMLElement;
			if (btn) btn.click();
		},
	},
	{
		key: "t",
		description: "Timeline: Jump to Today",
		action: () => {
			window.dispatchEvent(
				new CustomEvent("timeline-jump", { detail: { kind: "today" } }),
			);
		},
	},
	{
		key: "m",
		description: "Timeline: Jump to This Month",
		action: () => {
			window.dispatchEvent(
				new CustomEvent("timeline-jump", { detail: { kind: "this-month" } }),
			);
		},
	},
	{
		key: "l",
		description: "Timeline: Jump to Last Month",
		action: () => {
			window.dispatchEvent(
				new CustomEvent("timeline-jump", { detail: { kind: "last-month" } }),
			);
		},
	},
	{
		key: "o",
		description: "Timeline: Jump to Oldest",
		action: () => {
			window.dispatchEvent(
				new CustomEvent("timeline-jump", { detail: { kind: "oldest" } }),
			);
		},
	},
	{
		key: "Escape",
		description: "Close modal/Clear selection",
		action: () => {
			// Close any open modals
			const closeButton = document.querySelector(
				'[aria-label*="Close"]',
			) as HTMLElement;
			closeButton?.click();

			// Clear selection if no modal
			if (!closeButton) {
				const clearBtn = document.querySelector(
					'button:has-text("Clear Selection")',
				) as HTMLElement;
				clearBtn?.click();
			}
		},
	},
	{
		key: "g",
		shift: true,
		description: "Toggle grid view",
		action: () => {
			const gridButton = document.querySelector(
				'[aria-label*="Grid"]',
			) as HTMLElement;
			gridButton?.click();
		},
	},
	{
		key: "l",
		shift: true,
		description: "Toggle list view",
		action: () => {
			const listButton = document.querySelector(
				'[aria-label*="List"]',
			) as HTMLElement;
			listButton?.click();
		},
	},
	{
		key: "a",
		ctrl: true,
		description: "Select all",
		action: () => {
			const selectAllBtn = document.querySelector(
				'[aria-label*="Select all"]',
			) as HTMLElement;
			selectAllBtn?.click();
		},
		enabled: true,
	},
	{
		key: "d",
		ctrl: true,
		description: "Deselect all",
		action: () => {
			const deselectBtn = document.querySelector(
				'[aria-label*="Clear selection"]',
			) as HTMLElement;
			deselectBtn?.click();
		},
		enabled: true,
	},
	{
		key: "Delete",
		description: "Delete selected",
		action: () => {
			const deleteBtn = document.querySelector(
				'button:has-text("Delete")',
			) as HTMLElement;
			deleteBtn?.click();
		},
	},
	{
		key: "f",
		ctrl: true,
		description: "Focus filter",
		action: () => {
			const filterInput = document.querySelector(
				'[placeholder*="Filter"]',
			) as HTMLInputElement;
			filterInput?.focus();
		},
		enabled: true,
	},
	{
		key: "n",
		ctrl: true,
		description: "New collection",
		action: () => {
			const newCollectionBtn = document.querySelector(
				'button:has-text("New Collection")',
			) as HTMLElement;
			newCollectionBtn?.click();
		},
		enabled: true,
	},
	{
		key: "e",
		ctrl: true,
		description: "Export selected",
		action: () => {
			const exportBtn = document.querySelector(
				'button:has-text("Export")',
			) as HTMLElement;
			exportBtn?.click();
		},
		enabled: true,
	},
	{
		key: "s",
		ctrl: true,
		description: "Save search",
		action: () => {
			const saveBtn = document.querySelector(
				'button:has-text("Save Search")',
			) as HTMLElement;
			saveBtn?.click();
		},
		enabled: true,
	},
	{
		key: "ArrowLeft",
		description: "Previous photo",
		action: () => {
			const prevBtn = document.querySelector(
				'[aria-label*="Previous"]',
			) as HTMLElement;
			prevBtn?.click();
		},
	},
	{
		key: "ArrowRight",
		description: "Next photo",
		action: () => {
			const nextBtn = document.querySelector(
				'[aria-label*="Next"]',
			) as HTMLElement;
			nextBtn?.click();
		},
	},
	{
		key: " ",
		description: "Play/Pause slideshow",
		action: () => {
			const playBtn = document.querySelector(
				'[aria-label*="Play"]',
			) as HTMLElement;
			playBtn?.click();
		},
	},
	{
		key: "i",
		description: "Toggle info panel",
		action: () => {
			const infoBtn = document.querySelector(
				'[aria-label*="Info"]',
			) as HTMLElement;
			infoBtn?.click();
		},
	},
	{
		key: "?",
		shift: true,
		description: "Show keyboard shortcuts",
		action: () => {
			// Trigger help modal
			const helpBtn = document.querySelector(
				'[aria-label*="Help"]',
			) as HTMLElement;
			helpBtn?.click();
		},
	},
	{
		key: "h",
		description: "Go home",
		action: () => {
			try {
				window.location.hash = "#/";
			} catch {
				window.location.href = "/";
			}
		},
	},
	{
		key: "1",
		description: "Photos view",
		action: () => {
			const photosBtn = document.querySelector(
				'[href*="/photos"]',
			) as HTMLElement;
			photosBtn?.click();
		},
	},
	{
		key: "2",
		description: "Albums view",
		action: () => {
			const albumsBtn = document.querySelector(
				'[href*="/albums"]',
			) as HTMLElement;
			albumsBtn?.click();
		},
	},
	{
		key: "3",
		description: "People view",
		action: () => {
			const peopleBtn = document.querySelector(
				'[href*="/people"]',
			) as HTMLElement;
			peopleBtn?.click();
		},
	},
	{
		key: "p",
		ctrl: true,
		shift: true,
		description: "Open power user panel",
		action: () => {
			// Trigger power user panel
			const powerUserBtn = document.querySelector(
				'[aria-label*="Power user"]',
			) as HTMLElement;
			if (!powerUserBtn) {
				// Create and dispatch custom event if no button exists
				window.dispatchEvent(new CustomEvent("open-power-user-panel"));
			} else {
				powerUserBtn.click();
			}
		},
	},
];

export function useKeyboardShortcuts(customShortcuts?: KeyboardShortcut[]) {
	const shortcuts = customShortcuts || DEFAULT_SHORTCUTS;

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			// Don't trigger shortcuts when typing in inputs
			const target = event.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.contentEditable === "true"
			) {
				// Allow Escape to work in inputs
				if (event.key !== "Escape") {
					return;
				}
			}

			// Find matching shortcut
			const shortcut = shortcuts.find((s) => {
				if (s.enabled === false) return false;

				const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
				const ctrlMatch = s.ctrl
					? event.ctrlKey || event.metaKey
					: !event.ctrlKey && !event.metaKey;
				const altMatch = s.alt ? event.altKey : !event.altKey;
				const shiftMatch = s.shift ? event.shiftKey : !event.shiftKey;
				const metaMatch = s.meta ? event.metaKey : true;

				return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
			});

			if (shortcut) {
				event.preventDefault();
				shortcut.action();
			}
		},
		[shortcuts],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	return shortcuts;
}

// Hook to display shortcuts help
export function useShortcutsHelp() {
	const shortcuts = DEFAULT_SHORTCUTS;

	const getShortcutString = (shortcut: KeyboardShortcut) => {
		const parts = [];
		if (shortcut.ctrl) parts.push("Ctrl");
		if (shortcut.alt) parts.push("Alt");
		if (shortcut.shift) parts.push("Shift");
		if (shortcut.meta) parts.push("Cmd");
		parts.push(shortcut.key === " " ? "Space" : shortcut.key);
		return parts.join("+");
	};

	return shortcuts.map((s) => ({
		keys: getShortcutString(s),
		description: s.description,
	}));
}
