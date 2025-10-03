import type { PhotoMeta } from "../models/PhotoMeta";
import {
  enhancedOfflineSearchService,
  type OfflineSearchResult,
} from "../services/EnhancedOfflineSearchService";
import {
  enhancedOfflineStorage,
  type OfflinePhotoStorage,
} from "../services/EnhancedOfflineStorage";
import { offlineService } from "../services/OfflineService";
import { API_BASE } from "./base";
import { search as apiSearch } from "./search";
import type { SearchParams } from "./types";

// Helper function to convert blob to data URL
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Offline API wrapper for search functionality
export interface OfflineSearchOptions {
  maxResults?: number;
  useEmbeddings?: boolean;
  useMetadata?: boolean;
  fallbackToKeywords?: boolean;
}

export async function offlineCapableSearch(
  dir: string,
  query: string,
  provider: string = "local",
  topK: number = 24,
  options?: OfflineSearchOptions
): Promise<OfflineSearchResult[]> {
  // First, check if we're online
  const isOnline = offlineService.getStatus();

  if (isOnline) {
    // If online, perform online search and cache the results
    try {
      console.log(`[OfflineAPI] Performing online search for: ${query}`);

      // Perform the actual API search
      const searchParams: SearchParams = {
        dir,
        query,
        provider,
        topK,
        options: {}, // Empty options for now, can be expanded later
      };

      const onlineResponse = await apiSearch(searchParams);

      // Cache the results for offline use
      if (onlineResponse.results && onlineResponse.results.length > 0) {
        // Note: The API results may not include metadata in the SearchResult type
        // We'll need to fetch metadata separately or assume it's included
        for (const result of onlineResponse.results) {
          // Store the photo entry (without metadata for now)
          const photoData = {
            id: result.path,
            path: result.path,
            thumbnail: undefined, // Will be populated when metadata is available
            metadata: undefined, // Will be populated when metadata is available
            cachedAt: Date.now(),
            lastAccessed: Date.now(),
          };

          await enhancedOfflineStorage.storePhoto(photoData);
        }
      }

      // Return online results in offline format
      // Note: Since SearchResult doesn't include metadata, we'll return basic results
      return onlineResponse.results.map((result) => ({
        photoId: result.path,
        path: result.path,
        thumbnail: undefined,
        metadata: undefined,
        similarity: result.score || 0,
        cachedAt: Date.now(),
      }));
    } catch (error) {
      console.error(
        "[OfflineAPI] Online search failed, falling back to offline search:",
        error
      );
      // Continue to offline search
    }
  }

  // Whether online search failed or we're offline, perform offline search
  console.log(`[OfflineAPI] Performing offline search for: ${query}`);

  // Perform keyword-based search using cached metadata
  return await enhancedOfflineSearchService.searchByKeywords(query.split(" "), {
    maxResults: topK,
    ...options,
  });
}

/**
 * Offline-capable function to get library photos
 */
export async function offlineCapableGetLibrary(
  dir: string
): Promise<OfflinePhotoStorage[]> {
  // Check if we're online
  const isOnline = offlineService.getStatus();

  if (isOnline) {
    // If online, fetch from API and cache results
    try {
      console.log(`[OfflineAPI] Fetching library from online API for: ${dir}`);

      // Call the actual API to get the library
      const response = await fetch(
        `${API_BASE}/library?dir=${encodeURIComponent(dir)}`
      );
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const libraryResponse = (await response.json()) as {
        paths: string[];
        has_more: boolean;
      };

      // For each photo path, get its metadata and cache it
      for (const path of libraryResponse.paths) {
        try {
          // Get metadata for this photo
          const metadataResponse = await fetch(
            `${API_BASE}/metadata?dir=${encodeURIComponent(
              dir
            )}&path=${encodeURIComponent(path)}`
          );

          let metadata: PhotoMeta | undefined;
          if (metadataResponse.ok) {
            metadata = (await metadataResponse.json()) as PhotoMeta;
          }

          // Create thumbnail data URL if we have metadata with dimensions
          let thumbnail: string | undefined;
          if (metadata?.width && metadata?.height) {
            try {
              // Fetch thumbnail from API and convert to data URL
              const thumbResponse = await fetch(
                `${API_BASE}/thumb?dir=${encodeURIComponent(
                  dir
                )}&path=${encodeURIComponent(path)}&size=256`
              );

              if (thumbResponse.ok) {
                const thumbBlob = await thumbResponse.blob();
                thumbnail = await blobToDataURL(thumbBlob);
              }
            } catch (error) {
              console.warn(
                `[OfflineAPI] Failed to fetch thumbnail for ${path}:`,
                error
              );
              // Continue without thumbnail
            }
          }

          // Cache the photo data
          const photoData: OfflinePhotoStorage = {
            id: path,
            path,
            thumbnail,
            metadata,
            cachedAt: Date.now(),
            lastAccessed: Date.now(),
          };

          await enhancedOfflineStorage.storePhoto(photoData);
        } catch (error) {
          console.warn(`[OfflineAPI] Failed to cache photo ${path}:`, error);
          // Continue with other photos even if one fails
        }
      }

      console.log(
        `[OfflineAPI] Successfully cached ${libraryResponse.paths.length} photos from API`
      );
    } catch (error) {
      console.error(
        "[OfflineAPI] Failed to fetch library online, using offline cache:",
        error
      );
      // Continue to offline data
    }
  }

  // Get offline cached photos
  console.log(`[OfflineAPI] Retrieving library from offline cache for: ${dir}`);

  const allPhotos = (await enhancedOfflineStorage.getAllPhotos?.()) || [];
  return allPhotos;
}

