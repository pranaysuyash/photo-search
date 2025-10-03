/**
 * Search Intent Recognition System
 * Analyzes user queries to recognize intent and provide intelligent suggestions
 */

export interface SearchIntent {
	primary: SearchIntentType;
	confidence: number;
	context: IntentContext;
	modifiers: IntentModifier[];
	suggestedQueries: string[];
	filters: SearchFilters;
	categories: string[];
	complexity?: "simple" | "moderate" | "complex";
}

export type SearchIntentType =
	| "discovery" // Browsing, exploring
	| "specific" // Looking for something specific
	| "comparison" // Comparing photos
	| "narrative" // Telling a story
	| "technical" // Technical specifications
	| "emotional" // Mood/feeling based
	| "temporal" // Time-based search
	| "location" // Place-based search
	| "person" // People-focused
	| "activity" // Action/event focused
	| "quality" // Quality/aesthetic focused
	| "unknown"; // Couldn't determine intent

export interface IntentContext {
	timeFrame?: TimeFrame;
	location?: LocationContext;
	people?: PersonContext;
	activity?: ActivityContext;
	mood?: MoodContext;
	quality?: QualityContext;
	technical?: TechnicalContext;
}

export interface TimeFrame {
	type: "recent" | "specific" | "relative" | "seasonal" | "holiday";
	value?: string | Date;
	range?: { start: Date; end: Date };
	holidays?: string[];
}

export interface LocationContext {
	type: "specific" | "general" | "outdoor" | "indoor" | "travel";
	value?: string;
	country?: string;
	city?: string;
	venue?: string;
}

export interface PersonContext {
	type: "specific" | "group" | "relationship" | "age";
	value?: string;
	relationship?: string;
	ageGroup?: string;
	count?: number;
}

export interface ActivityContext {
	type: "event" | "hobby" | "sport" | "social" | "work";
	value?: string;
	intensity?: "low" | "medium" | "high";
}

export interface MoodContext {
	emotion: string;
	intensity: number;
	valence: "positive" | "negative" | "neutral";
}

export interface QualityContext {
	type: "professional" | "casual" | "artistic" | "technical";
	aspects: ("composition" | "lighting" | "focus" | "color" | "clarity")[];
}

export interface TechnicalContext {
	camera?: string;
	lens?: string;
	settings?: {
		aperture?: string;
		shutter?: string;
		iso?: string;
		focalLength?: string;
	};
	format?: "raw" | "jpeg" | "png";
}

export interface IntentModifier {
	type: "exclusion" | "inclusion" | "preference" | "quality" | "quantity";
	value: string;
	weight: number;
}

export interface SearchFilters {
	tags?: string[];
	dateFrom?: string;
	dateTo?: string;
	camera?: string;
	lens?: string;
	place?: string;
	person?: string;
	favoritesOnly?: boolean;
	ratingMin?: number;
	ratingMax?: number;
	fileType?: string;
	color?: string;
	orientation?: "portrait" | "landscape" | "square";
}

