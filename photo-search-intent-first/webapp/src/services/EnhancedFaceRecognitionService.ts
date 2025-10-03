/**
 * Enhanced Face Recognition Service
 * Provides advanced face clustering, recognition, and management capabilities
 */

export interface FaceDetection {
	id: string;
	bbox: [number, number, number, number]; // x, y, width, height
	confidence: number;
	quality_score: number;
	embedding_index: number;
	cluster_id?: number;
}

export interface FaceCluster {
	id: string;
	name: string;
	size: number;
	examples: Array<{
		photo_path: string;
		face_idx: number;
	}>;
	confidence: number;
	centroid_embedding?: number[];
}

export interface FaceSearchResult {
	photo_path: string;
	face_idx: number;
	similarity: number;
	cluster: number;
	bbox: [number, number, number, number];
}

export interface FaceQualityStats {
	total_faces: number;
	high_quality_faces: number;
	average_quality: number;
	high_quality_ratio: number;
}

export interface SimilarFaceSearchRequest {
	dir: string;
	photo_path: string;
	face_idx: number;
	threshold?: number;
}

export interface FaceClusterOperation {
	dir: string;
	source_cluster_id?: string;
	target_cluster_id?: string;
	cluster_id?: string;
	photo_paths?: string[];
}

export interface FaceIndexingRequest {
	dir: string;
	provider?: string;
	clustering_method?: string;
	min_cluster_size?: number;
	similarity_threshold?: number;
	quality_threshold?: number;
}

class EnhancedFaceRecognitionService {
	private static instance: EnhancedFaceRecognitionService;
	private baseUrl: string;
	private cache: Map<string, any> = new Map();
	private cacheTimeout = 5 * 60 * 1000; // 5 minutes

	private constructor() {
		this.baseUrl = "/api/v1";
	}

	public static getInstance(): EnhancedFaceRecognitionService {
		if (!EnhancedFaceRecognitionService.instance) {
			EnhancedFaceRecognitionService.instance =
				new EnhancedFaceRecognitionService();
		}
		return EnhancedFaceRecognitionService.instance;
	}

	/**
	 * Build enhanced face index for a directory
	 */
	public async buildFaceIndex(request: FaceIndexingRequest): Promise<{
		updated: number;
		faces: number;
		clusters: number;
		unclustered_faces?: number;
	}> {
		const response = await fetch(`${this.baseUrl}/enhanced_faces/build`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			throw new Error(`Failed to build face index: ${response.statusText}`);
		}

		const result = await response.json();

		// Clear cache after successful indexing
		this.cache.clear();

		return result;
	}

	/**
	 * Get all face clusters for a directory
	 */
	public async getFaceClusters(directory: string): Promise<FaceCluster[]> {
		const cacheKey = `clusters_${directory}`;
		const cached = this.cache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		const response = await fetch(
			`${this.baseUrl}/enhanced_faces/clusters?directory=${encodeURIComponent(directory)}`,
		);

		if (!response.ok) {
			throw new Error(`Failed to get face clusters: ${response.statusText}`);
		}

		const result = await response.json();
		const clusters = result.clusters || [];

		// Cache the result
		this.cache.set(cacheKey, {
			data: clusters,
			timestamp: Date.now(),
		});

		return clusters;
	}

	/**
	 * Merge two face clusters together
	 */
	public async mergeFaceClusters(request: FaceClusterOperation): Promise<{
		ok: boolean;
		merged_into: string;
		source: string;
		message: string;
	}> {
		const response = await fetch(`${this.baseUrl}/enhanced_faces/merge`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			throw new Error(`Failed to merge face clusters: ${response.statusText}`);
		}

		const result = await response.json();

		// Clear relevant cache entries
		this.cache.delete(`clusters_${request.dir}`);

		return result;
	}

	/**
	 * Split a face cluster
	 */
	public async splitFaceCluster(request: FaceClusterOperation): Promise<{
		ok: boolean;
		new_cluster_id: string;
		photos: string[];
		original_cluster: string;
		message: string;
	}> {
		const response = await fetch(`${this.baseUrl}/enhanced_faces/split`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			throw new Error(`Failed to split face cluster: ${response.statusText}`);
		}

		const result = await response.json();

		// Clear relevant cache entries
		this.cache.delete(`clusters_${request.dir}`);

		return result;
	}

