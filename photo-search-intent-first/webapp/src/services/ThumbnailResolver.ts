import { indexedDBStorage } from "./IndexedDBStorage";
import { enhancedOfflineStorage } from "./EnhancedOfflineStorage";

export interface ThumbnailResolveOptions {
  size?: number;
  preferEmbedded?: boolean;
}

/**
 * Resolve thumbnail URL for a photo with fallback strategies
 */
export async function resolveThumbUrl(
  photo: { path: string; thumb?: string; thumbnail?: string },
  opts: ThumbnailResolveOptions = {}
): Promise<string | undefined> {
  const { size = 256, preferEmbedded = false } = opts;

  // 1. If already has a data/blob URL, use it
  const inlineThumb = photo.thumb ?? photo.thumbnail;
  if (inlineThumb?.startsWith("data:") || inlineThumb?.startsWith("blob:")) {
    return inlineThumb;
  }

  // 2. Check IndexedDB cache
  try {
    const cachedBlob = await indexedDBStorage.getThumbnail(photo.path);
    if (cachedBlob) {
      const url = URL.createObjectURL(cachedBlob);
      // Note: caller should revoke URL when done
      return url;
    }
  } catch (error) {
    console.warn('[ThumbnailResolver] Cache check failed:', error);
  }

  // 2b. Check enhanced offline storage (data URL)
  try {
    const stored = await enhancedOfflineStorage.getPhoto(photo.path);
    if (stored?.thumbnail) {
      return stored.thumbnail;
    }
  } catch (error) {
    console.warn('[ThumbnailResolver] Offline storage lookup failed:', error);
  }

  // If we're offline and have no cached thumbnail, bail early
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return inlineThumb;
  }

  // 3. Electron file:// if available (placeholder - implement when electronAPI supports it)
  // TODO: Add Electron file URL support when API is available

  // 4. Fallback to /thumb endpoint
  const thumbUrl = `/thumb?path=${encodeURIComponent(photo.path)}&size=${size}`;
  return thumbUrl;
}

/**
 * Cache a thumbnail blob in IndexedDB
 */
export async function cacheThumbnail(path: string, blob: Blob): Promise<void> {
  try {
    await indexedDBStorage.storeThumbnail(path, blob);
  } catch (error) {
    console.error('[ThumbnailResolver] Failed to cache thumbnail:', error);
  }
}

/**
 * Preload and cache thumbnails for photos
 */
export async function preloadThumbnails(
  photos: Array<{ path: string }>,
  opts: ThumbnailResolveOptions = {}
): Promise<void> {
  const promises = photos.map(async (photo) => {
    // Only preload if not already cached
    const cached = await indexedDBStorage.getThumbnail(photo.path);
    if (!cached) {
      try {
        const url = await resolveThumbUrl(photo, opts);
        if (url?.startsWith('/thumb')) {
          // Fetch and cache
          const response = await fetch(url);
          if (response.ok) {
            const blob = await response.blob();
            await cacheThumbnail(photo.path, blob);
          }
        }
      } catch (error) {
        console.warn('[ThumbnailResolver] Preload failed for:', photo.path, error);
      }
    }
  });

  await Promise.allSettled(promises);
}
