import { EnhancedEmptyState } from "../components/EnhancedEmptyState";

function SynonymBanner({
	applied,
	original,
}: {
	applied: string;
	original: string;
}) {
	return (
		<div
			className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-800 border border-yellow-200 inline-flex items-center"
			aria-live="polite"
			data-testid="synonym-banner"
		>
			Showing results for "{applied}" (from "{original}")
			<button type="button" className="ml-2 underline">
				Search original
			</button>
		</div>
	);
}

export default function VisualHarness() {
	const params = new URLSearchParams(window.location.search);
	const mode = params.get("visual") || "indexing";
	const q = params.get("q") || "chidlren"; // common misspelling to trigger DYM
	const dym = (params.get("dym") || "children,child")
		.split(",")
		.filter(Boolean);

	return (
		<div className="min-h-screen flex items-center justify-center p-8 bg-white text-gray-900">
			<div className="w-full max-w-5xl">
				{mode === "indexing" && (
					<EnhancedEmptyState
						type="indexing"
						indexingProgress={42}
						estimatedTime="~2m"
					/>
				)}

				{mode === "no-results" && (
					<EnhancedEmptyState
						type="no-results"
						searchQuery={q}
						didYouMean={dym}
						onOpenFilters={() => {}}
						onOpenAdvanced={() => {}}
						onRunSample={() => {}}
						onAction={() => {}}
						hasActiveFilters={false}
						sampleQueries={["children", "people", "family", "kids"]}
					/>
				)}

				{mode === "synonym-banner" && (
					<div className="p-6 border rounded">
						<SynonymBanner applied="children" original="kid" />
					</div>
				)}
			</div>
		</div>
	);
}
