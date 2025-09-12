// Search Explainability Component
// User Intent: "I want to understand why these photos matched my search"
// Shows friendly explanations for search matches

import {
	Calendar,
	Camera,
	Eye,
	FileText,
	Heart,
	Image,
	MapPin,
	Palette,
	Sparkles,
	Tag,
	TrendingUp,
	User,
} from "lucide-react";

export interface MatchReason {
	type:
		| "caption"
		| "tag"
		| "location"
		| "person"
		| "date"
		| "color"
		| "object"
		| "scene"
		| "emotion"
		| "activity"
		| "similarity"
		| "metadata";
	confidence: number; // 0-1
	detail: string;
	highlight?: string; // specific text that matched
}

interface SearchExplainabilityProps {
	reasons: MatchReason[];
	query: string;
	compact?: boolean;
}

export function SearchExplainability({
	reasons,
	query,
	compact = false,
}: SearchExplainabilityProps) {
	if (!reasons || reasons.length === 0) return null;

	// Sort by confidence
	const sortedReasons = [...reasons].sort(
		(a, b) => b.confidence - a.confidence,
	);
	const topReasons = compact ? sortedReasons.slice(0, 3) : sortedReasons;

	const getReasonIcon = (type: MatchReason["type"]) => {
		const icons = {
			caption: <FileText className="w-3 h-3" />,
			tag: <Tag className="w-3 h-3" />,
			location: <MapPin className="w-3 h-3" />,
			person: <User className="w-3 h-3" />,
			date: <Calendar className="w-3 h-3" />,
			color: <Palette className="w-3 h-3" />,
			object: <Eye className="w-3 h-3" />,
			scene: <Image className="w-3 h-3" />,
			emotion: <Heart className="w-3 h-3" />,
			activity: <TrendingUp className="w-3 h-3" />,
			similarity: <Sparkles className="w-3 h-3" />,
			metadata: <Camera className="w-3 h-3" />,
		};
		return icons[type] || <Sparkles className="w-3 h-3" />;
	};

	const getReasonLabel = (type: MatchReason["type"]) => {
		const labels = {
			caption: "What I see",
			tag: "Tagged as",
			location: "Taken at",
			person: "Shows",
			date: "From",
			color: "Colors match",
			object: "Contains",
			scene: "Scene shows",
			emotion: "Feeling",
			activity: "Doing",
			similarity: "Similar to",
			metadata: "Camera info",
		};
		return labels[type] || "Matches";
	};

	const getConfidenceColor = (confidence: number) => {
		if (confidence > 0.8) return "text-green-600 bg-green-50 border-green-200";
		if (confidence > 0.6) return "text-blue-600 bg-blue-50 border-blue-200";
		if (confidence > 0.4)
			return "text-yellow-600 bg-yellow-50 border-yellow-200";
		return "text-gray-600 bg-gray-50 border-gray-200";
	};

	if (compact) {
		return (
			<div className="flex flex-wrap gap-1 mt-1">
				{topReasons.map((reason, idx) => (
					<div
						key={`reason-${idx}`}
						className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getConfidenceColor(reason.confidence)}`}
						title={reason.detail}
					>
						{getReasonIcon(reason.type)}
						<span className="max-w-[100px] truncate">
							{reason.highlight || reason.detail}
						</span>
					</div>
				))}
				{sortedReasons.length > 3 && (
					<div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
						+{sortedReasons.length - 3} more
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
			<div className="flex items-center gap-2 mb-2">
				<Sparkles className="w-4 h-4 text-blue-500" />
				<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
					Why this matched "{query}"
				</span>
			</div>
			<div className="space-y-1">
				{topReasons.map((reason, idx) => (
					<div key={`reason-${idx}`} className="flex items-start gap-2 text-sm">
						<div
							className={`mt-0.5 p-1 rounded ${getConfidenceColor(reason.confidence)}`}
						>
							{getReasonIcon(reason.type)}
						</div>
						<div className="flex-1">
							<span className="text-gray-600 dark:text-gray-400">
								{getReasonLabel(reason.type)}:
							</span>
							<span className="ml-1 text-gray-800 dark:text-gray-200">
								{reason.highlight ? (
									<HighlightedText
										text={reason.detail}
										highlight={reason.highlight}
									/>
								) : (
									reason.detail
								)}
							</span>
							{reason.confidence < 0.5 && (
								<span className="ml-1 text-xs text-gray-400">
									(possible match)
								</span>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// Component to highlight matched text
function HighlightedText({
	text,
	highlight,
}: {
	text: string;
	highlight: string;
}) {
	const parts = text.split(new RegExp(`(${highlight})`, "gi"));

	return (
		<>
			{parts.map((part, idx) =>
				part.toLowerCase() === highlight.toLowerCase() ? (
					<mark
						key={`part-${idx}`}
						className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded"
					>
						{part}
					</mark>
				) : (
					<span key={`part-${idx}`}>{part}</span>
				),
			)}
		</>
	);
}

// Match analyzer to generate reasons from search results
export class MatchAnalyzer {
	analyzeMatch(photo: any, query: string): MatchReason[] {
		const reasons: MatchReason[] = [];
		const queryLower = query.toLowerCase();
		const queryWords = queryLower.split(/\s+/);

		// Check caption match
		if (photo.caption) {
			const captionLower = photo.caption.toLowerCase();
			const matchedWords = queryWords.filter((word) =>
				captionLower.includes(word),
			);
			if (matchedWords.length > 0) {
				reasons.push({
					type: "caption",
					confidence: matchedWords.length / queryWords.length,
					detail: photo.caption,
					highlight: matchedWords[0],
				});
			}
		}

		// Check tags
		if (photo.tags && photo.tags.length > 0) {
			const matchedTags = photo.tags.filter((tag: string) =>
				queryWords.some((word) => tag.toLowerCase().includes(word)),
			);
			if (matchedTags.length > 0) {
				reasons.push({
					type: "tag",
					confidence: 0.9,
					detail: matchedTags.join(", "),
					highlight: matchedTags[0],
				});
			}
		}

		// Check location
		if (
			photo.location &&
			queryWords.some((word) => photo.location.toLowerCase().includes(word))
		) {
			reasons.push({
				type: "location",
				confidence: 0.85,
				detail: photo.location,
			});
		}

		// Check people
		if (photo.people && photo.people.length > 0) {
			const matchedPeople = photo.people.filter((person: string) =>
				queryWords.some((word) => person.toLowerCase().includes(word)),
			);
			if (matchedPeople.length > 0) {
				reasons.push({
					type: "person",
					confidence: 0.95,
					detail: matchedPeople.join(", "),
				});
			}
		}

		// Check date-related queries
		if (
			queryWords.some((word) =>
				["today", "yesterday", "week", "month", "year"].includes(word),
			)
		) {
			if (photo.date) {
				reasons.push({
					type: "date",
					confidence: 0.8,
					detail: this.formatDate(photo.date),
				});
			}
		}

		// Check for color mentions
		const colors = [
			"red",
			"blue",
			"green",
			"yellow",
			"orange",
			"purple",
			"pink",
			"black",
			"white",
			"gray",
		];
		const mentionedColors = queryWords.filter((word) => colors.includes(word));
		if (mentionedColors.length > 0 && photo.dominantColors) {
			reasons.push({
				type: "color",
				confidence: 0.7,
				detail: `Contains ${mentionedColors.join(", ")}`,
			});
		}

		// Check for objects
		if (photo.objects && photo.objects.length > 0) {
			const matchedObjects = photo.objects.filter((obj: any) =>
				queryWords.some((word) => obj.label.toLowerCase().includes(word)),
			);
			if (matchedObjects.length > 0) {
				reasons.push({
					type: "object",
					confidence: matchedObjects[0].confidence || 0.75,
					detail: matchedObjects.map((o: any) => o.label).join(", "),
				});
			}
		}

		// Check for scene understanding
		if (
			photo.scene &&
			queryWords.some((word) => photo.scene.toLowerCase().includes(word))
		) {
			reasons.push({
				type: "scene",
				confidence: 0.7,
				detail: photo.scene,
			});
		}

		// Check for emotions/activities
		const emotions = [
			"happy",
			"sad",
			"smiling",
			"laughing",
			"crying",
			"angry",
			"surprised",
		];
		const activities = [
			"running",
			"walking",
			"playing",
			"dancing",
			"eating",
			"sleeping",
			"working",
		];

		const matchedEmotions = queryWords.filter((word) =>
			emotions.includes(word),
		);
		if (matchedEmotions.length > 0 && photo.emotions) {
			reasons.push({
				type: "emotion",
				confidence: 0.65,
				detail: `Shows ${matchedEmotions.join(", ")}`,
			});
		}

		const matchedActivities = queryWords.filter((word) =>
			activities.includes(word),
		);
		if (matchedActivities.length > 0 && photo.activities) {
			reasons.push({
				type: "activity",
				confidence: 0.65,
				detail: `People ${matchedActivities.join(", ")}`,
			});
		}

		// If no specific matches found but still returned, it's similarity-based
		if (reasons.length === 0 && photo.similarity_score) {
			reasons.push({
				type: "similarity",
				confidence: photo.similarity_score,
				detail: "Visually similar to your search",
			});
		}

		return reasons;
	}

	private formatDate(date: string | Date): string {
		const d = new Date(date);
		const now = new Date();
		const diffDays = Math.floor(
			(now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (diffDays === 0) return "Today";
		if (diffDays === 1) return "Yesterday";
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}
}

export const matchAnalyzer = new MatchAnalyzer();
