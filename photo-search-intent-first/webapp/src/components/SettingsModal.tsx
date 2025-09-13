import { useEffect, useMemo, useState } from "react";
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
import { FocusTrap } from "../utils";

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
	const canManage = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useMemo(() => !!dir, [dir]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
	useEffect(() => {
		if (!isOpen) return;
		let cancelled = false;
		(async () => {
			try {
				const ws = await apiWatchStatus();
				if (!cancelled) setWatchAvail(!!ws.available);
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

	if (!isOpen) return null;
	return (
		<div
			role="dialog"
			className="fixed inset-0 z-[1200] bg-black/40 flex items-center justify-center"
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			tabIndex={-1}
		>
			<FocusTrap onEscape={onClose}>
				<div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl p-4">
					<div className="flex items-center justify-between mb-3">
						<div className="font-semibold text-lg">Settings</div>
						<button
							type="button"
							className="px-2 py-1 border rounded"
							onClick={onClose}
						>
							Close
						</button>
					</div>

					{/* Watcher */}
					<section className="mb-4">
						<div className="flex items-center justify-between mb-2">
							<div className="font-medium">File Watcher</div>
							<div className="text-sm text-gray-600">
								{watchAvail === null
									? "checking…"
									: watchAvail
										? "available"
										: "unavailable"}
							</div>
						</div>
						<div className="bg-gray-50 dark:bg-gray-800 border rounded p-3 flex items-center gap-2">
							<button
								type="button"
								className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
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
							</button>
							<button
								type="button"
								className="px-3 py-1 rounded bg-gray-200 text-sm disabled:opacity-50"
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
							</button>
							<div className="text-xs text-gray-600 ml-2">
								Keeps index up-to-date as files change.
							</div>
						</div>
					</section>

					{/* Excludes */}
					<section className="mb-4">
						<div className="font-medium mb-2">Excluded Folders / Patterns</div>
						<div className="bg-gray-50 dark:bg-gray-800 border rounded p-3">
							<div className="text-xs text-gray-600 mb-2">
								Examples: <code>**/Screenshots/**</code>, <code>*.heic</code>,{" "}
								<code>**/.trash/**</code>
							</div>
							<div className="flex items-center gap-2 mb-2">
								<input
									type="text"
									value={exclInput}
									onChange={(e) => setExclInput(e.target.value)}
									placeholder="Add a glob pattern"
									className="flex-1 border rounded px-2 py-1 text-sm"
								/>
								<button
									type="button"
									className="px-3 py-1 rounded bg-gray-200 text-sm disabled:opacity-50"
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
								</button>
								<button
									type="button"
									className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
									disabled={!canManage}
									onClick={async () => {
										if (!dir) return;
										try {
											await apiSetExcludes(dir, excludes);
										} catch {}
									}}
								>
									Save
								</button>
							</div>
							{excludes.length === 0 ? (
								<div className="text-sm text-gray-600">No excludes set.</div>
							) : (
								<div className="flex flex-wrap gap-2">
									{excludes.map((p, i) => (
										<span
											key={p}
											className="inline-flex items-center gap-1 text-xs bg-white dark:bg-gray-900 border rounded px-2 py-1"
										>
											<code>{p}</code>
											<button
												type="button"
												className="text-gray-500 hover:text-red-600"
												title="Remove"
												onClick={() =>
													setExcludes((prev) =>
														prev.filter((_x, idx) => idx !== i),
													)
												}
											>
												×
											</button>
										</span>
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
							<button
								type="button"
								className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
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
							</button>
						</div>
					</section>

					{/* Danger */}
					<section>
						<div className="font-medium mb-2">Danger Zone</div>
						<div className="bg-red-50 border border-red-200 rounded p-3 flex items-center gap-2">
							<button
								type="button"
								className="px-3 py-1 rounded bg-red-600 text-white text-sm disabled:opacity-50"
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
							</button>
							<button
								type="button"
								className="px-3 py-1 rounded bg-white text-red-700 border border-red-300 text-sm disabled:opacity-50"
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
							</button>
						</div>
					</section>
				</div>
			</FocusTrap>
		</div>
	);
}
