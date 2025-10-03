import {
  type PhotoDataSource,
  type PhotoItem,
  type PhotoSearchItem,
  type SearchParamsDS,
  type ListParams,
} from "./PhotoDataSource";
import { resolveThumbUrl } from "../services/ThumbnailResolver";

// Temporary dynamic calls via global fetch (keeps scaffold decoupled)
function getApiBase(): string {
  // Vite exposes import.meta.env typed; fallback for safety.
  const envBase = (import.meta as unknown as { env?: Record<string, string> })
    ?.env?.VITE_API_BASE;
  return envBase || "/api";
}

async function fetchLibrary(
  dir: string
): Promise<{ paths: string[]; has_more?: boolean }> {
  const base = getApiBase();
  const res = await fetch(`${base}/library?dir=${encodeURIComponent(dir)}`);
  if (!res.ok) throw new Error(`library fetch failed ${res.status}`);
  return res.json();
}

async function fetchSearch(
  dir: string,
  query: string,
  topK: number
): Promise<{ results: { path: string; score?: number }[] }> {
  const base = getApiBase();
  const body = new FormData();
  body.append("dir", dir);
  body.append("query", query);
  body.append("provider", "local");
  body.append("top_k", String(topK));
  const res = await fetch(`${base}/search`, { method: "POST", body });
  if (!res.ok) throw new Error(`search failed ${res.status}`);
  return res.json();
}

// NOTE: We are intentionally thin; this will be adapted when integrating.
export class OnlineAPISource implements PhotoDataSource {
  readonly capabilities = {
    supportsSearch: true,
    supportsEmbeddings: true, // remote can do embeddings
    supportsFavorites: true,
    sourceKind: "online-api",
  } as const;

  async list(params?: ListParams): Promise<PhotoItem[]> {
    if (!params?.dir) return [];
    try {
      const res = await fetchLibrary(params.dir);
      const paths: string[] = Array.isArray(res?.paths) ? res.paths : [];
      const start = params.offset || 0;
      const limit = params.limit || 200;
      const slice = paths.slice(start, start + limit);
      return slice.map((p) => ({ id: p, path: p, source: "api" }));
    } catch (e) {
      console.warn("[OnlineAPISource] list failed", e);
      return [];
    }
  }

  async search(params: SearchParamsDS): Promise<PhotoSearchItem[]> {
    if (!params.dir) return [];
    try {
      const res = await fetchSearch(
        params.dir,
        params.query,
        params.topK || 50
      );
      const results = Array.isArray(res?.results) ? res.results : [];
      return results.map((r) => ({
        id: r.path,
        path: r.path,
        score: r.score ?? 0,
        source: "api",
      }));
    } catch (e) {
      console.warn("[OnlineAPISource] search failed", e);
      return [];
    }
  }

  async getThumbnail(photo: PhotoItem): Promise<string | undefined> {
    // Use thumbnail resolver
    return resolveThumbUrl(photo);
  }
}
