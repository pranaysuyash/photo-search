// v1 backend adapter: maps webapp-v3 ApiClient calls to v1 endpoints and normalizes shapes

declare global {
  interface ImportMetaEnv {
    VITE_API_BASE?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const API_BASE: string =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE
    ? String(import.meta.env.VITE_API_BASE)
    : "/api";

function isElectron(): boolean {
  return (
    typeof window !== "undefined" &&
    window.navigator.userAgent.includes("Electron")
  );
}

type LibraryResponse = {
  paths: string[];
  total: number;
  offset: number;
  limit: number;
};

type SearchResult = { path: string; score: number };
type SearchResponse = { results: SearchResult[]; total: number; query: string };
type AnalyticsResponse = {
  total_photos: number;
  total_indexed: number;
  index_size_mb: number;
  cameras: string[];
  places: (string | number)[];
  people_clusters: Array<{ id?: string | number; name: string; size?: number }>;
  tags: string[];
  favorites_total: number;
  events: unknown[];
};
type Collection = {
  name: string;
  photos: string[];
  created?: string;
  description?: string;
};
type FaceCluster = {
  id: string;
  name?: string;
  size: number;
  examples: [string, number][];
};
type Trip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  photos: string[];
  place?: string;
  start_ts?: number;
  end_ts?: number;
  paths: string[];
  count: number;
};

type FavoriteEntry = {
  path: string;
  mtime?: number;
  isFavorite: boolean;
};

type FavoritesResponse = {
  favorites: FavoriteEntry[];
};

type FavoriteToggleResponse = {
  ok: boolean;
  path: string;
  favorite: boolean;
  favorites?: string[];
};

function normalizeFavoriteEntries(raw: unknown): FavoriteEntry[] {
  const discovered: FavoriteEntry[] = [];

  if (raw && typeof raw === "object") {
    const maybeData = (raw as { data?: { paths?: unknown } }).data;
    if (maybeData && Array.isArray(maybeData.paths)) {
      for (const item of maybeData.paths) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        const pathValue = record.path;
        const favoriteValue =
          record.is_favorite ?? record.isFavorite ?? record.favorite;
        if (typeof pathValue !== "string") continue;
        if (!favoriteValue) continue;
        discovered.push({
          path: pathValue,
          isFavorite: true,
          mtime:
            typeof record.mtime === "number"
              ? (record.mtime as number)
              : undefined,
        });
      }
    }

    const favoritesList = (raw as { favorites?: unknown }).favorites;
    if (Array.isArray(favoritesList)) {
      for (const item of favoritesList) {
        if (typeof item !== "string") continue;
        discovered.push({ path: item, isFavorite: true });
      }
    }
  }

  const dedup = new Map<string, FavoriteEntry>();
  for (const entry of discovered) {
    const existing = dedup.get(entry.path);
    dedup.set(entry.path, {
      path: entry.path,
      isFavorite: true,
      mtime: entry.mtime ?? existing?.mtime,
    });
  }

  return Array.from(dedup.values()).sort((a, b) => {
    const left = typeof a.mtime === "number" ? a.mtime : 0;
    const right = typeof b.mtime === "number" ? b.mtime : 0;
    return right - left;
  });
}

