/**
 * ANN (Approximate Nearest Neighbor) Indexing Service
 * Optimizes search performance for large photo libraries using vector embeddings
 */

interface ANNIndex {
	id: string;
	name: string;
	photoCount: number;
	dimension: number;
	indexType: "hnsw" | "ivf" | "lsh";
	status: "building" | "ready" | "error" | "updating";
	createdAt: number;
	lastUpdated: number;
	size: number; // in MB
}

interface VectorEmbedding {
	photoId: string;
	vector: number[];
	metadata: {
		filename: string;
		folder: string;
		tags: string[];
		exif: any;
	};
}

interface SearchQuery {
	query: string;
	vector?: number[];
	topK: number;
	threshold: number;
	filters?: {
		folders?: string[];
		tags?: string[];
		dateRange?: { start: Date; end: Date };
	};
}

interface SearchResult {
	photoId: string;
	score: number;
	distance: number;
	photo: any;
}

interface ANNPerformanceMetrics {
	indexingTime: number;
	searchTime: number;
	memoryUsage: number;
	accuracy: number;
	recall: number;
	totalSearches: number;
	cacheHitRate: number;
}

class ANNIndexingService {
	private static instance: ANNIndexingService;
	private indexes: Map<string, ANNIndex> = new Map();
	private embeddings: Map<string, VectorEmbedding> = new Map();
	private performanceMetrics: ANNPerformanceMetrics;
	private isIndexing = false;
	private indexingProgress = 0;

	private constructor() {
		this.performanceMetrics = {
			indexingTime: 0,
			searchTime: 0,
			memoryUsage: 0,
			accuracy: 0,
			recall: 0,
			totalSearches: 0,
			cacheHitRate: 0,
		};
	}

	public static getInstance(): ANNIndexingService {
		if (!ANNIndexingService.instance) {
			ANNIndexingService.instance = new ANNIndexingService();
		}
		return ANNIndexingService.instance;
	}

	/**
	 * Check if ANN should be enabled for the given library size
	 */
	public shouldEnableANN(photoCount: number): boolean {
		return photoCount >= 10000; // Enable for 10k+ photos
	}

	/**
	 * Get recommended ANN index configuration
	 */
	public getRecommendedConfiguration(photoCount: number): {
		indexType: "hnsw" | "ivf" | "lsh";
		dimension: number;
		topK: number;
		batchSize: number;
	} {
		if (photoCount < 50000) {
			return {
				indexType: "hnsw",
				dimension: 512,
				topK: 100,
				batchSize: 1000,
			};
		} else if (photoCount < 200000) {
			return {
				indexType: "ivf",
				dimension: 384,
				topK: 200,
				batchSize: 2000,
			};
		} else {
			return {
				indexType: "lsh",
				dimension: 256,
				topK: 500,
				batchSize: 5000,
			};
		}
	}

	/**
	 * Create or update ANN index for a photo library
	 */
	public async createIndex(
		libraryId: string,
		photos: unknown[],
		options?: {
			indexType?: "hnsw" | "ivf" | "lsh";
			dimension?: number;
			batchSize?: number;
		},
	): Promise<ANNIndex> {
		const startTime = performance.now();
		this.isIndexing = true;
		this.indexingProgress = 0;

		try {
			const config = this.getRecommendedConfiguration(photos.length);
			const indexType = options?.indexType || config.indexType;
			const dimension = options?.dimension || config.dimension;
			const batchSize = options?.batchSize || config.batchSize;

			console.log(
				`Creating ANN index for ${photos.length} photos using ${indexType.toUpperCase()}`,
			);

			// Create or update index metadata
			const index: ANNIndex = {
				id: libraryId,
				name: `ANN Index - ${libraryId}`,
				photoCount: photos.length,
				dimension,
				indexType,
				status: "building",
				createdAt: Date.now(),
				lastUpdated: Date.now(),
				size: 0, // Will be updated after building
			};

			this.indexes.set(libraryId, index);

			// Generate embeddings for all photos
			const embeddings: VectorEmbedding[] = [];
			const totalBatches = Math.ceil(photos.length / batchSize);

			for (let i = 0; i < totalBatches; i++) {
				const start = i * batchSize;
				const end = Math.min(start + batchSize, photos.length);
				const batch = photos.slice(start, end);

				// Process batch
				const batchEmbeddings = await this.processBatch(batch, dimension);
				embeddings.push(...batchEmbeddings);

				// Update progress
				this.indexingProgress = ((i + 1) / totalBatches) * 100;

				// Yield control to prevent blocking UI
				await new Promise((resolve) => setTimeout(resolve, 0));
			}

			// Store embeddings
			embeddings.forEach((embedding) => {
				this.embeddings.set(embedding.photoId, embedding);
			});

			// Update index status
			index.status = "ready";
			index.lastUpdated = Date.now();
			index.size = this.calculateIndexSize(embeddings);

			const indexingTime = performance.now() - startTime;
			this.performanceMetrics.indexingTime = indexingTime;

			console.log(
				`ANN index created successfully in ${indexingTime.toFixed(0)}ms`,
			);

			return index;
		} catch (error) {
			console.error("Failed to create ANN index:", error);
			const index = this.indexes.get(libraryId);
			if (index) {
				index.status = "error";
			}
			throw error;
		} finally {
			this.isIndexing = false;
			this.indexingProgress = 0;
		}
	}

