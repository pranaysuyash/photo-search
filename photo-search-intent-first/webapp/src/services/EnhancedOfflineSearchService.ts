import type { PhotoMeta } from "../models/PhotoMeta";
import {
	EnhancedOfflineStorage,
	enhancedOfflineStorage,
} from "./EnhancedOfflineStorage";

// Result from offline search
export interface OfflineSearchResult {
	photoId: string;
	path: string;
	thumbnail?: string;
	metadata?: PhotoMeta;
	similarity: number; // 0-1 similarity score
	cachedAt: number;
}

export interface OfflineSearchOptions {
	maxResults?: number;
	useEmbeddings?: boolean;
	useMetadata?: boolean;
	fallbackToKeywords?: boolean;
}

export class EnhancedOfflineSearchService {
	/**
	 * Perform a semantic search using cached embeddings
	 */
	async searchByEmbedding(
		queryEmbedding: number[],
		options?: OfflineSearchOptions,
	): Promise<OfflineSearchResult[]> {
		const maxResults = options?.maxResults || 24;
		const useEmbeddings = options?.useEmbeddings !== false; // default to true

		if (!useEmbeddings) {
			return [];
		}

		// Get all cached embeddings
		const allEmbeddings = await this.getAllCachedEmbeddings();

		// Calculate similarity between query embedding and all cached embeddings
		const similarities = allEmbeddings.map((item) => {
			const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);
			return {
				photoId: item.photoId,
				similarity,
			};
		});

		// Sort by similarity (highest first) and take top results
		similarities.sort((a, b) => b.similarity - a.similarity);
		const topSimilarities = similarities.slice(0, maxResults);

		// Get photo details for each result
		const results: OfflineSearchResult[] = [];
		for (const sim of topSimilarities) {
			const photo = await enhancedOfflineStorage.getPhoto(sim.photoId);
			if (photo) {
				results.push({
					photoId: photo.id,
					path: photo.path,
					thumbnail: photo.thumbnail,
					metadata: photo.metadata,
					similarity: sim.similarity,
					cachedAt: photo.cachedAt,
				});
			}
		}

