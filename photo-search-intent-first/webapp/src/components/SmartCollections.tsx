import type { SearchResult } from "../api";

interface SmartCollectionsProps {
	dir: string;
	engine: string;
	topK: number;
	smart: Record<string, any>;
	setSmart: (smart: Record<string, any>) => void;
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
			const rules: any = {
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

			const { apiSetSmart, apiGetSmart } = await import("../api");
			await apiSetSmart(dir, name, rules);
			const r = await apiGetSmart(dir);
			setSmart(r.smart || {});
			setNote("Saved smart collection");
		} catch (e: any) {
			setNote(e.message || "Failed to save smart");
		}
	};

	const handleRefreshSmart = async () => {
		try {
			const { apiGetSmart } = await import("../api");
			const r = await apiGetSmart(dir);
			setSmart(r.smart || {});
		} catch (e: any) {
			setNote(e.message || "Failed to load smart");
		}
	};

	const handleOpenSmart = async (name: string) => {
		try {
			const { apiResolveSmart } = await import("../api");
			const r = await apiResolveSmart(dir, name, engine, topK);
			setResults(r.results || []);
			setSearchId(r.search_id || "");
			setNote(`Opened smart: ${name}`);
		} catch (e: any) {
			setNote(e.message);
		}
	};

	const handleDeleteSmart = async (name: string) => {
		if (!confirm(`Delete smart collection "${name}"?`)) return;
		try {
			const { apiDeleteSmart, apiGetSmart } = await import("../api");
			await apiDeleteSmart(dir, name);
			const r = await apiGetSmart(dir);
			setSmart(r.smart || {});
		} catch (e: any) {
			setNote(e.message);
		}
	};

	return (
		<div className="bg-white border rounded p-3">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold">Smart Collections</h2>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={handleRefreshSmart}
						className="bg-gray-200 rounded px-3 py-1 text-sm"
					>
						Refresh
					</button>
					<button
						type="button"
						onClick={handleSaveCurrentAsSmart}
						className="bg-blue-600 text-white rounded px-3 py-1 text-sm"
					>
						Save current as Smart
					</button>
				</div>
			</div>
			{Object.keys(smart || {}).length === 0 ? (
				<div className="text-sm text-gray-600 mt-2">
					No smart collections yet.
				</div>
			) : (
				<div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
					{Object.keys(smart).map((name) => (
						<div key={name} className="border rounded p-2">
							<div className="flex items-center justify-between">
								<div className="font-semibold truncate" title={name}>
									{name}
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => handleOpenSmart(name)}
										className="px-2 py-1 bg-blue-600 text-white rounded"
									>
										Open
									</button>
									<button
										type="button"
										onClick={() => handleDeleteSmart(name)}
										className="px-2 py-1 bg-red-600 text-white rounded"
									>
										Delete
									</button>
								</div>
							</div>
							<div className="mt-1 text-xs text-gray-600 truncate">
								{JSON.stringify(smart[name])}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
