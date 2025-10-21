// API client facade for photo search backend
// Selects between native/refactor API and v1-backend adapter via env flag.

// Vite augmentations (lightweight) for env typing
declare global {
  interface ImportMetaEnv {
    VITE_API_BASE?: string;
    VITE_API_MODE?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const hasImportMeta =
  typeof import.meta !== "undefined" && !!(import.meta as unknown);
const API_BASE: string =
  hasImportMeta && import.meta.env && import.meta.env.VITE_API_BASE
    ? String(import.meta.env.VITE_API_BASE)
    : "/api";
const API_MODE: string =
  hasImportMeta && import.meta.env && import.meta.env.VITE_API_MODE
    ? String(import.meta.env.VITE_API_MODE)
    : "v1"; // default to v1

type ElectronPhotoRecord =
  | string
  | {
      path?: string;
      name?: string;
      relativePath?: string;
      size?: number;
      mtime?: number;
      ctime?: number;
      extension?: string;
    };

const MAX_DIRECT_RESULTS = 5000;

function getSecureElectronAPI():
  | (Window & {
      secureElectronAPI?: {
        readDirectoryPhotos?: (
          directoryPath:
            | string
            | { directory: string; limit?: number; offset?: number }
        ) => Promise<ElectronPhotoRecord[] | { paths?: string[] }>;
        setAllowedRoot?: (path: string) => Promise<boolean>;
      };
    })
  | undefined {
  if (typeof window === "undefined") return undefined;
  return window as typeof window & {
    secureElectronAPI?: {
      readDirectoryPhotos?: (
        directoryPath:
          | string
          | { directory: string; limit?: number; offset?: number }
      ) => Promise<ElectronPhotoRecord[] | { paths?: string[] }>;
      setAllowedRoot?: (path: string) => Promise<boolean>;
    };
  };
}

async function tryDirectLibraryRead(
  dir: string,
  limit = 100,
  offset = 0
): Promise<LibraryResponse | null> {
  const platform = getSecureElectronAPI();
  const secureApi = platform?.secureElectronAPI;
  if (!secureApi?.readDirectoryPhotos) {
    return null;
  }

  try {
    // Grant renderer access to the selected directory before reading
    await secureApi.setAllowedRoot?.(dir);

    const raw = await secureApi.readDirectoryPhotos({
      directory: dir,
      limit: Math.max(1, Math.min(limit, MAX_DIRECT_RESULTS)),
      offset: Math.max(0, offset),
    });

    const toArray = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { paths?: string[] }).paths)
      ? ((raw as { paths?: string[] }).paths as ElectronPhotoRecord[])
      : [];

    const normalizedPaths = toArray
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object" && entry.path) {
          return entry.path;
        }
        return null;
      })
      .filter((value): value is string => typeof value === "string");

    if (!normalizedPaths.length) {
      return { paths: [], total: 0, offset, limit };
    }

    const boundedOffset = Math.max(0, offset);
    const boundedLimit = Math.max(1, limit);
    const sliced = normalizedPaths.slice(
      boundedOffset,
      boundedOffset + boundedLimit
    );

    return {
      paths: sliced,
      total: normalizedPaths.length,
      offset: boundedOffset,
      limit: boundedLimit,
    };
  } catch (error) {
    console.warn("Direct library load failed, falling back to API:", error);
    return null;
  }
}

// Utility function to detect Electron environment
function isElectron(): boolean {
  return (
    typeof window !== "undefined" &&
    window.navigator.userAgent.includes("Electron")
  );
}

export interface LibraryResponse {
  paths: string[];
  total: number;
  offset: number;
  limit: number;
}

