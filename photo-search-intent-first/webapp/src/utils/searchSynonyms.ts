// Centralized synonyms and helpers for search UX

// Map lowercased token -> preferred replacement token
const SYN_MAP: Record<string, string> = {
	// people / family
	kid: "children",
	kids: "children",
	child: "children",
	children: "children",
	// pets / animals
	puppy: "dog",
	doggy: "dog",
	pups: "dog",
	kitty: "cat",
	kittens: "cat",
	// places
	beaches: "beach",
	coastline: "beach",
	cities: "city",
	downtown: "city",
	// vehicles
	auto: "car",
	automobile: "car",
	autos: "car",
	// boats
	ship: "boat",
	ships: "boat",
	boats: "boat",
	// events / holidays
	bday: "birthday",
	bdays: "birthday",
	xmas: "christmas",
	// travel / activity
	vacay: "vacation",
	holidays: "vacation",
	hike: "hiking",
	hikes: "hiking",
	// food / portraits
	foods: "food",
	meal: "food",
	meals: "food",
	portrait: "headshot",
	portraits: "headshot",
};

export function expandSynonyms(query: string): string {
	const parts = (query || "").split(/(\s+)/); // keep whitespace tokens
	let changed = false;
	const out = parts.map((seg) => {
		if (!seg.trim()) return seg; // keep spaces
		const lower = seg.toLowerCase();
		const repl = SYN_MAP[lower];
		if (repl && repl !== lower) {
			changed = true;
			// keep original casing for non-alpha? we return lower replacement
			return repl;
		}
		return seg;
	});
	return changed ? out.join("") : "";
}

export function synonymAlternates(query: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	const tokens = (query || "").toLowerCase().split(/\s+/).filter(Boolean);
	for (const t of tokens) {
		const repl = SYN_MAP[t];
		if (repl && repl !== t) {
			if (!seen.has(repl)) {
				out.push(repl);
				seen.add(repl);
			}
		}
	}
	return out;
}

// Lightweight Levenshtein for small candidate sets
function editDistance(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(
				dp[i - 1][j] + 1,
				dp[i][j - 1] + 1,
				dp[i - 1][j - 1] + cost,
			);
		}
	}
	return dp[m][n];
}

export function didYouMean(
	query: string,
	candidates: string[],
	max = 3,
): string[] {
	const toks = (query || "").toLowerCase().split(/\s+/).filter(Boolean);
	if (toks.length === 0) return [];
	const focus = toks.reduce((a, b) => (b.length > a.length ? b : a), toks[0]);
	if (!focus || focus.length < 4) return [];
	const ranks = candidates
		.map((c) => String(c || "").trim())
		.filter(Boolean)
		.map((c) => ({ c, d: editDistance(focus, c.toLowerCase()) }))
		.filter((r) => r.d > 0 && r.d <= 2)
		.sort((a, b) => a.d - b.d || a.c.length - b.c.length);
	const uniq: string[] = [];
	const seen = new Set<string>();
	for (const r of ranks) {
		if (!seen.has(r.c.toLowerCase())) {
			uniq.push(r.c);
			seen.add(r.c.toLowerCase());
			if (uniq.length >= max) break;
		}
	}
	return uniq;
}

export default {
	expandSynonyms,
	synonymAlternates,
	didYouMean,
};
