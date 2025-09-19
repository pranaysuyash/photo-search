import { useState } from "react";
import {
	apiBuildFaces,
	apiFacesName,
	apiGetFacePhotos,
	apiMergeFaceClusters,
	thumbFaceUrl,
	thumbUrl,
} from "../api";
import { EnhancedEmptyState } from "./EnhancedEmptyState";
import { Button } from "./ui/shadcn/Button";

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
	busy: _busy,
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
		} catch (e: unknown) {
			setBusy("");
			setNote(e instanceof Error ? e.message : "Failed to load photos");
		}
	};

	const _mergeClusters = async (sourceId: string, targetId: string) => {
		try {
			setBusy("Merging clusters...");
			await apiMergeFaceClusters(dir, sourceId, targetId);
			setBusy("");
			setNote("Clusters merged successfully");
			await onLoadFaces();
		} catch (e: unknown) {
			setBusy("");
			setNote(e instanceof Error ? e.message : "Merge failed");
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
					{clusterPhotos.map((photo) => {
						const name = photo.split("/").pop() || photo;
						return (
							<img
								key={`photo-${photo}`}
								src={thumbUrl(dir, engine, photo, 196)}
								alt={name}
								className="w-full h-24 object-cover rounded cursor-pointer hover:ring-2 hover:ring-blue-500"
								onClick={() => onOpenPhotos?.([photo])}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onOpenPhotos?.([photo]);
									}
								}}
							/>
						);
					})}
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white border rounded p-3">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold">People</h2>
				<div className="flex gap-2">
					<Button
						variant="secondary"
						size="sm"
						onClick={async () => {
							try {
								setBusy("Scanning faces…");
								const r = await apiBuildFaces(dir, engine);
								setBusy("");
								setNote(`Faces: ${r.faces}, clusters: ${r.clusters}`);
								await onLoadFaces();
							} catch (e: unknown) {
								setBusy("");
								setNote(e instanceof Error ? e.message : "Face build failed");
							}
						}}
					>
						Build/Update
					</Button>
					<Button variant="secondary" size="sm" onClick={onLoadFaces}>
						Refresh
					</Button>
				</div>
			</div>
			{clusters.length === 0 ? (
				<div className="mt-4">
					<EnhancedEmptyState
						type="no-directory"
						onAction={async () => {
							try {
								setBusy("Scanning faces…");
								const r = await apiBuildFaces(dir, engine);
								setBusy("");
								setNote(`Faces: ${r.faces}, clusters: ${r.clusters}`);
								await onLoadFaces();
							} catch (e: unknown) {
								setBusy("");
								setNote(e instanceof Error ? e.message : "Face build failed");
							}
						}}
						onOpenHelp={() => {
							/* TODO: Open help */
						}}
						sampleQueries={[
							"Build face clusters",
							"Name people",
							"Organize photos",
						]}
						onRunSample={() => {
							/* TODO: Run sample action */
						}}
					/>
				</div>
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
								{c.examples.map(([p, emb], _i) => (
									<img
										key={`item-${String(p)}`}
										src={thumbFaceUrl(dir, engine, p, emb, 196)}
										alt={`Face example ${_i + 1}`}
										className="w-full h-16 object-cover rounded"
									/>
								))}
							</div>
							<div className="mt-2 flex flex-col gap-2">
								<div className="flex gap-1">
									<Button
										variant={
											c.name && persons.includes(c.name)
												? "default"
												: c.name
													? "secondary"
													: "outline"
										}
										size="sm"
										onClick={() => {
											const nm = c.name || "";
											if (!nm) return;
											const next = persons.includes(nm)
												? persons.filter((x: string) => x !== nm)
												: [...persons, nm];
											setPersons(next);
										}}
										disabled={!c.name}
									>
										{c.name && persons.includes(c.name) ? "Remove" : "Add"}
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={async () => {
											const n =
												prompt("Name this person as…", c.name || "") || "";
											if (!n.trim()) return;
											try {
												await apiFacesName(dir, String(c.id), n.trim());
												await onLoadFaces();
											} catch {}
										}}
									>
										Name
									</Button>
								</div>
								<Button
									variant="default"
									size="sm"
									onClick={() => viewClusterPhotos(c.id)}
									className="w-full"
								>
									View Photos ({c.size})
								</Button>
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
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setPersons(persons.filter((x) => x !== p))}
								className="bg-white/20 rounded px-1 h-5 w-5"
							>
								×
							</Button>
						</span>
					))}
					<Button variant="outline" size="sm" onClick={() => setPersons([])}>
						Clear
					</Button>
				</div>
			)}
		</div>
	);
}