export class SearchIntentRecognizer {
	private static readonly INTENT_PATTERNS = {
		// Discovery patterns
		discovery: [
			/^(show|find|look|browse|explore|see|view)/i,
			/(what|which|some|any|interesting|amazing|best|favorite)/i,
			/^(photos?|pictures?|images?|pics?)\s*$/i,
		],

		// Specific patterns (made more precise to avoid over-matching)
		specific: [
			/(find|show|get|give|locate)\s+(the|my|a)\s+(photo|picture|image|pic)\s+(of|from|with)/i,
			/^(i want|i need|i'm looking for)\s+(a\s+)?(specific|particular|certain)/i,
			/(specific|particular|certain|exact)\s+(photo|picture|image)/i,
		],

		// Comparison patterns
		comparison: [
			/(compare|difference|versus|vs|or|better)/i,
			/(which one|what's the difference)/i,
			/^(both|either|neither)/i,
		],

		// Narrative patterns
		narrative: [
			/(story|memories|remember|recollect|journey)/i,
			/(chronological|timeline|sequence|progression)/i,
			/(over time|through the years|evolution)/i,
		],

		// Technical patterns
		technical: [
			/(aperture|shutter|iso|exposure|settings)/i,
			/(camera|lens|equipment|gear)/i,
			/(shot|photographed|captured)/i,
			/\b(f\/|f\d+\.?\d*|\/\d+|mm)\b/i,
		],

		// Emotional patterns
		emotional: [
			/(happy|sad|angry|love|joy|peace|excited|nostalgic)/i,
			/(feeling|mood|emotion|vibe|atmosphere)/i,
			/(beautiful|ugly|stunning|boring|amazing)/i,
		],

		// Temporal patterns
		temporal: [
			/(today|yesterday|tomorrow|now|recent|latest)/i,
			/(morning|afternoon|evening|night|dawn|dusk)/i,
			/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
			/(january|february|march|april|may|june|july|august|september|october|november|december)/i,
			/(winter|spring|summer|fall|autumn)/i,
			/(\d{4}|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})/i,
		],

		// Location patterns
		location: [
			/(in|at|on|near|around|inside|outside)\s+/i,
			/(home|work|school|office|park|beach|mountain|city|country)/i,
			/(travel|trip|vacation|holiday|tour)/i,
		],

		// Person patterns
		person: [
			/(mom|dad|brother|sister|mother|father|family|friend|friends)/i,
			/(people|person|someone|anyone|everybody|nobody)/i,
			/(kids?|children|adults?|teen|toddler|baby)/i,
			/(with|together|group|alone|solo)/i,
		],

		// Activity patterns
		activity: [
			/(playing|running|walking|sitting|standing|jumping|dancing|singing)/i,
			/(party|celebration|wedding|birthday|dinner|lunch|breakfast)/i,
			/(working|studying|reading|writing|drawing|painting)/i,
			/(sports?|game|match|competition|exercise|training)/i,
		],

		// Quality patterns
		quality: [
			/(best|worst|favorite|least favorite|top|bottom)/i,
			/(high quality|low quality|professional|amateur|snapshot)/i,
			/(sharp|blurry|clear|noisy|grainy|bright|dark)/i,
			/(composed|framed|cropped|edited|filtered)/i,
		],
	};

	private static readonly CONTEXT_KEYWORDS = {
		time: {
			recent: ["today", "yesterday", "recent", "latest", "new", "now"],
			specific: [
				"last week",
				"last month",
				"last year",
				"june 2023",
				"christmas",
			],
			relative: ["few days ago", "weeks ago", "months ago", "years ago"],
			seasonal: ["summer", "winter", "spring", "fall", "autumn"],
			holiday: ["christmas", "thanksgiving", "easter", "halloween", "new year"],
		},
		location: {
			specific: ["paris", "home", "office", "central park", "grand canyon"],
			general: ["beach", "mountain", "city", "country", "forest"],
			outdoor: ["outside", "outdoor", "garden", "street", "park"],
			indoor: ["inside", "indoor", "home", "office", "restaurant"],
			travel: ["vacation", "trip", "holiday", "tour", "journey"],
		},
		people: {
			specific: ["john", "mary", "mom", "dad", "sarah"],
			group: ["family", "friends", "team", "colleagues", "class"],
			relationship: ["mother", "father", "brother", "sister", "friend"],
			age: ["kids", "children", "baby", "toddler", "teen", "adult"],
		},
		mood: {
			positive: ["happy", "joy", "love", "excited", "beautiful", "amazing"],
			negative: ["sad", "angry", "boring", "ugly", "terrible", "awful"],
			neutral: ["calm", "peaceful", "quiet", "serene", "normal"],
		},
	};

	/**
	 * Analyze a query and recognize search intent
	 */
	static recognizeIntent(
		query: string,
		context?: {
			recentSearches?: string[];
			availableTags?: string[];
			availablePeople?: string[];
			availableLocations?: string[];
		},
	): SearchIntent {
		const normalizedQuery = query.toLowerCase().trim();

		if (!normalizedQuery) {
			return SearchIntentRecognizer.createDefaultIntent();
		}

		// Calculate confidence scores for each intent type
		const intentScores =
			SearchIntentRecognizer.calculateIntentScores(normalizedQuery);
		const primaryIntent = Object.entries(intentScores).sort(
			([, a], [, b]) => b - a,
		)[0];

		// Extract context information
		const intentContext = SearchIntentRecognizer.extractContext(
			normalizedQuery,
			context,
		);

		// Extract modifiers
		const modifiers = SearchIntentRecognizer.extractModifiers(normalizedQuery);

		// Generate suggested queries
		const suggestedQueries = SearchIntentRecognizer.generateSuggestions(
			normalizedQuery,
			primaryIntent[0] as SearchIntentType,
			intentContext,
			context,
		);

		// Generate search filters
		const filters = SearchIntentRecognizer.generateFilters(
			normalizedQuery,
			intentContext,
			modifiers,
		);

		// Categorize the query
		const categories = SearchIntentRecognizer.categorizeQuery(
			normalizedQuery,
			primaryIntent[0] as SearchIntentType,
		);

		// Calculate query complexity
		const complexity = SearchIntentRecognizer.calculateComplexity(
			normalizedQuery,
			primaryIntent[0] as SearchIntentType,
		);

		return {
			primary: primaryIntent[0] as SearchIntentType,
			confidence: primaryIntent[1],
			context: intentContext,
			modifiers,
			suggestedQueries,
			filters,
			categories,
			complexity,
		};
	}

	/**
	 * Calculate confidence scores for each intent type
	 */
	private static calculateIntentScores(
		query: string,
	): Record<SearchIntentType, number> {
		const scores: Partial<Record<SearchIntentType, number>> = {};

		for (const [intentType, patterns] of Object.entries(
			SearchIntentRecognizer.INTENT_PATTERNS,
		)) {
			scores[intentType as SearchIntentType] =
				SearchIntentRecognizer.calculatePatternScore(query, patterns);
		}

		// Normalize scores to 0-1 range
		const maxScore = Math.max(...Object.values(scores));
		if (maxScore === 0) {
			return { ...scores, unknown: 1.0 } as Record<SearchIntentType, number>;
		}

		const normalizedScores = Object.fromEntries(
			Object.entries(scores).map(([key, value]) => [key, value / maxScore]),
		);

		return normalizedScores as Record<SearchIntentType, number>;
	}

	/**
	 * Calculate how well query matches patterns
	 */
	private static calculatePatternScore(
		query: string,
		patterns: RegExp[],
	): number {
		let score = 0;
		for (const pattern of patterns) {
			if (pattern.test(query)) {
				score += pattern.source.length / query.length; // Longer patterns get higher scores
			}
		}
		return Math.min(score, 1.0);
	}

	/**
	 * Extract contextual information from the query
	 */
	private static extractContext(
		query: string,
		externalContext?: any,
	): IntentContext {
		const context: IntentContext = {};

		// Time context
		context.timeFrame = SearchIntentRecognizer.extractTimeContext(query);

		// Location context
		context.location = SearchIntentRecognizer.extractLocationContext(
			query,
			externalContext?.availableLocations,
		);

		// Person context
		context.people = SearchIntentRecognizer.extractPersonContext(
			query,
			externalContext?.availablePeople,
		);

		// Activity context
		context.activity = SearchIntentRecognizer.extractActivityContext(query);

		// Mood context
		context.mood = SearchIntentRecognizer.extractMoodContext(query);

		// Quality context
		context.quality = SearchIntentRecognizer.extractQualityContext(query);

		// Technical context
		context.technical = SearchIntentRecognizer.extractTechnicalContext(query);

		return context;
	}

	private static extractTimeContext(query: string): TimeFrame | undefined {
		// Specific dates
		const dateMatch = query.match(
			/\b(\d{4}|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})\b/,
		);
		if (dateMatch) {
			return { type: "specific", value: dateMatch[1] };
		}

		// Recent time indicators
		const recentWords = ["today", "yesterday", "recent", "latest", "new"];
		if (recentWords.some((word) => query.includes(word))) {
			return { type: "recent" };
		}

		// Seasons
		const seasons = ["summer", "winter", "spring", "fall", "autumn"];
		for (const season of seasons) {
			if (query.includes(season)) {
				return { type: "seasonal", value: season };
			}
		}

		// Holidays
		const holidays = [
			"christmas",
			"thanksgiving",
			"easter",
			"halloween",
			"new year",
		];
		const foundHolidays = holidays.filter((holiday) => query.includes(holiday));
		if (foundHolidays.length > 0) {
			return { type: "holiday", holidays: foundHolidays };
		}

		return undefined;
	}

