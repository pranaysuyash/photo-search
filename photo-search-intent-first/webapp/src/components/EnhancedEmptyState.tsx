import {
	ChevronDown,
	ChevronUp,
	FolderOpen,
	HelpCircle,
	Image,
	LifeBuoy,
	Search,
	SlidersHorizontal,
	Upload,
	Wand2,
} from "lucide-react";
import { useState } from "react";

interface EnhancedEmptyStateProps {
	type: "no-directory" | "no-photos" | "no-results" | "indexing";
	searchQuery?: string;
	onAction?: () => void;
	onDemoAction?: () => void;
	// Extended context actions
	onClearSearch?: () => void;
	onOpenFilters?: () => void;
	onOpenAdvanced?: () => void;
	onOpenHelp?: () => void;
	onStartTour?: () => void;
	onOpenJobs?: () => void;
	sampleQueries?: string[];
	onRunSample?: (q: string) => void;
	// Optional "Did you mean" alternatives (typo corrections)
	didYouMean?: string[];
	hasActiveFilters?: boolean;
	indexingProgress?: number;
	estimatedTime?: string;
}

export function EnhancedEmptyState({
	type,
	searchQuery,
	onAction,
	onDemoAction,
	onClearSearch,
	onOpenFilters,
	onOpenAdvanced,
	onOpenHelp,
	onStartTour,
	onOpenJobs,
	sampleQueries,
	onRunSample,
	didYouMean,
	hasActiveFilters,
	indexingProgress = 0,
	estimatedTime,
}: EnhancedEmptyStateProps) {
	const [showTips, setShowTips] = useState(false);
	const defaultSamples = [
		"beach sunset",
		"birthday cake",
		"mountain hike",
		"red car",
	];
	const samples =
		Array.isArray(sampleQueries) && sampleQueries.length > 0
			? sampleQueries
			: defaultSamples;

	const getContent = () => {
		switch (type) {
			case "no-directory":
				return {
					badge: "Getting started",
					icon: <FolderOpen className="w-10 h-10 text-blue-600" />,
					title: "Bring your photo library to life",
					subtitle:
						"Connect a folder or launch the demo library to explore search, filters, and OCR right away.",
					description:
						"All indexing runs locally. You can add or remove sources at any time — nothing leaves your device.",
					actionLabel: "Select photo folder",
					action: onAction,
					demoActionLabel: "Preview with demo photos",
					demoAction: onDemoAction,
					quickFacts: [
						{
							title: "🔒 Private by design",
							description:
								"Analysis happens on your machine. Your originals stay put.",
							icon: <Image className="w-4 h-4" />,
						},
						{
							title: "⚡ Instant tour",
							description:
								"Load a curated sample set to try search, filters, and OCR in seconds.",
							icon: <Search className="w-4 h-4" />,
						},
						{
							title: "🎯 Smart search",
							description:
								"Find photos by people, places, objects, colors, and emotions.",
							icon: <Wand2 className="w-4 h-4" />,
						},
					],
					tips: [
						"Choose folders with JPEG, PNG, HEIC, or TIFF photos for best results",
						"AI-based indexing unlocks natural language search, filters, and face clustering",
						"Keep the app running in the background while large libraries index",
						"Add more folders any time from the library switcher",
					],
				};

			case "no-photos":
				return {
					badge: "Empty folder",
					icon: <Image className="w-10 h-10 text-blue-600" />,
					title: "This folder is empty",
					subtitle:
						"Add photos to this directory or switch to another source to continue.",
					description:
						"Need inspiration? Launch the demo library to explore features without importing.",
					actionLabel: "Select a different folder",
					action: onAction,
					demoActionLabel: "Preview with demo photos",
					demoAction: onDemoAction,
					tips: [
						"Make sure your photos are in common formats like JPEG, PNG, or TIFF",
						"Check that the folder contains actual photo files, not just subfolders",
						"If you just added photos, try refreshing the library",
						"You can also import photos from other locations",
					],
				};

			case "no-results":
				return {
					badge: "No matches yet",
					icon: <Search className="w-10 h-10 text-blue-600" />,
					title: `No results for "${searchQuery}"`,
					description:
						"Try adjusting your search terms or filters. Here are some suggestions:",
					suggestions: (() => {
						const base = [
							"Use simpler words or phrases",
							"Try searching for colors, objects, or locations",
							"Check your spelling",
							"Remove filters if any are applied",
							"Try searching for people or events",
						];
						const q = (searchQuery || "").toLowerCase();
						// Contextual nudge for common synonyms
						if (/\bkids?\b/.test(q)) {
							base.unshift("Try 'children'");
						} else if (/\bchildren\b/.test(q)) {
							base.unshift("Try 'kid' or 'kids'");
						}
						return base;
					})(),
					actionLabel: "Clear Search",
					action: onAction,
				};

			case "indexing":
				return {
					badge: "Indexing",
					icon: <Upload className="w-10 h-10 text-blue-600" />,
					title: "Indexing your photos",
					subtitle:
						"We’re analyzing each image so you can search by people, places, and objects.",
					description: `Progress ${indexingProgress}% complete. You can keep browsing while we work.`,
					progress: indexingProgress,
					estimatedTime,
					tips: [
						"This process analyzes each photo using AI to understand its content",
						"You'll be able to search by objects, scenes, colors, and more",
						"The process typically takes about 30 seconds per 100 photos",
						"You can continue using other features while indexing runs",
					],
				};

			default:
				return {
					icon: <HelpCircle className="w-16 h-16 text-gray-400" />,
					title: "Something went wrong",
					description: "We're having trouble loading this content.",
					actionLabel: "Try Again",
					action: onAction,
				};
		}
	};

	const content = getContent();

	return (
		<div
			className="flex flex-col items-center justify-center min-h-[500px] px-4 py-8 text-center sm:min-h-[420px] sm:px-6 sm:py-10"
			role={type === "indexing" ? "status" : "region"}
			aria-live={type === "indexing" ? "polite" : undefined}
		>
			<div className="w-full max-w-4xl">
				<div className="relative overflow-hidden rounded-3xl border border-blue-100/50 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-xl dark:border-slate-700/60 dark:from-slate-900/60 dark:via-slate-900 dark:to-slate-950">
					<div
						className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-3xl"
						aria-hidden="true"
					/>
					<div
						className="pointer-events-none absolute -bottom-28 -left-10 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-400/15 to-purple-400/15 blur-3xl"
						aria-hidden="true"
					/>
					<div
						className="pointer-events-none absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-300/10 to-blue-300/10 blur-2xl"
						aria-hidden="true"
					/>
					<div className="relative flex flex-col items-center gap-6 px-6 py-12 sm:px-12">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 shadow-lg ring-1 ring-blue-100 dark:bg-slate-800 dark:ring-slate-700">
							{content.icon}
						</div>
						<div className="max-w-2xl space-y-3 text-center">
							{content.badge && (
								<span className="inline-flex items-center justify-center rounded-full border border-blue-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:border-blue-500/50 dark:bg-blue-900/30 dark:text-blue-100">
									{content.badge}
								</span>
							)}
							<h2 className="text-3xl font-semibold text-gray-900 dark:text-white">
								{content.title}
							</h2>
							{content.subtitle && (
								<p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
									{content.subtitle}
								</p>
							)}
							{content.description && (
								<p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
									{content.description}
								</p>
							)}
						</div>

						{content.progress !== undefined && (
							<div className="w-full max-w-xl text-left">
								<div className="h-2 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-slate-700">
									<div
										className="h-full rounded-full bg-blue-500 transition-all duration-500"
										style={{ width: `${content.progress}%` }}
									/>
								</div>
								{content.estimatedTime && (
									<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
										Estimated time remaining: {content.estimatedTime}
									</p>
								)}
							</div>
						)}

						{Array.isArray(content.quickFacts) &&
							content.quickFacts.length > 0 && (
								<div className="grid w-full max-w-4xl gap-4 text-left sm:grid-cols-3">
									{content.quickFacts.map((fact) => (
										<div
											key={`fact-${fact.title}`}
											className="group rounded-2xl border border-blue-100/70 bg-white/90 p-5 text-sm shadow-sm transition-all hover:shadow-md hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/80 dark:hover:bg-slate-800"
										>
											<div className="flex items-start gap-3">
												{fact.icon && (
													<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
														{fact.icon}
													</div>
												)}
												<div className="flex-1">
													<h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-100">
														{fact.title}
													</h3>
													<p className="mt-2 text-gray-600 dark:text-gray-300 leading-relaxed">
														{fact.description}
													</p>
												</div>
											</div>
										</div>
									))}
								</div>
							)}

						<div className="flex flex-wrap items-center justify-center gap-3 pt-2">
							{content.demoAction && (
								<button
									type="button"
									onClick={content.demoAction}
									className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
								>
									<Wand2 className="h-4 w-4" />
									{content.demoActionLabel}
								</button>
							)}
							{content.action && (
								<button
									type="button"
									onClick={content.action}
									className="inline-flex items-center justify-center rounded-lg border-2 border-blue-200 bg-white/95 px-6 py-3 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-blue-500/40 dark:bg-slate-800 dark:text-blue-100 dark:hover:border-blue-400 dark:hover:bg-slate-700"
								>
									{content.actionLabel}
								</button>
							)}
							{type === "no-directory" && onStartTour && (
								<button
									type="button"
									onClick={onStartTour}
									className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<HelpCircle className="h-4 w-4" />
									Start tour
								</button>
							)}
							{type === "indexing" && onOpenJobs && (
								<button
									type="button"
									onClick={onOpenJobs}
									className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<Upload className="h-4 w-4" />
									View progress
								</button>
							)}
							{onOpenHelp && (
								<button
									type="button"
									onClick={onOpenHelp}
									className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<LifeBuoy className="h-4 w-4" /> Help
								</button>
							)}
						</div>

						{(type === "no-directory" || type === "no-photos") &&
							content.demoAction && (
								<p className="max-w-xl text-xs text-gray-500 dark:text-gray-400">
									Demo photos stay local and can be reset anytime — ideal for
									walkthroughs and reviews.
								</p>
							)}
					</div>
				</div>
			</div>

			{content.suggestions && (
				<div className="mt-8 w-full max-w-4xl text-left">
					<ul className="space-y-2 rounded-2xl border border-gray-200/70 bg-white/80 p-5 text-sm leading-relaxed text-gray-600 shadow-sm dark:border-gray-700/60 dark:bg-slate-900/70 dark:text-gray-300">
						{content.suggestions.map((suggestion, index) => (
							<li
								key={`suggestion-${suggestion.substring(0, 10)}-${index}`}
								className="flex items-start gap-2"
							>
								<span className="text-blue-500">•</span>
								{suggestion}
							</li>
						))}
					</ul>
					<div className="mt-4 flex flex-wrap items-center gap-2">
						{onOpenFilters && (
							<button
								type="button"
								onClick={onOpenFilters}
								className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<SlidersHorizontal className="h-4 w-4" /> Filters
							</button>
						)}
						{onOpenAdvanced && (
							<button
								type="button"
								onClick={onOpenAdvanced}
								className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<Wand2 className="h-4 w-4" /> Advanced
							</button>
						)}
						{hasActiveFilters && onClearSearch && (
							<button
								type="button"
								onClick={onClearSearch}
								className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								Clear filters
							</button>
						)}
					</div>
				</div>
			)}

			{type === "no-results" && samples.length > 0 && (
				<div className="mt-6 flex flex-wrap justify-center gap-2">
					{samples.map((q) => (
						<button
							key={q}
							type="button"
							onClick={() => onRunSample?.(q)}
							className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:bg-slate-900 dark:text-gray-200 dark:hover:border-gray-500"
						>
							{q}
						</button>
					))}
				</div>
			)}

			{type === "no-results" &&
				Array.isArray(didYouMean) &&
				didYouMean.length > 0 && (
					<div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
						<span className="mr-2">Did you mean:</span>
						{didYouMean.slice(0, 3).map((alt) => (
							<button
								key={`dym-${alt}`}
								type="button"
								onClick={() => onRunSample?.(alt)}
								className="mr-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:bg-slate-900 dark:text-gray-200 dark:hover:border-gray-500"
							>
								{alt}
							</button>
						))}
					</div>
				)}

			{type === "indexing" && (
				<div className="mt-10 w-full max-w-4xl">
					<div className="grid grid-cols-3 gap-2 md:grid-cols-5 lg:grid-cols-8">
						{Array.from({ length: 16 }).map((_, idx) => (
							<div
								key={`skeleton-${idx}-${type}`}
								className="h-24 rounded-lg bg-blue-100/60 dark:bg-slate-800/60"
							/>
						))}
					</div>
					<p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
						Preparing thumbnails and metadata…
					</p>
				</div>
			)}

			{content.tips && (
				<div className="mt-10 w-full max-w-3xl text-left">
					<button
						type="button"
						onClick={() => setShowTips(!showTips)}
						className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
					>
						{showTips ? (
							<ChevronUp className="h-4 w-4" />
						) : (
							<ChevronDown className="h-4 w-4" />
						)}
						{showTips ? "Hide tips" : "Show tips"}
					</button>

					{showTips && (
						<div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-900/20">
							<h4 className="mb-3 font-medium text-blue-900 dark:text-blue-100">
								💡 Tips
							</h4>
							<ul className="space-y-2 text-sm text-blue-800 dark:text-blue-100">
								{content.tips.map((tip, index) => (
									<li
										key={`tip-${tip.substring(0, 10)}-${index}`}
										className="flex items-start gap-2"
									>
										<span className="mt-1 text-blue-500">•</span>
										{tip}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
