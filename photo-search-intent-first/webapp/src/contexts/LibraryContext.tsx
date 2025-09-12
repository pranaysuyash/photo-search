import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { apiIndex, apiLibrary } from "../api";
import { useDir, useEngine, useNeedsHf, useHfToken, useNeedsOAI, useOpenaiKey } from "../stores/settingsStore";
import { useEffect } from "react";
import {
	useLibHasMore,
	useLibrary,
	useSettingsActions,
} from "../stores/useStores";

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
    const settings = useSettingsActions() as any;
    const dir = useDir();
    const engine = useEngine();
    const needsHf = useNeedsHf();
    const hfToken = useHfToken();
    const needsOAI = useNeedsOAI();
    const openaiKey = useOpenaiKey();

    const index = useCallback(
        async (opts?: { dir?: string; provider?: string }) => {
            const dir = opts?.dir || settings?.state?.dir;
            const provider = opts?.provider || settings?.state?.engine || "local";
            if (!dir) return;
            try {
                setIsIndexing(true);
                await apiIndex(dir, provider);
            } finally {
                setIsIndexing(false);
            }
        },
        [settings],
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

    const pause = useCallback(async (d?: string) => {
        try {
            const { apiIndexPause } = await import("../api");
            await apiIndexPause(d || settings?.state?.dir);
        } catch {}
    }, [settings]);

  const resume = useCallback(async (d?: string) => {
        try {
            const { apiIndexResume } = await import("../api");
            await apiIndexResume(d || settings?.state?.dir);
        } catch {}
  }, [settings]);

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
        const { apiIndexStatus } = await import("../api");
        const s: any = await apiIndexStatus(
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
        if (typeof s.target === "number" && s.target > 0) parts.push(`target ${s.target}`);
        if (typeof s.state === "string" && s.state) parts.push(`state ${s.state}`);

        // ETA based on elapsed rate
        if (!startTs && s.start) startTs = Date.parse(s.start);
        const now = Date.now();
        const elapsed = startTs ? Math.max(1, (now - startTs) / 1000) : undefined;
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
          state: { paths: lib, hasMore, isIndexing, progressPct, etaSeconds, paused, tip },
          actions: { index, load, pause, resume },
      }),
      [lib, hasMore, isIndexing, progressPct, etaSeconds, paused, tip, index, load, pause, resume],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibraryContext() {
	const v = useContext(Ctx);
	if (!v)
		throw new Error("useLibraryContext must be used within LibraryProvider");
	return v;
}
