import { useEffect, useState } from "react";
import { usePhotoVaultAPI } from "../services/PhotoVaultAPIProvider";

type Diagnostics = {
	folder: string;
	engines: {
		key: string;
		index_dir: string;
		count: number;
		fast?: { annoy: boolean; faiss: boolean; hnsw: boolean };
	}[];
	free_gb: number;
	os: string;
};

export default function DiagnosticsDrawer({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const api = usePhotoVaultAPI();
	const [diag, setDiag] = useState<Diagnostics | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>("");

	useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				setLoading(true);
				setError("");
				const d = await api.runDiagnostics();
				if (!cancelled) setDiag(d as Diagnostics);
			} catch (e) {
				if (!cancelled)
					setError(
						e instanceof Error ? e.message : "Failed to load diagnostics",
					);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		if (open) load();
		return () => {
			cancelled = true;
		};
	}, [api, open]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50">
			<div
				role="button"
				tabIndex={0}
				className="absolute inset-0 bg-black/30"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onClose;
					}
				}}
			/>
			<div className="absolute right-0 top-0 bottom-0 w-full sm:w-[460px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-4 overflow-auto">
				<div className="flex items-center justify-between mb-3">
					<div className="text-lg font-semibold">System Diagnostics</div>
					<button
						type="button"
						className="px-2 py-1 border rounded"
						onClick={onClose}
					>
						Close
					</button>
				</div>

				{loading && <div className="text-sm text-gray-600">Loading…</div>}
				{error && (
					<div className="mb-3 p-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
						{error}
					</div>
				)}

				{diag && (
					<div className="space-y-4">
						<div className="p-3 border rounded">
							<div className="font-semibold mb-1">Environment</div>
							<div className="text-sm text-gray-700 dark:text-gray-300">
								Folder: {diag.folder || "-"}
							</div>
							<div className="text-sm text-gray-700 dark:text-gray-300">
								OS: {diag.os || "-"}
							</div>
							<div className="text-sm text-gray-700 dark:text-gray-300">
								Free Space:{" "}
								{typeof diag.free_gb === "number"
									? `${diag.free_gb.toFixed(1)} GB`
									: "-"}
							</div>
						</div>

						<div className="p-3 border rounded">
							<div className="font-semibold mb-2">Engines</div>
							<div className="space-y-2">
								{(diag.engines || []).map((e, i) => (
									<div
										key={`${e.key}-${i}`}
										className="text-sm p-2 rounded border"
									>
										<div className="font-medium">{e.key || "engine"}</div>
										<div className="text-gray-600 dark:text-gray-400">
											Index dir: {e.index_dir}
										</div>
										<div>Indexed: {e.count}</div>
										{e.fast && (
											<div className="mt-1 text-gray-700 dark:text-gray-300">
												Fast Index:{" "}
												{[
													e.fast.annoy ? "Annoy" : null,
													e.fast.faiss ? "FAISS" : null,
													e.fast.hnsw ? "HNSW" : null,
												]
													.filter(Boolean)
													.join(", ") || "None"}
											</div>
										)}
									</div>
								))}
								{(!diag.engines || diag.engines.length === 0) && (
									<div className="text-sm text-gray-600">
										No engines reported.
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
