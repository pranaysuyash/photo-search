import { Keyboard, X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";

interface KeyboardShortcut {
	key: string;
	description: string;
	category: string;
}

interface KeyboardShortcutsPanelProps {
	isOpen: boolean;
	onClose: () => void;
}

const shortcuts: KeyboardShortcut[] = [
	// Global shortcuts
	{ key: "/", description: "Open search overlay", category: "Global" },
	{ key: "?", description: "Show this help", category: "Global" },
	{ key: "I", description: "Toggle info overlay", category: "Global" },
	{ key: "A", description: "Open advanced search", category: "Global" },

	// Timeline shortcuts (when in timeline view)
	{ key: "T", description: "Jump to today", category: "Timeline" },
	{ key: "M", description: "Jump to this month", category: "Timeline" },
	{ key: "L", description: "Jump to last month", category: "Timeline" },
	{ key: "O", description: "Jump to oldest", category: "Timeline" },

	// Results navigation
	{ key: "↑↓←→", description: "Navigate photos", category: "Results" },
	{ key: "Home", description: "Jump to first photo", category: "Results" },
	{ key: "End", description: "Jump to last photo", category: "Results" },
	{ key: "Page Up/Down", description: "Jump by 3 rows", category: "Results" },
	{ key: "Enter", description: "Open photo detail", category: "Results" },
	{ key: "Space", description: "Select/deselect photo", category: "Results" },
	{ key: "F", description: "Toggle favorite", category: "Results" },
	{ key: "A", description: "Select all photos", category: "Results" },
	{ key: "C", description: "Clear all selections", category: "Results" },
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
	{ key: "Escape", description: "Close lightbox", category: "Lightbox" },
];

const categories = ["Global", "Timeline", "Results", "Lightbox"];

export const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({
	isOpen,
	onClose,
}) => {
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

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center gap-3">
						<Keyboard className="w-6 h-6 text-blue-600" />
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
							Keyboard Shortcuts
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
						aria-label="Close shortcuts"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{categories.map((category) => {
							const categoryShortcuts = shortcuts.filter(
								(shortcut) => shortcut.category === category,
							);

							return (
								<div key={category} className="space-y-3">
									<h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
										{category}
									</h3>
									<div className="space-y-2">
										{categoryShortcuts.map((shortcut, index) => (
											<div
												key={`${category}-${shortcut.key}-${index}`}
												className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
											>
												<span className="text-sm text-gray-600 dark:text-gray-300">
													{shortcut.description}
												</span>
												<kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs font-mono">
													{shortcut.key}
												</kbd>
											</div>
										))}
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
							<li>• Timeline shortcuts only work in timeline view</li>
							<li>• Results shortcuts work when viewing search results</li>
							<li>
								• Press{" "}
								<kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
									Escape
								</kbd>{" "}
								to close any overlay
							</li>
						</ul>
					</div>
				</div>

				{/* Footer */}
				<div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Got it!
					</button>
				</div>
			</div>
		</div>
	);
};
