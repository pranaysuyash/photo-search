/**
 * PhotoVault Comprehensive API Service
 * Integrates ALL 47 backend endpoints with proper typing and error handling
 */

import * as api from "../api";

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
		return api.apiSearch(this.config.dir, query, this.config.provider, topK, {
			hfToken: this.config.hfToken,
			openaiKey: this.config.openaiKey,
			...opts,
		});
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
		return api.apiIndex(
			this.config.dir,
			this.config.provider,
			batchSize,
			this.config.hfToken,
			this.config.openaiKey,
		);
	}

	/**
	 * Build fast index (FAISS/Annoy/HNSW)
	 */
	async buildFastIndex(kind: "annoy" | "faiss" | "hnsw") {
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
		return api.apiSetCollection(this.config.dir, name, paths);
	}

	/**
	 * Delete a collection
	 */
	async deleteCollection(name: string) {
		return api.apiDeleteCollection(this.config.dir, name);
	}

	/**
	 * Get smart collections
	 */
	async getSmartCollections() {
		return api.apiGetSmart(this.config.dir);
	}

	/**
	 * Create smart collection with rules
	 */
	async setSmartCollection(name: string, rules: unknown) {
		return api.apiSetSmart(this.config.dir, name, rules);
	}

	/**
	 * Delete smart collection
	 */
	async deleteSmartCollection(name: string) {
		return api.apiDeleteSmart(this.config.dir, name);
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
		return api.apiBuildFaces(this.config.dir, this.config.provider);
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
	 * Build OCR text extraction
	 */
	async buildOCR(languages?: string[]) {
		return api.apiBuildOCR(
			this.config.dir,
			this.config.provider,
			languages,
			this.config.hfToken,
			this.config.openaiKey,
		);
	}

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
	 * Build metadata extraction
	 */
	async buildMetadata() {
		return api.apiBuildMetadata(
			this.config.dir,
			this.config.provider,
			this.config.hfToken,
			this.config.openaiKey,
		);
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
		return api.apiSetTags(this.config.dir, path, tags);
	}

	/**
	 * Get location/map data
	 */
	async getMapData() {
		return api.apiMap(this.config.dir);
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
		return api.apiSetFavorite(this.config.dir, path, favorite);
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
		return api.apiAddSaved(this.config.dir, name, query, topK);
	}

	/**
	 * Delete saved search
	 */
	async deleteSavedSearch(name: string) {
		return api.apiDeleteSaved(this.config.dir, name);
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
		return api.apiDelete(this.config.dir, paths, useOsTrash);
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
