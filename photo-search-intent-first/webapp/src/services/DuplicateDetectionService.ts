/**
 * Duplicate Detection Service
 * Visual similarity clustering and near-duplicate identification
 */

export interface DuplicateGroup {
	id: string;
	photos: PhotoFingerprint[];
	bestPhoto: PhotoFingerprint;
	similarity: number;
	type: "exact" | "near" | "similar";
	sizeReduction: number; // Bytes that could be saved
}

export interface PhotoFingerprint {
	path: string;
	hash: string;
	perceptualHash: string;
	fileSize: number;
	dimensions: { width: number; height: number };
	quality: number;
	timestamp: number;
	embedding?: number[];
}

export interface DuplicateDetectionResult {
	groups: DuplicateGroup[];
	totalDuplicates: number;
	potentialSavings: number;
	recommendations: string[];
}

export class DuplicateDetectionService {
	private static readonly EXACT_THRESHOLD = 1.0;
	private static readonly NEAR_THRESHOLD = 0.95;
	private static readonly SIMILAR_THRESHOLD = 0.85;

	private static fingerprintCache = new Map<string, PhotoFingerprint>();
	private static duplicateGroups = new Map<string, DuplicateGroup>();

	/**
	 * Detect duplicates in a photo library
	 */
	static async detectDuplicates(
		photos: Array<{ path: string; embedding?: number[] }>,
		progressCallback?: (progress: number) => void,
	): Promise<DuplicateDetectionResult> {
		const fingerprints: PhotoFingerprint[] = [];
		const groups: DuplicateGroup[] = [];

		// Generate fingerprints for all photos
		let processed = 0;
		for (const photo of photos) {
			const fingerprint = await DuplicateDetectionService.generateFingerprint(
				photo.path,
				photo.embedding,
			);
			fingerprints.push(fingerprint);

			processed++;
			if (progressCallback) {
				progressCallback((processed / photos.length) * 50); // First 50% for fingerprinting
			}
		}

		// Find duplicate groups
		const duplicateMap = new Map<string, PhotoFingerprint[]>();
		const processedPairs = new Set<string>();

		for (let i = 0; i < fingerprints.length; i++) {
			for (let j = i + 1; j < fingerprints.length; j++) {
				const pairKey = `${i}-${j}`;
				if (processedPairs.has(pairKey)) continue;
				processedPairs.add(pairKey);

				const similarity = DuplicateDetectionService.calculateSimilarity(
					fingerprints[i],
					fingerprints[j],
				);

				if (similarity >= DuplicateDetectionService.SIMILAR_THRESHOLD) {
					const groupKey = DuplicateDetectionService.getGroupKey(
						fingerprints[i],
						fingerprints[j],
						similarity,
					);

					if (!duplicateMap.has(groupKey)) {
						duplicateMap.set(groupKey, []);
					}

					const group = duplicateMap.get(groupKey)!;
					if (!group.includes(fingerprints[i])) group.push(fingerprints[i]);
					if (!group.includes(fingerprints[j])) group.push(fingerprints[j]);
				}
			}

			if (progressCallback) {
				progressCallback(50 + (i / fingerprints.length) * 50); // Second 50% for comparison
			}
		}

		// Create duplicate groups
		let totalSavings = 0;
		duplicateMap.forEach((photos, key) => {
			const bestPhoto = DuplicateDetectionService.selectBestPhoto(photos);
			const similarity = DuplicateDetectionService.getAverageSimilarity(photos);
			const type = DuplicateDetectionService.getDuplicateType(similarity);

			// Calculate potential savings
			const sizeReduction = photos
				.filter((p) => p !== bestPhoto)
				.reduce((sum, p) => sum + p.fileSize, 0);

			totalSavings += sizeReduction;

			groups.push({
				id: key,
				photos,
				bestPhoto,
				similarity,
				type,
				sizeReduction,
			});
		});

		// Sort groups by potential savings
		groups.sort((a, b) => b.sizeReduction - a.sizeReduction);

		// Generate recommendations
		const recommendations =
			DuplicateDetectionService.generateRecommendations(groups);

		return {
			groups,
			totalDuplicates: groups.reduce((sum, g) => sum + g.photos.length - 1, 0),
			potentialSavings: totalSavings,
			recommendations,
		};
	}

	/**
	 * Generate fingerprint for a photo
	 */
	private static async generateFingerprint(
		path: string,
		embedding?: number[],
	): Promise<PhotoFingerprint> {
		// Check cache first
		if (DuplicateDetectionService.fingerprintCache.has(path)) {
			return DuplicateDetectionService.fingerprintCache.get(path)!;
		}

		// Generate hashes
		const hash = await DuplicateDetectionService.calculateFileHash(path);
		const perceptualHash =
			await DuplicateDetectionService.calculatePerceptualHash(path);

		// Get file metadata (simulated for now)
		const fingerprint: PhotoFingerprint = {
			path,
			hash,
			perceptualHash,
			fileSize: Math.floor(Math.random() * 10000000), // Simulated
			dimensions: {
				width: 1920 + Math.floor(Math.random() * 2000),
				height: 1080 + Math.floor(Math.random() * 1000),
			},
			quality: 70 + Math.floor(Math.random() * 30),
			timestamp: Date.now() - Math.floor(Math.random() * 31536000000), // Random date within last year
			embedding,
		};

		DuplicateDetectionService.fingerprintCache.set(path, fingerprint);
		return fingerprint;
	}

