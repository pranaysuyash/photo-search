import { useMemo, useState } from "react";

export default function AdvancedSearchModal({
	open,
	onClose,
	onApply,
	onSave,
	allTags,
	cameras,
	people,
}: {
	open: boolean;
	onClose: () => void;
	onApply: (query: string) => void;
	onSave: (name: string, query: string) => void;
	allTags: string[];
	cameras: string[];
	people: string[];
}) {
	const [base, setBase] = useState("");
	const [camera, setCamera] = useState("");
	const [place, setPlace] = useState("");
	const [tag, setTag] = useState("");
	const [person, setPerson] = useState("");
	const [hasText, setHasText] = useState<"any" | "true" | "false">("any");
	const [isoMin, setIsoMin] = useState("");
	const [fMax, setFMax] = useState("");
	const [wMin, setWMin] = useState("");
	const [hMin, setHMin] = useState("");
	const [filetype, setFiletype] = useState("");
	const [durationMin, setDurationMin] = useState("");
	const [name, setName] = useState("");

	const query = useMemo(() => {
		const parts: string[] = [];
		if (base.trim()) parts.push(base.trim());
		if (camera.trim()) parts.push(`camera:"${camera.trim()}"`);
		if (place.trim()) parts.push(`place:"${place.trim()}"`);
		if (tag.trim()) parts.push(`tag:${tag.trim()}`);
		if (person.trim()) parts.push(`person:"${person.trim()}"`);
		if (hasText === "true") parts.push("has_text:true");
		if (hasText === "false") parts.push("has_text:false");
		if (isoMin.trim()) parts.push(`iso:>=${isoMin.trim()}`);
		if (fMax.trim()) parts.push(`fnumber:<${fMax.trim()}`);
		if (wMin.trim()) parts.push(`width:>=${wMin.trim()}`);
		if (hMin.trim()) parts.push(`height:>=${hMin.trim()}`);
		if (filetype.trim())
			parts.push(`filetype:${filetype.trim().toLowerCase()}`);
		if (durationMin.trim()) parts.push(`duration:>${durationMin.trim()}`);
		return parts.join(" AND ");
	}, [
		base,
		camera,
		place,
		tag,
		person,
		hasText,
		isoMin,
		fMax,
		wMin,
		hMin,
		filetype,
		durationMin,
	]);

	const warnings = useMemo(() => {
		const issues: string[] = [];
		const q = query || "";
		// Paren balance
		let bal = 0;
		for (const ch of q) {
			if (ch === "(") bal++;
			else if (ch === ")") bal--;
			if (bal < 0) {
				issues.push("Unbalanced parentheses");
				break;
			}
		}
		if (bal > 0) issues.push("Unbalanced parentheses");
		// Unknown fields
		try {
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
			const parts = q.split(/\s+/);
			for (const tok of parts) {
				const i = tok.indexOf(":");
				if (i > 0) {
					const field = tok.slice(0, i).toLowerCase();
					if (!allowed.has(field)) {
						issues.push(`Unknown field: ${field}`);
					}
				}
			}
		} catch {}
		return Array.from(new Set(issues));
	}, [query]);

	if (!open) return null;
	return (
		<div
			className="fixed inset-0 z-[1080] flex items-center justify-center"
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<button
				type="button"
				className="absolute inset-0 bg-black/50"
				onClick={onClose}
				aria-label="Close"
			/>
			<div className="relative z-[1081] bg-white dark:bg-gray-900 rounded-lg shadow p-4 w-full max-w-2xl">
				<div className="text-lg font-semibold mb-2">Advanced Search</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label className="text-sm">Base Text</label>
						<input
							className="input"
							value={base}
							onChange={(e) => setBase(e.target.value)}
							placeholder='e.g., "golden hour" OR beach'
						/>
					</div>
					<div>
						<label className="text-sm">Camera</label>
						<input
							list="cam-list"
							className="input"
							value={camera}
							onChange={(e) => setCamera(e.target.value)}
							placeholder="Canon, Sony..."
						/>
						<datalist id="cam-list">
							{cameras.map((c) => (
								<option key={c} value={c} />
							))}
						</datalist>
					</div>
					<div>
						<label className="text-sm">Place</label>
						<input
							className="input"
							value={place}
							onChange={(e) => setPlace(e.target.value)}
							placeholder="City, location..."
						/>
					</div>
					<div>
						<label className="text-sm">Tag</label>
						<input
							list="tag-list"
							className="input"
							value={tag}
							onChange={(e) => setTag(e.target.value)}
							placeholder="Any tag"
						/>
						<datalist id="tag-list">
							{allTags.map((t) => (
								<option key={t} value={t} />
							))}
						</datalist>
					</div>
					<div>
						<label className="text-sm">Person</label>
						<input
							list="person-list"
							className="input"
							value={person}
							onChange={(e) => setPerson(e.target.value)}
							placeholder="Person name"
						/>
						<datalist id="person-list">
							{people.map((p) => (
								<option key={p} value={p} />
							))}
						</datalist>
					</div>
					<div>
						<label className="text-sm">Has Text</label>
						<select
							className="input"
							value={hasText}
							onChange={(e) => setHasText(e.target.value as any)}
						>
							<option value="any">Any</option>
							<option value="true">True</option>
							<option value="false">False</option>
						</select>
					</div>
					<div>
						<label className="text-sm">ISO ≥</label>
						<input
							className="input"
							value={isoMin}
							onChange={(e) => setIsoMin(e.target.value)}
							placeholder="e.g., 1600"
						/>
					</div>
					<div>
						<label className="text-sm">f-number &lt;</label>
						<input
							className="input"
							value={fMax}
							onChange={(e) => setFMax(e.target.value)}
							placeholder="e.g., 2.8"
						/>
					</div>
					<div>
						<label className="text-sm">Width ≥</label>
						<input
							className="input"
							value={wMin}
							onChange={(e) => setWMin(e.target.value)}
							placeholder="e.g., 3000"
						/>
					</div>
					<div>
						<label className="text-sm">Height ≥</label>
						<input
							className="input"
							value={hMin}
							onChange={(e) => setHMin(e.target.value)}
							placeholder="e.g., 2000"
						/>
					</div>
					<div>
						<label className="text-sm">Filetype</label>
						<input
							className="input"
							value={filetype}
							onChange={(e) => setFiletype(e.target.value)}
							placeholder="jpg, png, mp4, ..."
						/>
					</div>
					<div>
						<label className="text-sm">Duration &gt; (s)</label>
						<input
							className="input"
							value={durationMin}
							onChange={(e) => setDurationMin(e.target.value)}
							placeholder="e.g., 30"
						/>
					</div>
				</div>
				<div className="mt-3">
					<div className="text-xs text-gray-600 mb-1">Preview</div>
					<div
						className="text-sm font-mono bg-gray-100 dark:bg-gray-800 rounded p-2 break-words"
						style={{ minHeight: "2.2rem" }}
					>
						{query || "—"}
					</div>
					{warnings.length > 0 && (
						<ul className="mt-2 text-xs text-red-600 list-disc pl-5">
							{warnings.map((w, i) => (
								<li key={`warning-${i}`}>
									{w}
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="mt-3 flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<input
							className="input"
							placeholder="Preset name"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={() => {
								if (name.trim()) {
									onSave(name.trim(), query);
									setName("");
								}
							}}
						>
							Save Preset
						</button>
					</div>
					<div className="flex items-center gap-2">
						<button type="button" className="btn" onClick={onClose}>
							Close
						</button>
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => onApply(query)}
						>
							Apply
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
