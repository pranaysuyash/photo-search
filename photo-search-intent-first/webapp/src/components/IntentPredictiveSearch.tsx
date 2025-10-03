import {
	Brain,
	Calendar,
	Clock,
	Heart,
	MapPin,
	Search,
	Sparkles,
	Tag,
	TrendingUp,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface UserIntent {
	primary: "explore" | "organize" | "find" | "demo" | "unsure";
	confidence: number;
	context?: string;
}

interface SearchSuggestion {
	type: "intent" | "recent" | "trending" | "smart" | "contextual";
	text: string;
	icon: any;
	description?: string;
	score?: number;
	category?: string;
}

interface IntentPredictiveSearchProps {
	value: string;
	onChange: (value: string) => void;
	onSearch: (query: string) => void;
	placeholder?: string;
	className?: string;
}

// Intent-based suggestion patterns
const intentSuggestionPatterns = {
	find: {
		suggestions: [
			"family photos",
			"vacation pictures",
			"birthday celebrations",
			"holiday gatherings",
			"wedding photos",
			"baby pictures",
			"pet photos",
			"outdoor adventures",
			"food and meals",
			"sporting events",
		],
		categories: ["people", "events", "places", "activities"],
		smartQueries: [
			"photos of family",
			"recent vacation photos",
			"birthday pictures this year",
			"outdoor activities",
			"celebration photos",
		],
	},
	organize: {
		suggestions: [
			"duplicate photos",
			"similar faces",
			"photos by location",
			"recent uploads",
			"unsorted images",
			"low quality photos",
			"screenshots",
			"videos vs photos",
			"large files",
			"old photos",
		],
		categories: ["cleanup", "organization", "quality", "management"],
		smartQueries: [
			"find duplicate photos",
			"group similar faces",
			"photos by location",
			"recent screenshots",
			"unorganized images",
		],
	},
	explore: {
		suggestions: [
			"sunset photos",
			"nature scenes",
			"city views",
			"animal pictures",
			"architecture",
			"food photography",
			"travel memories",
			"artistic shots",
			"black and white",
			"seasonal photos",
		],
		categories: ["themes", "styles", "subjects", "techniques"],
		smartQueries: [
			"beautiful landscapes",
			"artistic photos",
			"city architecture",
			"nature photography",
			"seasonal pictures",
		],
	},
	demo: {
		suggestions: [
			"beach sunset",
			"mountain hike",
			"birthday party",
			"city skyline",
			"family dinner",
			"park with kids",
			"garden flowers",
			"cooking photos",
			"pet playing",
			"snow scenes",
		],
		categories: ["examples", "tutorials", "showcase"],
		smartQueries: [
			"demo search examples",
			"sample photo queries",
			"test searches",
			"example searches",
		],
	},
	unsure: {
		suggestions: [
			"recent photos",
			"favorite pictures",
			"family photos",
			"travel photos",
			"nature pictures",
			"celebrations",
			"daily life",
			"special moments",
		],
		categories: ["general", "popular", "versatile"],
		smartQueries: [
			"recent photos",
			"popular searches",
			"all photos",
			"memorable moments",
		],
	},
};

// Common search patterns and their expansions
const searchExpansions = {
	beach: ["beach sunset", "ocean waves", "sand photos", "seaside vacation"],
	family: [
		"family gathering",
		"family dinner",
		"kids playing",
		"family vacation",
	],
	birthday: [
		"birthday party",
		"birthday cake",
		"birthday celebration",
		"party photos",
	],
	sunset: ["sunset photos", "golden hour", "evening light", "dusk pictures"],
	nature: [
		"nature scenes",
		"outdoor photos",
		"landscape",
		"wildlife",
		"plants",
	],
	food: ["food photography", "meals", "cooking", "restaurant", "dinner photos"],
	travel: ["travel photos", "vacation", "trip", "journey", "adventure"],
};

export function IntentPredictiveSearch({
	value,
	onChange,
	onSearch,
	placeholder = "Search your photos...",
	className,
}: IntentPredictiveSearchProps) {
	const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
	const [userIntent, setUserIntent] = useState<UserIntent>({
		primary: "unsure",
		confidence: 0,
	});
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);

	// Load user intent from localStorage
	useEffect(() => {
		try {
			const storedIntent = localStorage.getItem("userIntent");
			if (storedIntent) {
				const intent = JSON.parse(storedIntent);
				setUserIntent(intent);
			}
		} catch (error) {
			console.log("Could not load user intent:", error);
		}
	}, []);

	// Generate intent-aware suggestions
	const generateSuggestions = useMemo(() => {
		if (!value.trim()) {
			// Return intent-based default suggestions
			const patterns = intentSuggestionPatterns[userIntent.primary];
			return patterns.suggestions.slice(0, 5).map((suggestion, idx) => ({
				type: "intent" as const,
				text: suggestion,
				icon: idx === 0 ? Brain : Sparkles,
				description: `Based on your interest: ${userIntent.primary}`,
				score: 0.9,
				category: patterns.categories[0],
			}));
		}

		const allSuggestions: SearchSuggestion[] = [];
		const searchValue = value.toLowerCase();

		// Check for exact matches in search expansions
		for (const [baseTerm, expansions] of Object.entries(searchExpansions)) {
			if (searchValue.includes(baseTerm)) {
				expansions.forEach((expansion) => {
					allSuggestions.push({
						type: "contextual" as const,
						text: expansion,
						icon: Sparkles,
						description: `Related to "${baseTerm}"`,
						score: 0.85,
						category: "expansion",
					});
				});
			}
		}

		// Add intent-based smart queries that match current input
		const patterns = intentSuggestionPatterns[userIntent.primary];
		patterns.smartQueries.forEach((query) => {
			if (query.toLowerCase().includes(searchValue)) {
				allSuggestions.push({
					type: "intent" as const,
					text: query,
					icon: Brain,
					description: `Smart suggestion for ${userIntent.primary}`,
					score: 0.9,
					category: "intent-based",
				});
			}
		});

		// Add trending/common searches if they match
		const trendingSearches = [
			"sunset photos",
			"family moments",
			"vacation memories",
			"birthday celebrations",
			"nature scenes",
			"city views",
		];

		trendingSearches.forEach((search) => {
			if (
				search.toLowerCase().includes(searchValue) &&
				searchValue.length > 2
			) {
				allSuggestions.push({
					type: "trending" as const,
					text: search,
					icon: TrendingUp,
					description: "Popular search",
					score: 0.7,
					category: "trending",
				});
			}
		});

		// Sort by score and limit results
		return allSuggestions
			.sort((a, b) => (b.score || 0) - (a.score || 0))
			.slice(0, 8);
	}, [value, userIntent]);

	// Update suggestions when input changes
	useEffect(() => {
		setSuggestions(generateSuggestions);
		setShowSuggestions(true);
		setSelectedIndex(-1);
	}, [generateSuggestions]);

	// Handle keyboard navigation
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!showSuggestions || suggestions.length === 0) return;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev < suggestions.length - 1 ? prev + 1 : 0,
				);
				break;
			case "ArrowUp":
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev > 0 ? prev - 1 : suggestions.length - 1,
				);
				break;
			case "Enter":
				e.preventDefault();
				if (selectedIndex >= 0) {
					const selectedSuggestion = suggestions[selectedIndex];
					onChange(selectedSuggestion.text);
					onSearch(selectedSuggestion.text);
					setShowSuggestions(false);
				} else {
					onSearch(value);
					setShowSuggestions(false);
				}
				break;
			case "Escape":
				setShowSuggestions(false);
				setSelectedIndex(-1);
				break;
		}
	};

	// Handle suggestion selection
	const handleSuggestionClick = (suggestion: SearchSuggestion) => {
		onChange(suggestion.text);
		onSearch(suggestion.text);
		setShowSuggestions(false);
	};

	// Get icon for suggestion type
	const getSuggestionIcon = (suggestion: SearchSuggestion) => {
		switch (suggestion.type) {
			case "intent":
				return Brain;
			case "contextual":
				return Sparkles;
			case "trending":
				return TrendingUp;
			case "recent":
				return Clock;
			case "smart":
				return Sparkles;
			default:
				return Search;
		}
	};

	// Get color for suggestion type
	const getSuggestionColor = (suggestion: SearchSuggestion) => {
		switch (suggestion.type) {
			case "intent":
				return "text-purple-600 bg-purple-50";
			case "contextual":
				return "text-blue-600 bg-blue-50";
			case "trending":
				return "text-green-600 bg-green-50";
			case "recent":
				return "text-gray-600 bg-gray-50";
			case "smart":
				return "text-orange-600 bg-orange-50";
			default:
				return "text-gray-600 bg-gray-50";
		}
	};

	return (
		<div className={`relative w-full ${className}`}>
			{/* Search Input */}
			<div className="relative">
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<Search className="h-5 w-5 text-gray-400" />
				</div>
				<input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => setShowSuggestions(true)}
					onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
					placeholder={placeholder}
					className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
				/>

				{/* Intent Badge */}
				{userIntent.confidence > 0.5 && (
					<div className="absolute inset-y-0 right-0 pr-3 flex items-center">
						<div
							className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
								userIntent.primary === "find"
									? "bg-purple-100 text-purple-800"
									: userIntent.primary === "organize"
										? "bg-blue-100 text-blue-800"
										: userIntent.primary === "explore"
											? "bg-green-100 text-green-800"
											: "bg-gray-100 text-gray-800"
							}`}
						>
							<Brain className="w-3 h-3 mr-1" />
							{userIntent.primary}
						</div>
					</div>
				)}
			</div>

			{/* Suggestions Dropdown */}
			{showSuggestions && suggestions.length > 0 && (
				<div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
					<div className="p-2">
						{/* Intent Header */}
						{userIntent.confidence > 0.5 && (
							<div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 mb-2">
								Personalized for your {userIntent.primary} interests
							</div>
						)}

						{/* Suggestions List */}
						{suggestions.map((suggestion, index) => {
							const Icon = getSuggestionIcon(suggestion);
							return (
								<button
									type="button"
									key={index}
									onClick={() => handleSuggestionClick(suggestion)}
									onMouseEnter={() => setSelectedIndex(index)}
									className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-3 transition-colors ${
										index === selectedIndex
											? "bg-blue-50 text-blue-700"
											: "hover:bg-gray-50 text-gray-700"
									}`}
								>
									<Icon
										className={`w-4 h-4 ${
											index === selectedIndex
												? "text-blue-600"
												: "text-gray-400"
										}`}
									/>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium truncate">
											{suggestion.text}
										</div>
										{suggestion.description && (
											<div className="text-xs text-gray-500 truncate">
												{suggestion.description}
											</div>
										)}
									</div>
									{suggestion.type === "intent" && (
										<div
											className={`px-2 py-1 rounded-full text-xs font-medium ${getSuggestionColor(suggestion)}`}
										>
											{suggestion.category}
										</div>
									)}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