	private static extractLocationContext(
		query: string,
		availableLocations?: string[],
	): LocationContext | undefined {
		// Check for specific locations from available data
		if (availableLocations) {
			for (const location of availableLocations) {
				if (query.includes(location.toLowerCase())) {
					return { type: "specific", value: location };
				}
			}
		}

		// General location types
		if (query.includes("home") || query.includes("house")) {
			return { type: "specific", value: "home" };
		}

		if (query.includes("work") || query.includes("office")) {
			return { type: "specific", value: "work" };
		}

		// Indoor/outdoor
		if (query.includes("outside") || query.includes("outdoor")) {
			return { type: "outdoor" };
		}

		if (query.includes("inside") || query.includes("indoor")) {
			return { type: "indoor" };
		}

		// Travel context
		if (
			["vacation", "trip", "holiday", "travel"].some((word) =>
				query.includes(word),
			)
		) {
			return { type: "travel" };
		}

		return undefined;
	}

	private static extractPersonContext(
		query: string,
		availablePeople?: string[],
	): PersonContext | undefined {
		// Check for specific people from available data
		if (availablePeople) {
			for (const person of availablePeople) {
				if (query.includes(person.toLowerCase())) {
					return { type: "specific", value: person };
				}
			}
		}

		// Family relationships
		const relationships = [
			"mom",
			"dad",
			"mother",
			"father",
			"brother",
			"sister",
			"family",
		];
		for (const relationship of relationships) {
			if (query.includes(relationship)) {
				return { type: "relationship", relationship };
			}
		}

		// Age groups
		if (query.includes("kids") || query.includes("children")) {
			return { type: "age", ageGroup: "children" };
		}

		if (query.includes("baby") || query.includes("toddler")) {
			return { type: "age", ageGroup: "toddler" };
		}

		// Group indicators
		if (
			["group", "together", "team", "class"].some((word) =>
				query.includes(word),
			)
		) {
			return { type: "group" };
		}

		return undefined;
	}

