import { type SearchResult, thumbUrl } from "../api";
import { ProgressiveImage } from "./ProgressiveImage";

export function ResultsGrid({
	dir,
	engine,
	results,
	selected,
	onToggleSelect,
	onOpen,
	showScore = true,
	explainChips,
}: {
	dir: string;
	engine: string;
	results: SearchResult[];
	selected: Record<string, boolean>;
	onToggleSelect: (path: string) => void;
	onOpen: (path: string) => void;
	showScore?: boolean;
	explainChips?: {
		caption?: boolean;
		ocr?: boolean;
		geo?: boolean;
		time?: boolean;
		faces?: boolean;
	};
}) {
	if (!results || results.length === 0) {
		return (
			<div className="text-sm text-gray-600 mt-2">
				No results yet. Type a description and click Search.
			</div>
		);
	}
	return (
		<div className="mt-2 grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
			{results.map((r, _index) => {
				const p = r.path;
				const isSel = !!selected[p];
				return (
					<div
						key={p}
						className={`relative border rounded ${
							isSel ? "ring-2 ring-blue-600" : ""
						}`}
						tabIndex={-1}
					>
						<ProgressiveImage
							src={thumbUrl(dir, engine, p, 256)}
							alt={`Photo: ${p.split("/").pop() || p}`}
							className="w-full h-24 object-cover rounded pointer-events-none select-none"
							thumbSize={96}
							mediumSize={256}
							fullSize={512}
							title={p}
						/>
						{/* Cover button for selection/open */}
						<button
							type="button"
							className="absolute inset-0 w-full h-full text-left"
							aria-label={`Select ${p}`}
							onClick={() => onToggleSelect(p)}
							onDoubleClick={() => onOpen(p)}
						/>
						{showScore && (
							<div className="absolute top-1 left-1 bg-white/80 rounded px-1 text-xs">
								{(r.score || 0).toFixed(2)}
							</div>
						)}
						{explainChips && (
							<div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-1 justify-start">
								{explainChips.faces && (
									<span className="text-[10px] px-1 py-0.5 rounded bg-purple-700/80 text-white">
										Faces
									</span>
								)}
								{explainChips.ocr && (
									<span className="text-[10px] px-1 py-0.5 rounded bg-emerald-700/80 text-white">
										OCR
									</span>
								)}
								{explainChips.caption && (
									<span className="text-[10px] px-1 py-0.5 rounded bg-blue-700/80 text-white">
										Caption
									</span>
								)}
								{explainChips.time && (
									<span className="text-[10px] px-1 py-0.5 rounded bg-amber-700/80 text-white">
										Time
									</span>
								)}
								{explainChips.geo && (
									<span className="text-[10px] px-1 py-0.5 rounded bg-teal-700/80 text-white">
										Geo
									</span>
								)}
							</div>
						)}
						<div className="absolute top-1 right-1 z-10">
							<input
								type="checkbox"
								checked={isSel}
								onChange={() => onToggleSelect(p)}
								aria-label={`Select ${p}`}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
}
