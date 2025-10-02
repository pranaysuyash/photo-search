/**
 * Query Expansion Utility
 * Provides synonym and suggestion expansion for search queries to improve search results
 */

// Basic synonym mappings for common photography terms
const SYNONYM_MAPPINGS: Record<string, string[]> = {
	// Colors
	red: ["crimson", "scarlet", "ruby", "burgundy", "maroon"],
	blue: ["azure", "navy", "sky", "cyan", "teal", "cobalt"],
	green: ["emerald", "forest", "lime", "olive", "mint"],
	yellow: ["gold", "amber", "golden", "lemon"],
	orange: ["tangerine", "coral", "peach", "amber"],
	purple: ["violet", "lavender", "magenta", "indigo"],
	pink: ["rose", "magenta", "fuchsia", "salmon"],
	black: ["dark", "shadow", "charcoal", "ebony"],
	white: ["light", "bright", "pale", "ivory"],
	brown: ["tan", "coffee", "chocolate", "beige", "sienna"],
	gray: ["grey", "silver", "ash", "slate"],

	// Outdoor/Nature
	beach: ["coast", "shore", "ocean", "sea", "sand"],
	mountain: ["peak", "hill", "summit", "alpine", "highland"],
	forest: ["woods", "trees", "woodland", "jungle"],
	sunset: ["dusk", "golden hour", "evening", "twilight"],
	sunrise: ["dawn", "morning", "sunup", "daybreak"],
	sky: ["clouds", "heavens", "atmosphere", "blue"],
	water: ["ocean", "sea", "lake", "river", "stream"],
	flower: ["bloom", "blossom", "floral", "petal"],
	tree: ["trees", "forest", "woods", "branch", "leaf"],

	// People/Activities
	family: ["together", "group", "relatives", "parents", "children"],
	portrait: ["headshot", "photo", "picture", "face"],
	wedding: ["marriage", "ceremony", "bride", "groom", "couple"],
	party: ["celebration", "event", "gathering", "festival"],
	vacation: ["holiday", "trip", "travel", "journey"],
	sports: ["game", "match", "competition", "athlete", "play"],

	// Urban/Architecture
	city: ["urban", "downtown", "metropolitan", "street"],
	building: ["architecture", "structure", "tower", "skyscraper"],
	bridge: ["overpass", "span", "viaduct"],
	house: ["home", "residence", "building", "dwelling"],
	street: ["road", "avenue", "boulevard", "lane"],

	// Food
	food: ["meal", "dish", "cuisine", "restaurant", "dinner"],
	coffee: ["caffeine", "espresso", "latte", "cup"],
	dessert: ["sweet", "cake", "pastry", "candy", "chocolate"],
	pizza: ["pie", "slice", "cheese", "italian"],

	// Animals
	dog: ["puppy", "canine", "pet", "hound"],
	cat: ["kitten", "feline", "pet", "kitty"],
	bird: ["avian", "flying", "feather", "wing"],

	// Transportation
	car: ["automobile", "vehicle", "auto", "driving"],
	plane: ["airplane", "aircraft", "flight", "aviation"],
	boat: ["ship", "vessel", "sail", "watercraft"],
	train: ["railway", "locomotive", "subway", "metro"],

	// Technical/Quality
	photo: ["picture", "image", "shot", "snapshot"],
	camera: ["dslr", "photography", "lens", "shot"],
	close: ["macro", "detail", "near", "intimate"],
	wide: ["panoramic", "broad", "vista", "expansive"],
	bright: ["light", "vibrant", "sunny", "illuminated"],
	dark: ["shadow", "moody", "dim", "low-key"],
};

// Common query corrections
const SPELL_CORRECTIONS: Record<string, string> = {
	beach: ["bech", "beeach", "beeach"],
	mountain: ["mountin", "mountian", "moutain"],
	sunset: ["sunset", "sundet", "sunset"],
	flower: ["flour", "flwoer", "flowr"],
	wedding: ["wedding", "weding", "weedding"],
	camera: ["camra", "cammera", "camrea"],
	restaurant: ["resturant", "restraunt", "restarant"],
	vacation: ["vacation", "vaction", "vacaton"],
	birthday: ["birthday", "bithday", "brithday"],
	family: ["family", "famly", "famaily"],
};