export default class V1Adapter {
  async getLibrary(
    dir: string,
    provider = "local",
    limit = 100,
    offset = 0
  ): Promise<LibraryResponse> {
    const params = new URLSearchParams({
      dir,
      provider,
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`${API_BASE}/library?${params}`, { method: "GET" });
    if (!res.ok) throw new Error(`v1 getLibrary failed: ${res.statusText}`);
    const data = await res.json();
    // Normalize expected shape defensively
    return {
      paths: Array.isArray(data.paths) ? data.paths : [],
      total:
        typeof data.total === "number" ? data.total : data.paths?.length ?? 0,
      offset,
      limit,
    };
  }

  async search(
    dir: string,
    query: string,
    provider = "local",
    topK = 50,
    offset = 0
  ): Promise<SearchResponse> {
    const form = new FormData();
    form.append("dir", dir);
    form.append("query", query);
    form.append("provider", provider);
    form.append("top_k", String(topK));
    form.append("offset", String(offset));
    const res = await fetch(`${API_BASE}/search`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(`v1 search failed: ${res.statusText}`);
    const data = await res.json();
    // Normalize: ensure results array of {path, score}
    const rawResults = (data as { results?: unknown }).results;
    const results: SearchResult[] = Array.isArray(rawResults)
      ? (rawResults as Array<Record<string, unknown>>).map((r) => {
          const pathVal = r.path;
          const scoreVal = r.score;
          const path =
            typeof pathVal === "string" ? pathVal : String(pathVal ?? "");
          const score =
            typeof scoreVal === "number" ? scoreVal : Number(scoreVal ?? 0);
          return { path, score };
        })
      : [];
    return { results, total: Number(data.total ?? results.length), query };
  }

  async getAnalytics(dir: string): Promise<AnalyticsResponse> {
    const res = await fetch(
      `${API_BASE}/analytics?dir=${encodeURIComponent(dir)}`
    );
    if (!res.ok) throw new Error(`v1 analytics failed: ${res.statusText}`);
    const raw = await res.json();
    return {
      total_photos: Number.isFinite(raw?.total_photos)
        ? Number(raw.total_photos)
        : 0,
      total_indexed: Number.isFinite(raw?.total_indexed)
        ? Number(raw.total_indexed)
        : Number.isFinite(raw?.total_photos)
          ? Number(raw.total_photos)
          : 0,
      index_size_mb: Number.isFinite(raw?.index_size_mb)
        ? Number(raw.index_size_mb)
        : 0,
      cameras: Array.isArray(raw?.cameras)
        ? raw.cameras.filter((item: unknown) => typeof item === "string")
        : [],
      places: Array.isArray(raw?.places) ? raw.places : [],
      people_clusters: Array.isArray(raw?.people_clusters)
        ? raw.people_clusters.map((cluster: any) => ({
            id: cluster?.id,
            name: typeof cluster?.name === "string" ? cluster.name : "",
            size:
              typeof cluster?.size === "number"
                ? cluster.size
                : undefined,
          }))
        : [],
      tags: Array.isArray(raw?.tags)
        ? raw.tags.filter((item: unknown) => typeof item === "string")
        : [],
      favorites_total: Number.isFinite(raw?.favorites_total)
        ? Number(raw.favorites_total)
        : 0,
      events: Array.isArray(raw?.events) ? raw.events : [],
    };
  }

  async getWorkspaces(): Promise<{
    workspaces: Array<{ name: string; path: string }>;
  }> {
    const res = await fetch(`${API_BASE}/workspace`);
    if (!res.ok) throw new Error(`v1 workspace failed: ${res.statusText}`);
    return res.json();
  }

  getPhotoUrl(path: string): string {
    if (isElectron()) return `file://${path.startsWith("/") ? path : path}`;
    return `${API_BASE}/photo?path=${encodeURIComponent(path)}`;
  }

  getThumbnailUrl(path: string, size = 300): string {
    if (isElectron()) return `file://${path.startsWith("/") ? path : path}`;
    return `${API_BASE}/thumb?path=${encodeURIComponent(path)}&size=${size}`;
  }

  async getCollections(
    dir: string
  ): Promise<{ collections: Record<string, Collection> }> {
    const res = await fetch(
      `${API_BASE}/collections?dir=${encodeURIComponent(dir)}`
    );
    if (!res.ok) throw new Error(`v1 collections failed: ${res.statusText}`);
    return res.json();
  }

  async setCollection(
    dir: string,
    name: string,
    photos: string[]
  ): Promise<{ ok: boolean }> {
    const form = new FormData();
    form.append("dir", dir);
    form.append("name", name);
    form.append("photos", JSON.stringify(photos));
    const res = await fetch(`${API_BASE}/collections`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(`v1 setCollection failed: ${res.statusText}`);
    return res.json();
  }

  async deleteCollection(dir: string, name: string): Promise<{ ok: boolean }> {
    const form = new FormData();
    form.append("dir", dir);
    form.append("name", name);
    const res = await fetch(`${API_BASE}/collections/delete`, {
      method: "POST",
      body: form,
    });
    if (!res.ok)
      throw new Error(`v1 deleteCollection failed: ${res.statusText}`);
    return res.json();
  }

  async getFavorites(dir: string): Promise<FavoritesResponse> {
    const res = await fetch(
      `${API_BASE}/favorites?dir=${encodeURIComponent(dir)}`
    );
    if (!res.ok) throw new Error(`v1 favorites failed: ${res.statusText}`);
    const payload = await res.json();
    return { favorites: normalizeFavoriteEntries(payload) };
  }

  async setFavorite(
    dir: string,
    path: string,
    favorite: boolean
  ): Promise<FavoriteToggleResponse> {
    const res = await fetch(`${API_BASE}/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dir, path, favorite }),
    });
    if (!res.ok) throw new Error(`v1 setFavorite failed: ${res.statusText}`);
    const payload = await res.json();
    return {
      ok: typeof (payload as { ok?: unknown }).ok === "boolean"
        ? Boolean((payload as { ok: boolean }).ok)
        : true,
      path:
        typeof (payload as { path?: unknown }).path === "string"
          ? String((payload as { path: string }).path)
          : path,
      favorite:
        typeof (payload as { favorite?: unknown }).favorite === "boolean"
          ? Boolean((payload as { favorite: boolean }).favorite)
          : favorite,
      favorites: Array.isArray((payload as { favorites?: unknown }).favorites)
        ? (payload as { favorites: unknown[] }).favorites.map(String)
        : undefined,
    };
  }

  async buildFaces(
    dir: string,
    provider = "local"
  ): Promise<{ ok: boolean; clusters: FaceCluster[] }> {
    const form = new FormData();
    form.append("dir", dir);
    form.append("provider", provider);
    const res = await fetch(`${API_BASE}/faces/build`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(`v1 buildFaces failed: ${res.statusText}`);
    return res.json();
  }

  async getFaceClusters(dir: string): Promise<{ clusters: FaceCluster[] }> {
    const res = await fetch(
      `${API_BASE}/faces/clusters?dir=${encodeURIComponent(dir)}`
    );
    if (!res.ok)
      throw new Error(`v1 getFaceClusters failed: ${res.statusText}`);
    return res.json();
  }

  async nameFaceCluster(
    dir: string,
    clusterId: string,
    name: string
  ): Promise<{ ok: boolean }> {
    const form = new FormData();
    form.append("dir", dir);
    form.append("cluster_id", clusterId);
    form.append("name", name);
    const res = await fetch(`${API_BASE}/faces/name`, {
      method: "POST",
      body: form,
    });
    if (!res.ok)
      throw new Error(`v1 nameFaceCluster failed: ${res.statusText}`);
    return res.json();
  }

  async buildTrips(
    dir: string,
    provider = "local"
  ): Promise<{ ok: boolean; trips: Trip[] }> {
    const form = new FormData();
    form.append("dir", dir);
    form.append("provider", provider);
    const res = await fetch(`${API_BASE}/trips/build`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(`v1 buildTrips failed: ${res.statusText}`);
    return res.json();
  }

  async getTrips(dir: string): Promise<{ trips: Trip[] }> {
    const res = await fetch(`${API_BASE}/trips?dir=${encodeURIComponent(dir)}`);
    if (!res.ok) throw new Error(`v1 getTrips failed: ${res.statusText}`);
    return res.json();
  }

  async startIndex(
    dir: string,
    provider = "local"
  ): Promise<{ job_id?: string; total?: number }> {
    const res = await fetch(`${API_BASE}/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dir, provider, batch_size: 32 }),
    });
    if (!res.ok) throw new Error(`v1 startIndex failed: ${res.statusText}`);
    return res.json();
  }

  async getIndexStatus(dir: string): Promise<Record<string, unknown>> {
    const res = await fetch(
      `${API_BASE}/index/status?dir=${encodeURIComponent(dir)}`
    );
    if (!res.ok) throw new Error(`v1 getIndexStatus failed: ${res.statusText}`);
    return res.json();
  }
}
