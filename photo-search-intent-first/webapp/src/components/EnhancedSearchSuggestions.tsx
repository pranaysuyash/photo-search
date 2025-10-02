import type { LucideProps } from "lucide-react";
import {
	Bot,
	Calendar,
	Camera,
	Clock,
	Compass,
	Filter,
	Gift,
	Heart,
	Lightbulb,
	MapPin,
	Sparkles,
	Star,
	TrendingUp,
	User,
	Zap,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { searchHistoryService } from "../services/SearchHistoryService";
import { SearchIntentRecognizer, type SearchIntent } from "../services/SearchIntentRecognizer";
import { didYouMean, expandSynonyms, synonymAlternates } from "../utils/searchSynonyms";

interface EnhancedSearchSuggestionsProps {
	query: string;
	onSuggestionSelect: (suggestion: string, intent?: SearchIntent) => void;
	availableTags?: string[];
	availablePeople?: string[];
	availableLocations?: string[];
	availableCameras?: string[];
	photoCount?: number;
	maxSuggestions?: number;
	className?: string;
}

interface SuggestionItem {
	id: string;
	text: string;
	type: "intent" | "history" | "smart" | "correction" | "synonym" | "popular";
	icon: React.ComponentType<LucideProps>;
	category: string;
	description?: string;
	intent?: SearchIntent;
	score: number;
}

export function EnhancedSearchSuggestions({
	query,
	onSuggestionSelect,
	availableTags = [],
	availablePeople = [],
	availableLocations = [],
	availableCameras = [],
	photoCount = 0,
	maxSuggestions = 12,
	className = "",
}: EnhancedSearchSuggestionsProps) {
	const suggestions = useMemo(() => {
		if (!query.trim()) {
			return getInitialSuggestions();
		}

		const allSuggestions: SuggestionItem[] = [];
		const normalizedQuery = query.toLowerCase().trim();

		// 1. Get intent-based suggestions
		const intent = SearchIntentRecognizer.recognizeIntent(query, {
			recentSearches: searchHistoryService.getHistory().slice(0, 5).map(h => h.query),
			availableTags,
			availablePeople,
			availableLocations,
		});

		// Add intent suggestions
		intent.suggestedQueries.forEach((suggestion, index) => {
			allSuggestions.push({
				id: `intent-${index}`,
				text: suggestion,
				type: "intent",
				icon: getIntentIcon(intent.primary),
				category: "Based on your intent",
				description: getIntentDescription(intent.primary),
				intent,
				score: intent.confidence,
			});
		});

		// 2. Get history-based suggestions
		const historySuggestions = searchHistoryService.getSuggestions(normalizedQuery);
		historySuggestions.slice(0, 4).forEach((suggestion, index) => {
			allSuggestions.push({
				id: `history-${index}`,
				text: suggestion.query,
				type: "history",
				icon: Clock,
				category: "Recent search",
				description: suggestion.metadata?.lastUsed
					? `Used ${formatRelativeTime(suggestion.metadata.lastUsed)}`
					: undefined,
				score: suggestion.score,
			});
		});

		// 3. Get spelling corrections
		const corrections = didYouMean(query, [
			...availableTags,
			...availablePeople,
			...availableLocations,
			...availableCameras,
		], 3);

		corrections.forEach((correction, index) => {
			allSuggestions.push({
				id: `correction-${index}`,
				text: correction,
				type: "correction",
				icon: Lightbulb,
				category: "Did you mean?",
				description: "Spelling correction",
				score: 0.9,
			});
		});

		// 4. Get synonym suggestions
		const synonyms = synonymAlternates(query);
		synonyms.slice(0, 3).forEach((synonym, index) => {
			allSuggestions.push({
				id: `synonym-${index}`,
				text: synonym,
				type: "synonym",
				icon: Sparkles,
				category: "Try also",
				description: "Related term",
				score: 0.7,
			});
		});

		// 5. Get smart contextual suggestions
		const smartSuggestions = getSmartSuggestions(
			query,
			intent,
			{ availableTags, availablePeople, availableLocations, availableCameras, photoCount }
		);
		allSuggestions.push(...smartSuggestions);

		// 6. Get popular searches
		const popularSearches = getPopularSearches();
		popularSearches.slice(0, 2).forEach((popular, index) => {
			allSuggestions.push({
				id: `popular-${index}`,
				text: popular,
				type: "popular",
				icon: TrendingUp,
				category: "Popular searches",
				description: "Trending in your library",
				score: 0.5,
			});
		});

		// Sort by score and deduplicate
		const seen = new Set<string>();
		const sortedSuggestions = allSuggestions
			.filter(suggestion => {
				const normalized = suggestion.text.toLowerCase();
				if (seen.has(normalized)) return false;
				seen.add(normalized);
				return true;
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, maxSuggestions);

		return sortedSuggestions;
	}, [
		query,
		availableTags,
		availablePeople,
		availableLocations,
		availableCameras,
		photoCount,
		maxSuggestions,
	]);

	const handleSuggestionClick = (suggestion: SuggestionItem) => {
		onSuggestionSelect(suggestion.text, suggestion.intent);
	};

	if (suggestions.length === 0) {
		return (
			<div className={`p-4 text-center text-muted-foreground ${className}`}>
				<Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
				<p className="text-sm">No suggestions available</p>
			</div>
		);
	}

	return (
		<div className={`space-y-2 ${className}`}>
			{suggestions.map((suggestion) => (
				<SuggestionItem
					key={suggestion.id}
					suggestion={suggestion}
					onClick={() => handleSuggestionClick(suggestion)}
				/>
			))}
		</div>
	);
}

function SuggestionItem({
	suggestion,
	onClick,
}: {
	suggestion: SuggestionItem;
	onClick: () => void;
}) {
	const Icon = suggestion.icon;

	return (
		<button
			type="button"
			className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			onClick={onClick}
			aria-label={`Search for "${suggestion.text}"`}
		>
			<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary flex-shrink-0">
				<Icon className="w-4 h-4" />
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-foreground truncate">
						{suggestion.text}
					</span>
					{getSuggestionBadge(suggestion.type)}
				</div>

				<div className="flex items-center gap-2 mt-0.5">
					<span className="text-xs text-muted-foreground">
						{suggestion.category}
					</span>
					{suggestion.description && (
						<>
							<span className="text-xs text-muted-foreground">•</span>
							<span className="text-xs text-muted-foreground">
								{suggestion.description}
							</span>
						</>
					)}
				</div>
			</div>

			{suggestion.score > 0.8 && (
				<Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />
			)}
		</button>
	);
}

function getSuggestionBadge(type: SuggestionItem["type"]) {
	switch (type) {
		case "intent":
			return (
				<span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded">
					AI
				</span>
			);
		case "correction":
			return (
				<span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded">
					Fix
				</span>
			);
		case "synonym":
			return (
				<span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">
					Syn
				</span>
			);
		case "popular":
			return (
				<span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
					Trend
				</span>
			);
		default:
			return null;
	}
}

function getIntentIcon(intent: SearchIntent["primary"]): React.ComponentType<LucideProps> {
	switch (intent) {
		case "discovery":
			return Compass;
		case "specific":
			return Filter;
		case "temporal":
			return Clock;
		case "location":
			return MapPin;
		case "person":
			return User;
		case "activity":
			return Star;
		case "technical":
			return Camera;
		case "emotional":
			return Heart;
		case "comparison":
			return TrendingUp;
		default:
			return Bot;
	}
}

function getIntentDescription(intent: SearchIntent["primary"]): string {
	switch (intent) {
		case "discovery":
			return "Browse your photos";
		case "specific":
			return "Find something specific";
		case "temporal":
			return "Time-based search";
		case "location":
			return "Place-based search";
		case "person":
			return "People-focused";
		case "activity":
			return "Event or activity";
		case "technical":
			return "Camera or settings";
		case "emotional":
			return "Mood or feeling";
		case "comparison":
			return "Compare photos";
		default:
			return "Smart search";
	}
}

function getSmartSuggestions(
	query: string,
	intent: SearchIntent,
	context: {
		availableTags: string[];
		availablePeople: string[];
		availableLocations: string[];
		availableCameras: string[];
		photoCount: number;
	}
): SuggestionItem[] {
	const suggestions: SuggestionItem[] = [];

	// Context-aware suggestions based on intent
	switch (intent.primary) {
		case "location":
			context.availableLocations.slice(0, 3).forEach((location, index) => {
				suggestions.push({
					id: `smart-location-${index}`,
					text: location,
					type: "smart",
					icon: MapPin,
					category: "From your library",
					description: "Location-based",
					score: 0.8,
				});
			});
			break;

		case "person":
			context.availablePeople.slice(0, 3).forEach((person, index) => {
				suggestions.push({
					id: `smart-person-${index}`,
					text: person,
					type: "smart",
					icon: User,
					category: "From your library",
					description: "Person-based",
					score: 0.8,
				});
			});
			break;

		case "activity":
			const activityTags = context.availableTags.filter(tag =>
				["party", "vacation", "birthday", "wedding", "holiday"].includes(tag.toLowerCase())
			).slice(0, 3);

			activityTags.forEach((tag, index) => {
				suggestions.push({
					id: `smart-activity-${index}`,
					text: tag,
					type: "smart",
					icon: Star,
					category: "From your library",
					description: "Event-based",
					score: 0.8,
				});
			});
			break;
	}

	// Time-based smart suggestions
	if (intent.context.timeFrame?.type === "recent") {
		suggestions.push({
			id: "smart-today",
			text: "photos from today",
			type: "smart",
			icon: Calendar,
			category: "Time-based",
			description: "Recent photos",
			score: 0.9,
		});
	}

	// Quality-based suggestions
	if (intent.primary === "quality" || intent.context.quality) {
		suggestions.push({
			id: "smart-favorites",
			text: "favorite photos",
			type: "smart",
			icon: Heart,
			category: "Quality-based",
			description: "Your favorites",
			score: 0.85,
		});
	}

	return suggestions;
}

function getInitialSuggestions(): SuggestionItem[] {
	return [
		{
			id: "initial-recent",
			text: "recent photos",
			type: "popular",
			icon: Clock,
			category: "Quick access",
			description: "Photos from last few days",
			score: 0.9,
		},
		{
			id: "initial-favorites",
			text: "favorite photos",
			type: "popular",
			icon: Heart,
			category: "Quick access",
			description: "Your top-rated photos",
			score: 0.85,
		},
		{
			id: "initial-family",
			text: "family photos",
			type: "popular",
			icon: User,
			category: "Quick access",
			description: "Photos with family members",
			score: 0.8,
		},
		{
			id: "initial-vacation",
			text: "vacation photos",
			type: "popular",
			icon: MapPin,
			category: "Quick access",
			description: "Travel and holiday memories",
			score: 0.8,
		},
	];
}

function getPopularSearches(): string[] {
	// This could be enhanced with actual analytics data
	return [
		"family photos",
		"vacation photos",
		"favorite moments",
		"last summer",
		"birthday party",
		"home photos",
		"sunset photos",
		"kids playing",
	];
}

function formatRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const minutes = Math.floor(diff / (1000 * 60));
	const hours = Math.floor(diff / (1000 * 60 * 60));
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}

export default EnhancedSearchSuggestions;