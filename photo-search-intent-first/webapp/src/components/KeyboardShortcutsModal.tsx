import { X } from "lucide-react";
import { useShortcutsHelp } from "../hooks/useKeyboardShortcuts";

interface KeyboardShortcutsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function KeyboardShortcutsModal({
	isOpen,
	onClose,
}: KeyboardShortcutsModalProps) {
	const shortcuts = useShortcutsHelp();

	if (!isOpen) return null;

	const categories = {
		Navigation: ["/", "1", "2", "3", "Arrow", "t", "m", "l", "o"],
		Selection: ["Ctrl+A", "Ctrl+D", "Space"],
		Actions: ["Delete", "Ctrl+E", "Ctrl+S", "Ctrl+N", "a"],
		View: ["Shift+G", "Shift+L", "i"],
		General: ["Escape", "Shift+?"],
	} as Record<string, string[]>;

	const getCategoryShortcuts = (keys: string[]) => {
		return shortcuts.filter((s) => {
			const lk = s.keys.toLowerCase();
			return keys.some((k) => lk.includes(k.toLowerCase()));
		});
	};

	return (
		<div
			className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div
				className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
						Keyboard Shortcuts
					</h2>
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
				<div className="p-6 overflow-y-auto max-h-[60vh]">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{Object.entries(categories).map(([category, keys]) => (
							<div key={category}>
								<h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
									{category}
								</h3>
								<div className="space-y-2">
									{getCategoryShortcuts(keys).map((shortcut, idx) => (
										<div
											key={`item-${idx}`}
											className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
										>
											<span className="text-sm text-gray-700 dark:text-gray-300">
												{shortcut.description}
											</span>
											<kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded border border-gray-300 dark:border-gray-600">
												{shortcut.keys}
											</kbd>
										</div>
									))}
								</div>
							</div>
						))}
					</div>

					{/* Tips */}
					<div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
							Pro Tips
						</h3>
						<ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
							<li>
								• Press{" "}
								<kbd className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 rounded">
									?
								</kbd>{" "}
								anytime to show this help
							</li>
							<li>
								• Most shortcuts work globally except when typing in inputs
							</li>
							<li>
								• Use{" "}
								<kbd className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 rounded">
									Escape
								</kbd>{" "}
								to close modals or clear selection
							</li>
							<li>• Navigate photos with arrow keys in lightbox view</li>
						</ul>
					</div>
				</div>

				{/* Footer */}
				<div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
					<div className="flex items-center justify-between">
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Press any key to try it out
						</p>
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
						>
							Got it
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
