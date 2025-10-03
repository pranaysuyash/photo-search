/*
 * Photo Data Source Abstraction
 * Phase 1: Offline manifest + online API selection
 * Intent: Provide a stable contract for gallery + search layers so we can inject
 * offline-only sources without refactoring every consumer.
 */

export interface PhotoItem {
  id: string; // stable identifier (path for now)
  path: string; // original file path (or virtual path in manifest)
  mtime?: number;
  size?: number;
  width?: number;
  height?: number;
  favorite?: boolean;
  tags?: string[];
  thumb?: string; // data URL, blob URL, remote URL, or placeholder token
  source?: "manifest" | "cache" | "api";
}

export interface PhotoSearchItem extends PhotoItem {
  score: number; // relevance score 0..1 (normalized)
}

export interface ListParams {
  /** Directory or logical collection identifier */
  dir?: string;
  /** Pagination window start (default 0) */
  offset?: number;
  /** Max items to return (default 200 for Phase 1) */
  limit?: number;
  /** Whether caller wants lightweight items only (omit metadata width/height) */
  lean?: boolean;
}

export interface SearchParamsDS {
  dir?: string; // optional: offline manifest ignores; online requires
  query: string;
  topK?: number; // desired number of results
  mode?: "auto" | "filename" | "hybrid";
}

export interface DataSourceCapabilities {
  supportsSearch: boolean;
  supportsEmbeddings: boolean;
  supportsFavorites: boolean;
  sourceKind: string; // e.g. 'online-api', 'offline-manifest'
}

export interface PhotoDataSource {
  readonly capabilities: DataSourceCapabilities;
  init?(): Promise<void>; // optional async setup (manifest load, warm caches)
  list(params?: ListParams): Promise<PhotoItem[]>;
  search?(params: SearchParamsDS): Promise<PhotoSearchItem[]>; // only if supportsSearch
  getThumbnail(
    photo: PhotoItem,
    opts?: { size?: number; preferEmbedded?: boolean }
  ): Promise<string | undefined>;
  dispose?(): Promise<void> | void; // cleanup listeners/resources
}

export interface DataSourceSelectionContext {
  forceOffline?: boolean; // VITE_FORCE_OFFLINE flag
  offlineGridEnabled?: boolean; // VITE_OFFLINE_GRID flag
  isOnline: boolean; // from OfflineService
  hasManifest?: boolean; // manifest preloaded indicator
}

// Factory return type for internal caching
export interface DataSourceFactoryResult {
  source: PhotoDataSource;
  kind: string;
}

// Placeholder tokens (Phase 1 practicality)
export const PLACEHOLDER_THUMB = "placeholder:thumb";

/*
 * Selection heuristic (Phase 1):
 * 1. If forceOffline -> offline manifest source (if manifest present else stub fallback)
 * 2. Else if !isOnline AND offlineGridEnabled -> offline manifest source
 * 3. Else -> online API source
 */
export function selectDataSource(
  ctx: DataSourceSelectionContext,
  sources: {
    offline?: PhotoDataSource;
    online: PhotoDataSource;
  }
): DataSourceFactoryResult {
  if (ctx.forceOffline) {
    return {
      source: sources.offline ?? sources.online,
      kind: sources.offline
        ? sources.offline.capabilities.sourceKind
        : sources.online.capabilities.sourceKind,
    };
  }
  if (!ctx.isOnline && ctx.offlineGridEnabled) {
    return {
      source: sources.offline ?? sources.online,
      kind: sources.offline
        ? sources.offline.capabilities.sourceKind
        : sources.online.capabilities.sourceKind,
    };
  }
  // Optional: if manifest exists and offline enabled we could still prefer offline for speed; later phase.
  return {
    source: sources.online,
    kind: sources.online.capabilities.sourceKind,
  };
}
