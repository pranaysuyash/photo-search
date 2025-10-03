import {
  PLACEHOLDER_THUMB,
  type PhotoDataSource,
  type PhotoItem,
  type PhotoSearchItem,
  type SearchParamsDS,
  type ListParams,
} from "./PhotoDataSource";
import { loadOfflineManifest, type PhotoManifestItem } from "../services/ManifestService";
import { resolveThumbUrl } from "../services/ThumbnailResolver";

export class OfflineManifestSource implements PhotoDataSource {
  readonly capabilities = {
    supportsSearch: true, // filename/token search only in Phase 1
    supportsEmbeddings: false,
    supportsFavorites: true, // local toggle (not yet persisted upstream)
    sourceKind: "offline-manifest",
  } as const;

  private manifest: PhotoManifestItem[] = [];
  private loaded = false;

  constructor() {}

  async init(): Promise<void> {
    if (this.loaded) return;
    try {
      const data = await loadOfflineManifest();
      if (data?.length) {
        this.manifest = data;
      }
      this.loaded = true;
    } catch (e) {
      console.warn("[OfflineManifestSource] manifest load failed", e);
      this.loaded = true; // avoid retry storm; higher layer can trigger manual reload
    }
  }

  async list(params?: ListParams): Promise<PhotoItem[]> {
    if (!this.loaded) await this.init();
    const offset = params?.offset || 0;
    const limit = params?.limit || 200;
    const slice = this.manifest.slice(offset, offset + limit);
    return slice.map((e) => ({
      id: e.path,
      path: e.path,
      mtime: e.mtime,
      size: e.size,
      width: e.width,
      height: e.height,
      source: "manifest",
    }));
  }

  async search(params: SearchParamsDS): Promise<PhotoSearchItem[]> {
    if (!this.loaded) await this.init();
    const q = (params.query || "").trim().toLowerCase();
    if (!q) return [];

    // Simple filename/token match (Phase 1)
    const tokens = q.split(/\s+/).filter(Boolean);
    const scored: PhotoSearchItem[] = [];
    for (const entry of this.manifest) {
      const namePart = entry.path.split(/[\\/]/).pop() || entry.path;
      const lower = namePart.toLowerCase();
      let hitCount = 0;
      for (const t of tokens) {
        if (lower.includes(t)) hitCount += 1;
      }
      if (hitCount > 0) {
        const score = Math.min(1, hitCount / tokens.length);
        scored.push({
          id: entry.path,
          path: entry.path,
          score,
          source: "manifest",
        });
      }
    }
    // Sort desc by score then name stable
    scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    const topK = params.topK || 50;
    return scored.slice(0, topK);
  }

  async getThumbnail(photo: PhotoItem): Promise<string | undefined> {
    // Use thumbnail resolver with fallback to placeholder
    const resolved = await resolveThumbUrl(photo);
    return resolved || PLACEHOLDER_THUMB;
  }
}