	/**
	 * Calculate file hash (MD5 or SHA256)
	 */
	private static async calculateFileHash(path: string): Promise<string> {
		// In production, this would read the file and calculate actual hash
		// For now, simulate with path-based hash
		let hash = 0;
		for (let i = 0; i < path.length; i++) {
			const char = path.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash).toString(16);
	}

	/**
	 * Calculate perceptual hash for visual similarity
	 */
	private static async calculatePerceptualHash(_path: string): Promise<string> {
		// Simplified pHash algorithm simulation
		// In production, this would:
		// 1. Resize image to 32x32
		// 2. Convert to grayscale
		// 3. Calculate DCT
		// 4. Generate hash from DCT coefficients

		const hash = new Array(16)
			.fill(0)
			.map(() => Math.floor(Math.random() * 16).toString(16))
			.join("");

		return hash;
	}

	/**
	 * Calculate similarity between two photos
	 */
	private static calculateSimilarity(
		photo1: PhotoFingerprint,
		photo2: PhotoFingerprint,
	): number {
		// Check exact match first
		if (photo1.hash === photo2.hash) {
			return 1.0;
		}

		// Calculate perceptual hash similarity (Hamming distance)
		const hashSimilarity = DuplicateDetectionService.comparePerceptualHashes(
			photo1.perceptualHash,
			photo2.perceptualHash,
		);

		// If embeddings available, use cosine similarity
		let embeddingSimilarity = 0;
		if (photo1.embedding && photo2.embedding) {
			embeddingSimilarity = DuplicateDetectionService.cosineSimilarity(
				photo1.embedding,
				photo2.embedding,
			);
		}

		// Weighted combination
		const weights = {
			hash: 0.3,
			embedding: 0.5,
			metadata: 0.2,
		};

		// Metadata similarity (dimensions, timestamp)
		const dimensionSimilarity = DuplicateDetectionService.compareDimensions(
			photo1.dimensions,
			photo2.dimensions,
		);
		const timeSimilarity = DuplicateDetectionService.compareTimestamps(
			photo1.timestamp,
			photo2.timestamp,
		);
		const metadataSimilarity = (dimensionSimilarity + timeSimilarity) / 2;

		return (
			hashSimilarity * weights.hash +
			embeddingSimilarity * weights.embedding +
			metadataSimilarity * weights.metadata
		);
	}

	/**
	 * Compare perceptual hashes using Hamming distance
	 */
	private static comparePerceptualHashes(hash1: string, hash2: string): number {
		let distance = 0;
		const maxLength = Math.max(hash1.length, hash2.length);

		for (let i = 0; i < maxLength; i++) {
			if (hash1[i] !== hash2[i]) {
				distance++;
			}
		}

		return 1 - distance / maxLength;
	}

	/**
	 * Calculate cosine similarity between embeddings
	 */
	private static cosineSimilarity(vec1: number[], vec2: number[]): number {
		let dotProduct = 0;
		let norm1 = 0;
		let norm2 = 0;

		for (let i = 0; i < vec1.length; i++) {
			dotProduct += vec1[i] * vec2[i];
			norm1 += vec1[i] * vec1[i];
			norm2 += vec2[i] * vec2[i];
		}

		return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
	}

	/**
	 * Compare image dimensions
	 */
	private static compareDimensions(
		dim1: { width: number; height: number },
		dim2: { width: number; height: number },
	): number {
		const widthRatio =
			Math.min(dim1.width, dim2.width) / Math.max(dim1.width, dim2.width);
		const heightRatio =
			Math.min(dim1.height, dim2.height) / Math.max(dim1.height, dim2.height);
		return (widthRatio + heightRatio) / 2;
	}

	/**
	 * Compare timestamps
	 */
	private static compareTimestamps(time1: number, time2: number): number {
		const diff = Math.abs(time1 - time2);
		const maxDiff = 86400000; // 1 day in milliseconds
		return Math.max(0, 1 - diff / maxDiff);
	}

	/**
	 * Select the best photo from a duplicate group
	 */
	private static selectBestPhoto(photos: PhotoFingerprint[]): PhotoFingerprint {
		// Score each photo based on multiple criteria
		let bestPhoto = photos[0];
		let bestScore = 0;

		for (const photo of photos) {
			let score = 0;

			// Prefer higher resolution
			score += (photo.dimensions.width * photo.dimensions.height) / 10000000;

			// Prefer higher quality
			score += photo.quality / 100;

			// Prefer larger file size (usually better quality)
			score += Math.log10(photo.fileSize) / 10;

			// Prefer newer photos
			score += photo.timestamp / Date.now();

			if (score > bestScore) {
				bestScore = score;
				bestPhoto = photo;
			}
		}

		return bestPhoto;
	}

