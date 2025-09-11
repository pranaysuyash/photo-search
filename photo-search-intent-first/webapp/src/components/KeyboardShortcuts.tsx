// Keyboard Shortcuts Overlay
// User Intent: "I want to learn and use keyboard shortcuts efficiently"
// Shows a friendly, discoverable shortcuts reference

import { Keyboard, X } from "lucide-react";
import React, { useEffect, useState } from "react";

interface ShortcutGroup {
	title: string;
	shortcuts: {
		keys: string[];
		description: string;
		available?: boolean;
	}[];
}

interface KeyboardShortcutsProps {
	isOpen: boolean;
	onClose: () => void;
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
	const [currentOS, setCurrentOS] = useState<"mac" | "windows">("mac");

	useEffect(() => {
		// Detect OS
		const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
		setCurrentOS(isMac ? "mac" : "windows");
	}, []);

	if (!isOpen) return null;

	const shortcutGroups: ShortcutGroup[] = [
		{
			title: "🔍 Search & Find",
			shortcuts: [
				{ keys: ["cmd", "k"], description: "Quick search" },
				{ keys: ["cmd", "f"], description: "Find in current view" },
				{ keys: ["cmd", "p"], description: "Search for people" },
				{ keys: ["cmd", "l"], description: "Search by location" },
				{ keys: ["/"], description: "Focus search bar" },
				{ keys: ["esc"], description: "Clear search" },
			],
		},
		{
			title: "🎯 Navigation",
			shortcuts: [
				{ keys: ["↑", "↓", "←", "→"], description: "Navigate photos" },
				{ keys: ["space"], description: "Quick preview" },
				{ keys: ["enter"], description: "Open photo" },
				{ keys: ["esc"], description: "Close photo" },
				{ keys: ["g", "h"], description: "Go home" },
				{ keys: ["g", "f"], description: "Go to favorites" },
				{ keys: ["g", "t"], description: "Go to trash" },
			],
		},
		{
			title: "✏️ Selection & Editing",
			shortcuts: [
				{ keys: ["cmd", "a"], description: "Select all" },
				{ keys: ["cmd", "click"], description: "Multi-select" },
				{ keys: ["shift", "click"], description: "Range select" },
				{ keys: ["x"], description: "Select/deselect current" },
				{ keys: ["cmd", "c"], description: "Copy selected" },
				{ keys: ["cmd", "v"], description: "Paste" },
				{ keys: ["delete"], description: "Delete selected" },
			],
		},
		{
			title: "👁️ View & Display",
			shortcuts: [
				{ keys: ["v"], description: "Toggle grid/list view" },
				{ keys: ["cmd", "+"], description: "Zoom in" },
				{ keys: ["cmd", "-"], description: "Zoom out" },
				{ keys: ["cmd", "0"], description: "Reset zoom" },
				{ keys: ["f"], description: "Toggle fullscreen" },
				{ keys: ["i"], description: "Show photo info" },
				{ keys: ["cmd", "d"], description: "Toggle dark mode" },
			],
		},
		{
			title: "⭐ Quick Actions",
			shortcuts: [
				{ keys: ["h"], description: "Heart/favorite photo" },
				{ keys: ["t"], description: "Add tags" },
				{ keys: ["r"], description: "Rotate photo" },
				{ keys: ["e"], description: "Edit photo" },
				{ keys: ["s"], description: "Share photo" },
				{ keys: ["cmd", "e"], description: "Export selected" },
				{ keys: ["cmd", "b"], description: "Backup photos" },
			],
		},
		{
			title: "⚡ Power User",
			shortcuts: [
				{ keys: ["cmd", "shift", "p"], description: "Command palette" },
				{ keys: ["?"], description: "Show this help" },
				{ keys: ["j"], description: "Next photo (vim style)" },
				{ keys: ["k"], description: "Previous photo (vim style)" },
				{ keys: ["shift", "j"], description: "Next row" },
				{ keys: ["shift", "k"], description: "Previous row" },
				{ keys: ["."], description: "Show hidden photos" },
			],
		},
	];