	private static extractActivityContext(
		query: string,
	): ActivityContext | undefined {
		// Events
		const events = [
			"party",
			"celebration",
			"wedding",
			"birthday",
			"dinner",
			"lunch",
		];
		for (const event of events) {
			if (query.includes(event)) {
				return { type: "event", value: event };
			}
		}

		// Sports
		const sports = ["running", "walking", "playing", "sports", "game", "match"];
		for (const sport of sports) {
			if (query.includes(sport)) {
				return { type: "sport", value: sport };
			}
		}

		// Social activities
		const social = ["talking", "laughing", "dancing", "singing", "celebrating"];
		for (const activity of social) {
			if (query.includes(activity)) {
				return { type: "social", value: activity };
			}
		}

		return undefined;
	}

	private static extractMoodContext(query: string): MoodContext | undefined {
		const positiveWords = [
			"happy",
			"joy",
			"love",
			"excited",
			"beautiful",
			"amazing",
			"wonderful",
		];
		const negativeWords = [
			"sad",
			"angry",
			"boring",
			"ugly",
			"terrible",
			"awful",
		];
		const neutralWords = ["calm", "peaceful", "quiet", "serene", "normal"];

		const moodWords = [...positiveWords, ...negativeWords, ...neutralWords];
		const foundMood = moodWords.find((word) => query.includes(word));

		if (foundMood) {
			let valence: "positive" | "negative" | "neutral" = "neutral";
			let intensity = 0.5;

			if (positiveWords.includes(foundMood)) {
				valence = "positive";
				intensity = 0.7;
			} else if (negativeWords.includes(foundMood)) {
				valence = "negative";
				intensity = 0.7;
			}

			return {
				emotion: foundMood,
				intensity,
				valence,
			};
		}

		return undefined;
	}

