import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/shadcn/Button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/shadcn/Dialog";
import { Input } from "@/components/ui/shadcn/Input";
import {
	apiDataNuke,
	apiGetExcludes,
	apiModelsCapabilities,
	apiModelsDownload,
	apiSetExcludes,
	apiWatchStart,
	apiWatchStatus,
	apiWatchStop,
} from "../api";

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	dir: string;
	engine: string;
}

export function SettingsModal({
	isOpen,
	onClose,
	dir,
	engine,
}: SettingsModalProps) {
	const [watchAvail, setWatchAvail] = useState<boolean | null>(null);
	const [watchBusy, setWatchBusy] = useState(false);
	const [excludes, setExcludes] = useState<string[]>([]);
	const [exclInput, setExclInput] = useState("");
	const [modelCaps, setModelCaps] = useState<{
		transformers: boolean;
		torch: boolean;
		cuda: boolean;
		mps: boolean;
	} | null>(null);
	const [modelBusy, setModelBusy] = useState(false);
	const [nukeBusy, setNukeBusy] = useState(false);
	const canManage = useMemo(() => !!dir, [dir]);

	useEffect(() => {
		if (!isOpen) return;
		let cancelled = false;
		(async () => {
			try {
				await apiWatchStatus();
				if (!cancelled) setWatchAvail(true);
			} catch {
				if (!cancelled) setWatchAvail(false);
			}
			try {
				const caps = await apiModelsCapabilities();
				if (!cancelled) setModelCaps(caps.capabilities);
			} catch {
				if (!cancelled) setModelCaps(null);
			}
			if (dir) {
				try {
					const ex = await apiGetExcludes(dir);
					if (!cancelled) setExcludes(ex || []);
				} catch {
					if (!cancelled) setExcludes([]);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [isOpen, dir]);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
				</DialogHeader>

				<div className="space-y-6">
					{/* Watcher */}
					<section>
						<div className="flex items-center justify-between mb-2">
							<Label className="text-base font-medium">File Watcher</Label>
							<div className="text-sm text-gray-600">
								{watchAvail === null
									? "checking…"
									: watchAvail
										? "available"
										: "unavailable"}
							</div>
						</div>
						<div className="bg-gray-50 dark:bg-gray-800 border rounded-lg p-4 flex items-center gap-2">
							<Button
								variant="default"
								size="sm"
								disabled={!canManage || !watchAvail || watchBusy}
								onClick={async () => {
									if (!dir) return;
									try {
										setWatchBusy(true);
										await apiWatchStart(dir, engine, 1200, 12);
									} finally {
										setWatchBusy(false);
									}
								}}
							>
								Start
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={!canManage || watchBusy}
								onClick={async () => {
									if (!dir) return;
									try {
										setWatchBusy(true);
										await apiWatchStop(dir);
									} finally {
										setWatchBusy(false);
									}
								}}
							>
								Stop
							</Button>
							<div className="text-xs text-gray-600 ml-2">
								Keeps index up-to-date as files change.
							</div>
						</div>
					</section>

					<Separator />

					{/* Excludes */}
					<section>
						<Label className="text-base font-medium mb-2">
							Excluded Folders / Patterns
						</Label>
						<div className="bg-gray-50 dark:bg-gray-800 border rounded-lg p-4">
							<div className="text-xs text-gray-600 mb-3">
								Examples:{" "}
								<code className="bg-gray-100 px-1 rounded">
									**/Screenshots/**
								</code>
								, <code className="bg-gray-100 px-1 rounded">*.heic</code>,{" "}
								<code className="bg-gray-100 px-1 rounded">**/.trash/**</code>
							</div>
							<div className="flex items-center gap-2 mb-3">
								<Input
									type="text"
									value={exclInput}
									onChange={(e) => setExclInput(e.target.value)}
									placeholder="Add a glob pattern"
									className="flex-1"
								/>
								<Button
									variant="outline"
									size="sm"
									disabled={!exclInput.trim() || !canManage}
									onClick={() => {
										const p = exclInput.trim();
										if (!p) return;
										setExcludes((prev) =>
											prev.includes(p) ? prev : [...prev, p],
										);
										setExclInput("");
									}}
								>
									Add
								</Button>
								<Button
									variant="default"
									size="sm"
									disabled={!canManage}
									onClick={async () => {
										if (!dir) return;
										try {
											await apiSetExcludes(dir, excludes);
										} catch {}
									}}
								>
									Save
								</Button>
							</div>
							{excludes.length === 0 ? (
								<div className="text-sm text-gray-600">No excludes set.</div>
							) : (
								<div className="flex flex-wrap gap-2">
									{excludes.map((p, i) => (
										<Badge key={p} variant="secondary" className="text-xs">
											<code className="mr-1">{p}</code>
											<button
												type="button"
												className="text-gray-500 hover:text-red-600 ml-1"
												title="Remove"
												onClick={() =>
													setExcludes((prev) =>
														prev.filter((_x, idx) => idx !== i),
													)
												}
											>
												×
											</button>
										</Badge>
									))}
								</div>
							)}
						</div>
					</section>

					{/* Models */}
					<section className="mb-4">
						<div className="font-medium mb-2">Model Acceleration</div>
						<div className="bg-gray-50 dark:bg-gray-800 border rounded p-3 flex items-center justify-between">
							<div className="text-sm text-gray-700">
								{modelCaps ? (
									<>
										<span className="mr-2">
											Transformers: {modelCaps.transformers ? "✅" : "❌"}
										</span>
										<span className="mr-2">
											Torch: {modelCaps.torch ? "✅" : "❌"}
										</span>
										<span className="mr-2">
											CUDA: {modelCaps.cuda ? "✅" : "❌"}
										</span>
										<span>Metal (MPS): {modelCaps.mps ? "✅" : "❌"}</span>
									</>
								) : (
									"Checking…"
								)}
							</div>
							<Button
								variant="default"
								size="sm"
								disabled={modelBusy}
								onClick={async () => {
									try {
										setModelBusy(true);
										await apiModelsDownload("openai/clip-vit-base-patch32");
									} finally {
										setModelBusy(false);
									}
								}}
							>
								{modelBusy ? "Downloading…" : "Download CLIP Base"}
							</Button>
						</div>
					</section>

					<Separator />

					{/* Danger */}
					<section>
						<div className="font-medium mb-2">Danger Zone</div>
						<div className="bg-red-50 border border-red-200 rounded p-3 flex items-center gap-2">
							<Button
								variant="destructive"
								size="sm"
								disabled={!canManage || nukeBusy}
								onClick={async () => {
									if (!dir) return;
									const ok = window.confirm(
										"This will clear the local index for the current folder. Continue?",
									);
									if (!ok) return;
									try {
										setNukeBusy(true);
										await apiDataNuke(dir, false);
									} finally {
										setNukeBusy(false);
									}
								}}
							>
								{nukeBusy ? "Clearing…" : "Clear Current Folder Index"}
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={nukeBusy}
								onClick={async () => {
									const ok = window.confirm(
										"This attempts to clear all app data (if centralized). Are you absolutely sure?",
									);
									if (!ok) return;
									try {
										setNukeBusy(true);
										await apiDataNuke(undefined, true);
									} finally {
										setNukeBusy(false);
									}
								}}
							>
								Clear All App Data
							</Button>
						</div>
					</section>
				</div>
			</DialogContent>
		</Dialog>
	);
}
