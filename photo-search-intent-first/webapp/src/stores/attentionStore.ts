import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { API_BASE } from "../api";

// Data shapes returned by backend endpoints
export interface PopularityItem {
	path: string;
	score: number;
	last: number;
	count: number;
}
export interface SeasonalItem {
	path: string;
	score: number;
	doy: number;
}
export interface ForgottenItem {
	path: string;
	score: number;
	last: number;
}
export interface ShuffleItem {
	path: string;
	score: number;
}
export interface DuplicateGroup {
	id: string;
	size: number;
	paths: string[];
	resolved: boolean;
}
export interface RelatedItem {
	path: string;
	score: number;
}

export interface AttentionState {
	dir: string;
	loading: boolean;
	error: string;
	popularity: PopularityItem[];
	forgotten: ForgottenItem[];
	seasonal: SeasonalItem[];
	shuffle: ShuffleItem[];
	dupes: DuplicateGroup[];
	related: RelatedItem[];
	relatedSource?: string;
	lastUpdated?: number;
}

export interface AttentionActions {
	setDir: (dir: string) => void;
	fetchPopularity: (limit?: number) => Promise<void>;
	fetchForgotten: (limit?: number, days?: number) => Promise<void>;
	fetchSeasonal: (limit?: number, window?: number) => Promise<void>;
	fetchShuffle: (limit?: number) => Promise<void>;
	fetchDupes: (rebuild?: boolean, maxDistance?: number) => Promise<void>;
	resolveDupeGroup: (id: string, resolved: boolean) => Promise<void>;
	fetchRelated: (
		path: string,
		provider: string,
		limit?: number,
	) => Promise<void>;
	clearError: () => void;
	refreshAll: () => Promise<void>;
}

async function jsonGet<T>(path: string): Promise<T> {
	const r = await fetch(path);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<T>;
}

async function jsonPost<T, B>(path: string, body: B): Promise<T> {
	const r = await fetch(path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<T>;
}

export const useAttentionStore = create<AttentionState & AttentionActions>()(
	subscribeWithSelector((set, get) => ({
		dir: "",
		loading: false,
		error: "",
		popularity: [],
		forgotten: [],
		seasonal: [],
		shuffle: [],
		dupes: [],
		related: [],

		setDir: (dir) => set({ dir }),
		clearError: () => set({ error: "" }),

		async fetchPopularity(limit = 24) {
			const { dir } = get();
			if (!dir) return;
			set({ loading: true, error: "" });
			try {
				const data = await jsonGet<{ items: PopularityItem[] }>(
					`${API_BASE}/attention/popularity?dir=${encodeURIComponent(
						dir,
					)}&limit=${limit}`,
				);
				set({ popularity: data.items, lastUpdated: Date.now() });
			} catch (e: unknown) {
				set({ error: e instanceof Error ? e.message : String(e) });
			} finally {
				set({ loading: false });
			}
		},
		async fetchForgotten(limit = 24, days = 7) {
			const { dir } = get();
			if (!dir) return;
			set({ loading: true, error: "" });
			try {
				const data = await jsonGet<{ items: ForgottenItem[] }>(
					`${API_BASE}/attention/forgotten?dir=${encodeURIComponent(
						dir,
					)}&limit=${limit}&days=${days}`,
				);
				set({ forgotten: data.items, lastUpdated: Date.now() });
			} catch (e: unknown) {
				set({ error: e instanceof Error ? e.message : String(e) });
			} finally {
				set({ loading: false });
			}
		},
		async fetchSeasonal(limit = 24, window = 30) {
			const { dir } = get();
			if (!dir) return;
			set({ loading: true, error: "" });
			try {
				const data = await jsonGet<{ items: SeasonalItem[] }>(
					`${API_BASE}/attention/seasonal?dir=${encodeURIComponent(
						dir,
					)}&limit=${limit}&window=${window}`,
				);
				set({ seasonal: data.items, lastUpdated: Date.now() });
			} catch (e: unknown) {
				set({ error: e instanceof Error ? e.message : String(e) });
			} finally {
				set({ loading: false });
			}
		},
		async fetchShuffle(limit = 24) {
			const { dir } = get();
			if (!dir) return;
			set({ loading: true, error: "" });
			try {
				const data = await jsonGet<{ items: ShuffleItem[] }>(
					`${API_BASE}/attention/shuffle?dir=${encodeURIComponent(
						dir,
					)}&limit=${limit}`,
				);
				set({ shuffle: data.items, lastUpdated: Date.now() });
			} catch (e: unknown) {
				set({ error: e instanceof Error ? e.message : String(e) });
			} finally {
				set({ loading: false });
			}
		},
		async fetchDupes(rebuild = false, maxDistance = 5) {
			const { dir } = get();
			if (!dir) return;
			set({ loading: true, error: "" });
			try {
				const data = await jsonGet<{ groups: DuplicateGroup[] }>(
					`${API_BASE}/attention/dupes?dir=${encodeURIComponent(dir)}&rebuild=${
						rebuild ? 1 : 0
					}&max_distance=${maxDistance}`,
				);
				set({ dupes: data.groups, lastUpdated: Date.now() });
			} catch (e: unknown) {
				set({ error: e instanceof Error ? e.message : String(e) });
			} finally {
				set({ loading: false });
			}
		},
		async resolveDupeGroup(id: string, resolved: boolean) {
			const { dir } = get();
			if (!dir) return;
			try {
				await jsonPost(
					`${API_BASE}/attention/dupes/${id}/resolve?dir=${encodeURIComponent(
						dir,
					)}&resolved=${resolved ? 1 : 0}`,
					{},
				);
				set({
					dupes: get().dupes.map((g) => (g.id === id ? { ...g, resolved } : g)),
				});
			} catch (e: unknown) {
				set({ error: e instanceof Error ? e.message : String(e) });
			}
		},
		async fetchRelated(path: string, provider: string, limit = 12) {
			const { dir } = get();
			if (!dir) return;
			set({ loading: true, error: "" });
			try {
				const data = await jsonGet<{ items: RelatedItem[] }>(
					`${API_BASE}/attention/related?dir=${encodeURIComponent(
						dir,
					)}&path=${encodeURIComponent(
						path,
					)}&provider=${provider}&limit=${limit}`,
				);
				set({
					related: data.items,
					relatedSource: path,
					lastUpdated: Date.now(),
				});
			} catch (e: unknown) {
				set({ error: e instanceof Error ? e.message : String(e) });
			} finally {
				set({ loading: false });
			}
		},
		async refreshAll() {
			await Promise.all([
				get().fetchPopularity(12),
				get().fetchForgotten(12, 7),
				get().fetchSeasonal(12, 30),
				get().fetchShuffle(12),
				get().fetchDupes(false, 5),
			]);
		},
	})),
);

export const useAttention = () => useAttentionStore((s) => s);
export const usePopularity = () => useAttentionStore((s) => s.popularity);
export const useForgotten = () => useAttentionStore((s) => s.forgotten);
export const useSeasonal = () => useAttentionStore((s) => s.seasonal);
export const useShuffle = () => useAttentionStore((s) => s.shuffle);
export const useDupes = () => useAttentionStore((s) => s.dupes);
export const useRelated = () =>
	useAttentionStore((s) => ({ items: s.related, source: s.relatedSource }));