	private static extractQualityContext(
		query: string,
	): QualityContext | undefined {
		let qualityType:
			| "professional"
			| "casual"
			| "artistic"
			| "technical"
			| undefined;
		const aspects: (
			| "composition"
			| "lighting"
			| "focus"
			| "color"
			| "clarity"
		)[] = [];

		// Quality type
		if (
			["professional", "pro", "studio"].some((word) => query.includes(word))
		) {
			qualityType = "professional";
		} else if (
			["casual", "snapshot", "quick"].some((word) => query.includes(word))
		) {
			qualityType = "casual";
		} else if (
			["artistic", "creative", "fine art"].some((word) => query.includes(word))
		) {
			qualityType = "artistic";
		} else if (
			["technical", "settings", "camera"].some((word) => query.includes(word))
		) {
			qualityType = "technical";
		}

		// Quality aspects
		if (
			["composition", "framed", "cropped"].some((word) => query.includes(word))
		) {
			aspects.push("composition");
		}
		if (
			["light", "bright", "dark", "exposure"].some((word) =>
				query.includes(word),
			)
		) {
			aspects.push("lighting");
		}
		if (
			["focus", "sharp", "blurry", "clear"].some((word) => query.includes(word))
		) {
			aspects.push("focus");
		}
		if (
			["color", "black and white", "monochrome"].some((word) =>
				query.includes(word),
			)
		) {
			aspects.push("color");
		}
		if (
			["quality", "noise", "grainy", "clear"].some((word) =>
				query.includes(word),
			)
		) {
			aspects.push("clarity");
		}

		if (qualityType || aspects.length > 0) {
			return {
				type: qualityType || "casual",
				aspects,
			};
		}

		return undefined;
	}

	private static extractTechnicalContext(
		query: string,
	): TechnicalContext | undefined {
		const context: TechnicalContext = {};

		// Camera/lens mentions
		const cameraPatterns = [
			/camera:\s*(\w+)/i,
			/(\w+)\s+camera/i,
			/shot on (\w+)/i,
		];

		for (const pattern of cameraPatterns) {
			const match = query.match(pattern);
			if (match) {
				context.camera = match[1];
				break;
			}
		}

		// Technical settings
		const apertureMatch = query.match(/f\/?(\d+\.?\d*)/i);
		if (apertureMatch) {
			context.settings = {
				...context.settings,
				aperture: `f/${apertureMatch[1]}`,
			};
		}

		const isoMatch = query.match(/iso\s*(\d+)/i);
		if (isoMatch) {
			context.settings = { ...context.settings, iso: isoMatch[1] };
		}

		const focalMatch = query.match(/(\d+)mm/i);
		if (focalMatch) {
			context.settings = {
				...context.settings,
				focalLength: `${focalMatch[1]}mm`,
			};
		}

		// File format
		if (query.includes("raw") || query.includes("dng")) {
			context.format = "raw";
		} else if (query.includes("jpeg") || query.includes("jpg")) {
			context.format = "jpeg";
		}

		return Object.keys(context).length > 0 ? context : undefined;
	}

