import { X } from "lucide-react";

interface ContextualHelpProps {
	isVisible: boolean;
	onDismiss: () => void;
	context: "search" | "library" | "results" | "settings" | "collections";
	userActions: string[];
}

const CONTEXTUAL_HELP_CONTENT = {
	search: {
		title: "Search Tips",
		content: [
			"Try natural language queries like 'beach sunset' or 'birthday cake'",
			"Use filters to narrow results by date, camera, or location",
			"Search for people by name or use face recognition",
			"Save frequent searches as presets for quick access",
		],
	},
	library: {
		title: "Library Management",
		content: [
			"Click photos to select them for batch operations",
			"Use the grid view for browsing or timeline for chronological view",
			"Create collections to organize your photos",
			"Index your photos to enable fast search",
		],
	},
	results: {
		title: "Working with Results",
		content: [
			"Click any photo to view it in detail",
			"Use arrow keys to navigate between photos",
			"Press spacebar to select/deselect photos",
			"Right-click for additional actions menu",
		],
	},
	settings: {
		title: "Settings & Preferences",
		content: [
			"Configure search providers and API keys",
			"Adjust performance settings for your hardware",
			"Enable accessibility features as needed",
			"Manage photo directories and indexing",
		],
	},
	collections: {
		title: "Collections & Organization",
		content: [
			"Create smart collections with automatic rules",
			"Organize photos by events, people, or themes",
			"Share collections with others",
			"Export collections for backup or sharing",
		],
	},
};

export function ContextualHelp({
	isVisible,
	onDismiss,
	context,
	userActions,
}: ContextualHelpProps) {
	if (!isVisible) return null;

	const helpContent =
		CONTEXTUAL_HELP_CONTENT[context] || CONTEXTUAL_HELP_CONTENT.search;

	// Show more advanced tips for experienced users
	const isExperienced = userActions.length > 10;
	const tips = isExperienced
		? helpContent.content
		: helpContent.content.slice(0, 2);

	return (
		<div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4" data-help-context={context}>
			<div className="flex items-start justify-between mb-3">
				<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
					{helpContent.title}
				</h3>
				<button
					type="button"
					onClick={onDismiss}
					className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
					aria-label="Close help"
				>
					<X size={16} />
				</button>
			</div>

			<ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
				{tips.map((tip) => (
					<li key={tip} className="flex items-start">
						<span className="text-blue-500 mr-2 mt-1">•</span>
						<span>{tip}</span>
					</li>
				))}
			</ul>

			{isExperienced && (
				<p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
					💡 Pro tip: Try advanced search with multiple filters combined
				</p>
			)}
		</div>
	);
}
