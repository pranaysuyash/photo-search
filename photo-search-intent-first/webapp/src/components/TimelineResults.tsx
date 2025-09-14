import { useEffect, useMemo, useRef, useState } from "react";
import { apiMetadataDetail, thumbUrl } from "../api";
import LazyImage from "./LazyImage";

type Item = { path: string; score?: number };

export default function TimelineResults({
	dir,
	engine,
	items,
	selected,
	onToggleSelect,
	onOpen,
	showInfoOverlay,
	bucket = "day",
}: {
	dir: string;
	engine: string;
	items: Item[];
	selected: Set<string>;
	onToggleSelect: (path: string) => void;
	onOpen: (path: string) => void;
	showInfoOverlay?: boolean;
	bucket?: "day" | "week" | "month";
}) {
	const [meta, setMeta] = useState<
		Record<
			string,
			{ mtime?: number; camera?: string; fnumber?: number; iso?: number }
		>
	>({});
	const [inflight, setInflight] = useState<Set<string>>(new Set());

	// Fetch metadata lazily for first N then progressively
	useEffect(() => {
		const need = items
			.slice(0, 200)
			.map((it) => it.path)
			.filter((p) => !meta[p] && !inflight.has(p))
			.slice(0, 32);
		if (need.length === 0) return;
		const next = new Set(inflight);
		need.forEach((p) => next.add(p));
		setInflight(next);
		let cancelled = false;
        Promise.all(
            need.map(async (p) => {
                try {
                    const r = await apiMetadataDetail(dir, p);
                    if (!cancelled && r && r.meta) {
                        setMeta((m) => ({
                            ...m,
                            [p]: {
                                mtime: typeof r.meta.mtime === 'number' ? r.meta.mtime : undefined,
                                camera: typeof r.meta.camera === 'string' ? r.meta.camera : undefined,
                                fnumber: typeof r.meta.fnumber === 'number' ? r.meta.fnumber : undefined,
                                iso: typeof r.meta.iso === 'number' ? r.meta.iso : undefined,
                            },
                        }));
                    }
                } catch {}
            }),
        ).finally(() => {
			if (!cancelled) {
				setInflight((s) => {
					const n = new Set(s);
					need.forEach((p) => n.delete(p));
					return n;
				});
			}
		});
		return () => {
			cancelled = true;
		};
	}, [items, dir, meta, inflight]);

	const grouped = useMemo(() => {
		const fmtDay = (ts?: number) => {
			if (!ts || !Number.isFinite(ts)) return "Unknown";
			const d = new Date(ts * 1000);
			return d.toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "2-digit",
			});
		};
		const fmtMonth = (ts?: number) => {
			if (!ts || !Number.isFinite(ts)) return "Unknown";
			const d = new Date(ts * 1000);
			return d.toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
			});
		};
		const fmtWeek = (ts?: number) => {
			if (!ts || !Number.isFinite(ts)) return "Unknown";
			const d = new Date(ts * 1000);
			// ISO week number
			const tmp = new Date(
				Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
			);
			const dayNum = tmp.getUTCDay() || 7;
			tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
			const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
			const weekNo = Math.ceil(
				((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
			);
			return `${tmp.getUTCFullYear()} • W${String(weekNo).padStart(2, "0")}`;
		};
		const keyFor = (ts?: number) =>
			bucket === "month"
				? fmtMonth(ts)
				: bucket === "week"
					? fmtWeek(ts)
					: fmtDay(ts);
		const arr = items.map((it) => ({ it, ts: meta[it.path]?.mtime }));
		arr.sort((a, b) => (b.ts || 0) - (a.ts || 0));
		const map: Record<string, Item[]> = {};
		for (const { it, ts } of arr) {
			const key = keyFor(ts);
			if (!map[key]) map[key] = [];
			map[key].push(it);
		}
		const order = Object.keys(map);
		// Keep Unknown at end
		order.sort((a, b) => (a === "Unknown" ? 1 : b === "Unknown" ? -1 : 0));
		return order.map((k) => ({ key: k, items: map[k] }));
	}, [items, meta, bucket]);

	// Month index for scrubber
	const monthKeys = useMemo(() => {
		const months = new Set<string>();
		if (bucket === "week") {
			for (const g of grouped) {
				const first = g.items[0]?.path;
				const ts = first ? meta[first]?.mtime : undefined;
				if (ts && Number.isFinite(ts)) {
					const d = new Date(ts * 1000);
					months.add(
						d.toLocaleDateString(undefined, {
							year: "numeric",
							month: "short",
						}),
					);
				}
			}
		} else {
			for (const g of grouped) {
				const parts = g.key.split(" ");
				if (parts.length >= 2) months.add(`${parts[0]} ${parts[1]}`);
			}
		}
		return Array.from(months);
	}, [grouped, bucket, meta]);
	const monthCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		if (bucket === "week") {
			for (const g of grouped) {
				const first = g.items[0]?.path;
				const ts = first ? meta[first]?.mtime : undefined;
				if (ts && Number.isFinite(ts)) {
					const d = new Date(ts * 1000);
					const mk = d.toLocaleDateString(undefined, {
						year: "numeric",
						month: "short",
					});
					counts[mk] = (counts[mk] || 0) + g.items.length;
				}
			}
		} else {
			for (const g of grouped) {
				const mk = g.key.split(" ").slice(0, 2).join(" ");
				counts[mk] = (counts[mk] || 0) + g.items.length;
			}
		}
		return counts;
	}, [grouped, bucket, meta]);
	const maxMonthCount = useMemo(() => {
		return (
			Object.values(monthCounts).reduce((m, v) => Math.max(m, v || 0), 0) || 1
		);
	}, [monthCounts]);

	const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
	const containerRef = useRef<HTMLDivElement>(null);
	const [activeMonth, setActiveMonth] = useState<string | null>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		try {
			if (typeof IntersectionObserver !== "undefined") {
				const io = new IntersectionObserver(
					(entries) => {
						for (const entry of entries) {
							if (entry.isIntersecting) {
								const label =
									(entry.target as HTMLElement).dataset.month || null;
								if (label) setActiveMonth(label);
							}
						}
					},
					{ root: el, threshold: 0.1 },
				);
				Object.values(sectionRefs.current).forEach(
					(sec) => sec && io.observe(sec),
				);
				return () => io.disconnect();
			}
		} catch {
			// Fallback below
		}
		// Fallback: update activeMonth on scroll if IO is unavailable
		const onScroll = () => {
			let bestLabel: string | null = null;
			let minTop = Infinity;
			for (const [label, node] of Object.entries(sectionRefs.current)) {
				if (!node) continue;
				const rect = node.getBoundingClientRect();
				if (rect.top >= 0 && rect.top < minTop) {
					minTop = rect.top;
					bestLabel = label.split(" ").slice(0, 2).join(" ");
				}
			}
			if (bestLabel) setActiveMonth(bestLabel);
		};
		el.addEventListener("scroll", onScroll);
		onScroll();
		return () => el.removeEventListener("scroll", onScroll);
	}, []);

	// Listen for global jump events dispatched by the app for keyboard shortcuts
    useEffect(() => {
        const onJump = (e: CustomEvent<{ kind?: string }>) => {
            try {
                const kind = e.detail?.kind as string;
                if (!kind) return;
				const now = Date.now() / 1000;
				if (kind === "today") {
					const key =
						bucket === "month"
							? new Date(now * 1000).toLocaleDateString(undefined, {
									year: "numeric",
									month: "short",
								})
							: bucket === "week"
								? (() => {
										const d = new Date(now * 1000);
										const tmp = new Date(
											Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
										);
										const dayNum = tmp.getUTCDay() || 7;
										tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
										const ys = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
										const wn = Math.ceil(
											((tmp.getTime() - ys.getTime()) / 86400000 + 1) / 7,
										);
										return `${tmp.getUTCFullYear()} • W${String(wn).padStart(2, "0")}`;
									})()
								: new Date(now * 1000).toLocaleDateString(undefined, {
										year: "numeric",
										month: "short",
										day: "2-digit",
									});
					const target = sectionRefs.current[key];
					target?.scrollIntoView({ behavior: "smooth", block: "start" });
				} else if (kind === "this-month") {
					const m = new Date(now * 1000).toLocaleDateString(undefined, {
						year: "numeric",
						month: "short",
					});
					const target = Object.values(sectionRefs.current).find(
						(sec) =>
							sec?.dataset.month && (sec.dataset.month as string).startsWith(m),
					);
					target?.scrollIntoView({ behavior: "smooth", block: "start" });
				} else if (kind === "last-month") {
					const d = new Date();
					const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
					const m = prev.toLocaleDateString(undefined, {
						year: "numeric",
						month: "short",
					});
					const target = Object.values(sectionRefs.current).find(
						(sec) =>
							sec?.dataset.month && (sec.dataset.month as string).startsWith(m),
					);
					target?.scrollIntoView({ behavior: "smooth", block: "start" });
				} else if (kind === "oldest") {
					const keys = Object.keys(sectionRefs.current);
					if (keys.length > 0) {
						const target = sectionRefs.current[keys[keys.length - 1]];
						target?.scrollIntoView({ behavior: "smooth", block: "start" });
					}
				}
			} catch {}
		};
        window.addEventListener("timeline-jump", onJump as unknown as EventListener);
        return () => window.removeEventListener("timeline-jump", onJump as unknown as EventListener);
    }, [bucket]);

	return (
		<div
			ref={containerRef}
			className="space-y-8 relative"
			style={{ scrollSnapType: "y proximity" }}
		>
			{/* Jump controls */}
			<button
				type="button"
				className="hidden md:flex items-center gap-1 fixed right-4 bottom-4 z-10 bg-blue-600 text-white px-3 py-1 rounded shadow"
				onClick={() => {
					// Build today's key based on bucket formatters
					const now = Date.now() / 1000;
					const key =
						bucket === "month"
							? new Date(now * 1000).toLocaleDateString(undefined, {
									year: "numeric",
									month: "short",
								})
							: bucket === "week"
								? (() => {
										const d = new Date(now * 1000);
										const tmp = new Date(
											Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
										);
										const dayNum = tmp.getUTCDay() || 7;
										tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
										const ys = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
										const wn = Math.ceil(
											((tmp.getTime() - ys.getTime()) / 86400000 + 1) / 7,
										);
										return `${tmp.getUTCFullYear()} • W${String(wn).padStart(2, "0")}`;
									})()
								: new Date(now * 1000).toLocaleDateString(undefined, {
										year: "numeric",
										month: "short",
										day: "2-digit",
									});
					const target = sectionRefs.current[key];
					if (target)
						target.scrollIntoView({ behavior: "smooth", block: "start" });
				}}
				aria-label="Jump to today"
			>
				Today
			</button>
			<button
				type="button"
				className="hidden md:flex items-center gap-1 fixed right-4 bottom-14 z-10 bg-gray-700 text-white px-3 py-1 rounded shadow"
				onClick={() => {
					// Jump to this month header
					const now = Date.now() / 1000;
					const m = new Date(now * 1000).toLocaleDateString(undefined, {
						year: "numeric",
						month: "short",
					});
					const target = Object.values(sectionRefs.current).find(
						(sec) =>
							sec?.dataset.month && (sec.dataset.month as string).startsWith(m),
					);
					target?.scrollIntoView({ behavior: "smooth", block: "start" });
				}}
				aria-label="Jump to this month"
			>
				This Month
			</button>
			<button
				type="button"
				className="hidden md:flex items-center gap-1 fixed right-4 bottom-20 z-10 bg-gray-700 text-white px-3 py-1 rounded shadow"
				onClick={() => {
					const now = new Date();
					const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
					const m = prev.toLocaleDateString(undefined, {
						year: "numeric",
						month: "short",
					});
					const target = Object.values(sectionRefs.current).find(
						(sec) =>
							sec?.dataset.month && (sec.dataset.month as string).startsWith(m),
					);
					target?.scrollIntoView({ behavior: "smooth", block: "start" });
				}}
				aria-label="Jump to last month"
			>
				Last Month
			</button>
			<button
				type="button"
				className="hidden md:flex items-center gap-1 fixed right-4 bottom-24 z-10 bg-gray-600 text-white px-3 py-1 rounded shadow"
				onClick={() => {
					// Jump to oldest section
					const keys = Object.keys(sectionRefs.current);
					if (keys.length > 0) {
						const target = sectionRefs.current[keys[keys.length - 1]];
						target?.scrollIntoView({ behavior: "smooth", block: "start" });
					}
				}}
				aria-label="Jump to oldest"
			>
				Oldest
			</button>
			{/* Mini scrubber */}
			{monthKeys.length > 1 && (
				<div className="hidden md:flex flex-col gap-1 fixed right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur p-2 rounded shadow max-h-[60vh] overflow-auto">
					{monthKeys.map((m) => (
						<button
							key={m}
							type="button"
							className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${activeMonth === m ? "bg-blue-600 text-white" : "text-blue-700 hover:bg-blue-100"}`}
							onClick={() => {
								const target = Object.values(sectionRefs.current).find(
									(sec) => sec?.dataset.month === m,
								);
								target?.scrollIntoView({ behavior: "smooth", block: "start" });
							}}
						>
							<span>{m}</span>
							<span className="opacity-70">({monthCounts[m] || 0})</span>
							<span
								className="inline-block h-1 bg-current opacity-50"
								style={{
									width: `${Math.max(6, Math.round(((monthCounts[m] || 0) / maxMonthCount) * 60))}px`,
								}}
							/>
						</button>
					))}
				</div>
			)}
			{grouped.map((g) => (
				<section
					key={g.key}
					aria-label={g.key}
					ref={(el) => {
						if (el) sectionRefs.current[g.key] = el;
					}}
					data-month={g.key.split(" ").slice(0, 2).join(" ")}
					style={{ scrollSnapAlign: "start" }}
				>
					<div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur px-2 py-1 border-b text-sm font-medium">
						{g.key} • {g.items.length}
					</div>
					<div className="mt-3 grid gap-2 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
						{g.items.map((it) => {
							const isSel = selected.has(it.path);
							const base = it.path.split("/").pop() || it.path;
							const m = meta[it.path];
							return (
								<div
									role="button"
									tabIndex={0}
									key={it.path}
									className={`relative group cursor-pointer rounded-lg overflow-hidden border ${isSel ? "ring-2 ring-blue-500" : "border-transparent"}`}
									onClick={() => onToggleSelect(it.path)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											onToggleSelect(it.path);
										}
									}}
									onDoubleClick={() => onOpen(it.path)}
									title={it.path}
								>
									<LazyImage
										src={thumbUrl(dir, engine, it.path, 256)}
										alt={base}
										className="w-full h-[160px] object-cover"
									/>
									{showInfoOverlay && (
										<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent text-white px-1.5 py-1 text-[10px] flex items-center justify-between">
											<span className="truncate mr-2" title={base}>
												{base}
											</span>
											<div className="flex items-center gap-1">
												{m?.camera && (
													<span className="bg-white/20 rounded px-1 whitespace-nowrap">
														{m.camera}
													</span>
												)}
												{typeof m?.fnumber === "number" && (
													<span className="bg-white/20 rounded px-1 whitespace-nowrap">
														f/{m.fnumber}
													</span>
												)}
												{typeof m?.iso === "number" && (
													<span className="bg-white/20 rounded px-1 whitespace-nowrap">
														ISO {m.iso}
													</span>
												)}
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</section>
			))}
		</div>
	);
}
