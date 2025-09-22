import { AnimatePresence, motion } from "framer-motion";
import {
	ChevronDown,
	ChevronUp,
	Download,
	FolderOpen,
	HelpCircle,
	Play,
	Search,
	Settings,
	Upload,
	Wand2,
} from "lucide-react";
import { useState } from "react";

interface EmptyStateQuickActionsProps {
	prefersReducedMotion: boolean;
	onOpenHelp?: () => void;
	onStartTour?: () => void;
	onOpenSettings?: () => void;
	onTryDemo?: () => void;
	onQuickSearch?: (query: string) => void;
	sampleQueries?: string[];
	context?: "search" | "collections" | "saved" | "people" | "library";
}

export function EmptyStateQuickActions({
	prefersReducedMotion,
	onOpenHelp,
	onStartTour,
	onOpenSettings,
	onTryDemo,
	onQuickSearch,
	sampleQueries = [],
	context = "search",
}: EmptyStateQuickActionsProps) {
	const [showMore, setShowMore] = useState(false);

	const animationProps = prefersReducedMotion
		? {}
		: {
				whileHover: { scale: 1.02 },
				whileTap: { scale: 0.98 },
			};

	const getContextualActions = () => {
		switch (context) {
			case "search":
				return [
					{
						label: "Try sample searches",
						icon: <Search className="w-4 h-4" />,
						action: () => setShowMore(!showMore),
						variant: "secondary" as const,
					},
					...(onTryDemo
						? [
								{
									label: "Explore demo photos",
									icon: <Wand2 className="w-4 h-4" />,
									action: onTryDemo,
									variant: "primary" as const,
								},
							]
						: []),
				];
			case "collections":
				return [
					{
						label: "Create your first collection",
						icon: <FolderOpen className="w-4 h-4" />,
						action: () => setShowMore(!showMore),
						variant: "secondary" as const,
					},
				];
			case "saved":
				return [
					{
						label: "Save your first search",
						icon: <Download className="w-4 h-4" />,
						action: () => setShowMore(!showMore),
						variant: "secondary" as const,
					},
				];
			case "people":
				return [
					{
						label: "Start face recognition",
						icon: <Upload className="w-4 h-4" />,
						action: () => setShowMore(!showMore),
						variant: "secondary" as const,
					},
				];
			case "library":
				return [
					...(onTryDemo
						? [
								{
									label: "Try demo library",
									icon: <Wand2 className="w-4 h-4" />,
									action: onTryDemo,
									variant: "primary" as const,
								},
							]
						: []),
				];
			default:
				return [];
		}
	};

	const actions = getContextualActions();

	if (actions.length === 0 && !onOpenHelp && !onStartTour && !onOpenSettings) {
		return null;
	}

	return (
		<div className="mt-6 space-y-3">
			{/* Primary Actions */}
			<div className="flex flex-wrap items-center justify-center gap-2">
				{actions.map((action) => (
					<motion.button
						key={`action-${action.label}`}
						type="button"
						{...animationProps}
						onClick={action.action}
						className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
							action.variant === "primary"
								? "bg-blue-600 text-white hover:bg-blue-700"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
						}`}
					>
						{action.icon}
						{action.label}
						{action.action === setShowMore && (
							<AnimatePresence mode="wait">
								{showMore ? (
									<ChevronUp className="w-4 h-4" />
								) : (
									<ChevronDown className="w-4 h-4" />
								)}
							</AnimatePresence>
						)}
					</motion.button>
				))}

				{/* Help & Settings */}
				{onOpenHelp && (
					<motion.button
						type="button"
						{...animationProps}
						onClick={onOpenHelp}
						className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
					>
						<HelpCircle className="w-4 h-4" />
						Help
					</motion.button>
				)}

				{onStartTour && (
					<motion.button
						type="button"
						{...animationProps}
						onClick={onStartTour}
						className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
					>
						<Play className="w-4 h-4" />
						Start tour
					</motion.button>
				)}

				{onOpenSettings && (
					<motion.button
						type="button"
						{...animationProps}
						onClick={onOpenSettings}
						className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
					>
						<Settings className="w-4 h-4" />
						Settings
					</motion.button>
				)}
			</div>

			{/* Expanded Content */}
			<AnimatePresence>
				{showMore && (
					<motion.div
						initial={
							prefersReducedMotion ? undefined : { opacity: 0, height: 0 }
						}
						animate={
							prefersReducedMotion ? undefined : { opacity: 1, height: "auto" }
						}
						exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
						transition={
							prefersReducedMotion
								? undefined
								: { duration: 0.2, ease: "easeOut" }
						}
						className="overflow-hidden"
					>
						<div className="pt-4 border-t border-gray-200 dark:border-gray-700">
							{context === "search" && sampleQueries.length > 0 && (
								<div className="text-center">
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
										Try these sample searches:
									</p>
									<div className="flex flex-wrap justify-center gap-2">
										{sampleQueries.slice(0, 6).map((query) => (
											<motion.button
												key={query}
												type="button"
												{...animationProps}
												onClick={() => onQuickSearch?.(query)}
												className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-full hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
											>
												{query}
											</motion.button>
										))}
									</div>
								</div>
							)}

							{context === "collections" && (
								<div className="text-center">
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
										Collections help you organize photos by theme or event
									</p>
									<div className="flex flex-wrap justify-center gap-2">
										{sampleQueries.map((name) => (
											<motion.button
												key={name}
												type="button"
												{...animationProps}
												onClick={() => onQuickSearch?.(name)}
												className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-full hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors"
											>
												Create "{name}"
											</motion.button>
										))}
									</div>
								</div>
							)}

							{context === "saved" && (
								<div className="text-center">
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
										Save frequently used searches for quick access
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-500">
										Search for photos first, then use the "Save" button to store
										your query
									</p>
								</div>
							)}

							{context === "people" && (
								<div className="text-center">
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
										Face recognition automatically groups photos by person
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-500">
										Click "Build/Update" to scan your photos for faces
									</p>
								</div>
							)}

							{context === "library" && onTryDemo && (
								<div className="text-center">
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
										Experience all features with our sample library
									</p>
									<motion.button
										type="button"
										{...animationProps}
										onClick={onTryDemo}
										className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors"
									>
										<Wand2 className="w-4 h-4" />
										Load Demo Library
									</motion.button>
									<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
										Demo photos stay local and can be reset anytime
									</p>
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export default EmptyStateQuickActions;