	/**
	 * Extract modifiers (inclusions, exclusions, preferences)
	 */
	private static extractModifiers(query: string): IntentModifier[] {
		const modifiers: IntentModifier[] = [];

		// Exclusions
		const exclusionPatterns = [
			/not\s+(\w+)/gi,
			/without\s+(\w+)/gi,
			/-(\w+)/gi,
			/no\s+(\w+)/gi,
		];

		for (const pattern of exclusionPatterns) {
			let match;
			while ((match = pattern.exec(query)) !== null) {
				modifiers.push({
					type: "exclusion",
					value: match[1],
					weight: 0.8,
				});
			}
		}

		// Inclusions
		const inclusionPatterns = [
			/with\s+(\w+)/gi,
			/has\s+(\w+)/gi,
			/including\s+(\w+)/gi,
			/\+(\w+)/gi,
		];

		for (const pattern of inclusionPatterns) {
			let match;
			while ((match = pattern.exec(query)) !== null) {
				modifiers.push({
					type: "inclusion",
					value: match[1],
					weight: 0.7,
				});
			}
		}

		// Preferences
		const preferenceWords = ["best", "favorite", "prefer", "like", "love"];
		for (const word of preferenceWords) {
			if (query.includes(word)) {
				modifiers.push({
					type: "preference",
					value: word,
					weight: 0.6,
				});
			}
		}

		return modifiers;
	}

	/**
	 * Generate intelligent suggestions based on recognized intent
	 */
	private static generateSuggestions(
		query: string,
		intent: SearchIntentType,
		context: IntentContext,
		externalContext?: any,
	): string[] {
		const suggestions: string[] = [];

		// Base suggestions by intent type
		switch (intent) {
			case "discovery":
				suggestions.push(
					"interesting photos",
					"favorite moments",
					"best memories",
					"hidden gems",
				);

				// Add context-aware suggestions for discovery intent
				if (externalContext?.availableLocations?.length > 0) {
					externalContext.availableLocations
						.slice(0, 2)
						.forEach((loc: string) => {
							suggestions.push(`photos in ${loc}`);
							suggestions.push(`${loc} photos`);
						});
				}

				if (externalContext?.availablePeople?.length > 0) {
					externalContext.availablePeople
						.slice(0, 2)
						.forEach((person: string) => {
							suggestions.push(`photos with ${person}`);
						});
				}
				break;

			case "specific":
				if (context.timeFrame) {
					suggestions.push(`${query} from last year`);
					suggestions.push(`${query} from last month`);
				}
				if (context.location) {
					suggestions.push(`${query} at home`);
					suggestions.push(`${query} on vacation`);
				}
				break;

			case "temporal":
				if (context.timeFrame?.type === "recent") {
					suggestions.push("photos from today");
					suggestions.push("photos from this week");
					suggestions.push("photos from this month");
				}
				break;

			case "location": {
				// Extract location words from the query to provide better suggestions
				const locationWords = query
					.split(" ")
					.filter(
						(word) =>
							![
								"photos",
								"pictures",
								"pics",
								"images",
								"from",
								"at",
								"in",
								"near",
							].includes(word.toLowerCase()),
					);

				if (locationWords.length > 0) {
					const location = locationWords.join(" ");
					suggestions.push("recent photos"); // Include general recent photos suggestion
					suggestions.push(`${location} photos`);
					suggestions.push(`photos at ${location}`);
					suggestions.push(`photos from ${location}`);
					suggestions.push(`recent ${location} photos`);
				} else {
					suggestions.push("recent photos");
					suggestions.push("photos near me");
					suggestions.push("photos from vacation");
					suggestions.push("photos at home");
				}
				break;
			}

			case "person":
				suggestions.push("family photos");
				suggestions.push("photos with friends");
				suggestions.push("kids photos");
				break;

			case "activity":
				suggestions.push("party photos");
				suggestions.push("vacation photos");
				suggestions.push("sports photos");
				break;
		}

		// Context-aware suggestions
		if (context.mood?.valence === "positive") {
			suggestions.push("happy moments");
			suggestions.push("beautiful memories");
		}

		if (context.quality?.type === "professional") {
			suggestions.push("best quality photos");
			suggestions.push("professional shots");
		}

		// Add suggestions from external context
		if (externalContext?.recentSearches?.length > 0) {
			suggestions.push(...externalContext.recentSearches.slice(0, 2));
		}

		// Add context-aware suggestions based on available data
		if (externalContext?.availableLocations?.length > 0) {
			const relevantLocations = externalContext.availableLocations
				.filter(
					(loc: string) =>
						loc.toLowerCase().includes(query.split(" ")[0]) ||
						query.toLowerCase().includes(loc.toLowerCase().split(" ")[0]),
				)
				.slice(0, 2);

			relevantLocations.forEach((loc: string) => {
				suggestions.push(`photos at ${loc}`);
			});
		}

		if (externalContext?.availableTags?.length > 0) {
			const relevantTags = externalContext.availableTags
				.filter(
					(tag: string) =>
						tag.toLowerCase().includes(query.split(" ")[0]) ||
						query.toLowerCase().includes(tag.toLowerCase()),
				)
				.slice(0, 2);

			relevantTags.forEach((tag: string) => {
				suggestions.push(`${tag} photos`);
			});
		}

		return [...new Set(suggestions)].slice(0, 6);
	}