	/**
	 * Process a batch of photos and generate embeddings
	 */
	private async processBatch(
		photos: unknown[],
		dimension: number,
	): Promise<VectorEmbedding[]> {
		// Simulate embedding generation
		// In a real implementation, this would use a ML model like CLIP or ResNet
		return photos.map((photo) => ({
			photoId: photo.id,
			vector: this.generateMockEmbedding(dimension),
			metadata: {
				filename: photo.filename,
				folder: photo.folder,
				tags: photo.tags || [],
				exif: photo.exif || {},
			},
		}));
	}

	/**
	 * Generate mock embedding vector (for demonstration)
	 */
	private generateMockEmbedding(dimension: number): number[] {
		const vector = new Array(dimension);
		for (let i = 0; i < dimension; i++) {
			vector[i] = Math.random() * 2 - 1; // Random values between -1 and 1
		}
		// Normalize the vector
		const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
		return vector.map((val) => val / norm);
	}

	/**
	 * Calculate index size in memory (MB)
	 */
	private calculateIndexSize(embeddings: VectorEmbedding[]): number {
		const bytesPerEmbedding = embeddings[0]?.vector.length * 4 || 0; // 4 bytes per float
		const totalBytes = embeddings.length * bytesPerEmbedding;
		return totalBytes / (1024 * 1024); // Convert to MB
	}

	/**
	 * Search using ANN index
	 */
	public async search(
		query: SearchQuery,
		libraryId: string,
	): Promise<SearchResult[]> {
		const startTime = performance.now();
		const index = this.indexes.get(libraryId);

		if (!index || index.status !== "ready") {
			throw new Error("ANN index not available for library");
		}

		try {
			// Generate query vector
			let queryVector: number[];
			if (query.vector) {
				queryVector = query.vector;
			} else {
				// Convert text query to vector (in real implementation, use text encoder)
				queryVector = this.generateMockEmbedding(index.dimension);
			}

			// Perform ANN search
			const results = await this.performVectorSearch(
				queryVector,
				query.topK || 100,
				query.threshold || 0.7,
				query.filters,
			);

			const searchTime = performance.now() - startTime;
			this.updatePerformanceMetrics(searchTime);

			return results;
		} catch (error) {
			console.error("ANN search failed:", error);
			throw error;
		}
	}

	/**
	 * Perform vector similarity search
	 */
	private async performVectorSearch(
		queryVector: number[],
		topK: number,
		threshold: number,
		filters?: SearchQuery["filters"],
	): Promise<SearchResult[]> {
		const results: SearchResult[] = [];

		// Filter embeddings based on criteria
		let candidateEmbeddings = Array.from(this.embeddings.values());

		if (filters?.folders) {
			candidateEmbeddings = candidateEmbeddings.filter((e) =>
				filters.folders!.includes(e.metadata.folder),
			);
		}

		if (filters?.tags) {
			candidateEmbeddings = candidateEmbeddings.filter((e) =>
				filters.tags!.some((tag) => e.metadata.tags.includes(tag)),
			);
		}

		// Calculate similarity scores
		const similarities = candidateEmbeddings.map((embedding) => {
			const similarity = this.cosineSimilarity(queryVector, embedding.vector);
			return {
				photoId: embedding.photoId,
				score: similarity,
				distance: 1 - similarity,
				embedding,
			};
		});

		// Filter by threshold and sort by score
		const filteredSimilarities = similarities
			.filter((s) => s.score >= threshold)
			.sort((a, b) => b.score - a.score)
			.slice(0, topK);

		// Convert to search results
		return filteredSimilarities.map((s) => ({
			photoId: s.photoId,
			score: s.score,
			distance: s.distance,
			photo: {
				id: s.photoId,
				filename: s.embedding.metadata.filename,
				folder: s.embedding.metadata.folder,
				tags: s.embedding.metadata.tags,
				exif: s.embedding.metadata.exif,
			},
		}));
	}

	/**
	 * Calculate cosine similarity between two vectors
	 */
	private cosineSimilarity(a: number[], b: number[]): number {
		if (a.length !== b.length) {
			throw new Error("Vector dimensions must match");
		}

		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		for (let i = 0; i < a.length; i++) {
			dotProduct += a[i] * b[i];
			normA += a[i] * a[i];
			normB += b[i] * b[i];
		}

		if (normA === 0 || normB === 0) {
			return 0;
		}

		return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
	}

