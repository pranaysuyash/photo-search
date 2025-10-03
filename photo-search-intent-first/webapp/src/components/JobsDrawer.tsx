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
		{ type: string; time: string; [k: string]: unknown }[]
	>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let t: ReturnType<typeof setTimeout> | null = null;
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
			<button
				type="button"
				className="absolute inset-0 bg-black/30 backdrop-blur-md supports-[backdrop-filter]:bg-black/25 supports-[backdrop-filter]:backdrop-blur-xl transition-all duration-300 ease-out"
				aria-label="Close jobs"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onClose();
					}
				}}
				style={{ all: "unset" }}
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
					{events.map((e) => {
						const ev = e as Record<string, unknown>;
						const num = (v: unknown) =>
							typeof v === "number" ? v : Number(v ?? 0);
						return (
							<div
								key={`event-${e.type}-${e.time}`}
								className="p-2 border rounded text-sm flex items-center justify-between"
							>
								<div>
									<span className="font-mono text-xs bg-gray-100 rounded px-1 py-0.5 mr-2">
										{e.type}
									</span>
									{e.type === "export" && (
										<span>
											{num(ev.copied)} copied, {num(ev.skipped)} skipped
											{num(ev.errors) ? `, ${num(ev.errors)} errors` : ""}
										</span>
									)}
									{e.type === "backup_run" && (
										<span>
											{num(ev.copied)} backed up, {num(ev.skipped)} skipped
										</span>
									)}
									{e.type === "backup_restore" && (
										<span>{num(ev.restored)} restored</span>
									)}
									{e.type === "captions_build" && (
										<span>{num(ev.updated)} captions</span>
									)}
									{e.type === "ocr_build" && <span>{num(ev.updated)} OCR</span>}
									{e.type === "fast_build" && (
										<span>
											{String(ev.kind ?? "")} index {ev.ok ? "ok" : "failed"}
										</span>
									)}
									{e.type === "trips_build" && (
										<span>{num(ev.trips)} trips</span>
									)}
									{e.type === "thumbs_build" && (
										<span>{num(ev.made)} thumbs</span>
									)}
									{e.type === "metadata_build" && (
										<span>{num(ev.updated)} metadata</span>
									)}
									{e.type === "share_created" && (
										<span>link • {num(ev.count)} items</span>
									)}
									{e.type === "share_open" && <span>link opened</span>}
									{e.type === "search" && (
										<span>“{String(ev.query ?? "")}”</span>
									)}
								</div>
								<div className="text-gray-500">
									{new Date(e.time).toLocaleString()}
								</div>
							</div>
						);
					})}
					{events.length === 0 && !loading && (
						<div className="text-sm text-gray-600">No recent jobs.</div>
					)}
				</div>
			</div>
		</div>
	);
}
