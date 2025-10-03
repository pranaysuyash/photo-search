import type { LucideProps } from "lucide-react";
import { Clock, TrendingUp } from "lucide-react";
import type { SearchIntent } from "../services/SearchIntentRecognizer";
import { didYouMean, synonymAlternates } from "../utils/searchSynonyms";

export type SuggestionType = "history" | "metadata" | "alternate";

export interface SuggestionItem {
	cat: string;
	label: string;
	icon?: React.ComponentType<LucideProps>;
	subtitle?: string;
	type: SuggestionType;
	metadata?: { lastUsed?: number; useCount?: number };
}

export interface BuildSuggestionsArgs {
	searchText: string;
	suggestOpen: boolean;
	historySuggestions: Array<{
		query: string;
		type: "history";
		metadata?: { lastUsed?: number; useCount?: number };
	}>;
	clusters: Array<{ name?: string }>;
	allTags: string[];
	meta: { cameras?: string[]; places?: (string | number)[] };
	formatRelativeTime: (ts: number) => string;
}

export function buildSuggestions({
	searchText,
	suggestOpen,
	historySuggestions,
	clusters,
	allTags,
	meta,
	formatRelativeTime,
}: BuildSuggestionsArgs): SuggestionItem[] {
	if (!suggestOpen) return [];
	const q = searchText.toLowerCase();
	const items: SuggestionItem[] = [];

	if (historySuggestions.length > 0) {
		historySuggestions.forEach((histSugg) => {
			if (!q || histSugg.query.toLowerCase().includes(q)) {
				items.push({
					cat: histSugg.type === "history" ? "Recent" : "Similar",
					label: histSugg.query,
					icon: Clock,
					subtitle: histSugg.metadata?.lastUsed
						? `${histSugg.metadata.useCount || 1} times, ${formatRelativeTime(
								histSugg.metadata.lastUsed,
							)}`
						: undefined,
					type: "history",
					metadata: histSugg.metadata,
				});
			}
		});
	}

	const ppl = (clusters || []).map((c) => c.name).filter(Boolean) as string[];
	for (const p of ppl) {
		if (!q || p.toLowerCase().includes(q)) {
			items.push({ cat: "People", label: p, type: "metadata" });
		}
	}

	for (const t of allTags || []) {
		if (!q || t.toLowerCase().includes(q)) {
			items.push({ cat: "Tag", label: t, type: "metadata" });
		}
	}

	for (const c of meta.cameras || []) {
		if (!q || c.toLowerCase().includes(q)) {
			items.push({ cat: "Camera", label: c, type: "metadata" });
		}
	}

	for (const pl of meta.places || []) {
		if (!q || String(pl).toLowerCase().includes(q)) {
			items.push({ cat: "Place", label: String(pl), type: "metadata" });
		}
	}

	const historySuggs = items.filter((s) => s.type === "history").slice(0, 8);
	const metaSuggs = items.filter((s) => s.type === "metadata").slice(0, 12);
	const combined = [...historySuggs, ...metaSuggs].slice(0, 20);
	if (combined.length > 0) return combined;

	// Enhanced suggestions fallback
	const alts = synonymAlternates(searchText || "");
	const fallback = ["family dinner", "golden hour", "mountain hike"];
	const allCandidates = [
		...clusters.map((c) => c.name || "").filter(Boolean),
		...allTags,
		...fallback,
	];
	const corrections = didYouMean(searchText || "", allCandidates, 2);

	const enhanced: SuggestionItem[] = [];
	if (corrections.length > 0) {
		enhanced.push(
			...corrections.map((c) => ({
				cat: "Did you mean?",
				label: c,
				type: "alternate" as const,
				subtitle: "Spelling suggestion",
			})),
		);
	}
	if (alts.length > 0) {
		enhanced.push(
			...alts.map((alt) => ({
				cat: "Try also",
				label: alt,
				type: "alternate" as const,
				subtitle: "Synonym suggestion",
			})),
		);
	}
	if (enhanced.length < 3) {
		enhanced.push(
			...fallback.map((f) => ({
				cat: "Popular searches",
				label: f,
				type: "alternate" as const,
				subtitle: "Press Enter to search",
			})),
		);
	}
	return enhanced.slice(0, 6);
}

export function computeWarnings(qRaw: string): string[] {
	const list: string[] = [];
	const q = qRaw.trim();
	if (!q) return list;
	try {
		let bal = 0;
		for (const ch of q) {
			if (ch === "(") bal++;
			else if (ch === ")") bal--;
			if (bal < 0) {
				list.push("Unbalanced parentheses");
				break;
			}
		}
		if (bal > 0) list.push("Unbalanced parentheses");
		const allowed = new Set([
			"camera",
			"place",
			"tag",
			"rating",
			"person",
			"has_text",
			"filetype",
			"iso",
			"fnumber",
			"width",
			"height",
			"mtime",
			"brightness",
			"sharpness",
			"exposure",
			"focal",
			"duration",
		]);
		for (const tok of q.split(/\s+/)) {
			const idx = tok.indexOf(":");
			if (idx > 0) {
				const field = tok.slice(0, idx).toLowerCase();
				if (!allowed.has(field)) list.push(`Unknown field: ${field}`);
			}
		}
	} catch {
		// parsing guard
	}
	return Array.from(new Set(list));
}
