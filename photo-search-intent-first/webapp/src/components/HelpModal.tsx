import {
	Book,
	HelpCircle,
	Keyboard,
	MapPin,
	Play,
	Search,
	Settings,
	Shield,
	Star,
	Users,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { searchHistoryService } from "../services/SearchHistoryService";
import { KeyboardShortcutsPanel } from "./KeyboardShortcutsPanel";
import { SearchHistoryPrivacy } from "./SearchHistoryPrivacy";
import { Button } from "@/components/ui/shadcn/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/shadcn/Dialog";

interface HelpModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialSection?:
		| "getting-started"
		| "features"
		| "shortcuts"
		| "privacy"
		| "troubleshooting";
}

type HelpSection =
	| "getting-started"
	| "features"
	| "shortcuts"
	| "privacy"
	| "troubleshooting";

export function HelpModal({
	isOpen,
	onClose,
	initialSection = "getting-started",
}: HelpModalProps) {
	const [activeSection, setActiveSection] =
		useState<HelpSection>(initialSection);
	const [showShortcuts, setShowShortcuts] = useState(false);

	// Handle keyboard shortcuts globally
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Show help when pressing '?'
			if (
				e.key === "?" &&
				!e.ctrlKey &&
				!e.metaKey &&
				!e.altKey &&
				!e.shiftKey
			) {
				// Don't show help if user is typing in an input field
				if (
					document.activeElement instanceof HTMLInputElement ||
					document.activeElement instanceof HTMLTextAreaElement ||
					document.activeElement?.hasAttribute("contenteditable")
				) {
					return;
				}

				e.preventDefault();
				// Blur the active element to ensure we're not in an input
				(document.activeElement as HTMLElement)?.blur?.();
				// Note: The parent component should handle opening the help modal
				// This is just preventing the default behavior
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	const sections = [
		{
			id: "getting-started" as HelpSection,
			title: "Getting Started",
			icon: <Play className="w-5 h-5" />,
			content: (
				<div className="space-y-6">
					<div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
							Welcome to Photo Search!
						</h3>
						<p className="text-gray-600 dark:text-gray-300 mb-4">
							Your AI-powered photo search and management tool. Here's how to
							get started:
						</p>
						<p className="text-gray-600 dark:text-gray-300 text-sm">
							Tip: Press <span className="font-mono">?</span> anytime to open
							this help.
						</p>
					</div>

					<div className="grid gap-4">
						<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
									<span className="text-blue-600 dark:text-blue-400 font-semibold">
										1
									</span>
								</div>
								<div>
									<h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
										Select Your Photo Directory
									</h4>
									<p className="text-sm text-blue-700 dark:text-blue-400">
										Choose the folder containing your photos. The app will index
										them for fast searching.
									</p>
								</div>
							</div>
						</div>

						<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0">
									<span className="text-green-600 dark:text-green-400 font-semibold">
										2
									</span>
								</div>
								<div>
									<h4 className="font-medium text-green-900 dark:text-green-300 mb-1">
										Try the Demo Library
									</h4>
									<p className="text-sm text-green-700 dark:text-green-400">
										Don't have photos ready? Click "Try Demo" to explore with
										sample photos and see how search works.
									</p>
								</div>
							</div>
						</div>

						<div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center flex-shrink-0">
									<span className="text-purple-600 dark:text-purple-400 font-semibold">
										3
									</span>
								</div>
								<div>
									<h4 className="font-medium text-purple-900 dark:text-purple-300 mb-1">
										Start Searching
									</h4>
									<p className="text-sm text-purple-700 dark:text-purple-400">
										Use natural language to search: "beach sunset", "family
										photos", "mountains", or "red car".
									</p>
								</div>
							</div>
						</div>
					</div>

					<div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
						<h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">
							💡 Pro Tip
						</h4>
						<p className="text-sm text-yellow-700 dark:text-yellow-400">
							The more specific your search terms, the better results you'll
							get. Try combining concepts like "golden hour beach wedding" or
							"snowy mountain landscape".
						</p>
					</div>
				</div>
			),
		},
		{
			id: "features" as HelpSection,
			title: "Features",
			icon: <Zap className="w-5 h-5" />,
			content: (
				<div className="space-y-6">
					<div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
							Powerful Features
						</h3>
						<p className="text-gray-600 dark:text-gray-300 mb-4">
							Discover what makes Photo Search special:
						</p>
					</div>

					<div className="grid gap-4">
						<div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
							<Search className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
							<div>
								<h4 className="font-medium text-gray-900 dark:text-white mb-1">
									AI-Powered Search
								</h4>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									Search by visual content, not just filenames. Find photos
									using natural language descriptions.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
							<Users className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
							<div>
								<h4 className="font-medium text-gray-900 dark:text-white mb-1">
									Face Recognition
								</h4>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									Automatically detect and group photos by people. Find all
									photos of specific individuals.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
							<MapPin className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
							<div>
								<h4 className="font-medium text-gray-900 dark:text-white mb-1">
									Location Search
								</h4>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									Search photos by location data. Find all photos taken in
									Paris, at the beach, or at home.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
							<Star className="w-6 h-6 text-yellow-500 mt-1 flex-shrink-0" />
							<div>
								<h4 className="font-medium text-gray-900 dark:text-white mb-1">
									Smart Collections
								</h4>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									Create dynamic collections based on search criteria.
									Automatically updated as you add new photos.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
							<Settings className="w-6 h-6 text-purple-500 mt-1 flex-shrink-0" />
							<div>
								<h4 className="font-medium text-gray-900 dark:text-white mb-1">
									Advanced Filters
								</h4>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									Filter by date, camera, lens, ISO, aperture, and more. Combine
									with AI search for precise results.
								</p>
							</div>
						</div>
					</div>
				</div>
			),
		},
		{
			id: "shortcuts",
			title: "Keyboard Shortcuts",
			icon: <Keyboard className="w-5 h-5" />,
			content: (
				<div className="space-y-6">
					<div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
							Master Keyboard Navigation
						</h3>
						<p className="text-gray-600 dark:text-gray-300 mb-4">
							Speed up your workflow with powerful keyboard shortcuts. Learn the
							essentials or dive deep into advanced navigation techniques.
						</p>
						<p className="text-gray-600 dark:text-gray-300 text-sm">
							Tip: Press{" "}
							<span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">
								?
							</span>
							anytime to open this shortcuts reference.
						</p>
					</div>

					<div className="grid gap-4">
						<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
									<span className="text-blue-600 dark:text-blue-400 font-semibold">
										⌘/
									</span>
								</div>
								<div>
									<h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
										Universal Access
									</h4>
									<p className="text-sm text-blue-700 dark:text-blue-400">
										The{" "}
										<span className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">
											/
										</span>{" "}
										key opens search anywhere, and{" "}
										<span className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">
											?
										</span>
										shows this help panel.
									</p>
								</div>
							</div>
						</div>

						<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0">
									<span className="text-green-600 dark:text-green-400 font-semibold">
										↑↓
									</span>
								</div>
								<div>
									<h4 className="font-medium text-green-900 dark:text-green-300 mb-1">
										Navigation Mastery
									</h4>
									<p className="text-sm text-green-700 dark:text-green-400">
										Use arrow keys to navigate photo grids,
										<span className="font-mono bg-green-100 dark:bg-green-800 px-1 rounded">
											Enter
										</span>
										to open details, and{" "}
										<span className="font-mono bg-green-100 dark:bg-green-800 px-1 rounded">
											Space
										</span>
										to select.
									</p>
								</div>
							</div>
						</div>

						<div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center flex-shrink-0">
									<span className="text-purple-600 dark:text-purple-400 font-semibold">
										⌘K
									</span>
								</div>
								<div>
									<h4 className="font-medium text-purple-900 dark:text-purple-300 mb-1">
										Command Palette
									</h4>
									<p className="text-sm text-purple-700 dark:text-purple-400">
										Press{" "}
										<span className="font-mono bg-purple-100 dark:bg-purple-800 px-1 rounded">
											⌘K
										</span>
										(Ctrl+K on Windows) to access the powerful command palette
										for instant navigation.
									</p>
								</div>
							</div>
						</div>
					</div>

					<div className="border-t border-gray-200 dark:border-gray-700 pt-4">
						<Button
							variant="ghost"
							onClick={() => setShowShortcuts(true)}
							className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors group"
						>
							<div className="flex items-center gap-3">
								<Keyboard className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500" />
								<div className="text-left">
									<h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-500">
										View All Keyboard Shortcuts
									</h4>
									<p className="text-sm text-gray-500 dark:text-gray-400">
										Complete reference with categorized shortcuts
									</p>
								</div>
							</div>
							<svg
								className="w-5 h-5 text-gray-400 group-hover:text-blue-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Next section</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</Button>
					</div>
				</div>
			),
		},
		{
			id: "privacy" as HelpSection,
			title: "Privacy & Data",
			icon: <Shield className="w-5 h-5" />,
			content: (
				<div className="space-y-6">
					<SearchHistoryPrivacy
						onClearHistory={() => {
							searchHistoryService.clearHistory();
							// Show confirmation
							alert("Search history cleared successfully");
						}}
					/>
				</div>
			),
		},
		{
			id: "troubleshooting" as HelpSection,
			title: "Troubleshooting",
			icon: <HelpCircle className="w-5 h-5" />,
			content: (
				<div className="space-y-6">
					<div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
							Common Issues & Solutions
						</h3>
						<p className="text-gray-600 dark:text-gray-300 mb-4">
							Having trouble? Here are solutions to common problems:
						</p>
					</div>

					<div className="space-y-4">
						<div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
							<h4 className="font-medium text-red-900 dark:text-red-300 mb-2">
								🔍 No Search Results
							</h4>
							<ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
								<li>• Try more general search terms</li>
								<li>
									• Check if your photos are indexed (look for the indexing
									progress)
								</li>
								<li>• Try searching for colors, objects, or activities</li>
								<li>• Use the demo library to test search functionality</li>
							</ul>
						</div>

						<div className="border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
							<h4 className="font-medium text-orange-900 dark:text-orange-300 mb-2">
								📁 Photos Not Loading
							</h4>
							<ul className="text-sm text-orange-700 dark:text-orange-400 space-y-1">
								<li>• Ensure the photo directory is accessible</li>
								<li>• Check file permissions</li>
								<li>• Try re-selecting the directory</li>
								<li>• Restart the application if thumbnails don't appear</li>
							</ul>
						</div>

						<div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
							<h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
								🐌 Slow Performance
							</h4>
							<ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
								<li>
									• Large photo libraries may take time to index initially
								</li>
								<li>
									• Use the "Fast" indexing option for quicker but less accurate
									results
								</li>
								<li>• Close other applications to free up memory</li>
								<li>• Consider using smaller batch sizes for indexing</li>
							</ul>
						</div>

						<div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
							<h4 className="font-medium text-green-900 dark:text-green-300 mb-2">
								🎯 Face Recognition Issues
							</h4>
							<ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
								<li>• Face detection works best with clear, well-lit photos</li>
								<li>• Ensure faces are not obstructed or at extreme angles</li>
								<li>• Re-index your photos after making changes</li>
								<li>• Check the People view to see detected faces</li>
							</ul>
						</div>
					</div>

					<div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
						<h4 className="font-medium text-gray-900 dark:text-white mb-2">
							Still Need Help?
						</h4>
						<p className="text-sm text-gray-600 dark:text-gray-300">
							If you're still experiencing issues, try:
						</p>
						<ul className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-1">
							<li>• Restarting the application</li>
							<li>• Checking the browser console for error messages</li>
							<li>• Ensuring your browser supports modern web features</li>
							<li>• Clearing browser cache and cookies</li>
						</ul>
					</div>
				</div>
			),
		},
	];

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader className="flex flex-row items-center justify-between pb-4 border-b dark:border-gray-700">
					<div className="flex items-center gap-3">
						<Book className="w-6 h-6 text-blue-500" />
						<DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
							Help Center
						</DialogTitle>
					</div>
					<Button 
						variant="ghost" 
						onClick={onClose}
						aria-label="Close help"
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
					>
						<X className="w-5 h-5" />
					</Button>
				</DialogHeader>

				{/* Navigation */}
				<div className="px-6 py-4 border-b dark:border-gray-700">
					<div className="flex gap-1">
						{sections.map((section) => (
							<Button
								key={section.id}
								variant={activeSection === section.id ? "default" : "ghost"}
								onClick={() => setActiveSection(section.id as HelpSection)}
								className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
									activeSection === section.id
										? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
										: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
								}`}
							>
								{section.icon}
								{section.title}
							</Button>
						))}
					</div>
				</div>

				{/* Content */}
				<div className="p-6 max-h-[60vh] overflow-y-auto">
					{sections.find((s) => s.id === activeSection)?.content}
				</div>

				{/* Footer */}
				<div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
					<div className="flex items-center justify-between">
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Need more help? Check out the demo library to explore features.
						</p>
						<div className="flex gap-3">
							<Button
								variant="ghost"
								onClick={() => setShowShortcuts(true)}
								className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
							>
								<Keyboard className="w-4 h-4" />
								Keyboard Shortcuts
							</Button>
							<Button
								variant="default"
								onClick={onClose}
								className="bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
							>
								Got it
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>

			{/* Keyboard Shortcuts Panel */}
			<KeyboardShortcutsPanel
				isOpen={showShortcuts}
				onClose={() => setShowShortcuts(false)}
			/>
		</Dialog>
	);
}