	/**
	 * Get average similarity within a group
	 */
	private static getAverageSimilarity(photos: PhotoFingerprint[]): number {
		if (photos.length < 2) return 1;

		let totalSimilarity = 0;
		let comparisons = 0;

		for (let i = 0; i < photos.length; i++) {
			for (let j = i + 1; j < photos.length; j++) {
				totalSimilarity += DuplicateDetectionService.calculateSimilarity(
					photos[i],
					photos[j],
				);
				comparisons++;
			}
		}

		return totalSimilarity / comparisons;
	}

	/**
	 * Determine duplicate type based on similarity
	 */
	private static getDuplicateType(
		similarity: number,
	): "exact" | "near" | "similar" {
		if (similarity >= DuplicateDetectionService.EXACT_THRESHOLD) return "exact";
		if (similarity >= DuplicateDetectionService.NEAR_THRESHOLD) return "near";
		return "similar";
	}

	/**
	 * Generate group key for duplicate mapping
	 */
	private static getGroupKey(
		photo1: PhotoFingerprint,
		photo2: PhotoFingerprint,
		similarity: number,
	): string {
		// For exact duplicates, use file hash
		if (
			similarity >= DuplicateDetectionService.EXACT_THRESHOLD &&
			photo1.hash === photo2.hash
		) {
			return `exact-${photo1.hash}`;
		}

		// For near duplicates, use perceptual hash prefix
		if (similarity >= DuplicateDetectionService.NEAR_THRESHOLD) {
			return `near-${photo1.perceptualHash.substring(0, 8)}`;
		}

		// For similar photos, create a combined key
		const keys = [photo1.path, photo2.path].sort();
		return `similar-${keys[0].substring(0, 10)}`;
	}

	/**
	 * Generate recommendations based on duplicate analysis
	 */
	private static generateRecommendations(groups: DuplicateGroup[]): string[] {
		const recommendations: string[] = [];

		// Calculate totals
		const exactDuplicates = groups.filter((g) => g.type === "exact").length;
		const nearDuplicates = groups.filter((g) => g.type === "near").length;
		const similarPhotos = groups.filter((g) => g.type === "similar").length;

		if (exactDuplicates > 0) {
			recommendations.push(
				`Found ${exactDuplicates} groups of exact duplicates. These can be safely deleted.`,
			);
		}

		if (nearDuplicates > 0) {
			recommendations.push(
				`Found ${nearDuplicates} groups of near-duplicates. Review and keep the best version.`,
			);
		}

		if (similarPhotos > 0) {
			recommendations.push(
				`Found ${similarPhotos} groups of similar photos. Consider organizing into albums.`,
			);
		}

		// Size-based recommendations
		const totalSavings = groups.reduce((sum, g) => sum + g.sizeReduction, 0);
		if (totalSavings > 1073741824) {
			// 1GB
			recommendations.push(
				`You can free up ${(totalSavings / 1073741824).toFixed(2)} GB by removing duplicates.`,
			);
		}

		// Quality-based recommendations
		const lowQualityDuplicates = groups.filter(
			(g) =>
				g.photos.some((p) => p.quality < 70) &&
				g.photos.some((p) => p.quality >= 70),
		);
		if (lowQualityDuplicates.length > 0) {
			recommendations.push(
				`${lowQualityDuplicates.length} groups have both high and low quality versions. Keep only the best.`,
			);
		}

		return recommendations;
	}

	/**
	 * Batch delete duplicates keeping the best version
	 */
	static async batchDeleteDuplicates(
		groups: DuplicateGroup[],
		deleteCallback: (paths: string[]) => Promise<void>,
		options?: {
			keepStrategy?: "best" | "newest" | "largest";
			safeMode?: boolean;
			dryRun?: boolean;
		},
	): Promise<{ deleted: number; freed: number; errors: string[] }> {
		const opts = {
			keepStrategy: "best" as const,
			safeMode: true,
			dryRun: false,
			...options,
		};

		let deleted = 0;
		let freed = 0;
		const errors: string[] = [];
		const toDelete: string[] = [];

		for (const group of groups) {
			// Skip if not safe to delete
			if (opts.safeMode && group.type !== "exact") {
				continue;
			}

			// Determine which photo to keep
			let keepPhoto: PhotoFingerprint;
			switch (opts.keepStrategy) {
				case "newest":
					keepPhoto = group.photos.reduce((newest, photo) =>
						photo.timestamp > newest.timestamp ? photo : newest,
					);
					break;
				case "largest":
					keepPhoto = group.photos.reduce((largest, photo) =>
						photo.fileSize > largest.fileSize ? photo : largest,
					);
					break;
				default:
					keepPhoto = group.bestPhoto;
			}

			// Mark others for deletion
			for (const photo of group.photos) {
				if (photo !== keepPhoto) {
					toDelete.push(photo.path);
					deleted++;
					freed += photo.fileSize;
				}
			}
		}

		// Perform deletion if not dry run
		if (!opts.dryRun && toDelete.length > 0) {
			try {
				await deleteCallback(toDelete);
			} catch (error) {
				errors.push(`Failed to delete: ${error}`);
			}
		}

		return { deleted, freed, errors };
	}
}