	/**
	 * Generate search filters based on intent and context
	 */
	private static generateFilters(
		query: string,
		context: IntentContext,
		modifiers: IntentModifier[],
	): SearchFilters {
		const filters: SearchFilters = {};

		// Time-based filters
		if (context.timeFrame) {
			switch (context.timeFrame.type) {
				case "recent":
					filters.dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
						.toISOString()
						.split("T")[0];
					break;
				case "specific":
					// Try to parse specific date
					if (context.timeFrame.value) {
						// This would need more sophisticated date parsing
					}
					break;
				case "seasonal":
					// Set seasonal date ranges
					break;
			}
		}

		// Location filters
		if (context.location?.value) {
			filters.place = context.location.value;
		}

		// Person filters
		if (context.people?.value) {
			filters.person = context.people.value;
		}

		// Quality filters
		if (context.quality?.type === "professional") {
			filters.ratingMin = 4;
		}

		// Apply modifiers
		for (const modifier of modifiers) {
			if (modifier.type === "exclusion") {
				// Handle exclusions
			}
		}

		return filters;
	}

	/**
	 * Categorize the query for better organization
	 */
	private static categorizeQuery(
		query: string,
		intent: SearchIntentType,
	): string[] {
		const categories: string[] = [];

		// Add intent as primary category
		categories.push(intent);

		// Add descriptive categories based on content
		if (
			query.includes("family") ||
			query.includes("mom") ||
			query.includes("dad")
		) {
			categories.push("family");
		}

		if (
			query.includes("vacation") ||
			query.includes("travel") ||
			query.includes("trip")
		) {
			categories.push("travel");
		}

		if (
			query.includes("birthday") ||
			query.includes("party") ||
			query.includes("celebration")
		) {
			categories.push("events");
		}

		if (query.includes("home") || query.includes("house")) {
			categories.push("home");
		}

		return [...new Set(categories)];
	}