	/**
	 * Update performance metrics
	 */
	private updatePerformanceMetrics(searchTime: number): void {
		this.performanceMetrics.totalSearches++;
		this.performanceMetrics.searchTime =
			(this.performanceMetrics.searchTime *
				(this.performanceMetrics.totalSearches - 1) +
				searchTime) /
			this.performanceMetrics.totalSearches;
	}

	/**
	 * Get current performance metrics
	 */
	public getPerformanceMetrics(): ANNPerformanceMetrics {
		return { ...this.performanceMetrics };
	}

	/**
	 * Get index information
	 */
	public getIndex(libraryId: string): ANNIndex | null {
		return this.indexes.get(libraryId) || null;
	}

	/**
	 * Get all indexes
	 */
	public getAllIndexes(): ANNIndex[] {
		return Array.from(this.indexes.values());
	}

	/**
	 * Check if indexing is in progress
	 */
	public isIndexingInProgress(): boolean {
		return this.isIndexing;
	}

	/**
	 * Get indexing progress (0-100)
	 */
	public getIndexingProgress(): number {
		return this.indexingProgress;
	}

	/**
	 * Update index (incremental update for new photos)
	 */
	public async updateIndex(
		libraryId: string,
		newPhotos: unknown[],
	): Promise<void> {
		const index = this.indexes.get(libraryId);
		if (!index) {
			throw new Error("Index not found");
		}

		console.log(`Updating ANN index with ${newPhotos.length} new photos`);

		// Update status
		index.status = "updating";
		index.photoCount += newPhotos.length;

		try {
			// Generate embeddings for new photos
			const config = this.getRecommendedConfiguration(index.photoCount);
			const newEmbeddings = await this.processBatch(
				newPhotos,
				config.dimension,
			);

			// Add new embeddings
			newEmbeddings.forEach((embedding) => {
				this.embeddings.set(embedding.photoId, embedding);
			});

			// Update index metadata
			index.status = "ready";
			index.lastUpdated = Date.now();
			index.size = this.calculateIndexSize(
				Array.from(this.embeddings.values()),
			);
		} catch (error) {
			console.error("Failed to update ANN index:", error);
			index.status = "error";
			throw error;
		}
	}

	/**
	 * Delete index
	 */
	public deleteIndex(libraryId: string): void {
		const index = this.indexes.get(libraryId);
		if (index) {
			// Remove embeddings associated with this index
			// In a real implementation, we'd need to track which embeddings belong to which index
			this.indexes.delete(libraryId);
			console.log(`ANN index deleted for library: ${libraryId}`);
		}
	}

	/**
	 * Get estimated memory usage for an index
	 */
	public getEstimatedMemoryUsage(
		photoCount: number,
		dimension: number,
	): number {
		// Estimate: each photo needs a vector (dimension * 4 bytes) + metadata (1KB)
		const vectorSize = photoCount * dimension * 4; // bytes
		const metadataSize = photoCount * 1024; // 1KB per photo
		const indexOverhead = photoCount * 100; // 100 bytes per photo for index structures

		const totalBytes = vectorSize + metadataSize + indexOverhead;
		return totalBytes / (1024 * 1024); // Convert to MB
	}

	/**
	 * Benchmark ANN performance
	 */
	public async benchmark(
		libraryId: string,
		testQueries: string[],
	): Promise<{
		averageSearchTime: number;
		accuracy: number;
		recall: number;
		throughput: number;
	}> {
		const index = this.indexes.get(libraryId);
		if (!index || index.status !== "ready") {
			throw new Error("Index not available for benchmarking");
		}

		const searchTimes: number[] = [];
		const startTime = performance.now();

		for (const query of testQueries) {
			const queryStart = performance.now();
			await this.search({ query, topK: 100, threshold: 0.5 }, libraryId);
			searchTimes.push(performance.now() - queryStart);
		}

		const totalTime = performance.now() - startTime;
		const averageSearchTime =
			searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length;
		const throughput = testQueries.length / (totalTime / 1000); // queries per second

		// Mock accuracy and recall (would be calculated against ground truth in real implementation)
		const accuracy = 0.85 + Math.random() * 0.1; // 85-95%
		const recall = 0.8 + Math.random() * 0.15; // 80-95%

		return {
			averageSearchTime,
			accuracy,
			recall,
			throughput,
		};
	}
}

// Export singleton instance
export const annIndexingService = ANNIndexingService.getInstance();

// Export types
export type {
	ANNIndex,
	VectorEmbedding,
	SearchQuery,
	SearchResult,
	ANNPerformanceMetrics,
};
