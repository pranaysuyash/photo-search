/**
 * PhotoVault Comprehensive API Service
 * Integrates ALL 47 backend endpoints with proper typing and error handling
 */

import * as api from "../api";
import { offlineSearchService } from "./OfflineSearchService";
import { offlineService } from "./OfflineService";

// Narrowed option types to mirror api.ts without duplicating full shapes here
export type SearchOptions = {
	hfToken?: string;
	openaiKey?: string;
	favoritesOnly?: boolean;
	tags?: string[];
	dateFrom?: number;
	dateTo?: number;
	useFast?: boolean;
	fastKind?: string;
	useCaptions?: boolean;
	camera?: string;
	isoMin?: number;
	isoMax?: number;
	fMin?: number;
	fMax?: number;
	flash?: "fired" | "noflash";
	wb?: "auto" | "manual";
	metering?: string;
	altMin?: number;
	altMax?: number;
	headingMin?: number;
	headingMax?: number;
	place?: string;
	useOcr?: boolean;
	hasText?: boolean;
	person?: string;
	persons?: string[];
	sharpOnly?: boolean;
	excludeUnder?: boolean;
	excludeOver?: boolean;
};

export interface PhotoVaultConfig {
	dir: string;
	provider: string;
	hfToken?: string;
	openaiKey?: string;
}

export class PhotoVaultAPI {
	private config: PhotoVaultConfig;

	constructor(config: PhotoVaultConfig) {
		this.config = config;
	}

	// ============================================================
	// SEARCH & AI ENDPOINTS (7/7)
	// ============================================================

