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
type SearchOptions = {
  provider?: string;
  topK?: number;
  useFast?: boolean;
  useCaptions?: boolean;
  useOcr?: boolean;
  favoritesOnly?: boolean;
  place?: string;
  tags?: string[];
  hasText?: boolean;
};
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
type PlacePoint = {
  path: string;
  lat: number;
  lon: number;
  place: string | null;
};
type PlaceLocation = {
  id: string;
  name: string;
  count: number;
  center: { lat: number; lon: number };
  bounds: {
    min_lat: number;
    min_lon: number;
    max_lat: number;
    max_lon: number;
  };
  approximate_radius_km: number;
  sample_points: PlacePoint[];
};
type PlacesMapResponse = {
  generated_at: string;
  directory: string;
  total_with_coordinates: number;
  total_without_coordinates: number;
  locations: PlaceLocation[];
  points: PlacePoint[];
};
type TagCount = {
  name: string;
  count: number;
  samplePaths: string[];
};
type TagsIndexResponse = {
  tagsByPath: Record<string, string[]>;
  tagCounts: TagCount[];
  allTags: string[];
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
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const payload: Record<string, unknown> = {
      dir,
      query,
      provider: options.provider ?? "local",
      top_k: Math.max(1, Math.min(options.topK ?? 50, 500)),
    };

    if (options.useFast) payload.use_fast = true;
    if (options.useCaptions) payload.use_captions = true;
    if (options.useOcr) payload.use_ocr = true;
    if (options.favoritesOnly) payload.favorites_only = true;
    if (options.place && options.place.trim()) {
      payload.place = options.place.trim();
    }
    if (Array.isArray(options.tags) && options.tags.length > 0) {
      payload.tags = options.tags.filter((tag) => tag && tag.trim().length > 0);
    }
    if (options.hasText) payload.has_text = true;

    const res = await fetch(`${API_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
        ? (raw.people_clusters as Record<string, unknown>[]).map((cluster) => ({
            id: cluster.id,
            name: typeof cluster.name === "string" ? cluster.name : "",
            size:
              typeof cluster.size === "number"
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

  async getTagsIndex(dir: string): Promise<TagsIndexResponse> {
    const res = await fetch(`${API_BASE}/tags?dir=${encodeURIComponent(dir)}`);
    if (!res.ok) throw new Error(`v1 tags failed: ${res.statusText}`);

    const raw = await res.json();
    const tagsByPath: Record<string, string[]> = {};

    if (raw && typeof raw === "object" && raw.tags) {
      const entries = raw.tags as Record<string, unknown>;
      for (const [path, value] of Object.entries(entries)) {
        if (typeof path !== "string") continue;
        if (!Array.isArray(value)) continue;
        const cleaned = value
          .map((tag) =>
            typeof tag === "string" ? tag.trim() : typeof tag === "number" ? String(tag) : ""
          )
          .filter((tag) => tag.length > 0);
        if (cleaned.length > 0) {
          tagsByPath[path] = cleaned;
        }
      }
    }

    const countMap = new Map<string, TagCount>();
    for (const [path, tags] of Object.entries(tagsByPath)) {
      for (const tag of tags) {
        const existing = countMap.get(tag);
        if (existing) {
          existing.count += 1;
          if (existing.samplePaths.length < 8) {
            existing.samplePaths.push(path);
          }
        } else {
          countMap.set(tag, {
            name: tag,
            count: 1,
            samplePaths: [path],
          });
        }
      }
    }

    const tagCounts = Array.from(countMap.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

    const allTags = Array.isArray(raw?.all)
      ? (raw.all as unknown[])
          .map((tag) =>
            typeof tag === "string" ? tag : typeof tag === "number" ? String(tag) : ""
          )
          .filter((tag) => tag.length > 0)
      : [];

    return { tagsByPath, tagCounts, allTags };
  }

  async getPlacesMap(dir: string): Promise<PlacesMapResponse> {
    const res = await fetch(
      `${API_BASE}/analytics/places?dir=${encodeURIComponent(dir)}&limit=8000&sample_per_location=24`
    );
    if (!res.ok) throw new Error(`v1 places analytics failed: ${res.statusText}`);

    const raw = await res.json();

    const toNumber = (value: unknown, fallback = 0): number => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
      return fallback;
    };

    const parsePoint = (value: unknown): PlacePoint | null => {
      if (!value || typeof value !== "object") {
        return null;
      }
      const point = value as Record<string, unknown>;
      const lat = toNumber(point.lat, NaN);
      const lon = toNumber(point.lon, NaN);
      const path = typeof point.path === "string" ? point.path : "";
      if (!path || Number.isNaN(lat) || Number.isNaN(lon)) {
        return null;
      }
      const placeValue =
        typeof point.place === "string" && point.place.trim().length > 0
          ? point.place
          : null;
      return { path, lat, lon, place: placeValue };
    };

    const points: PlacePoint[] = Array.isArray(raw?.points)
      ? (raw.points as unknown[])
          .map(parsePoint)
          .filter((pt): pt is PlacePoint => pt !== null)
      : [];

    const locations: PlaceLocation[] = Array.isArray(raw?.locations)
      ? (raw.locations as unknown[])
          .map((value) => {
            if (!value || typeof value !== "object") {
              return null;
            }
            const entry = value as Record<string, unknown>;
            const centerRecord = (entry.center ?? {}) as Record<string, unknown>;
            const centerLat = toNumber(centerRecord.lat, NaN);
            const centerLon = toNumber(centerRecord.lon, NaN);
            if (Number.isNaN(centerLat) || Number.isNaN(centerLon)) {
              return null;
            }

            const idValue = typeof entry.id === "string" ? entry.id : "";
            const nameValue =
              typeof entry.name === "string" && entry.name.trim().length > 0
                ? entry.name
                : idValue;
            const countValue = Math.max(0, Math.floor(toNumber(entry.count, 0)));

            const boundsRecord = (entry.bounds ?? {}) as Record<string, unknown>;
            const bounds = {
              min_lat: toNumber(boundsRecord.min_lat, centerLat),
              min_lon: toNumber(boundsRecord.min_lon, centerLon),
              max_lat: toNumber(boundsRecord.max_lat, centerLat),
              max_lon: toNumber(boundsRecord.max_lon, centerLon),
            };

            const approx = toNumber(entry.approximate_radius_km, 0);
            const samplePoints = Array.isArray(entry.sample_points)
              ? (entry.sample_points as unknown[])
                  .map(parsePoint)
                  .filter((pt): pt is PlacePoint => pt !== null)
              : [];

            return {
              id: idValue || `${centerLat.toFixed(3)},${centerLon.toFixed(3)}`,
              name: nameValue || `${centerLat.toFixed(3)}, ${centerLon.toFixed(3)}`,
              count: countValue,
              center: { lat: centerLat, lon: centerLon },
              bounds,
              approximate_radius_km: approx,
              sample_points: samplePoints,
            } as PlaceLocation;
          })
          .filter((loc): loc is PlaceLocation => loc !== null)
      : [];

    return {
      generated_at:
        typeof raw?.generated_at === "string"
          ? raw.generated_at
          : new Date().toISOString(),
      directory: typeof raw?.directory === "string" ? raw.directory : dir,
      total_with_coordinates: Math.max(
        0,
        Math.floor(toNumber(raw?.total_with_coordinates, 0))
      ),
      total_without_coordinates: Math.max(
        0,
        Math.floor(toNumber(raw?.total_without_coordinates, 0))
      ),
      locations,
      points,
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