	/**
	 * Calculate query complexity based on length, keywords, and structure
	 */
	private static calculateComplexity(
		query: string,
		intent: SearchIntentType,
	): "simple" | "moderate" | "complex" {
		const wordCount = query.split(/\s+/).length;
		const hasMultipleClauses =
			query.includes(",") || query.includes(" and ") || query.includes(" or ");
		const hasSpecificTerms =
			/((find|show|get)\s+(the|my|a)\s+\w+|specific|particular|exact)/i.test(
				query,
			);
		const hasTemporalTerms =
			/(today|yesterday|tomorrow|last week|last month|last year|\d{4})/i.test(
				query,
			);
		const hasLocationTerms = /(in|at|on|near)\s+\w+/i.test(query);
		const hasPeopleTerms = /(with|together|family|friends)/i.test(query);

		// Complex queries have multiple dimensions
		if (
			wordCount > 8 ||
			hasMultipleClauses ||
			(hasSpecificTerms && hasTemporalTerms && hasLocationTerms) ||
			(hasSpecificTerms && hasTemporalTerms && hasPeopleTerms) ||
			(hasLocationTerms && hasPeopleTerms && hasTemporalTerms)
		) {
			return "complex";
		}

		// Moderate queries have some specificity
		if (
			wordCount > 4 ||
			hasSpecificTerms ||
			hasTemporalTerms ||
			hasLocationTerms ||
			hasPeopleTerms
		) {
			return "moderate";
		}

		// Simple queries are short and general
		return "simple";
	}

	/**
	 * Create a default intent for empty queries
	 */
	private static createDefaultIntent(): SearchIntent {
		return {
			primary: "discovery",
			confidence: 0.5,
			context: {},
			modifiers: [],
			suggestedQueries: [
				"recent photos",
				"favorite photos",
				"family photos",
				"vacation photos",
			],
			filters: {},
			categories: ["discovery"],
			complexity: "simple",
		};
	}

	/**
	 * Get intent-based query suggestions as user types
	 */
	static getTypingSuggestions(
		partialQuery: string,
		intentHistory?: SearchIntent[],
		externalContext?: any,
	): string[] {
		const normalized = partialQuery.toLowerCase().trim();

		if (!normalized || normalized.length < 2) {
			return [
				"recent photos",
				"family photos",
				"vacation photos",
				"favorite photos",
			];
		}

		// Recognize intent from partial query
		const intent = SearchIntentRecognizer.recognizeIntent(
			partialQuery,
			externalContext,
		);

		// If the intent already provides good suggestions (should with our new logic), use them
		if (intent.suggestedQueries.length > 0) {
			// Filter suggestions to include the partial query or related terms
			const relevantSuggestions = intent.suggestedQueries.filter(
				(suggestion) => {
					const suggestionLower = suggestion.toLowerCase();
					const queryWords = normalized.split(" ");
					const suggestionWords = suggestionLower.split(" ");

					// Check if suggestion contains the query or vice versa
					if (
						suggestionLower.includes(normalized) ||
						normalized.includes(suggestionWords[0])
					) {
						return true;
					}

					// Check for word overlap
					return queryWords.some((qWord) =>
						suggestionWords.some(
							(sWord) =>
								qWord.length > 2 &&
								(sWord.includes(qWord) || qWord.includes(sWord)),
						),
					);
				},
			);

			// If we found relevant suggestions, return them
			if (relevantSuggestions.length > 0) {
				return relevantSuggestions.slice(0, 4);
			}

			// Otherwise, return the first few suggestions from the intent
			return intent.suggestedQueries.slice(0, 4);
		}

		// Fallback to general suggestions
		const fallbackSuggestions = [
			"recent photos",
			"family photos",
			"vacation photos",
			"favorite photos",
			"photos from today",
			"photos at home",
		];

		// Add context-specific suggestions based on the partial query
		if (
			["beach", "park", "mountain", "city"].some((word) =>
				normalized.includes(word),
			)
		) {
			fallbackSuggestions.push(`${normalized} photos`);
		}

		return fallbackSuggestions.slice(0, 4);
	}
}

export default SearchIntentRecognizer;