export interface SearchResult {
  path: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

export interface SearchOptions {
  provider?: string;
  topK?: number;
  useFast?: boolean;
  useCaptions?: boolean;
  useOcr?: boolean;
  favoritesOnly?: boolean;
  place?: string;
  tags?: string[];
  hasText?: boolean;
}

export interface AnalyticsResponse {
  total_photos: number;
  total_indexed: number;
  index_size_mb: number;
  cameras: string[];
  places: (string | number)[];
  people_clusters: Array<{ id?: string | number; name: string; size?: number }>;
  tags: string[];
  favorites_total: number;
  events: unknown[];
}

export interface PlacePoint {
  path: string;
  lat: number;
  lon: number;
  place: string | null;
}

export interface PlaceLocation {
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
}

export interface PlacesMapResponse {
  generated_at: string;
  directory: string;
  total_with_coordinates: number;
  total_without_coordinates: number;
  locations: PlaceLocation[];
  points: PlacePoint[];
}

export interface TagCount {
  name: string;
  count: number;
  samplePaths: string[];
}

export interface TagsIndexResponse {
  tagsByPath: Record<string, string[]>;
  tagCounts: TagCount[];
  allTags: string[];
}

export interface Collection {
  name: string;
  photos: string[];
  created?: string;
  description?: string;
}

export interface FaceCluster {
  id: string;
  name?: string;
  size: number;
  examples: [string, number][];
}

export interface Trip {
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
}

export interface FavoriteEntry {
  path: string;
  mtime?: number;
  isFavorite: boolean;
}

export interface FavoritesResponse {
  favorites: FavoriteEntry[];
}

export interface FavoriteToggleResponse {
  ok: boolean;
  path: string;
  favorite: boolean;
  favorites?: string[];
}

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
        const entry: FavoriteEntry = {
          path: pathValue,
          isFavorite: true,
          mtime:
            typeof record.mtime === "number"
              ? (record.mtime as number)
              : undefined,
        };
        discovered.push(entry);
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

// Minimal index status shape we rely on in UI
interface IndexStatus {
  state?: string;
  total?: number;
  indexed?: number;
  coverage?: number;
  drift?: number;
  paused?: boolean;
}

// Export types
export interface ExportDataItem {
  path: string;
  score?: number;
  query?: string;
  size?: number;
  modified?: number;
  width?: number;
  height?: number;
  favorite?: boolean;
  collection?: string;
}

export interface ExportResponse {
  ok: boolean;
  data: ExportDataItem[] | string;
  format: string;
  count: number;
}

// Minimal contract for clients
interface ApiClientLike {
  getLibrary(
    dir: string,
    provider?: string,
    limit?: number,
    offset?: number
  ): Promise<LibraryResponse>;
  search(
    dir: string,
    query: string,
    options?: SearchOptions
  ): Promise<SearchResponse>;
  getAnalytics(dir: string): Promise<AnalyticsResponse>;
  getPlacesMap(dir: string): Promise<PlacesMapResponse>;
  getTagsIndex(dir: string): Promise<TagsIndexResponse>;
  getWorkspaces(): Promise<{
    workspaces: Array<{ name: string; path: string }>;
  }>;
  getPhotoUrl(path: string): string;
  getThumbnailUrl(path: string, size?: number): string;
  getCollections(
    dir: string
  ): Promise<{ collections: Record<string, Collection> }>;
  setCollection(
    dir: string,
    name: string,
    photos: string[]
  ): Promise<{ ok: boolean }>;
  deleteCollection(dir: string, name: string): Promise<{ ok: boolean }>;
  getFavorites(dir: string): Promise<FavoritesResponse>;
  setFavorite(
    dir: string,
    path: string,
    favorite: boolean
  ): Promise<FavoriteToggleResponse>;
  buildFaces(
    dir: string,
    provider?: string
  ): Promise<{ ok: boolean; clusters: FaceCluster[] }>;
  getFaceClusters(dir: string): Promise<{ clusters: FaceCluster[] }>;
  nameFaceCluster(
    dir: string,
    clusterId: string,
    name: string
  ): Promise<{ ok: boolean }>;
  buildTrips(
    dir: string,
    provider?: string
  ): Promise<{ ok: boolean; trips: Trip[] }>;
  getTrips(dir: string): Promise<{ trips: Trip[] }>;
  // Indexing
  startIndex(
    dir: string,
    provider?: string
  ): Promise<{ job_id?: string; total?: number }>;
  getIndexStatus(dir: string): Promise<IndexStatus>;
  // Export functions
  exportCollection(
    dir: string,
    collection: string,
    format?: "json" | "csv"
  ): Promise<ExportResponse>;
  exportSearch(
    dir: string,
    query: string,
    format?: "json" | "csv",
    options?: { include_metadata?: boolean }
  ): Promise<ExportResponse>;
  exportLibrary(
    dir: string,
    format?: "json" | "csv",
    options?: { include_metadata?: boolean; filter?: string }
  ): Promise<ExportResponse>;
  exportFavorites(
    dir: string,
    format?: "json" | "csv"
  ): Promise<ExportResponse>;
  importPhotos(
    sourceDir: string,
    destDir: string,
    options?: { recursive?: boolean; copy?: boolean }
  ): Promise<{
    ok: boolean;
    imported: number;
    skipped: number;
    errors: number;
    source: string;
    destination: string;
  }>;
}

class NativeApiClient implements ApiClientLike {
  async getLibrary(
    dir: string,
    provider = "local",
    limit = 100,
    offset = 0
  ): Promise<LibraryResponse> {
    const direct = await tryDirectLibraryRead(dir, limit, offset);
    if (direct) {
      return direct;
    }

    // Fix: Backend expects GET request with query parameters, not POST with FormData
    const params = new URLSearchParams({
      dir,
      provider,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${API_BASE}/library?${params}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Library API failed: ${response.statusText}`);
    }

    return response.json();
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
    const trimmedPlace = options.place?.trim();
    if (trimmedPlace) {
      payload.place = trimmedPlace;
    }
    if (Array.isArray(options.tags) && options.tags.length > 0) {
      payload.tags = options.tags.filter((tag) => tag && tag.trim().length > 0);
    }
    if (options.hasText) {
      payload.has_text = true;
    }

    const response = await fetch(`${API_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Search API failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getAnalytics(dir: string): Promise<AnalyticsResponse> {
    const response = await fetch(
      `${API_BASE}/analytics?dir=${encodeURIComponent(dir)}`
    );

    if (!response.ok) {
      throw new Error(`Analytics API failed: ${response.statusText}`);
    }

    const raw = await response.json();
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
            id:
              typeof cluster.id === "string" || typeof cluster.id === "number"
                ? cluster.id
                : undefined,
            name: typeof cluster.name === "string" ? cluster.name : "",
            size: typeof cluster.size === "number" ? cluster.size : undefined,
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

  async getPlacesMap(dir: string): Promise<PlacesMapResponse> {
    const response = await fetch(
      `${API_BASE}/analytics/places?dir=${encodeURIComponent(
        dir
      )}&limit=8000&sample_per_location=24`
    );

    if (!response.ok) {
      throw new Error(`Places analytics API failed: ${response.statusText}`);
    }

    const raw = await response.json();

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
            const centerRecord = (entry.center ?? {}) as Record<
              string,
              unknown
            >;
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
            const countValue = Math.max(
              0,
              Math.floor(toNumber(entry.count, 0))
            );

            const boundsRecord = (entry.bounds ?? {}) as Record<
              string,
              unknown
            >;
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
              name:
                nameValue || `${centerLat.toFixed(3)}, ${centerLon.toFixed(3)}`,
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

  async getTagsIndex(dir: string): Promise<TagsIndexResponse> {
    const response = await fetch(
      `${API_BASE}/tags?dir=${encodeURIComponent(dir)}`
    );

    if (!response.ok) {
      throw new Error(`Tags API failed: ${response.statusText}`);
    }

    const raw = await response.json();
    const tagsByPath: Record<string, string[]> = {};

    if (raw && typeof raw === "object" && raw.tags) {
      const tagEntries = raw.tags as Record<string, unknown>;
      for (const [path, value] of Object.entries(tagEntries)) {
        if (typeof path !== "string") continue;
        if (!Array.isArray(value)) continue;
        const cleaned = value
          .map((tag) =>
            typeof tag === "string"
              ? tag.trim()
              : typeof tag === "number"
              ? String(tag)
              : ""
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
            typeof tag === "string"
              ? tag
              : typeof tag === "number"
              ? String(tag)
              : ""
          )
          .filter((tag) => tag.length > 0)
      : [];

    return { tagsByPath, tagCounts, allTags };
  }

  async getWorkspaces(): Promise<{
    workspaces: Array<{ name: string; path: string }>;
  }> {
    const response = await fetch(`${API_BASE}/workspace`);

    if (!response.ok) {
      throw new Error(`Workspace API failed: ${response.statusText}`);
    }

    return response.json();
  }

  getPhotoUrl(path: string): string {
    // In Electron, use direct file access for offline capability
    if (isElectron()) {
      // Convert path to absolute file:// URL for direct file access
      const absolutePath = path.startsWith("/") ? path : path;
      return `file://${absolutePath}`;
    }

    // For web app, photos would need to be served differently
    // This endpoint may not exist - photos should be accessed directly
    return `${API_BASE}/photo?path=${encodeURIComponent(path)}`;
  }

  getThumbnailUrl(path: string, size = 300): string {
    // In Electron, use direct file access for offline capability
    if (isElectron()) {
      // For thumbnails, we might want to use the backend even in Electron
      // to generate thumbnails, but fallback to direct access if needed
      const absolutePath = path.startsWith("/") ? path : path;
      return `file://${absolutePath}`;
    }

    // For web app, use HTTP API
    return `${API_BASE}/thumb?path=${encodeURIComponent(path)}&size=${size}`;
  }

  // Collections API
  async getCollections(
    dir: string
  ): Promise<{ collections: Record<string, Collection> }> {
    const response = await fetch(
      `${API_BASE}/collections?dir=${encodeURIComponent(dir)}`
    );
    if (!response.ok) {
      throw new Error(`Collections API failed: ${response.statusText}`);
    }
    return response.json();
  }

  async setCollection(
    dir: string,
    name: string,
    photos: string[]
  ): Promise<{ ok: boolean }> {
    const formData = new FormData();
    formData.append("dir", dir);
    formData.append("name", name);
    formData.append("photos", JSON.stringify(photos));

    const response = await fetch(`${API_BASE}/collections`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Set collection failed: ${response.statusText}`);
    }
    return response.json();
  }

  async deleteCollection(dir: string, name: string): Promise<{ ok: boolean }> {
    const formData = new FormData();
    formData.append("dir", dir);
    formData.append("name", name);

    const response = await fetch(`${API_BASE}/collections/delete`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Delete collection failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getFavorites(dir: string): Promise<FavoritesResponse> {
    const response = await fetch(
      `${API_BASE}/favorites?dir=${encodeURIComponent(dir)}`
    );

    if (!response.ok) {
      throw new Error(`Favorites API failed: ${response.statusText}`);
    }

    const payload = await response.json();
    return { favorites: normalizeFavoriteEntries(payload) };
  }

  async setFavorite(
    dir: string,
    path: string,
    favorite: boolean
  ): Promise<FavoriteToggleResponse> {
    const response = await fetch(`${API_BASE}/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dir, path, favorite }),
    });

    if (!response.ok) {
      throw new Error(`Set favorite failed: ${response.statusText}`);
    }

    const payload = await response.json();
    return {
      ok:
        typeof (payload as { ok?: unknown }).ok === "boolean"
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

  // Faces API
  async buildFaces(
    dir: string,
    provider = "local"
  ): Promise<{ ok: boolean; clusters: FaceCluster[] }> {
    const formData = new FormData();
    formData.append("dir", dir);
    formData.append("provider", provider);

    const response = await fetch(`${API_BASE}/faces/build`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Build faces failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getFaceClusters(dir: string): Promise<{ clusters: FaceCluster[] }> {
    const response = await fetch(
      `${API_BASE}/faces/clusters?dir=${encodeURIComponent(dir)}`
    );
    if (!response.ok) {
      throw new Error(`Get face clusters failed: ${response.statusText}`);
    }
    return response.json();
  }

  async nameFaceCluster(
    dir: string,
    clusterId: string,
    name: string
  ): Promise<{ ok: boolean }> {
    const formData = new FormData();
    formData.append("dir", dir);
    formData.append("cluster_id", clusterId);
    formData.append("name", name);

    const response = await fetch(`${API_BASE}/faces/name`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Name face cluster failed: ${response.statusText}`);
    }
    return response.json();
  }

  // Trips API
  async buildTrips(
    dir: string,
    provider = "local"
  ): Promise<{ ok: boolean; trips: Trip[] }> {
    const formData = new FormData();
    formData.append("dir", dir);
    formData.append("provider", provider);

    const response = await fetch(`${API_BASE}/trips/build`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Build trips failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getTrips(dir: string): Promise<{ trips: Trip[] }> {
    const response = await fetch(
      `${API_BASE}/trips?dir=${encodeURIComponent(dir)}`
    );
    if (!response.ok) {
      throw new Error(`Get trips failed: ${response.statusText}`);
    }
    return response.json();
  }

  async startIndex(
    dir: string,
    provider = "local"
  ): Promise<{ job_id?: string; total?: number }> {
    const response = await fetch(`${API_BASE}/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dir, provider, batch_size: 32 }),
    });
    if (!response.ok) {
      throw new Error(`Start index failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getIndexStatus(dir: string): Promise<IndexStatus> {
    const response = await fetch(
      `${API_BASE}/index/status?dir=${encodeURIComponent(dir)}`
    );
    if (!response.ok) {
      throw new Error(`Index status failed: ${response.statusText}`);
    }
    return response.json();
  }

  // Export functions
  async exportCollection(
    dir: string,
    collection: string,
    format: "json" | "csv" = "json"
  ): Promise<ExportResponse> {
    const formData = new FormData();
    formData.append("dir", dir);
    formData.append("collection", collection);
    formData.append("format", format);

    const response = await fetch(`${API_BASE}/export/collection`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Export collection failed: ${response.statusText}`);
    }

    return response.json();
  }

  async exportSearch(
    dir: string,
    query: string,
    format: "json" | "csv" = "json",
    options?: { include_metadata?: boolean }
  ): Promise<ExportResponse> {
    const formData = new FormData();
    formData.append("dir", dir);
    formData.append("query", query);
    formData.append("format", format);
    if (options?.include_metadata) {
      formData.append("include_metadata", "true");
    }

    const response = await fetch(`${API_BASE}/export/search`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Export search failed: ${response.statusText}`);
    }

    return response.json();
  }

  async exportLibrary(
    dir: string,
    format: "json" | "csv" = "json",
    options?: { include_metadata?: boolean; filter?: string }
  ): Promise<ExportResponse> {
    const formData = new FormData();
    formData.append("dir", dir);
    formData.append("format", format);
    if (options?.include_metadata) {
      formData.append("include_metadata", "true");
    }
    if (options?.filter) {
      formData.append("filter", options.filter);
    }

    const response = await fetch(`${API_BASE}/export/library`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Export library failed: ${response.statusText}`);
    }

    return response.json();
  }

  async exportFavorites(
    dir: string,
    format: "json" | "csv" = "json"
  ): Promise<ExportResponse> {
    const formData = new FormData();
    formData.append("dir", dir);
    formData.append("format", format);

    const response = await fetch(`${API_BASE}/export/favorites`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Export favorites failed: ${response.statusText}`);
    }

    return response.json();
  }

  async importPhotos(
    sourceDir: string,
    destDir: string,
    options?: { recursive?: boolean; copy?: boolean }
  ): Promise<{
    ok: boolean;
    imported: number;
    skipped: number;
    errors: number;
    source: string;
    destination: string;
  }> {
    const formData = new FormData();
    formData.append("source_dir", sourceDir);
    formData.append("dest_dir", destDir);
    if (options?.recursive !== undefined) {
      formData.append("recursive", options.recursive.toString());
    }
    if (options?.copy !== undefined) {
      formData.append("copy", options.copy.toString());
    }

    const response = await fetch(`${API_BASE}/import`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Import photos failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Adapter selection via static import
import V1Adapter from "./api_v1_adapter.ts";

function createApiClient(): ApiClientLike {
  const baseClient = (
    API_MODE === "v1" ? new V1Adapter() : new NativeApiClient()
  ) as ApiClientLike;

  // Ensure getLibrary always attempts direct access before falling back.
  return new Proxy<ApiClientLike>(baseClient, {
    get(target, prop, receiver) {
      if (prop === "getLibrary") {
        return async (
          dir: string,
          provider = "local",
          limit = 100,
          offset = 0
        ) => {
          const direct = await tryDirectLibraryRead(dir, limit, offset);
          if (direct) {
            return direct;
          }
          return target.getLibrary.call(target, dir, provider, limit, offset);
        };
      }

      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return value.bind(target);
      }
      return value;
    },
  });
}

const apiClient = createApiClient();

export { apiClient };