		return results;
	}

	/**
	 * Perform a keyword-based search using cached metadata
	 */
	async searchByKeywords(
		keywords: string[],
		options?: OfflineSearchOptions,
	): Promise<OfflineSearchResult[]> {
		const maxResults = options?.maxResults || 24;
		const useMetadata = options?.useMetadata !== false; // default to true

		if (!useMetadata) {
			return [];
		}

		// Get all cached metadata
		const allPhotos = await this.getAllCachedPhotos();
		const keywordResults: OfflineSearchResult[] = [];

		for (const photo of allPhotos) {
			if (photo.metadata) {
				// Check for keyword matches in various metadata fields
				const score = this.scoreKeywordMatch(keywords, photo.metadata);
				if (score > 0) {
					keywordResults.push({
						photoId: photo.id,
						path: photo.path,
						thumbnail: photo.thumbnail,
						metadata: photo.metadata,
						similarity: score,
						cachedAt: photo.cachedAt,
					});
				}
			}
		}

		// Sort by keyword match score (highest first) and take top results
		keywordResults.sort((a, b) => b.similarity - a.similarity);
		return keywordResults.slice(0, maxResults);
	}

	/**
	 * Perform a hybrid search combining embedding similarity and keyword matching
	 */
	async hybridSearch(
		queryEmbedding: number[],
		keywords: string[],
		options?: OfflineSearchOptions,
	): Promise<OfflineSearchResult[]> {
		const embeddingResults = await this.searchByEmbedding(
			queryEmbedding,
			options,
		);
		const keywordResults = await this.searchByKeywords(keywords, options);

		// Combine and deduplicate results
		const resultMap = new Map<string, OfflineSearchResult>();

		// Add embedding results with higher weight
		for (const result of embeddingResults) {
			resultMap.set(result.photoId, {
				...result,
				similarity: result.similarity * 0.7, // 70% weight to embedding similarity
			});
		}

		// Add keyword results with lower weight
		for (const result of keywordResults) {
			if (resultMap.has(result.photoId)) {
				// Combine scores if photo exists in both results
				const existingResult = resultMap.get(result.photoId)!;
				existingResult.similarity += result.similarity * 0.3; // 30% weight to keyword match
			} else {
				// Add new result
				resultMap.set(result.photoId, {
					...result,
					similarity: result.similarity * 0.3,
				});
			}
		}

		// Convert map to array and sort by combined score
		const results = Array.from(resultMap.values());
		results.sort((a, b) => b.similarity - a.similarity);

		// Limit results
		const maxResults = options?.maxResults || 24;
		return results.slice(0, maxResults);
	}

	/**
	 * Perform text-based search using cached OCR text
	 */
	async searchByOCR(text: string): Promise<OfflineSearchResult[]> {
		// In a real implementation, this would search cached OCR text
		// For now, this is a placeholder
		console.log(`[EnhancedOfflineSearchService] Searching OCR for: ${text}`);

		// TODO: Implement OCR search when OCR data is available in PhotoMeta
		return [];
	}

	/**
	 * Calculate cosine similarity between two vectors
	 */
	private cosineSimilarity(vecA: number[], vecB: number[]): number {
		if (vecA.length !== vecB.length) {
			throw new Error("Vectors must have the same length");
		}

		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		for (let i = 0; i < vecA.length; i++) {
			dotProduct += vecA[i] * vecB[i];
			normA += vecA[i] ** 2;
			normB += vecB[i] ** 2;
		}

		if (normA === 0 || normB === 0) {
			return 0; // Vectors with zero magnitude are orthogonal
		}

		const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
		// Ensure similarity is in [0, 1] range (cosine similarity is [-1, 1], but we want [0, 1])
		return (similarity + 1) / 2;
	}

	/**
	 * Score how well keywords match the metadata
	 */
	private scoreKeywordMatch(keywords: string[], metadata: PhotoMeta): number {
		let score = 0;

		// Check title/description
		if (metadata.title || metadata.description) {
			const text = (metadata.title || "") + " " + (metadata.description || "");
			score += this.keywordMatchScore(keywords, text);
		}

		// Check tags
		if (metadata.tags && metadata.tags.length > 0) {
			const tagText = metadata.tags.join(" ");
			score += this.keywordMatchScore(keywords, tagText) * 1.5; // Tags are more important
		}

		// Check faces
		if (metadata.faces && metadata.faces.length > 0) {
			const faceIds = metadata.faces
				.map((face) => face.id)
				.filter((id) => id)
				.join(" ");
			score += this.keywordMatchScore(keywords, faceIds) * 1.2;
		}

		// Check camera/lens info as fallback for EXIF-like data
		if (metadata.camera || metadata.lens) {
			const cameraText = [metadata.camera, metadata.lens]
				.filter(Boolean)
				.join(" ");
			score += this.keywordMatchScore(keywords, cameraText) * 0.5;
		}

		return Math.min(1, score); // Normalize to 0-1 range
	}

	/**
	 * Calculate a score for how well keywords match a text
	 */
	private keywordMatchScore(keywords: string[], text: string): number {
		const lowerText = text.toLowerCase();
		let score = 0;

		for (const keyword of keywords) {
			const lowerKeyword = keyword.toLowerCase();
			if (lowerText.includes(lowerKeyword)) {
				score +=
					1 +
					(lowerText.match(new RegExp(lowerKeyword, "g")) || []).length * 0.1;
			}
		}

		return score;
	}

	/**
	 * Get all cached embeddings
	 */
	private async getAllCachedEmbeddings(): Promise<
		{ photoId: string; embedding: number[] }[]
	> {
		try {
			// Get all photos and extract their embeddings
			const allPhotos = await enhancedOfflineStorage.getAllPhotos();
			const embeddings: { photoId: string; embedding: number[] }[] = [];

			for (const photo of allPhotos) {
				if (photo.embedding && photo.embedding.length > 0) {
					embeddings.push({
						photoId: photo.id,
						embedding: photo.embedding,
					});
				}
			}

			return embeddings;
		} catch (error) {
			console.error(
				"[EnhancedOfflineSearchService] Failed to get cached embeddings:",
				error,
			);
			return [];
		}
	}

	/**
	 * Get all cached photos
	 */
	private async getAllCachedPhotos(): Promise<
		import("./EnhancedOfflineStorage").OfflinePhotoStorage[]
	> {
		try {
			return await enhancedOfflineStorage.getAllPhotos();
		} catch (error) {
			console.error(
				"[EnhancedOfflineSearchService] Failed to get cached photos:",
				error,
			);
			return [];
		}
	}

	/**
	 * Precompute and cache embeddings for all photos
	 * This would typically run when the app is online to prepare for offline use
	 */
	async precomputeEmbeddings(): Promise<void> {
		console.log(
			"[EnhancedOfflineSearchService] Precomputing embeddings for offline use",
		);
		// This would iterate through all photos and generate/store embeddings
		// Implementation would depend on the specific CLIP model or embedding approach used
	}

	/**
	 * Check if offline search is supported
	 */
	isSupported(): boolean {
		return EnhancedOfflineStorage.isSupported();
	}
}

// Singleton instance
export const enhancedOfflineSearchService = new EnhancedOfflineSearchService();
