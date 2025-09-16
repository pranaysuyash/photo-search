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

type LibraryState = {
	paths: string[];
	hasMore: boolean;
	isIndexing: boolean;
	progressPct?: number;
	etaSeconds?: number;
	paused?: boolean;
	tip?: string;
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
	const settings = useSettingsActions() as unknown;
	const dir = useDir();
	const engine = useEngine();
	const needsHf = useNeedsHf();
	const hfToken = useHfToken();
	const needsOAI = useNeedsOAI();
	const openaiKey = useOpenaiKey();
	const { actions: jobs } = useJobsContext();

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
		if (!isIndexing || !dir) {
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
				const s: unknown = await apiIndexStatus(
					dir,
					engine,
					needsHf ? hfToken : undefined,
					needsOAI ? openaiKey : undefined,
				);
				// Compute progress using insert/update totals when present
				const insDone = Number(s.insert_done || 0);
				const insTot = Number(s.insert_total || 0);
				const updDone = Number(s.updated_done || 0);
				const updTot = Number(s.updated_total || 0);
				const num = insDone + updDone;
				const den = Math.max(1, insTot + updTot);
				const pct = Math.min(1, Math.max(0, num / den));
				if (den > 1) setProgressPct(pct);
				setPaused(Boolean(s?.paused) || s.state === "paused");

				const parts: string[] = [];
				if (den > 1) parts.push(`processed ${num}/${den}`);
				if (typeof s.target === "number" && s.target > 0)
					parts.push(`target ${s.target}`);
				if (typeof s.state === "string" && s.state)
					parts.push(`state ${s.state}`);

				// ETA based on elapsed rate
				if (!startTs && s.start) startTs = Date.parse(s.start);
				const now = Date.now();
				const elapsed = startTs
					? Math.max(1, (now - startTs) / 1000)
					: undefined;
				if (elapsed && num > 5) {
					const rate = num / elapsed;
					const remaining = Math.max(0, den - num);
					const eta = rate > 0 ? remaining / rate : undefined;
					if (eta && Number.isFinite(eta)) setEtaSeconds(eta);
				}
				if (parts.length > 0) setTip(parts.join(" • "));
			} catch {
				// ignore transient errors
			}
		};
		poll();
		timer = window.setInterval(poll, 1200) as unknown as number;
		return () => {
			if (timer) window.clearInterval(timer);
		};
	}, [isIndexing, dir, engine, needsHf, hfToken, needsOAI, openaiKey]);

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
