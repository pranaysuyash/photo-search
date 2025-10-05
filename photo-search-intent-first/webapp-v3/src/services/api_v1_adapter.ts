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
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE)
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
  people_clusters: Array<{ name?: string }>;
  tags: string[];
};
type Collection = { name: string; photos: string[]; created?: string; description?: string };
type FaceCluster = { id: string; name?: string; size: number; examples: [string, number][] };
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
      total: typeof data.total === "number" ? data.total : (data.paths?.length ?? 0),
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
    const res = await fetch(`${API_BASE}/search`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`v1 search failed: ${res.statusText}`);
    const data = await res.json();
    // Normalize: ensure results array of {path, score}
    const rawResults = (data as { results?: unknown }).results;
    const results: SearchResult[] = Array.isArray(rawResults)
      ? (rawResults as Array<Record<string, unknown>>).map((r) => {
          const pathVal = r.path;
          const scoreVal = r.score;
          const path = typeof pathVal === "string" ? pathVal : String(pathVal ?? "");
          const score = typeof scoreVal === "number" ? scoreVal : Number(scoreVal ?? 0);
          return { path, score };
        })
      : [];
    return { results, total: Number(data.total ?? results.length), query };
  }

  async getAnalytics(dir: string): Promise<AnalyticsResponse> {
    const res = await fetch(`${API_BASE}/analytics?dir=${encodeURIComponent(dir)}`);
    if (!res.ok) throw new Error(`v1 analytics failed: ${res.statusText}`);
    return res.json();
  }

  async getWorkspaces(): Promise<{ workspaces: Array<{ name: string; path: string }> }> {
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

  async getCollections(dir: string): Promise<{ collections: Record<string, Collection> }> {
    const res = await fetch(`${API_BASE}/collections?dir=${encodeURIComponent(dir)}`);
    if (!res.ok) throw new Error(`v1 collections failed: ${res.statusText}`);
    return res.json();
  }

  async setCollection(dir: string, name: string, photos: string[]): Promise<{ ok: boolean }> {
    const form = new FormData();
    form.append("dir", dir);
    form.append("name", name);
    form.append("photos", JSON.stringify(photos));
    const res = await fetch(`${API_BASE}/collections`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`v1 setCollection failed: ${res.statusText}`);
    return res.json();
  }

  async deleteCollection(dir: string, name: string): Promise<{ ok: boolean }> {
    const form = new FormData();
    form.append("dir", dir);
    form.append("name", name);
    const res = await fetch(`${API_BASE}/collections/delete`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`v1 deleteCollection failed: ${res.statusText}`);
    return res.json();
  }

  async buildFaces(dir: string, provider = "local"): Promise<{ ok: boolean; clusters: FaceCluster[] }> {
    const form = new FormData();
    form.append("dir", dir);
    form.append("provider", provider);
    const res = await fetch(`${API_BASE}/faces/build`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`v1 buildFaces failed: ${res.statusText}`);
    return res.json();
  }

  async getFaceClusters(dir: string): Promise<{ clusters: FaceCluster[] }> {
    const res = await fetch(`${API_BASE}/faces/clusters?dir=${encodeURIComponent(dir)}`);
    if (!res.ok) throw new Error(`v1 getFaceClusters failed: ${res.statusText}`);
    return res.json();
  }

  async nameFaceCluster(dir: string, clusterId: string, name: string): Promise<{ ok: boolean }> {
    const form = new FormData();
    form.append("dir", dir);
    form.append("cluster_id", clusterId);
    form.append("name", name);
    const res = await fetch(`${API_BASE}/faces/name`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`v1 nameFaceCluster failed: ${res.statusText}`);
    return res.json();
  }

  async buildTrips(dir: string, provider = "local"): Promise<{ ok: boolean; trips: Trip[] }> {
    const form = new FormData();
    form.append("dir", dir);
    form.append("provider", provider);
    const res = await fetch(`${API_BASE}/trips/build`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`v1 buildTrips failed: ${res.statusText}`);
    return res.json();
  }

  async getTrips(dir: string): Promise<{ trips: Trip[] }> {
    const res = await fetch(`${API_BASE}/trips?dir=${encodeURIComponent(dir)}`);
    if (!res.ok) throw new Error(`v1 getTrips failed: ${res.statusText}`);
    return res.json();
  }
}
