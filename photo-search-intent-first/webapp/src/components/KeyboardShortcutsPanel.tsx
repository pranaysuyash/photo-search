import { Keyboard, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { detectOS, formatShortcut } from "../utils/platform";

interface KeyboardShortcut {
	key: string;
	description: string;
	category: string;
	// Optional macOS-specific shortcut
	macShortcut?: string;
}

interface KeyboardShortcutsPanelProps {
	isOpen: boolean;
	onClose: () => void;
}

// Define all keyboard shortcuts with categories
const shortcuts: KeyboardShortcut[] = [
	// Global shortcuts
	{ key: "/", description: "Open search overlay", category: "Global" },
	{ key: "?", description: "Show this help", category: "Global" },
	{ key: "I", description: "Toggle info overlay", category: "Global" },
	{ key: "A", description: "Open advanced search", category: "Global" },
	{ key: "mod+,", description: "Open settings", category: "Global" },
	{ key: "mod+S", description: "Save current search", category: "Global" },
	{ key: "mod+H", description: "Show search history", category: "Global" },

	// Navigation shortcuts
	{ key: "mod+K", description: "Open command palette", category: "Navigation" },
	{
		key: "mod+T",
		description: "Switch to timeline view",
		category: "Navigation",
	},
	{
		key: "mod+R",
		description: "Switch to results view",
		category: "Navigation",
	},
	{
		key: "mod+L",
		description: "Switch to library view",
		category: "Navigation",
	},
	{ key: "mod+M", description: "Switch to map view", category: "Navigation" },
	{
		key: "mod+P",
		description: "Switch to people view",
		category: "Navigation",
	},
	{
		key: "mod+C",
		description: "Switch to collections view",
		category: "Navigation",
	},

	// Timeline shortcuts (when in timeline view)
	{ key: "T", description: "Jump to today", category: "Timeline" },
	{ key: "M", description: "Jump to this month", category: "Timeline" },
	{ key: "L", description: "Jump to last month", category: "Timeline" },
	{ key: "O", description: "Jump to oldest", category: "Timeline" },
	{ key: "N", description: "Jump to newest", category: "Timeline" },

	// Results navigation
	{ key: "↑↓←→", description: "Navigate photos", category: "Results" },
	{ key: "Home", description: "Jump to first photo", category: "Results" },
	{ key: "End", description: "Jump to last photo", category: "Results" },
	{ key: "Page Up", description: "Jump by 3 rows up", category: "Results" },
	{ key: "Page Down", description: "Jump by 3 rows down", category: "Results" },
	{ key: "Enter", description: "Open photo detail", category: "Results" },
	{ key: "Space", description: "Select/deselect photo", category: "Results" },
	{ key: "Shift+Click", description: "Range select", category: "Results" },
	{
		key: "Cmd+A",
		description: "Select all photos",
		category: "Results",
		macShortcut: "⌘A",
	},
	{ key: "Ctrl+A", description: "Select all photos", category: "Results" },
	{
		key: "Cmd+C",
		description: "Copy selected photos",
		category: "Results",
		macShortcut: "⌘C",
	},
	{ key: "Ctrl+C", description: "Copy selected photos", category: "Results" },
	{ key: "F", description: "Toggle favorite", category: "Results" },
	{ key: "D", description: "Delete selected photos", category: "Results" },
	{ key: "Escape", description: "Close detail view", category: "Results" },

	// Lightbox navigation
	{
		key: "←→ or J/K",
		description: "Navigate in lightbox",
		category: "Lightbox",
	},
	{
		key: "F",
		description: "Toggle favorite in lightbox",
		category: "Lightbox",
	},
	{ key: "I", description: "Show photo info", category: "Lightbox" },
	{ key: "C", description: "Add to collection", category: "Lightbox" },
	{ key: "T", description: "Add tags", category: "Lightbox" },
	{ key: "Escape", description: "Close lightbox", category: "Lightbox" },
	{ key: "Space", description: "Zoom photo", category: "Lightbox" },

	// Search modifiers
	{
		key: "mod+Enter",
		description: "Search in current view only",
		category: "Search",
	},
	{
		key: "Shift+Enter",
		description: "Search with exact phrase",
		category: "Search",
	},
	{
		key: "Alt+Enter",
		description: "Search with broader terms",
		category: "Search",
	},
	{
		key: "mod+Shift+F",
		description: "Search in filenames only",
		category: "Search",
	},

	// Batch operations
	{
		key: "mod+B",
		description: "Batch tag selected photos",
		category: "Batch Operations",
	},
	{
		key: "mod+G",
		description: "Batch geotag selected photos",
		category: "Batch Operations",
	},
	{
		key: "mod+E",
		description: "Export selected photos",
		category: "Batch Operations",
	},

	// Collections
	{
		key: "mod+N",
		description: "Create new collection",
		category: "Collections",
	},
	{
		key: "mod+O",
		description: "Open collection manager",
		category: "Collections",
	},

	// People/Faces
	{ key: "mod+F", description: "Open face recognition", category: "People" },
	{ key: "mod+U", description: "Update face recognition", category: "People" },
];

// Define categories in order of importance
const categories = [
	"Global",
	"Navigation",
	"Search",
	"Results",
	"Lightbox",
	"Timeline",
	"Collections",
	"People",
	"Batch Operations",
];

export const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({
	isOpen,
	onClose,
}) => {
	const [os, setOs] = useState<"macOS" | "Windows" | "Linux" | "Unknown">(
		"Unknown",
	);

	// Detect OS on mount
	useEffect(() => {
		setOs(detectOS());
	}, []);

	// Handle escape key to close
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	// Group shortcuts by category
	const groupedShortcuts = shortcuts.reduce(
		(acc, shortcut) => {
			if (!acc[shortcut.category]) {
				acc[shortcut.category] = [];
			}
			acc[shortcut.category].push(shortcut);
			return acc;
		},
		{} as Record<string, KeyboardShortcut[]>,
	);

	return (
		<div
			className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="keyboard-shortcuts-title"
		>
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
					<div className="flex items-center gap-3">
						<Keyboard className="w-6 h-6 text-blue-600" />
						<h2
							id="keyboard-shortcuts-title"
							className="text-xl font-semibold text-gray-900 dark:text-white"
						>
							Keyboard Shortcuts
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
						aria-label="Close shortcuts"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 overflow-y-auto flex-1">
					<div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<p className="text-sm text-blue-800 dark:text-blue-200">
							<span className="font-medium">Platform:</span>{" "}
							{os === "Unknown" ? "Detecting..." : os} • Modifier key:{" "}
							{os === "macOS" ? "⌘ (Cmd)" : "Ctrl"}
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{categories.map((category) => {
							const categoryShortcuts = groupedShortcuts[category] || [];

							if (categoryShortcuts.length === 0) return null;

							return (
								<div key={category} className="space-y-3">
									<h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
										{category}
									</h3>
									<div className="space-y-2">
										{categoryShortcuts.map((shortcut, index) => {
											// Use OS-specific shortcut if available
											const displayKey =
												os === "macOS" && shortcut.macShortcut
													? shortcut.macShortcut
													: shortcut.key;

											const formattedKey = formatShortcut(displayKey);

											return (
												<div
													key={`${category}-${shortcut.key}-${index}`}
													className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
												>
													<span className="text-sm text-gray-600 dark:text-gray-300">
														{shortcut.description}
													</span>
													<kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs font-mono flex items-center gap-1">
														{formattedKey.split("+").map((part, i) => (
															<span key={i}>
																{part.trim() === "Cmd" && os === "macOS"
																	? "⌘"
																	: part.trim()}
																{i < formattedKey.split("+").length - 1 && "+"}
															</span>
														))}
													</kbd>
												</div>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>

					{/* Tips section */}
					<div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
							💡 Tips
						</h4>
						<ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
							<li>• Shortcuts work when not typing in input fields</li>
							<li>
								• View-specific shortcuts only work in their respective views
							</li>
							<li>
								• Press{" "}
								<kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
									Escape
								</kbd>{" "}
								to close any overlay
							</li>
							<li>
								• Use{" "}
								<kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
									Shift+Click
								</kbd>{" "}
								for range selection
							</li>
							<li>
								• Hold{" "}
								<kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
									Alt
								</kbd>{" "}
								while dragging to pan the map view
							</li>
						</ul>
					</div>
				</div>

				{/* Footer */}
				<div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Press{" "}
						<kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
							?
						</kbd>{" "}
						anytime to reopen this help
					</p>
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
					>
						Got it!
					</button>
				</div>
			</div>
		</div>
	);
};