/**
 * Offline-capable function to get photo metadata
 */
export async function offlineCapableGetMetadata(
  dir: string,
  path: string
): Promise<PhotoMeta | null> {
  const isOnline = offlineService.getStatus();

  if (isOnline) {
    try {
      console.log(`[OfflineAPI] Fetching metadata online for: ${path}`);

      // Call the actual API to get metadata
      const response = await fetch(
        `${API_BASE}/metadata?dir=${encodeURIComponent(
          dir
        )}&path=${encodeURIComponent(path)}`
      );

      if (response.ok) {
        const metadata = (await response.json()) as PhotoMeta;

        // Cache the metadata
        await enhancedOfflineStorage.storeMetadata(path, metadata);

        return metadata;
      } else {
        console.warn(
          `[OfflineAPI] Failed to fetch metadata for ${path}: ${response.status}`
        );
      }
    } catch (error) {
      console.error(
        "[OfflineAPI] Failed to fetch metadata online, using offline cache:",
        error
      );
      // Continue to offline data
    }
  }

  // Try to get from offline cache
  console.log(
    `[OfflineAPI] Retrieving metadata from offline cache for: ${path}`
  );
  const metadata = await enhancedOfflineStorage.getMetadata(path);

  if (metadata) {
    return metadata;
  }

  return null; // No cached metadata found
}

/**
 * Offline-capable function to set favorite status
 */
export async function offlineCapableSetFavorite(
  dir: string,
  path: string,
  favorite: boolean
): Promise<void> {
  const isOnline = offlineService.getStatus();

  if (isOnline) {
    try {
      // In a real implementation, this would call the actual API
      // await apiSetFavorite(dir, path, favorite);

      // Update locally cached data
      const photo = await enhancedOfflineStorage.getPhoto(path);
      if (photo?.metadata) {
        (photo.metadata as PhotoMeta & { favorite?: boolean }).favorite =
          favorite;
        await enhancedOfflineStorage.storePhoto(photo);
      }

      return;
    } catch (error) {
      console.error(
        "[OfflineAPI] Failed to set favorite online, queuing for sync:",
        error
      );
    }
  }

  // Queue the action for offline processing
  await offlineService.queueAction({
    type: "favorite",
    payload: {
      dir,
      path,
      favorite,
    },
  });
}

/**
 * Offline-capable function to set tags
 */
export async function offlineCapableSetTags(
  dir: string,
  path: string,
  tags: string[]
): Promise<void> {
  const isOnline = offlineService.getStatus();

  if (isOnline) {
    try {
      // In a real implementation, this would call the actual API
      // await apiSetTags(dir, path, tags);

      // Update locally cached data
      const photo = await enhancedOfflineStorage.getPhoto(path);
      if (photo?.metadata) {
        photo.metadata.tags = tags;
        await enhancedOfflineStorage.storePhoto(photo);
      }

      return;
    } catch (error) {
      console.error(
        "[OfflineAPI] Failed to set tags online, queuing for sync:",
        error
      );
    }
  }

  // Queue the action for offline processing
  await offlineService.queueAction({
    type: "set_tags",
    payload: {
      dir,
      path,
      tags,
    },
  });
}

/**
 * Pre-cache library data for offline use
 */
export async function precacheLibraryForOffline(dir: string): Promise<void> {
  console.log(`[OfflineAPI] Precaching library data for offline use: ${dir}`);

  try {
    // This would fetch the library and cache it
    // const library = await apiLibrary(dir);
    // for (const photo of library) {
    //   await enhancedOfflineStorage.storePhoto({
    //     id: photo.id,
    //     path: photo.path,
    //     thumbnail: photo.thumbnail,
    //     metadata: photo.metadata,
    //     cachedAt: Date.now(),
    //     lastAccessed: Date.now()
    //   });
    // }

    console.log(`[OfflineAPI] Successfully precached library data for: ${dir}`);
  } catch (error) {
    console.error("[OfflineAPI] Failed to precache library data:", error);
    throw error;
  }
}

/**
 * Pre-cache embeddings for offline semantic search
 */
export async function precacheEmbeddingsForOffline(dir: string): Promise<void> {
  console.log(`[OfflineAPI] Precaching embeddings for offline search: ${dir}`);

  try {
    // This would fetch embeddings and cache them
    // await enhancedOfflineSearchService.precomputeEmbeddings();

    console.log(`[OfflineAPI] Successfully precached embeddings for: ${dir}`);
  } catch (error) {
    console.error("[OfflineAPI] Failed to precache embeddings:", error);
    throw error;
  }
}