	const formatKey = (key: string): string => {
		if (currentOS === "windows") {
			return key.replace("cmd", "Ctrl").replace("option", "Alt");
		}
		return key.replace("cmd", "⌘").replace("option", "⌥").replace("shift", "⇧");
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
					<div className="flex items-center gap-3">
						<Keyboard className="w-6 h-6 text-blue-500" />
						<h2 className="text-xl font-bold text-gray-900 dark:text-white">
							Keyboard Shortcuts
						</h2>
						<span className="text-sm text-gray-500">
							Work faster with these handy shortcuts
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 overflow-y-auto max-h-[60vh]">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{shortcutGroups.map((group, idx) => (
							<div
								key={`group-${group.title}-${idx}`}
								className="space-y-2"
							>
								<h3 className="font-semibold text-gray-900 dark:text-white mb-3">
									{group.title}
								</h3>
								<div className="space-y-1">
									{group.shortcuts.map((shortcut, sidx) => (
										<div
											key={sidx}
											className={`flex items-center justify-between p-2 rounded ${
												shortcut.available === false
													? "opacity-50"
													: "hover:bg-gray-50 dark:hover:bg-gray-700"
											}`}
										>
											<span className="text-sm text-gray-600 dark:text-gray-400">
												{shortcut.description}
											</span>
											<div className="flex items-center gap-1">
												{shortcut.keys.map((key, kidx) => (
													<React.Fragment key={kidx}>
														{kidx > 0 && (
															<span className="text-xs text-gray-400">+</span>
														)}
														<kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
															{formatKey(key)}
														</kbd>
													</React.Fragment>
												))}
											</div>
										</div>
									))}
								</div>
							</div>
						))}
					</div>

					{/* Tips */}
					<div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<h4 className="font-semibold text-gray-900 dark:text-white mb-2">
							💡 Pro Tips
						</h4>
						<ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
							<li>
								• Press{" "}
								<kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">
									?
								</kbd>{" "}
								anytime to see these shortcuts
							</li>
							<li>
								• Use{" "}
								<kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">
									{formatKey("cmd")} Shift P
								</kbd>{" "}
								to access any feature quickly
							</li>
							<li>
								• Combine shortcuts for faster workflows (select + action)
							</li>
							<li>• Most shortcuts work in any view or mode</li>
						</ul>
					</div>
				</div>

				{/* Footer */}
				<div className="p-4 border-t dark:border-gray-700 flex items-center justify-between text-sm text-gray-500">
					<span>Using {currentOS === "mac" ? "Mac" : "Windows"} shortcuts</span>
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
					>
						Got it!
					</button>
				</div>
			</div>
		</div>
	);
}

// Keyboard shortcuts hook for managing shortcuts
export function useKeyboardShortcuts(shortcuts: { [key: string]: () => void }) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Build key combination string
			const keys: string[] = [];
			if (e.metaKey || e.ctrlKey) keys.push("cmd");
			if (e.shiftKey) keys.push("shift");
			if (e.altKey) keys.push("option");

			// Add the actual key
			const key = e.key.toLowerCase();
			if (
				key !== "meta" &&
				key !== "control" &&
				key !== "shift" &&
				key !== "alt"
			) {
				keys.push(key);
			}

			const combo = keys.join("+");

			// Check if we have a handler for this combination
			if (shortcuts[combo]) {
				e.preventDefault();
				shortcuts[combo]();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [shortcuts]);
}

// Global keyboard shortcuts manager
class KeyboardShortcutsManager {
	private shortcuts: Map<string, () => void> = new Map();
	private enabled: boolean = true;

	register(combo: string, handler: () => void) {
		this.shortcuts.set(combo, handler);
	}

	unregister(combo: string) {
		this.shortcuts.delete(combo);
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}

	init() {
		window.addEventListener("keydown", this.handleKeyDown);
	}

	destroy() {
		window.removeEventListener("keydown", this.handleKeyDown);
	}

	private handleKeyDown = (e: KeyboardEvent) => {
		if (!this.enabled) return;

		// Don't trigger shortcuts when typing in input fields
		const target = e.target as HTMLElement;
		if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
			// Allow some shortcuts even in input fields
			if (!e.metaKey && !e.ctrlKey) return;
		}

		// Build key combination
		const keys: string[] = [];
		if (e.metaKey || e.ctrlKey) keys.push("cmd");
		if (e.shiftKey) keys.push("shift");
		if (e.altKey) keys.push("option");

		const key = e.key.toLowerCase();
		if (
			key !== "meta" &&
			key !== "control" &&
			key !== "shift" &&
			key !== "alt"
		) {
			keys.push(key);
		}

		const combo = keys.join("+");

		// Execute handler if found
		const handler = this.shortcuts.get(combo);
		if (handler) {
			e.preventDefault();
			handler();
		}
	};
}

export const keyboardShortcutsManager = new KeyboardShortcutsManager();
