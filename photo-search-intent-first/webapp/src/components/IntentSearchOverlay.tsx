import { AnimatePresence, motion } from "framer-motion";
import {
	Brain,
	Clock,
	Filter,
	Search,
	Sparkles,
	TrendingUp,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { IntentPredictiveSearch } from "./IntentPredictiveSearch";

interface IntentSearchOverlayProps {
	isOpen: boolean;
	onClose: () => void;
	onSearch: (query: string) => void;
	initialQuery?: string;
	userIntent?: {
		primary: "explore" | "organize" | "find" | "demo" | "unsure";
		confidence: number;
	};
}

interface QuickSearchOption {
	label: string;
	query: string;
	icon: any;
	description: string;
	category: "people" | "places" | "events" | "themes";
}

// Quick search categories based on user intent
const getQuickSearches = (intent: string): QuickSearchOption[] => {
	const baseOptions = [
		{
			label: "Recent photos",
			query: "recent photos this week",
			icon: Clock,
			description: "Photos from the last 7 days",
			category: "recent" as const,
		},
		{
			label: "Favorites",
			query: "favorite photos marked",
			icon: Sparkles,
			description: "Your starred photos",
			category: "themes" as const,
		},
		{
			label: "Family",
			query: "family members together",
			icon: Brain,
			description: "Photos with family members",
			category: "people" as const,
		},
		{
			label: "Outdoor",
			query: "outdoor nature photos",
			icon: TrendingUp,
			description: "Nature and outdoor scenes",
			category: "places" as const,
		},
	];

	// Customize based on user intent
	if (intent === "find") {
		return [
			{
				label: "People",
				query: "photos of people faces",
				icon: Brain,
				description: "Find photos with people",
				category: "people" as const,
			},
			{
				label: "Events",
				query: "birthday wedding celebration",
				icon: Sparkles,
				description: "Special occasions and events",
				category: "events" as const,
			},
			{
				label: "Places",
				query: "travel vacation locations",
				icon: TrendingUp,
				description: "Photos from different places",
				category: "places" as const,
			},
			{
				label: "Activities",
				query: "sports hobbies activities",
				icon: Brain,
				description: "Action and activity photos",
				category: "themes" as const,
			},
		];
	}

	if (intent === "organize") {
		return [
			{
				label: "Duplicates",
				query: "duplicate similar photos",
				icon: Filter,
				description: "Find duplicate or similar images",
				category: "themes" as const,
			},
			{
				label: "Screenshots",
				query: "screenshot screen capture",
				icon: Brain,
				description: "All screenshots and screen captures",
				category: "themes" as const,
			},
			{
				label: "Large files",
				query: "large size photos mb",
				icon: TrendingUp,
				description: "High-resolution and large photos",
				category: "themes" as const,
			},
			{
				label: "Old photos",
				query: "old vintage photos years",
				icon: Clock,
				description: "Photos from previous years",
				category: "events" as const,
			},
		];
	}

	return baseOptions;
};

export function IntentSearchOverlay({
	isOpen,
	onClose,
	onSearch,
	initialQuery = "",
	userIntent = { primary: "unsure", confidence: 0 },
}: IntentSearchOverlayProps) {
	const [searchQuery, setSearchQuery] = useState(initialQuery);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);

	// Load recent searches
	useEffect(() => {
		try {
			const stored = localStorage.getItem("recentSearches");
			if (stored) {
				setRecentSearches(JSON.parse(stored).slice(0, 5));
			}
		} catch (error) {
			console.log("Could not load recent searches:", error);
		}
	}, []);

	// Handle search
	const handleSearch = (query: string) => {
		if (!query.trim()) return;

		// Save to recent searches
		const updatedRecent = [
			query,
			...recentSearches.filter((s) => s !== query),
		].slice(0, 10);
		setRecentSearches(updatedRecent);
		try {
			localStorage.setItem("recentSearches", JSON.stringify(updatedRecent));
		} catch (error) {
			console.log("Could not save recent searches:", error);
		}

		onSearch(query);
		onClose();
	};

	const quickSearches = getQuickSearches(userIntent.primary);

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[20vh]"
					onClick={onClose}
				>
					<motion.div
						initial={{ scale: 0.95, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.95, opacity: 0 }}
						transition={{ type: "spring", duration: 0.3 }}
						className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
									<Search className="w-5 h-5 text-white" />
								</div>
								<div>
									<h2 className="text-xl font-semibold text-gray-900">
										Search Photos
									</h2>
									{userIntent.confidence > 0.5 && (
										<p className="text-sm text-gray-500">
											Personalized for your {userIntent.primary} interests
										</p>
									)}
								</div>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<X className="w-5 h-5 text-gray-500" />
							</button>
						</div>

						{/* Search Input */}
						<div className="p-6 pb-4">
							<IntentPredictiveSearch
								value={searchQuery}
								onChange={setSearchQuery}
								onSearch={handleSearch}
								placeholder="Describe what you're looking for..."
								className="text-lg"
							/>
						</div>

						{/* Quick Searches */}
						<div className="px-6 pb-4">
							<div className="flex items-center gap-2 mb-3">
								<Sparkles className="w-4 h-4 text-purple-600" />
								<h3 className="text-sm font-medium text-gray-700">
									{userIntent.confidence > 0.5
										? `Quick searches for ${userIntent.primary}`
										: "Quick searches"}
								</h3>
							</div>
							<div className="grid grid-cols-2 gap-2">
								{quickSearches.map((option, index) => {
									const Icon = option.icon;
									return (
										<button
											type="button"
											key={index}
											onClick={() => handleSearch(option.query)}
											className="flex items-center gap-3 p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
										>
											<div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
												<Icon className="w-4 h-4 text-gray-600" />
											</div>
											<div className="flex-1 min-w-0">
												<div className="text-sm font-medium text-gray-900 truncate">
													{option.label}
												</div>
												<div className="text-xs text-gray-500 truncate">
													{option.description}
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* Recent Searches */}
						{recentSearches.length > 0 && (
							<div className="px-6 pb-6">
								<div className="flex items-center gap-2 mb-3">
									<Clock className="w-4 h-4 text-gray-600" />
									<h3 className="text-sm font-medium text-gray-700">
										Recent searches
									</h3>
								</div>
								<div className="flex flex-wrap gap-2">
									{recentSearches.map((search, index) => (
										<button
											type="button"
											key={index}
											onClick={() => handleSearch(search)}
											className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
										>
											{search}
										</button>
									))}
								</div>
							</div>
						)}

						{/* Search Tips */}
						<div className="bg-blue-50 border-t border-blue-100 px-6 py-4">
							<div className="flex items-start gap-3">
								<Brain className="w-5 h-5 text-blue-600 mt-0.5" />
								<div className="flex-1">
									<h4 className="text-sm font-medium text-blue-900 mb-1">
										Smart search tips
									</h4>
									<ul className="text-xs text-blue-700 space-y-1">
										<li>• Try natural language: "beach sunset last summer"</li>
										<li>• Include people: "photos with Sarah"</li>
										<li>• Describe scenes: "birthday cake with candles"</li>
										<li>• Use locations: "photos from Paris trip"</li>
									</ul>
								</div>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