// Common term variations
const TERM_VARIATIONS: Record<string, string[]> = {
	photo: ["picture", "image", "pic", "snapshot", "shot"],
	pic: ["picture", "photo", "image"],
	img: ["image", "picture", "photo"],
	pics: ["pictures", "photos", "images"],
};

/**
 * Expands a query with synonyms and related terms
 */
export function expandQuery(query: string): {
	expandedQuery: string;
	suggestions: string[];
	corrections: string[];
} {
	const terms = query.toLowerCase().trim().split(/\s+/);
	const corrections: string[] = [];
	const suggestions: string[] = [];
	const expandedTerms: string[] = [];

	// Process each term
	terms.forEach((term) => {
		let processedTerm = term;
		let hasCorrection = false;
		let hasSynonyms = false;

		// Check for spelling corrections
		for (const [correct, misspellings] of Object.entries(SPELL_CORRECTIONS)) {
			if (misspellings.includes(term)) {
				corrections.push(`${term} → ${correct}`);
				processedTerm = correct;
				hasCorrection = true;
				break;
			}
		}

		// Check for term variations
		for (const [canonical, variations] of Object.entries(TERM_VARIATIONS)) {
			if (variations.includes(term) && term !== canonical) {
				processedTerm = canonical;
				break;
			}
		}

		// Find synonyms for the processed term
		const synonyms = SYNONYM_MAPPINGS[processedTerm];
		if (synonyms && synonyms.length > 0) {
			// Add the original term
			expandedTerms.push(processedTerm);
			// Add up to 2 best synonyms
			const bestSynonyms = synonyms.slice(0, 2);
			expandedTerms.push(...bestSynonyms);

			// Create suggestions with alternative terms
			suggestions.push(
				...bestSynonyms.map((synonym) => query.replace(term, synonym).trim()),
			);
			hasSynonyms = true;
		} else {
			// No synonyms found, keep the original term
			expandedTerms.push(processedTerm);
		}

		// If we found corrections or synonyms, add alternative suggestions
		if (hasCorrection || hasSynonyms) {
			const alternativeQuery = query.replace(term, processedTerm);
			if (alternativeQuery !== query) {
				suggestions.unshift(alternativeQuery);
			}
		}
	});

	// Remove duplicates while preserving order
	const uniqueTerms = [...new Set(expandedTerms)];
	const uniqueSuggestions = [...new Set(suggestions)];

	// Build expanded query (original terms + selected synonyms)
	const expandedQuery = uniqueTerms.slice(0, 8).join(" "); // Limit to prevent overly long queries

	return {
		expandedQuery,
		suggestions: uniqueSuggestions.slice(0, 5), // Limit suggestions
		corrections: [...new Set(corrections)],
	};
}

/**
 * Generates alternative search suggestions for a given query
 */
export function generateSuggestions(query: string): string[] {
	const { suggestions } = expandQuery(query);
	return suggestions;
}

/**
 * Checks if a query has potential spelling issues and suggests corrections
 */
export function checkSpelling(query: string): string[] {
	const { corrections } = expandQuery(query);
	return corrections;
}

/**
 * Simple test function to verify query expansion works
 */
export function testQueryExpansion() {
	const testQueries = [
		"beach sunset",
		"family photo",
		"red flower",
		"mountain view",
		"wedding cake",
	];

	console.log("Query Expansion Test Results:");
	testQueries.forEach((query) => {
		const result = expandQuery(query);
		console.log(`\nOriginal: ${query}`);
		console.log(`Expanded: ${result.expandedQuery}`);
		console.log(`Suggestions: ${result.suggestions.join(", ")}`);
		console.log(`Corrections: ${result.corrections.join(", ")}`);
	});
}

// Run test in development mode
if (process.env.NODE_ENV === "development") {
	testQueryExpansion();
}
