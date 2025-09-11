import { useEffect, useState } from "react";
import { apiAnalytics } from "../api";
import { useDir } from "../stores/settingsStore";

export default function JobsDrawer({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const dir = useDir();
	const [events, setEvents] = useState<
		{ type: string; time: string; [k: string]: any }[]
	>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let t: any;
		async function load() {
			if (!dir) return;
			setLoading(true);
			try {
				const r = await apiAnalytics(dir, 200);
				setEvents(r.events || []);
			} catch {}
			setLoading(false);
			t = setTimeout(load, 3500);
		}
		if (open) load();
		return () => {
			if (t) clearTimeout(t);
		};
	}, [dir, open]);

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
			<div className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-3 overflow-auto">
				<div className="flex items-center justify-between mb-2">
					<div className="font-semibold">Jobs</div>
					<button
						type="button"
						className="px-2 py-1 border rounded"
						onClick={onClose}
					>
						Close
					</button>
				</div>
				{loading && <div className="text-sm text-gray-600">Loading…</div>}
				<div className="space-y-2">
					{events.map((e, i) => (
						<div
							key={`${e.id || e.path || e.name || e.key || ""}-${i}`}
							className="p-2 border rounded text-sm flex items-center justify-between"
						>
							<div>
								<span className="font-mono text-xs bg-gray-100 rounded px-1 py-0.5 mr-2">
									{e.type}
								</span>
								{e.type === "export" && (
									<span>
										{e.copied} copied, {e.skipped} skipped
										{e.errors ? `, ${e.errors} errors` : ""}
									</span>
								)}
								{e.type === "backup_run" && (
									<span>
										{e.copied} backed up, {e.skipped} skipped
									</span>
								)}
								{e.type === "backup_restore" && (
									<span>{e.restored} restored</span>
								)}
								{e.type === "captions_build" && (
									<span>{e.updated} captions</span>
								)}
								{e.type === "ocr_build" && <span>{e.updated} OCR</span>}
								{e.type === "fast_build" && (
									<span>
										{e.kind} index {e.ok ? "ok" : "failed"}
									</span>
								)}
								{e.type === "trips_build" && <span>{e.trips} trips</span>}
								{e.type === "thumbs_build" && <span>{e.made} thumbs</span>}
								{e.type === "metadata_build" && (
									<span>{e.updated} metadata</span>
								)}
								{e.type === "share_created" && (
									<span>link • {e.count} items</span>
								)}
								{e.type === "share_open" && <span>link opened</span>}
								{e.type === "search" && <span>“{e.query}”</span>}
							</div>
							<div className="text-gray-500">
								{new Date(e.time).toLocaleString()}
							</div>
						</div>
					))}
					{events.length === 0 && !loading && (
						<div className="text-sm text-gray-600">No recent jobs.</div>
					)}
				</div>
			</div>
		</div>
	);
}
