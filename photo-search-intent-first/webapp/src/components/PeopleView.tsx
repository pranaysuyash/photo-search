import { useState } from "react";
import {
	apiBuildFaces,
	apiFacesName,
	apiGetFacePhotos,
	apiMergeFaceClusters,
	thumbFaceUrl,
	thumbUrl,
} from "../api";

interface PeopleViewProps {
	dir: string;
	engine: string;
	clusters: {
		id: string;
		name?: string;
		size: number;
		examples: [string, number][];
	}[];
	persons: string[];
	setPersons: (persons: string[]) => void;
	busy: string;
	setBusy: (busy: string) => void;
	setNote: (note: string) => void;
	onLoadFaces: () => void;
	onOpenPhotos?: (photos: string[]) => void;
}

export default function PeopleView({
	dir,
	engine,
	clusters,
	persons,
	setPersons,
	busy,
	setBusy,
	setNote,
	onLoadFaces,
	onOpenPhotos,
}: PeopleViewProps) {
	const [selectedClusterId, setSelectedClusterId] = useState<string | null>(
		null,
	);
	const [clusterPhotos, setClusterPhotos] = useState<string[]>([]);
	const [showClusterPhotos, setShowClusterPhotos] = useState(false);

	const viewClusterPhotos = async (clusterId: string) => {
		try {
			setBusy("Loading photos...");
			const result = await apiGetFacePhotos(dir, clusterId);
			setClusterPhotos(result.photos);
			setSelectedClusterId(clusterId);
			setShowClusterPhotos(true);
			setBusy("");
			setNote(`Found ${result.photos.length} photos in cluster`);
		} catch (e: any) {
			setBusy("");
			setNote(e.message);
		}
	};

	const _mergeClusters = async (sourceId: string, targetId: string) => {
		try {
			setBusy("Merging clusters...");
			await apiMergeFaceClusters(dir, sourceId, targetId);
			setBusy("");
			setNote("Clusters merged successfully");
			await onLoadFaces();
		} catch (e: any) {
			setBusy("");
			setNote(e.message);
		}
	};

	if (showClusterPhotos && selectedClusterId) {
		return (
			<div className="bg-white border rounded p-3">
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-semibold">Photos in Cluster</h3>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setShowClusterPhotos(false)}
							className="bg-gray-200 rounded px-3 py-1 text-sm"
						>
							Back
						</button>
						<button
							type="button"
							onClick={() => onOpenPhotos?.(clusterPhotos)}
							className="bg-blue-600 text-white rounded px-3 py-1 text-sm"
						>
							View All ({clusterPhotos.length})
						</button>
					</div>
				</div>
				<div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
					{clusterPhotos.map((photo, index) => (
						<img
							key={`${photo.id || photo.path || photo.name || photo.key || ""}-${index}`}
							src={thumbUrl(dir, engine, photo, 196)}
							alt={`Photo ${index + 1}`}
							className="w-full h-24 object-cover rounded cursor-pointer hover:ring-2 hover:ring-blue-500"
							onClick={() => onOpenPhotos?.([photo])}
						/>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white border rounded p-3">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold">People</h2>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={async () => {
							try {
								setBusy("Scanning faces…");
								const r = await apiBuildFaces(dir, engine);
								setBusy("");
								setNote(`Faces: ${r.faces}, clusters: ${r.clusters}`);
								await onLoadFaces();
							} catch (e: any) {
								setBusy("");
								setNote(e.message);
							}
						}}
						className="bg-gray-200 rounded px-3 py-1 text-sm"
					>
						Build/Update
					</button>
					<button
						type="button"
						onClick={onLoadFaces}
						className="bg-gray-200 rounded px-3 py-1 text-sm"
					>
						Refresh
					</button>
				</div>
			</div>
			{clusters.length === 0 ? (
				<div className="text-sm text-gray-600 mt-2">No face clusters yet.</div>
			) : (
				<div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
					{clusters.map((c) => (
						<div key={c.id} className="border rounded p-2">
							<div className="flex items-center justify-between">
								<div
									className="font-semibold truncate"
									title={c.name || `Cluster ${c.id}`}
								>
									{c.name || `Cluster ${c.id}`}
								</div>
								<div className="text-xs text-gray-600">{c.size}</div>
							</div>
							<div className="mt-2 grid grid-cols-2 gap-1">
								{c.examples.map(([p, emb], i) => (
									<img
										key={`item-${i}`}
										src={thumbFaceUrl(dir, engine, p, emb, 196)}
										className="w-full h-16 object-cover rounded"
									/>
								))}
							</div>
							<div className="mt-2 flex flex-col gap-2">
								<div className="flex gap-1">
									<button
										type="button"
										onClick={() => {
											const nm = c.name || "";
											if (!nm) return;
											const next = persons.includes(nm)
												? persons.filter((x: string) => x !== nm)
												: [...persons, nm];
											setPersons(next);
										}}
										disabled={!c.name}
										className={`px-2 py-1 rounded text-xs ${c.name && persons.includes(c.name) ? "bg-blue-700 text-white" : c.name ? "bg-blue-600 text-white" : "bg-gray-200"}`}
									>
										{c.name && persons.includes(c.name) ? "Remove" : "Add"}
									</button>
									<button
										type="button"
										onClick={async () => {
											const n =
												prompt("Name this person as…", c.name || "") || "";
											if (!n.trim()) return;
											try {
												await apiFacesName(dir, String(c.id), n.trim());
												await onLoadFaces();
											} catch {}
										}}
										className="px-2 py-1 rounded bg-gray-200 text-xs"
									>
										Name
									</button>
								</div>
								<button
									type="button"
									onClick={() => viewClusterPhotos(c.id)}
									className="px-2 py-1 rounded bg-green-600 text-white text-xs w-full"
								>
									View Photos ({c.size})
								</button>
							</div>
						</div>
					))}
				</div>
			)}
			{persons.length > 0 && (
				<div className="mt-2 text-sm flex items-center gap-2 flex-wrap">
					{persons.map((p) => (
						<span
							key={p}
							className="px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-2"
						>
							{p}{" "}
							<button
								type="button"
								onClick={() => setPersons(persons.filter((x) => x !== p))}
								className="bg-white/20 rounded px-1"
							>
								×
							</button>
						</span>
					))}
					<button
						type="button"
						onClick={() => setPersons([])}
						className="px-2 py-1 bg-gray-200 rounded"
					>
						Clear
					</button>
				</div>
			)}
		</div>
	);
}