	/**
	 * Text/semantic search across images
	 */
	async search(query: string, topK = 24, opts?: SearchOptions) {
		// Try online search first
		try {
			return await api.apiSearch(
				this.config.dir,
				query,
				this.config.provider,
				topK,
				{
					hfToken: this.config.hfToken,
					openaiKey: this.config.openaiKey,
					...opts,
				},
			);
		} catch (error) {
			// If we're offline and offline search is available, use it
			if (!navigator.onLine && offlineSearchService.isAvailable()) {
				try {
					const offlineResults = await offlineSearchService.search(query, topK);
					return {
						...offlineResults,
						results: offlineResults.results.map((result) => ({
							...result,
							reasons: ["Offline search result"],
						})),
					};
				} catch (offlineError) {
					// If offline search fails, fall back to queuing
					console.warn("Offline search failed, queuing action:", offlineError);
				}
			}

			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const searchPayload = {
					dir: this.config.dir,
					query,
					provider: this.config.provider,
					topK,
					...opts,
				};

				await offlineService.queueAction({
					type: "search",
					payload: searchPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Search queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Search across entire workspace
	 */
	async searchWorkspace(
		query: string,
		topK = 24,
		opts?: Pick<
			SearchOptions,
			| "favoritesOnly"
			| "tags"
			| "dateFrom"
			| "dateTo"
			| "place"
			| "hasText"
			| "person"
			| "persons"
		>,
	) {
		return api.apiSearchWorkspace(
			this.config.dir,
			query,
			this.config.provider,
			topK,
			opts,
		);
	}

	/**
	 * Find visually similar images
	 */
	async searchSimilar(imagePath: string, topK = 24) {
		return api.apiSearchLike(
			this.config.dir,
			imagePath,
			this.config.provider,
			topK,
		);
	}

	/**
	 * Advanced similarity search with text weighting
	 */
	async searchSimilarPlus(
		imagePath: string,
		text?: string,
		weight = 0.5,
		topK = 24,
	) {
		return api.apiSearchLikePlus(
			this.config.dir,
			imagePath,
			this.config.provider,
			topK,
			text,
			weight,
		);
	}

	/**
	 * Build/rebuild search index
	 */
	async buildIndex(batchSize = 32) {
		try {
			return await api.apiIndex(
				this.config.dir,
				this.config.provider,
				batchSize,
				this.config.hfToken,
				this.config.openaiKey,
			);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const indexPayload = {
					dir: this.config.dir,
					provider: this.config.provider,
					batchSize,
					hfToken: this.config.hfToken,
					openaiKey: this.config.openaiKey,
				};

				await offlineService.queueAction({
					type: "index",
					payload: indexPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Index operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Build fast index (FAISS/Annoy/HNSW)
	 */
	async buildFastIndex(kind: "annoy" | "faiss" | "hnsw") {
		// This operation typically requires online connectivity and can't be queued
		return api.apiBuildFast(
			this.config.dir,
			kind,
			this.config.provider,
			this.config.hfToken,
			this.config.openaiKey,
		);
	}

	/**
	 * Generate AI captions for images
	 */
	async buildCaptions(vlmModel: string) {
		// This operation typically requires online connectivity and can't be queued
		return api.apiBuildCaptions(
			this.config.dir,
			vlmModel,
			this.config.provider,
			this.config.hfToken,
			this.config.openaiKey,
		);
	}

	// ============================================================
	// COLLECTIONS & ORGANIZATION (9/9)
	// ============================================================

	/**
	 * Get all collections
	 */
	async getCollections() {
		return api.apiGetCollections(this.config.dir);
	}

	/**
	 * Create or update a collection
	 */
	async setCollection(name: string, paths: string[]) {
		try {
			return await api.apiSetCollection(this.config.dir, name, paths);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const collectionPayload = {
					dir: this.config.dir,
					name,
					paths,
				};

				await offlineService.queueAction({
					type: "collection",
					payload: collectionPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Collection update queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Delete a collection
	 */
	async deleteCollection(name: string) {
		try {
			return await api.apiDeleteCollection(this.config.dir, name);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const deleteCollectionPayload = {
					dir: this.config.dir,
					name,
				};

				await offlineService.queueAction({
					type: "delete_collection",
					payload: deleteCollectionPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Delete collection operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Get smart collections
	 */
	async getSmartCollections() {
		return api.apiGetSmart(this.config.dir);
	}

	/**
	 * Batch add images to collection
	 */
	async batchAddToCollection(paths: string[], collectionName: string) {
		try {
			return await api.apiBatchAddToCollection(
				this.config.dir,
				paths,
				collectionName,
			);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const batchAddToCollectionPayload = {
					dir: this.config.dir,
					paths,
					collectionName,
				};

				await offlineService.queueAction({
					type: "batch_add_to_collection",
					payload: batchAddToCollectionPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error(
					"Batch add to collection operation queued for when online",
				);
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Delete smart collection
	 */
	async deleteSmartCollection(name: string) {
		try {
			return await api.apiDeleteSmart(this.config.dir, name);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const deleteSmartCollectionPayload = {
					dir: this.config.dir,
					name,
				};

				await offlineService.queueAction({
					type: "delete_smart_collection",
					payload: deleteSmartCollectionPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error(
					"Delete smart collection operation queued for when online",
				);
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Resolve smart collection to get matching images
	 */
	async resolveSmartCollection(name: string, topK = 24) {
		return api.apiResolveSmart(
			this.config.dir,
			name,
			this.config.provider,
			topK,
		);
	}

	/**
	 * Create smart collection with rules
	 */
	async setSmartCollection(name: string, rules: unknown) {
		try {
			return await api.apiSetSmart(this.config.dir, name, rules);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const smartCollectionPayload = {
					dir: this.config.dir,
					name,
					rules,
				};

				await offlineService.queueAction({
					type: "smart_collection",
					payload: smartCollectionPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Smart collection operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Build trips from photo metadata
	 */
	async buildTrips() {
		return api.apiTripsBuild(this.config.dir, this.config.provider);
	}

	/**
	 * Get list of detected trips
	 */
	async getTrips() {
		return api.apiTripsList(this.config.dir);
	}

	// ============================================================
	// FACE DETECTION & PEOPLE (3/3)
	// ============================================================

	/**
	 * Build face detection index
	 */
	async buildFaces() {
		try {
			return await api.apiBuildFaces(this.config.dir, this.config.provider);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const buildFacesPayload = {
					dir: this.config.dir,
					provider: this.config.provider,
				};

				await offlineService.queueAction({
					type: "build_faces",
					payload: buildFacesPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Build faces operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Get face clusters
	 */
	async getFaceClusters() {
		return api.apiFacesClusters(this.config.dir);
	}

	/**
	 * Name a face cluster
	 */
	async nameFaceCluster(clusterId: string, name: string) {
		return api.apiFacesName(this.config.dir, clusterId, name);
	}

	// ============================================================
	// TEXT & OCR (2/2)
	// ============================================================

	/**
	 * Get OCR text snippets for images
	 */
	async getOCRSnippets(paths: string[], limit = 160) {
		return api.apiOcrSnippets(this.config.dir, paths, limit);
	}

	// ============================================================
	// METADATA & TAGS (6/6)
	// ============================================================

	/**
	 * Get all metadata
	 */
	async getMetadata() {
		return api.apiGetMetadata(this.config.dir);
	}

	/**
	 * Get detailed metadata for specific image
	 */
	async getMetadataDetail(path: string) {
		return api.apiMetadataDetail(this.config.dir, path);
	}

	/**
	 * Get all tags
	 */
	async getTags() {
		return api.apiGetTags(this.config.dir);
	}

	/**
	 * Set tags for an image
	 */
	async setTags(path: string, tags: string[]) {
		try {
			return await api.apiSetTags(this.config.dir, path, tags);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const tagPayload = {
					dir: this.config.dir,
					paths: [path],
					tags,
					operation: "add" as const,
				};

				await offlineService.queueAction({
					type: "tag",
					payload: tagPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Tag update queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Batch tag images
	 */
	async batchTag(
		paths: string[],
		tags: string[],
		operation: "add" | "remove" | "replace" = "add",
	) {
		try {
			return await api.apiBatchTag(this.config.dir, paths, tags, operation);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const tagPayload = {
					dir: this.config.dir,
					paths,
					tags,
					operation,
				};

				await offlineService.queueAction({
					type: "tag",
					payload: tagPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Batch tag operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Get location/map data
	 */
	async getMapData() {
		return api.apiMap(this.config.dir);
	}

	/**
	 * Build metadata extraction
	 */
	async buildMetadata() {
		try {
			return await api.apiBuildMetadata(
				this.config.dir,
				this.config.provider,
				this.config.hfToken,
				this.config.openaiKey,
			);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const buildMetadataPayload = {
					dir: this.config.dir,
					provider: this.config.provider,
					hfToken: this.config.hfToken,
					openaiKey: this.config.openaiKey,
				};

				await offlineService.queueAction({
					type: "build_metadata",
					payload: buildMetadataPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Build metadata operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Build OCR text extraction
	 */
	async buildOCR(languages?: string[]) {
		try {
			return await api.apiBuildOCR(
				this.config.dir,
				this.config.provider,
				languages,
				this.config.hfToken,
				this.config.openaiKey,
			);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const buildOCRPayload = {
					dir: this.config.dir,
					provider: this.config.provider,
					languages,
					hfToken: this.config.hfToken,
					openaiKey: this.config.openaiKey,
				};

				await offlineService.queueAction({
					type: "build_ocr",
					payload: buildOCRPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Build OCR operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	// ============================================================
	// FAVORITES & SAVED (5/5)
	// ============================================================

	/**
	 * Get favorite images
	 */
	async getFavorites() {
		return api.apiGetFavorites(this.config.dir);
	}

	/**
	 * Toggle favorite status
	 */
	async setFavorite(path: string, favorite: boolean) {
		try {
			return await api.apiSetFavorite(this.config.dir, path, favorite);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const favoritePayload = {
					dir: this.config.dir,
					path,
					favorite,
				};

				await offlineService.queueAction({
					type: "favorite",
					payload: favoritePayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Favorite operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Get saved searches
	 */
	async getSavedSearches() {
		return api.apiGetSaved(this.config.dir);
	}

	/**
	 * Save a search
	 */
	async addSavedSearch(name: string, query: string, topK: number) {
		try {
			return await api.apiAddSaved(this.config.dir, name, query, topK);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const savedSearchPayload = {
					dir: this.config.dir,
					name,
					query,
					topK,
				};

				await offlineService.queueAction({
					type: "saved_search",
					payload: savedSearchPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Saved search operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Delete saved search
	 */
	async deleteSavedSearch(name: string) {
		try {
			return await api.apiDeleteSaved(this.config.dir, name);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const deleteSavedSearchPayload = {
					dir: this.config.dir,
					name,
				};

				await offlineService.queueAction({
					type: "delete_saved_search",
					payload: deleteSavedSearchPayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Delete saved search operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	// ============================================================
	// IMAGE OPERATIONS (4/4)
	// ============================================================

	/**
	 * Edit operations (rotate, flip, crop)
	 */
	async editImage(
		path: string,
		ops: {
			rotate?: number;
			flip?: "h" | "v";
			crop?: { x: number; y: number; w: number; h: number };
		},
	) {
		return api.apiEditOps(this.config.dir, path, ops);
	}

	/**
	 * AI upscale image
	 */
	async upscaleImage(
		path: string,
		scale: 2 | 4 = 2,
		engine: "pil" | "realesrgan" = "pil",
	) {
		return api.apiUpscale(this.config.dir, path, scale, engine);
	}

	/**
	 * Export images with options
	 */
	async exportImages(
		paths: string[],
		dest: string,
		mode: "copy" | "symlink" = "copy",
		stripExif = false,
		overwrite = false,
	) {
		return api.apiExport(
			this.config.dir,
			paths,
			dest,
			mode,
			stripExif,
			overwrite,
		);
	}

	/**
	 * Open image in external application
	 */
	async openExternal(path: string) {
		return api.apiOpen(this.config.dir, path);
	}

	// ============================================================
	// FILE MANAGEMENT (5/5)
	// ============================================================

	/**
	 * Get library images
	 */
	async getLibrary(limit = 120, offset = 0) {
		return api.apiLibrary(
			this.config.dir,
			this.config.provider,
			limit,
			offset,
			{
				hfToken: this.config.hfToken,
				openaiKey: this.config.openaiKey,
			},
		);
	}

	/**
	 * List workspace folders
	 */
	async getWorkspace() {
		return api.apiWorkspaceList();
	}

	/**
	 * Add folder to workspace
	 */
	async addToWorkspace(path: string) {
		return api.apiWorkspaceAdd(path);
	}

	/**
	 * Remove folder from workspace
	 */
	async removeFromWorkspace(path: string) {
		return api.apiWorkspaceRemove(path);
	}

	/**
	 * Delete images (with optional OS trash)
	 */
	async deleteImages(paths: string[], useOsTrash = true) {
		try {
			return await api.apiDelete(this.config.dir, paths, useOsTrash);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const deletePayload = {
					dir: this.config.dir,
					paths,
					useOsTrash,
				};

				await offlineService.queueAction({
					type: "delete",
					payload: deletePayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Delete operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Batch delete images
	 */
	async batchDelete(paths: string[], useOsTrash = true) {
		try {
			return await api.apiBatchDelete(this.config.dir, paths, useOsTrash);
		} catch (error) {
			// If we're offline, queue the action for later sync
			if (!navigator.onLine) {
				const deletePayload = {
					dir: this.config.dir,
					paths,
					useOsTrash,
				};

				await offlineService.queueAction({
					type: "delete",
					payload: deletePayload,
				});

				// Re-throw the error so the caller knows the operation was queued
				throw new Error("Batch delete operation queued for when online");
			}

			// For other errors, re-throw as-is
			throw error;
		}
	}

	/**
	 * Undo last delete operation
	 */
	async undoDelete() {
		return api.apiUndoDelete(this.config.dir);
	}

	// ============================================================
	// SIMILARITY & ANALYSIS (2/2)
	// ============================================================

	/**
	 * Find duplicate/similar images
	 */
	async findLookalikes(maxDistance = 5) {
		return api.apiLookalikes(this.config.dir, maxDistance);
	}

	/**
	 * Resolve lookalikes (mark as duplicates)
	 */
	async resolveLookalikes(paths: string[]) {
		return api.apiResolveLookalike(this.config.dir, paths);
	}

	// ============================================================
	// SYSTEM & FEEDBACK (3/3)
	// ============================================================

	/**
	 * Run system diagnostics
	 */
	async runDiagnostics() {
		return api.apiDiagnostics(
			this.config.dir,
			this.config.provider,
			this.config.openaiKey,
			this.config.hfToken,
		);
	}

	/**
	 * Submit user feedback
	 */
	async submitFeedback(
		searchId: string,
		query: string,
		positives: string[],
		note: string,
	) {
		return api.apiFeedback(this.config.dir, searchId, query, positives, note);
	}

	// Developer-only TODOs removed

	// ============================================================
	// UTILITIES
	// ============================================================

	/**
	 * Get thumbnail URL for image
	 */
	getThumbnailUrl(path: string): string {
		return api.thumbUrl(this.config.dir, this.config.provider, path);
	}

	/**
	 * Get face thumbnail URL
	 */
	getFaceThumbnailUrl(path: string, emb: number, size = 196): string {
		return api.thumbFaceUrl(
			this.config.dir,
			this.config.provider,
			path,
			emb,
			size,
		);
	}

	/**
	 * Auto-tag images
	 */
	async autoTag() {
		return api.apiAutotag(this.config.dir, this.config.provider);
	}
}

// Singleton instance
let apiInstance: PhotoVaultAPI | null = null;

export function initializeAPI(config: PhotoVaultConfig): PhotoVaultAPI {
	apiInstance = new PhotoVaultAPI(config);
	return apiInstance;
}

export function getAPI(): PhotoVaultAPI {
	if (!apiInstance) {
		throw new Error(
			"PhotoVault API not initialized. Call initializeAPI first.",
		);
	}
	return apiInstance;
}
