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

const hasImportMeta = typeof import.meta !== "undefined" && !!(import.meta as unknown);
const API_BASE: string = hasImportMeta && import.meta.env && import.meta.env.VITE_API_BASE
  ? String(import.meta.env.VITE_API_BASE)
  : "/api";
const API_MODE: string = hasImportMeta && import.meta.env && import.meta.env.VITE_API_MODE
  ? String(import.meta.env.VITE_API_MODE)
  : "v1"; // default to v1

// Utility function to detect Electron environment
function isElectron(): boolean {
  return (
    typeof window !== "undefined" &&
    window.navigator.userAgent.includes("Electron")
  );
}

interface LibraryResponse {
  paths: string[];
  total: number;
  offset: number;
  limit: number;
}

interface SearchResult {
  path: string;
  score: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

interface AnalyticsResponse {
  total_photos: number;
  total_indexed: number;
  index_size_mb: number;
  cameras: string[];
  places: (string | number)[];
  people_clusters: Array<{ name?: string }>;
  tags: string[];
}

interface Collection {
  name: string;
  photos: string[];
  created?: string;
  description?: string;
}

interface FaceCluster {
  id: string;
  name?: string;
  size: number;
  examples: [string, number][];
}

interface Trip {
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

// Minimal contract for clients
interface ApiClientLike {
  getLibrary(dir: string, provider?: string, limit?: number, offset?: number): Promise<LibraryResponse>;
  search(
    dir: string,
    query: string,
    provider?: string,
    topK?: number,
    offset?: number
  ): Promise<SearchResponse>;
  getAnalytics(dir: string): Promise<AnalyticsResponse>;
  getWorkspaces(): Promise<{ workspaces: Array<{ name: string; path: string }> }>;
  getPhotoUrl(path: string): string;
  getThumbnailUrl(path: string, size?: number): string;
  getCollections(dir: string): Promise<{ collections: Record<string, Collection> }>;
  setCollection(dir: string, name: string, photos: string[]): Promise<{ ok: boolean }>;
  deleteCollection(dir: string, name: string): Promise<{ ok: boolean }>;
  buildFaces(dir: string, provider?: string): Promise<{ ok: boolean; clusters: FaceCluster[] }>;
  getFaceClusters(dir: string): Promise<{ clusters: FaceCluster[] }>;
  nameFaceCluster(dir: string, clusterId: string, name: string): Promise<{ ok: boolean }>;
  buildTrips(dir: string, provider?: string): Promise<{ ok: boolean; trips: Trip[] }>;
  getTrips(dir: string): Promise<{ trips: Trip[] }>;
}

class NativeApiClient implements ApiClientLike {
  async getLibrary(
    dir: string,
    provider = "local",
    limit = 100,
    offset = 0
  ): Promise<LibraryResponse> {
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
    provider = "local",
    topK = 50,
    offset = 0
  ): Promise<SearchResponse> {
    const formData = new FormData();
    formData.append("dir", dir);
    formData.append("query", query); // Fix: Backend expects 'query', not 'q'
    formData.append("provider", provider);
    formData.append("top_k", topK.toString());
    formData.append("offset", offset.toString());

    const response = await fetch(`${API_BASE}/search`, {
      method: "POST",
      body: formData,
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

    return response.json();
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
}

// Adapter selection via static import
import V1Adapter from "./api_v1_adapter.ts";
const apiClient: ApiClientLike =
  API_MODE === "v1" ? new V1Adapter() : new NativeApiClient();

export { apiClient };
export type {
  LibraryResponse,
  SearchResponse,
  SearchResult,
  AnalyticsResponse,
  Collection,
  FaceCluster,
  Trip,
};
