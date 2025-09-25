import type { SearchResult } from "../api";
import {
	apiDeleteSmart,
	apiGetSmart,
	apiResolveSmart,
	apiSetSmart,
} from "../api";

interface SmartCollectionsProps {
	dir: string;
	engine: string;
	topK: number;
	smart: Record<string, unknown>;
	setSmart: (smart: Record<string, unknown>) => void;
	setResults: (results: SearchResult[]) => void;
	setSearchId: (searchId: string) => void;
	setNote: (note: string) => void;

	// Current search state for saving as smart collection
	query: string;
	favOnly: boolean;
	tagFilter: string;
	useCaps: boolean;
	useOcr: boolean;
	hasText: boolean;
	camera: string;
	isoMin: string;
	isoMax: string;
	fMin: string;
	fMax: string;
	place: string;
	persons: string[];
}

export default function SmartCollections({
	dir,
	engine,
	topK,
	smart,
	setSmart,
	setResults,
	setSearchId,
	setNote,
	query,
	favOnly,
	tagFilter,
	useCaps,
	useOcr,
	hasText,
	camera,
	isoMin,
	isoMax,
	fMin,
	fMax,
	place,
	persons,
}: SmartCollectionsProps) {
	const handleSaveCurrentAsSmart = async () => {
		const name = (prompt("Save current search as Smart (name):") || "").trim();
		if (!name) return;

		try {
			const tags = tagFilter
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			const rules: Record<string, unknown> = {
				query,
				favoritesOnly: favOnly,
				tags,
				useCaptions: useCaps,
				useOcr,
				hasText,
				camera: camera || undefined,
				isoMin: isoMin ? parseInt(isoMin, 10) : undefined,
				isoMax: isoMax ? parseInt(isoMax, 10) : undefined,
				fMin: fMin ? parseFloat(fMin) : undefined,
				fMax: fMax ? parseFloat(fMax) : undefined,
				place: place || undefined,
			};

			const ppl = persons.filter(Boolean);
			if (ppl.length === 1) rules.person = ppl[0];
			else if (ppl.length > 1) rules.persons = ppl;

			await apiSetSmart(
				dir,
				name,
				rules as { query: string; count?: number } & Record<string, unknown>,
			);
			const r = await apiGetSmart(dir);
			setSmart(r.smart || {});
			setNote("Saved smart collection");
		} catch (e: unknown) {
			setNote(e instanceof Error ? e.message : "Failed to save smart");
		}
	};

	const handleRefreshSmart = async () => {
		try {
			const r = await apiGetSmart(dir);
			setSmart(r.smart || {});
		} catch (e: unknown) {
			setNote(e instanceof Error ? e.message : "Failed to load smart");
		}
	};

	const handleOpenSmart = async (name: string) => {
		try {
			const r = await apiResolveSmart(dir, name, engine, topK);
			setResults(r.results || []);
			setSearchId(r.search_id || "");
			setNote(`Opened smart: ${name}`);
		} catch (e: unknown) {
			setNote(e instanceof Error ? e.message : "Failed to open smart");
		}
	};

	const handleDeleteSmart = async (name: string) => {
		if (!confirm(`Delete smart collection "${name}"?`)) return;
		try {
			await apiDeleteSmart(dir, name);
			const r = await apiGetSmart(dir);
			setSmart(r.smart || {});
		} catch (e: unknown) {
			setNote(e instanceof Error ? e.message : "Failed to delete smart");
		}
	};

	return (
		<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
				<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
					Smart Collections
				</h2>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={handleRefreshSmart}
						className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
					>
						Refresh
					</button>
					<button
						type="button"
						onClick={handleSaveCurrentAsSmart}
						className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
					>
						Save current as Smart
					</button>
				</div>
			</div>
			{Object.keys(smart || {}).length === 0 ? (
				<div className="text-sm text-gray-600 dark:text-gray-400 py-8 text-center">
					No smart collections yet. Save your current search to create one.
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
					{Object.keys(smart).map((name) => (
						<div
							key={name}
							className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						>
							<div className="flex items-start justify-between gap-2 mb-2">
								<div
									className="font-medium text-gray-900 dark:text-white truncate flex-1"
									title={name}
								>
									{name}
								</div>
								<div className="flex gap-1 flex-shrink-0">
									<button
										type="button"
										onClick={() => handleOpenSmart(name)}
										className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
									>
										Open
									</button>
									<button
										type="button"
										onClick={() => handleDeleteSmart(name)}
										className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
									>
										Delete
									</button>
								</div>
							</div>
							<div className="text-xs text-gray-600 dark:text-gray-400">
								{/* Show a concise summary instead of raw JSON */}
								{(() => {
									try {
										const rules =
											(smart[name] as Record<string, unknown>) || {};
										const parts: string[] = [];
										if (typeof rules.query === "string" && rules.query.trim())
											parts.push(`q: "${rules.query.trim()}"`);
										if (Array.isArray(rules.tags) && rules.tags.length)
											parts.push(`tags: ${rules.tags.length}`);
										if (rules.favoritesOnly) parts.push("favorites");
										if (
											rules.person ||
											(Array.isArray(rules.persons) && rules.persons.length)
										)
											parts.push(
												rules.person
													? `person: ${String(rules.person)}`
													: `people: ${
															((rules.persons as unknown[]) || []).length
														}`,
											);
										return parts.length ? parts.join(" • ") : "Smart rules";
									} catch {
										return "Smart rules";
									}
								})()}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