	/**
	 * Find faces similar to a specified face
	 */
	public async findSimilarFaces(request: SimilarFaceSearchRequest): Promise<{
		ok: boolean;
		target_face: { photo_path: string; face_idx: number };
		similar_faces: FaceSearchResult[];
		count: number;
	}> {
		const response = await fetch(
			`${this.baseUrl}/enhanced_faces/find_similar`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(request),
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to find similar faces: ${response.statusText}`);
		}

		return await response.json();
	}

	/**
	 * Get face quality statistics
	 */
	public async getFaceQualityStats(
		directory: string,
	): Promise<FaceQualityStats> {
		const cacheKey = `quality_${directory}`;
		const cached = this.cache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		const response = await fetch(
			`${this.baseUrl}/enhanced_faces/quality_stats?directory=${encodeURIComponent(directory)}`,
		);

		if (!response.ok) {
			throw new Error(
				`Failed to get face quality stats: ${response.statusText}`,
			);
		}

		const result = await response.json();

		// Cache the result
		this.cache.set(cacheKey, {
			data: result,
			timestamp: Date.now(),
		});

		return result;
	}

	/**
	 * Set cluster name (using existing endpoint)
	 */
	public async setClusterName(
		directory: string,
		clusterId: string,
		name: string,
	): Promise<{ ok: boolean; names: Record<string, string> }> {
		const response = await fetch(`${this.baseUrl}/faces/set_name`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				dir: directory,
				cluster_id: clusterId,
				name: name,
			}),
		});

		if (!response.ok) {
			throw new Error(`Failed to set cluster name: ${response.statusText}`);
		}

		const result = await response.json();

		// Clear relevant cache entries
		this.cache.delete(`clusters_${directory}`);

		return result;
	}

	/**
	 * Get photos for a specific person
	 */
	public async getPhotosForPerson(
		directory: string,
		personName: string,
	): Promise<string[]> {
		const cacheKey = `person_${directory}_${personName}`;
		const cached = this.cache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		const response = await fetch(
			`${this.baseUrl}/faces/person?dir=${encodeURIComponent(directory)}&person=${encodeURIComponent(personName)}`,
		);

		if (!response.ok) {
			throw new Error(
				`Failed to get photos for person: ${response.statusText}`,
			);
		}

		const result = await response.json();
		const photos = result.photos || [];

		// Cache the result
		this.cache.set(cacheKey, {
			data: photos,
			timestamp: Date.now(),
		});

		return photos;
	}

	/**
	 * Analyze face clustering performance
	 */
	public analyzeClusteringPerformance(clusters: FaceCluster[]): {
		totalClusters: number;
		averageClusterSize: number;
		largestClusterSize: number;
		smallestClusterSize: number;
		unnamedClusters: number;
		namedClusters: number;
	} {
		if (clusters.length === 0) {
			return {
				totalClusters: 0,
				averageClusterSize: 0,
				largestClusterSize: 0,
				smallestClusterSize: 0,
				unnamedClusters: 0,
				namedClusters: 0,
			};
		}

		const sizes = clusters.map((c) => c.size);
		const namedClusters = clusters.filter(
			(c) => c.name && c.name.trim() !== "",
		).length;
		const unnamedClusters = clusters.length - namedClusters;

		return {
			totalClusters: clusters.length,
			averageClusterSize:
				sizes.reduce((sum, size) => sum + size, 0) / clusters.length,
			largestClusterSize: Math.max(...sizes),
			smallestClusterSize: Math.min(...sizes),
			unnamedClusters,
			namedClusters,
		};
	}

	/**
	 * Get cluster quality assessment
	 */
	public assessClusterQuality(clusters: FaceCluster[]): {
		highQualityClusters: string[];
		mediumQualityClusters: string[];
		lowQualityClusters: string[];
		recommendations: string[];
	} {
		const highQualityClusters: string[] = [];
		const mediumQualityClusters: string[] = [];
		const lowQualityClusters: string[] = [];
		const recommendations: string[] = [];

		clusters.forEach((cluster) => {
			// Assess quality based on size and confidence
			if (cluster.size >= 10 && cluster.confidence >= 0.8) {
				highQualityClusters.push(cluster.id);
			} else if (cluster.size >= 5 && cluster.confidence >= 0.6) {
				mediumQualityClusters.push(cluster.id);
			} else {
				lowQualityClusters.push(cluster.id);
			}

			// Generate recommendations
			if (cluster.size < 3 && cluster.confidence < 0.5) {
				recommendations.push(
					`Consider reviewing cluster ${cluster.id} (${cluster.size} faces, low confidence)`,
				);
			}
			if (cluster.size > 50) {
				recommendations.push(
					`Large cluster ${cluster.id} (${cluster.size} faces) might need splitting`,
				);
			}
		});

		return {
			highQualityClusters,
			mediumQualityClusters,
			lowQualityClusters,
			recommendations,
		};
	}

	/**
	 * Clear cache
	 */
	public clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	public getCacheStats(): {
		size: number;
		keys: string[];
	} {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys()),
		};
	}
}

// Export singleton instance
export const enhancedFaceRecognitionService =
	EnhancedFaceRecognitionService.getInstance();

// Export types
export type {
	FaceDetection,
	FaceCluster,
	FaceSearchResult,
	FaceQualityStats,
	SimilarFaceSearchRequest,
	FaceClusterOperation,
	FaceIndexingRequest,
};
