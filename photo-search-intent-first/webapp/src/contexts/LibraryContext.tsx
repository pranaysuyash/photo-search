import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { apiIndex, apiLibrary, apiIndexPause, apiIndexResume, apiIndexStatus } from "../api";
import { handleError } from "../utils/errors";
import {
	useDir,
	useEngine,
	useHfToken,
	useNeedsHf,
	useNeedsOAI,
	useOpenaiKey,
} from "../stores/settingsStore";
import {
	useLibHasMore,
	useLibrary,
	useSettingsActions,
} from "../stores/useStores";
import { useJobsContext } from "./JobsContext";
import { humanizeSeconds } from "../utils/time";

type LibraryState = {
	paths: string[];
	hasMore: boolean;
	isIndexing: boolean;
	progressPct?: number;
	etaSeconds?: number;
	paused?: boolean;
	tip?: string;
	indexStatus?: IndexStatusDetails;
};

type LibraryActions = {
	index: (opts?: { dir?: string; provider?: string }) => Promise<void>;
	load: (opts?: {
		dir?: string;
		provider?: string;
		limit?: number;
		offset?: number;
		append?: boolean;
	}) => Promise<void>;
	pause?: (dir?: string) => Promise<void>;
	resume?: (dir?: string) => Promise<void>;
};

export interface IndexStatusDetails {
	state?: string;
	start?: string;
	end?: string;
	processed?: { done: number; total: number };
	target?: number;
	existing?: number;
	indexed?: number;
	newCount?: number;
	updatedCount?: number;
	drift?: number;
	etaSeconds?: number;
	ratePerSecond?: number;
	coverage?: number;
	lastIndexedAt?: string;
}

