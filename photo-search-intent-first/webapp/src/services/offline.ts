import { isElectron } from "../api";
import { enhancedOfflineStorage } from "./EnhancedOfflineStorage";

interface DemoManifestEntry {
  id: string;
  path: string;
  name: string;
  dataUri: string;
  size?: number;
  width?: number;
  height?: number;
  mime?: string;
  mtime?: number;
}

const demoDataUriMap = new Map<string, DemoManifestEntry>();

interface WindowWithDemoMap extends Window {
  __PHOTO_DEMO_MAP__?: Record<string, DemoManifestEntry>;
}

function setDemoEntry(entry: DemoManifestEntry) {
  demoDataUriMap.set(entry.path, entry);
  if (typeof window !== "undefined") {
    const win = window as WindowWithDemoMap;
    if (!win.__PHOTO_DEMO_MAP__) {
      win.__PHOTO_DEMO_MAP__ = {};
    }
    win.__PHOTO_DEMO_MAP__![entry.path] = entry;
  }
}
let demoManifestPromise: Promise<DemoManifestEntry[] | null> | null = null;
let demoCacheInitPromise: Promise<void> | null = null;

async function seedDemoManifestCache(entries: DemoManifestEntry[]): Promise<void> {
  if (demoCacheInitPromise) {
    return demoCacheInitPromise;
  }

  demoCacheInitPromise = (async () => {
    try {
      await enhancedOfflineStorage.initialize();
      for (const entry of entries) {
        setDemoEntry(entry);
        await enhancedOfflineStorage.storePhoto({
          id: entry.path,
          path: entry.path,
          thumbnail: entry.dataUri,
          metadata: {
            width: entry.width,
            height: entry.height,
            size_bytes: entry.size,
            title: entry.name,
            mtime: entry.mtime,
          },
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
        });
      }
    } catch (error) {
      console.warn(
        "[offlineCapableGetLibrary] Failed to seed demo manifest cache:",
        error
      );
    }
  })();

  return demoCacheInitPromise;
}

async function loadDemoManifest(): Promise<DemoManifestEntry[] | null> {
  if (!demoManifestPromise) {
    demoManifestPromise = fetch("/demo_manifest.json")
      .then(async (res) => {
        if (!res.ok) {
          return null;
        }
        const data = (await res.json()) as DemoManifestEntry[];
        if (!Array.isArray(data) || data.length === 0) {
          return null;
        }
        data.forEach((entry) => {
          setDemoEntry(entry);
        });
        void seedDemoManifestCache(data);
        return data;
      })
      .catch(() => null);
  }
  return demoManifestPromise;
}

async function loadBrowserDemoLibrary(
  limit: number,
  offset: number
): Promise<LibraryResult | null> {
  const manifest = await loadDemoManifest();
  if (!manifest || manifest.length === 0) {
    return null;
  }

  await seedDemoManifestCache(manifest);

  const slice = manifest.slice(offset, offset + limit);

  return {
    total: manifest.length,
    offset,
    limit,
    paths: slice.map((entry) => entry.path),
  };
}

interface WindowWithSecureElectron extends Window {
  secureElectronAPI?: {
    readDirectoryPhotos?: (options: {
      directory: string;
      limit?: number;
      offset?: number;
    }) => Promise<{
      paths: string[];
      total: number;
      offset: number;
      limit: number;
    }>;
  };
}

/**
 * Offline-capable library loading function
 * Attempts to load photo library using multiple fallback strategies:
 * 1. Direct file system access (Electron only)
 * 2. Cached offline storage
 * 3. API call (last resort)
 */

interface LibraryResult {
  total: number;
  offset: number;
  limit: number;
  paths: string[];
}

interface LibraryOptions {
  hfToken?: string;
  openaiKey?: string;
}

/**
 * Get library photos with offline capability
 * @param dir Directory path to scan
 * @param provider Embedding provider (local, hf, openai)
 * @param limit Maximum number of photos to return
 * @param offset Pagination offset
 * @param opts Additional options (tokens, keys)
 * @returns Promise resolving to library result
 */
export async function offlineCapableGetLibrary(
  dir: string,
  provider: string,
  limit = 120,
  offset = 0,
  opts?: LibraryOptions
): Promise<LibraryResult> {
  if (!isElectron() && dir === "__browser_demo__") {
    const browserResult = await loadBrowserDemoLibrary(limit, offset);
    if (browserResult) {
      return browserResult;
    }
  }

  // Strategy 1: Direct file system access in Electron
  if (isElectron()) {
    try {
      const windowWithSecure = window as WindowWithSecureElectron;
      if (windowWithSecure.secureElectronAPI?.readDirectoryPhotos) {
        console.log("[offlineCapableGetLibrary] Attempting direct file access");
        const result =
          await windowWithSecure.secureElectronAPI.readDirectoryPhotos({
            directory: dir,
            limit,
            offset,
          });

        if (result && Array.isArray(result.paths)) {
          console.log(
            `[offlineCapableGetLibrary] Direct access successful: ${result.paths.length} photos`
          );
          return {
            total: result.total || result.paths.length,
            offset: result.offset || offset,
            limit: result.limit || limit,
            paths: result.paths,
          };
        }
      }
    } catch (error) {
      console.warn(
        "[offlineCapableGetLibrary] Direct file access failed:",
        error
      );
    }
  }

  // Strategy 2: Cached offline storage
  try {
    console.log("[offlineCapableGetLibrary] Attempting cached data");
    await enhancedOfflineStorage.initialize();

    // Try to get cached photos for this directory
    const cachedPhotos = await enhancedOfflineStorage.getAllPhotos();

    // Filter photos by directory and apply pagination
    const dirPhotos = cachedPhotos
      .filter((photo) => photo.path.startsWith(dir))
      .map((photo) => photo.path)
      .slice(offset, offset + limit);

    if (dirPhotos.length > 0) {
      console.log(
        `[offlineCapableGetLibrary] Cached data successful: ${dirPhotos.length} photos`
      );
      return {
        total: cachedPhotos.filter((photo) => photo.path.startsWith(dir))
          .length,
        offset,
        limit,
        paths: dirPhotos,
      };
    }
  } catch (error) {
    console.warn(
      "[offlineCapableGetLibrary] Cached data access failed:",
      error
    );
  }

  // Strategy 3: API call (last resort)
  console.log("[offlineCapableGetLibrary] Falling back to API call");
  const { apiLibrary } = await import("../api");

  try {
    const result = await apiLibrary(dir, provider, limit, offset, opts);
    console.log(
      `[offlineCapableGetLibrary] API call successful: ${
        result.paths?.length || 0
      } photos`
    );

    // Optionally cache the results for future offline use
    if (result.paths && result.paths.length > 0) {
      try {
        await enhancedOfflineStorage.initialize();
        // Cache a subset of photos for offline use
        const cachePromises = result.paths.slice(0, 100).map(async (path) => {
          const photoData = {
            id: `photo_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
            path,
            cachedAt: Date.now(),
            lastAccessed: Date.now(),
          };
          return enhancedOfflineStorage.storePhoto(photoData);
        });
        await Promise.allSettled(cachePromises);
      } catch (cacheError) {
        console.warn(
          "[offlineCapableGetLibrary] Failed to cache API results:",
          cacheError
        );
      }
    }

    return result;
  } catch (error) {
    console.error("[offlineCapableGetLibrary] API call failed:", error);

    if (!isElectron()) {
      const browserResult = await loadBrowserDemoLibrary(limit, offset);
      if (browserResult) {
        return browserResult;
      }
    }

    throw error;
  }
}
