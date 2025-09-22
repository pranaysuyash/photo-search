import { EnhancedEmptyState } from "./EnhancedEmptyState";

interface SavedItem {
	name: string;
	query: string;
	top_k?: number;
}

export default function SavedSearches({
	saved,
	onRun,
	onDelete,
	onOpenHelp,
}: {
	saved: SavedItem[];
	onRun: (name: string, query: string, topK?: number) => void;
	onDelete: (name: string) => void;
	onOpenHelp?: () => void;
}) {
	return (
		<div className="bg-white border rounded p-3">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold">Saved Searches</h2>
			</div>
			{!saved || saved.length === 0 ? (
				<div className="mt-4">
					<EnhancedEmptyState
						type="no-directory"
						onAction={() => {
							/* TODO: Navigate to search */
						}}
						onDemoAction={() => {
							/* TODO: Show demo searches */
						}}
						onOpenHelp={onOpenHelp}
						sampleQueries={[
							"beach sunset",
							"birthday cake",
							"mountain hike",
							"red car",
						]}
						onRunSample={() => {
							/* TODO: Run sample search */
						}}
						context="saved"
					/>
				</div>
			) : (
				<div className="mt-2 divide-y">
					{saved.map((s) => (
						<div
							key={s.name}
							className="py-2 flex items-center justify-between gap-3"
						>
							<div className="min-w-0">
								<div className="font-medium truncate" title={s.name}>
									{s.name}
								</div>
								<div className="text-xs text-gray-600 truncate" title={s.query}>
									{s.query}
								</div>
							</div>
							<div className="flex gap-2 shrink-0">
								<button
									type="button"
									onClick={() => onRun(s.name, s.query, s.top_k)}
									className="px-2 py-1 rounded bg-blue-600 text-white text-sm"
								>
									Run
								</button>
								<button
									type="button"
									onClick={() => onDelete(s.name)}
									className="px-2 py-1 rounded bg-red-600 text-white text-sm"
								>
									Delete
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