const Ctx = createContext<{
	state: LibraryState;
	actions: LibraryActions;
} | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
	const lib = useLibrary() || [];
	const hasMore = !!useLibHasMore();
	const [isIndexing, setIsIndexing] = useState(false);
	const [progressPct, setProgressPct] = useState<number | undefined>(undefined);
	const [etaSeconds, setEtaSeconds] = useState<number | undefined>(undefined);
	const [paused, setPaused] = useState<boolean>(false);
	const [tip, setTip] = useState<string | undefined>(undefined);
	const [indexStatusDetails, setIndexStatusDetails] = useState<
		IndexStatusDetails | undefined
	>(undefined);
	const settings = useSettingsActions() as unknown;
	const dir = useDir();
	const engine = useEngine();
	const needsHf = useNeedsHf();
	const hfToken = useHfToken();
	const needsOAI = useNeedsOAI();
	const openaiKey = useOpenaiKey();
	const { actions: jobs } = useJobsContext();

	const buildIndexStatusDetails = useCallback(
		(
			raw: unknown,
			extra: { etaSeconds?: number; ratePerSecond?: number } = {},
		): IndexStatusDetails | undefined => {
			if (!raw || typeof raw !== "object") return undefined;
			const value = raw as Record<string, unknown>;
			const num = (v: unknown) => {
				if (typeof v === "number" && Number.isFinite(v)) return v;
				const parsed = Number(v);
				return Number.isFinite(parsed) ? parsed : undefined;
			};
			const str = (v: unknown) =>
				typeof v === "string" && v.length > 0 ? v : undefined;

			const insertDone = num(value.insert_done) ?? 0;
			const insertTotal = num(value.insert_total) ?? 0;
			const updatedDone = num(value.updated_done) ?? 0;
			const updatedTotal = num(value.updated_total) ?? 0;
			const processedDone = insertDone + updatedDone;
			const processedTotal = insertTotal + updatedTotal;
			const target = num(value.target);
			const indexed = num(value.total);
			const existing = num(value.existing);
			const drift =
				target !== undefined && indexed !== undefined
					? target - indexed
					: undefined;
			const coverage =
				target && target > 0 && indexed !== undefined
					? Math.min(1, Math.max(0, indexed / target))
					: undefined;
			const state = str(value.state);
			const start = str(value.start);
			const end = str(value.end);
			const lastIndexedAt = end ?? start;

			return {
				state,
				start,
				end,
				processed:
					processedTotal > 0
						? { done: processedDone, total: processedTotal }
						: undefined,
				target,
				indexed,
				existing,
				newCount: num(value.new),
				updatedCount: num(value.updated),
				drift,
				etaSeconds: extra.etaSeconds,
				ratePerSecond: extra.ratePerSecond,
				coverage,
				lastIndexedAt,
			};
		},
		[],
	);

	const composeIndexTip = useCallback(
		(
			details?: IndexStatusDetails,
			extra: { etaSeconds?: number; ratePerSecond?: number } = {},
		) => {
			if (!details) return undefined;
			const parts: string[] = [];
			if (details.processed && details.processed.total > 0) {
				parts.push(
					`processed ${details.processed.done}/${details.processed.total}`,
				);
			}
			if (details.indexed !== undefined && details.target !== undefined) {
				const coveragePct =
					details.coverage !== undefined
						? Math.round(details.coverage * 100)
						: undefined;
				const indexedLine = coveragePct !== undefined
					? `indexed ${details.indexed}/${details.target} (${coveragePct}%)`
					: `indexed ${details.indexed}/${details.target}`;
				parts.push(indexedLine);
			}
			if (typeof details.drift === "number") {
				const driftValue = Math.abs(details.drift);
				const label = details.drift >= 0 ? "remaining" : "over";
				parts.push(`${label} ${driftValue}`);
			}
			const etaValue = extra.etaSeconds ?? details.etaSeconds;
			if (etaValue && Number.isFinite(etaValue)) {
				parts.push(`eta ${humanizeSeconds(Math.round(etaValue))}`);
			}
			const rateValue = extra.ratePerSecond ?? details.ratePerSecond;
			if (rateValue && Number.isFinite(rateValue)) {
				const perMinute = rateValue * 60;
				const rateText = perMinute >= 10 ? perMinute.toFixed(0) : perMinute.toFixed(1);
				parts.push(`rate ${rateText}/min`);
			}
			return parts.length > 0 ? parts.join(" • ") : undefined;
		},
		[],
	);

	const index = useCallback(
		async (opts?: { dir?: string; provider?: string }) => {
			const d = opts?.dir || settings?.state?.dir;
			const provider = opts?.provider || settings?.state?.engine || "local";
			if (!d) return;
			const jobId = `index-${Date.now()}`;
			try {
				setIsIndexing(true);
				// Announce job start
				jobs.add({
					id: jobId,
					type: "index" as unknown,
					title: "Indexing Photos",
					description: `Analyzing photos in ${d}`,
					status: "running" as unknown,
					startTime: new Date(),
					canCancel: true,
					total: (lib || []).length || undefined,
				} as unknown);
				await apiIndex(d, provider);
				jobs.update(jobId, {
					status: "completed",
					endTime: new Date(),
				} as unknown);
            } catch (e) {
                const err = e instanceof Error ? e.message : "Index failed";
                jobs.update(jobId, {
                    status: "failed",
                    endTime: new Date(),
                    error: err,
                } as unknown);
                handleError(e, {
                    logToConsole: true,
                    logToServer: true,
                    context: { action: "index", component: "LibraryContext.index", dir: d },
                });
            } finally {
                setIsIndexing(false);
            }
		},
		[settings, jobs, lib],
	);

	const load = useCallback(
		async (opts?: {
			dir?: string;
			provider?: string;
			limit?: number;
			offset?: number;
			append?: boolean;
		}) => {
			const dir = opts?.dir || settings?.state?.dir;
			const provider = opts?.provider || settings?.state?.engine || "local";
			if (!dir) return;
			await apiLibrary(dir, provider, opts?.limit ?? 120, opts?.offset ?? 0);
		},
		[settings],
	);

	const pause = useCallback(
		async (d?: string) => {
			try {
				await apiIndexPause(d || settings?.state?.dir);
				setPaused(true);
				jobs.add({
					id: `idx-pause-${Date.now()}`,
					type: "index" as unknown,
					title: "Indexing paused",
					status: "completed" as unknown,
				} as unknown);
			} catch (e) {
				// bubble as note only; do not crash UI
				console.warn("Index pause failed", e);
			}
		},
		[settings, jobs],
	);

	const resume = useCallback(
		async (d?: string) => {
			try {
				await apiIndexResume(d || settings?.state?.dir);
				setPaused(false);
				jobs.add({
					id: `idx-resume-${Date.now()}`,
					type: "index" as unknown,
					title: "Indexing resumed",
					status: "completed" as unknown,
				} as unknown);
			} catch (e) {
				console.warn("Index resume failed", e);
			}
		},
		[settings, jobs],
	);

	// Poll index status to compute progress/ETA/paused/tip while indexing
	useEffect(() => {
		if (!dir) {
			setProgressPct(undefined);
			setEtaSeconds(undefined);
			setPaused(false);
			setTip(undefined);
			setIndexStatusDetails(undefined);
			return;
		}
		if (!isIndexing) {
			setProgressPct(undefined);
			setEtaSeconds(undefined);
			setPaused(false);
			setTip(undefined);
			return;
		}
		let timer: number | undefined;
		let startTs: number | undefined;
		const poll = async () => {
			try {
				const rawStatus = await apiIndexStatus(
					dir,
					engine,
					needsHf ? hfToken : undefined,
					needsOAI ? openaiKey : undefined,
				);
				const baseDetails = buildIndexStatusDetails(rawStatus);
				const processed = baseDetails?.processed;
				if (processed && processed.total > 0) {
					const pct = Math.min(
						1,
						Math.max(0, processed.done / processed.total),
					);
					setProgressPct(pct);
				} else {
					setProgressPct(undefined);
				}
				const pausedFlag =
					Boolean((rawStatus as Record<string, unknown>)?.paused) ||
					baseDetails?.state === "paused";
				setPaused(pausedFlag);

				if (!startTs) {
					const startVal = (rawStatus as Record<string, unknown>).start;
					if (typeof startVal === "string") startTs = Date.parse(startVal);
				}
				const elapsed =
					startTs !== undefined
						? Math.max(1, (Date.now() - startTs) / 1000)
						: undefined;
				let eta: number | undefined;
				let rate: number | undefined;
				if (elapsed && processed && processed.done > 5) {
					rate = processed.done / elapsed;
					const remaining = Math.max(0, processed.total - processed.done);
					eta = rate > 0 ? remaining / rate : undefined;
				}
				const etaValue = eta && Number.isFinite(eta) ? eta : undefined;
				setEtaSeconds(etaValue);
				const rateValue = rate && Number.isFinite(rate) ? rate : undefined;
				const extras = {
					etaSeconds: etaValue,
					ratePerSecond: rateValue,
				};
				const detailsWithExtras = buildIndexStatusDetails(rawStatus, extras);
				setIndexStatusDetails(detailsWithExtras);
				setTip(composeIndexTip(detailsWithExtras, extras));
			} catch {
				// ignore transient errors
			}
		};
		poll();
		timer = window.setInterval(poll, 1200) as unknown as number;
		return () => {
			if (timer) window.clearInterval(timer);
		};
	}, [
		isIndexing,
		dir,
		engine,
		needsHf,
		hfToken,
		needsOAI,
		openaiKey,
		buildIndexStatusDetails,
		composeIndexTip,
	]);

	useEffect(() => {
		if (!dir || isIndexing) {
			return;
		}
		let cancelled = false;
		const fetchStatus = async () => {
			try {
				const rawStatus = await apiIndexStatus(
					dir,
					engine,
					needsHf ? hfToken : undefined,
					needsOAI ? openaiKey : undefined,
				);
				if (cancelled) return;
				const details = buildIndexStatusDetails(rawStatus);
				setIndexStatusDetails(details);
				setTip(composeIndexTip(details));
			} catch {
				if (!cancelled) {
					setIndexStatusDetails(undefined);
					setTip(undefined);
				}
			}
		};
		fetchStatus();
		return () => {
			cancelled = true;
		};
	}, [
		dir,
		engine,
		needsHf,
		hfToken,
		needsOAI,
		openaiKey,
		isIndexing,
		buildIndexStatusDetails,
		composeIndexTip,
	]);

	const value = useMemo(
		() => ({
			state: {
				paths: lib,
				hasMore,
				isIndexing,
				progressPct,
				etaSeconds,
				paused,
				tip,
				indexStatus: indexStatusDetails,
			},
			actions: { index, load, pause, resume },
		}),
		[
			lib,
			hasMore,
			isIndexing,
			progressPct,
			etaSeconds,
			paused,
			tip,
			indexStatusDetails,
			index,
			load,
			pause,
			resume,
		],
	);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibraryContext() {
	const v = useContext(Ctx);
	if (!v)
		throw new Error("useLibraryContext must be used within LibraryProvider");
	return v;
}
