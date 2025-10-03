/**
 * Object Detection Service
 * Provides advanced object detection and content analysis capabilities
 */

export interface ObjectDetection {
	id: string;
	class_name: string;
	confidence: number;
	bbox: [number, number, number, number]; // x, y, width, height
	area: number;
	attributes?: Record<string, any>;
}

export interface PhotoObjectAnalysis {
	photo_path: string;
	objects: ObjectDetection[];
	total_objects: number;
	dominant_objects: string[];
	scene_type?: string;
	quality_score: number;
	analysis_timestamp: number;
}

export interface ObjectSearchQuery {
	query: string;
	object_classes?: string[];
	attributes?: Record<string, any>;
	min_confidence?: number;
	scene_types?: string[];
	exclude_classes?: string[];
}

export interface ObjectSearchResult {
	photo_path: string;
	matching_objects: ObjectDetection[];
	relevance_score: number;
	match_details: {
		exact_matches: string[];
		semantic_matches: string[];
		attribute_matches: string[];
	};
}

export interface ObjectCategory {
	name: string;
	display_name: string;
	description: string;
	icon?: string;
	common_attributes: string[];
}

export interface DetectionModel {
	name: string;
	version: string;
	type: "local" | "cloud";
	supported_classes: string[];
	performance: {
		accuracy: number;
		speed: number; // images per second
		memory_usage: number; // MB
	};
}

class ObjectDetectionService {
	private static instance: ObjectDetectionService;
	private baseUrl: string;
	private cache: Map<string, any> = new Map();
	private cacheTimeout = 10 * 60 * 1000; // 10 minutes
	private supportedModels: DetectionModel[] = [];
	private objectCategories: ObjectCategory[] = [];

	private constructor() {
		this.baseUrl = "/api/v1";
		this.initializeCategories();
		this.initializeModels();
	}

	public static getInstance(): ObjectDetectionService {
		if (!ObjectDetectionService.instance) {
			ObjectDetectionService.instance = new ObjectDetectionService();
		}
		return ObjectDetectionService.instance;
	}

	private initializeCategories(): void {
		this.objectCategories = [
			{
				name: "person",
				display_name: "People",
				description: "Human figures and faces",
				icon: "user",
				common_attributes: ["age", "gender", "clothing", "pose"],
			},
			{
				name: "vehicle",
				display_name: "Vehicles",
				description: "Cars, trucks, motorcycles, and other vehicles",
				icon: "car",
				common_attributes: ["type", "color", "make", "condition"],
			},
			{
				name: "animal",
				display_name: "Animals",
				description: "Pets, wildlife, and other animals",
				icon: "dog",
				common_attributes: ["species", "breed", "size", "pose"],
			},
			{
				name: "food",
				display_name: "Food & Drink",
				description: "Meals, ingredients, and beverages",
				icon: "coffee",
				common_attributes: ["type", "cuisine", "preparation", "ingredients"],
			},
			{
				name: "nature",
				display_name: "Nature",
				description: "Landscapes, plants, and natural elements",
				icon: "tree",
				common_attributes: ["season", "weather", "terrain", "time_of_day"],
			},
			{
				name: "building",
				display_name: "Architecture",
				description: "Buildings, structures, and architecture",
				icon: "building",
				common_attributes: ["style", "material", "height", "condition"],
			},
			{
				name: "object",
				display_name: "Objects",
				description: "General objects and items",
				icon: "box",
				common_attributes: ["material", "condition", "use", "color"],
			},
			{
				name: "text",
				display_name: "Text & Signs",
				description: "Text, signs, and written content",
				icon: "type",
				common_attributes: ["language", "font", "size", "type"],
			},
		];
	}

	private initializeModels(): void {
		this.supportedModels = [
			{
				name: "YOLOv8",
				version: "8.0",
				type: "local",
				supported_classes: [
					"person",
					"car",
					"truck",
					"bus",
					"motorcycle",
					"bicycle",
					"dog",
					"cat",
					"chair",
					"table",
				],
				performance: {
					accuracy: 0.85,
					speed: 30,
					memory_usage: 512,
				},
			},
			{
				name: "Detectron2",
				version: "2.1",
				type: "local",
				supported_classes: [
					"person",
					"vehicle",
					"animal",
					"food",
					"building",
					"object",
				],
				performance: {
					accuracy: 0.92,
					speed: 15,
					memory_usage: 1024,
				},
			},
			{
				name: "CLIP-ViT",
				version: "base",
				type: "local",
				supported_classes: ["*"], // Supports arbitrary classes
				performance: {
					accuracy: 0.88,
					speed: 8,
					memory_usage: 768,
				},
			},
		];
	}

	/**
	 * Analyze objects in a photo
	 */
	public async analyzePhotoObjects(
		photoPath: string,
		model?: string,
	): Promise<PhotoObjectAnalysis> {
		const cacheKey = `objects_${photoPath}_${model || "default"}`;
		const cached = this.cache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		// Mock implementation for now - in real app this would call backend API
		const mockAnalysis = await this.mockObjectAnalysis(photoPath);

		// Cache the result
		this.cache.set(cacheKey, {
			data: mockAnalysis,
			timestamp: Date.now(),
		});

		return mockAnalysis;
	}

	/**
	 * Search photos by object content
	 */
	public async searchByObjects(
		query: ObjectSearchQuery,
		directory?: string,
	): Promise<ObjectSearchResult[]> {
		const cacheKey = `search_${JSON.stringify(query)}_${directory || "all"}`;
		const cached = this.cache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		// Mock implementation for now - in real app this would call backend API
		const mockResults = await this.mockObjectSearch(query, directory);

		// Cache the result
		this.cache.set(cacheKey, {
			data: mockResults,
			timestamp: Date.now(),
		});

		return mockResults;
	}

	/**
	 * Get object detection statistics for a directory
	 */
	public async getObjectDetectionStats(directory: string): Promise<{
		total_photos: number;
		photos_with_objects: number;
		total_objects_detected: number;
		most_common_objects: Array<{ class: string; count: number }>;
		average_objects_per_photo: number;
		detection_quality_score: number;
	}> {
		const cacheKey = `stats_${directory}`;
		const cached = this.cache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		// Mock implementation for now
		const mockStats = {
			total_photos: 1500,
			photos_with_objects: 1200,
			total_objects_detected: 3500,
			most_common_objects: [
				{ class: "person", count: 800 },
				{ class: "car", count: 400 },
				{ class: "dog", count: 250 },
				{ class: "food", count: 200 },
				{ class: "building", count: 180 },
			],
			average_objects_per_photo: 2.3,
			detection_quality_score: 0.87,
		};

		// Cache the result
		this.cache.set(cacheKey, {
			data: mockStats,
			timestamp: Date.now(),
		});

		return mockStats;
	}

	/**
	 * Get supported object categories
	 */
	public getObjectCategories(): ObjectCategory[] {
		return this.objectCategories;
	}

	/**
	 * Get supported detection models
	 */
	public getSupportedModels(): DetectionModel[] {
		return this.supportedModels;
	}

	/**
	 * Parse natural language object queries
	 */
	public parseObjectQuery(query: string): ObjectSearchQuery {
		const normalizedQuery = query.toLowerCase().trim();

		// Extract object classes
		const objectClasses: string[] = [];
		const attributes: Record<string, any> = {};

		// Simple keyword matching for common objects
		const keywords = {
			person: ["person", "people", "human", "man", "woman", "child", "adult"],
			vehicle: ["car", "truck", "bus", "motorcycle", "bike", "automobile"],
			animal: ["dog", "cat", "pet", "animal", "bird", "horse"],
			food: ["food", "meal", "dinner", "lunch", "breakfast", "restaurant"],
			nature: ["tree", "flower", "plant", "landscape", "mountain", "beach"],
			building: ["building", "house", "architecture", "structure", "office"],
			object: ["chair", "table", "book", "phone", "computer", "laptop"],
		};

		for (const [category, words] of Object.entries(keywords)) {
			if (words.some((word) => normalizedQuery.includes(word))) {
				objectClasses.push(category);
			}
		}

		// Extract attributes (simplified)
		if (
			normalizedQuery.includes("red") ||
			normalizedQuery.includes("blue") ||
			normalizedQuery.includes("green") ||
			normalizedQuery.includes("yellow")
		) {
			attributes.color = normalizedQuery.match(
				/(red|blue|green|yellow|black|white|brown|purple|orange)/,
			)?.[0];
		}

		if (normalizedQuery.includes("large") || normalizedQuery.includes("big")) {
			attributes.size = "large";
		} else if (
			normalizedQuery.includes("small") ||
			normalizedQuery.includes("tiny")
		) {
			attributes.size = "small";
		}

		return {
			query: normalizedQuery,
			object_classes: objectClasses.length > 0 ? objectClasses : undefined,
			attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
			min_confidence: 0.5,
		};
	}

	/**
	 * Get object detection recommendations
	 */
	public getObjectRecommendations(
		searchHistory: ObjectSearchQuery[],
		userPreferences: Record<string, any>,
	): {
		trendingObjects: string[];
		recommendedCategories: ObjectCategory[];
		searchSuggestions: string[];
		modelRecommendations: DetectionModel[];
	} {
		// Analyze search history to find patterns
		const objectFrequency: Record<string, number> = {};
		searchHistory.forEach((query) => {
			query.object_classes?.forEach((cls) => {
				objectFrequency[cls] = (objectFrequency[cls] || 0) + 1;
			});
		});

		// Get trending objects (most frequently searched)
		const trendingObjects = Object.entries(objectFrequency)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([cls]) => cls);

		// Recommend categories based on preferences and history
		const recommendedCategories = this.objectCategories.filter(
			(category) =>
				trendingObjects.includes(category.name) ||
				userPreferences.favoriteCategories?.includes(category.name),
		);

		// Generate search suggestions
		const searchSuggestions = [
			"people smiling",
			"cars in city",
			"dogs playing",
			"food on table",
			"buildings at sunset",
			"nature landscape",
			"chairs and tables",
			"text and signs",
		];

		// Recommend models based on usage patterns
		const modelRecommendations = this.supportedModels.filter((model) => {
			if (userPreferences.preferLocalModels && model.type === "cloud")
				return false;
			if (
				userPreferences.highAccuracyPriority &&
				model.performance.accuracy < 0.8
			)
				return false;
			if (userPreferences.speedPriority && model.performance.speed < 20)
				return false;
			return true;
		});

		return {
			trendingObjects,
			recommendedCategories,
			searchSuggestions,
			modelRecommendations,
		};
	}

	private async mockObjectAnalysis(
		photoPath: string,
	): Promise<PhotoObjectAnalysis> {
		// Simulate API delay
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Generate mock objects based on photo path (for demo purposes)
		const mockObjects: ObjectDetection[] = [];
		const hasPerson = Math.random() > 0.3;
		const hasCar = Math.random() > 0.7;
		const hasDog = Math.random() > 0.8;

		if (hasPerson) {
			mockObjects.push({
				id: "obj_1",
				class_name: "person",
				confidence: 0.85 + Math.random() * 0.1,
				bbox: [100, 100, 200, 300],
				area: 60000,
				attributes: {
					age: "adult",
					pose: "standing",
				},
			});
		}

		if (hasCar) {
			mockObjects.push({
				id: "obj_2",
				class_name: "car",
				confidence: 0.75 + Math.random() * 0.15,
				bbox: [300, 200, 400, 250],
				area: 100000,
				attributes: {
					color: "red",
					type: "sedan",
				},
			});
		}

		if (hasDog) {
			mockObjects.push({
				id: "obj_3",
				class_name: "dog",
				confidence: 0.7 + Math.random() * 0.2,
				bbox: [150, 350, 100, 80],
				area: 8000,
				attributes: {
					breed: "golden retriever",
					pose: "sitting",
				},
			});
		}

		return {
			photo_path: photoPath,
			objects: mockObjects,
			total_objects: mockObjects.length,
			dominant_objects: mockObjects.map((obj) => obj.class_name),
			scene_type: mockObjects.length > 0 ? "indoor" : "outdoor",
			quality_score: 0.8 + Math.random() * 0.15,
			analysis_timestamp: Date.now(),
		};
	}

	private async mockObjectSearch(
		query: ObjectSearchQuery,
		directory?: string,
	): Promise<ObjectSearchResult[]> {
		// Simulate API delay
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Generate mock search results
		const results: ObjectSearchResult[] = [];
		const numResults = Math.floor(Math.random() * 20) + 5;

		for (let i = 0; i < numResults; i++) {
			const photoPath = `/mock/photo_${i + 1}.jpg`;
			const mockObjects: ObjectDetection[] = [];

			// Add matching objects based on query
			if (
				query.object_classes?.includes("person") ||
				query.query.includes("person")
			) {
				mockObjects.push({
					id: `obj_${i}_1`,
					class_name: "person",
					confidence: 0.8 + Math.random() * 0.15,
					bbox: [50, 50, 150, 200],
					area: 30000,
				});
			}

			if (
				query.object_classes?.includes("car") ||
				query.query.includes("car")
			) {
				mockObjects.push({
					id: `obj_${i}_2`,
					class_name: "car",
					confidence: 0.75 + Math.random() * 0.2,
					bbox: [200, 100, 300, 150],
					area: 75000,
				});
			}

			if (mockObjects.length > 0) {
				results.push({
					photo_path: photoPath,
					matching_objects: mockObjects,
					relevance_score: 0.6 + Math.random() * 0.35,
					match_details: {
						exact_matches: mockObjects.map((obj) => obj.class_name),
						semantic_matches: [],
						attribute_matches: Object.keys(query.attributes || {}),
					},
				});
			}
		}

		return results.sort((a, b) => b.relevance_score - a.relevance_score);
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
export const objectDetectionService = ObjectDetectionService.getInstance();

// Export types
export type {
	ObjectDetection,
	PhotoObjectAnalysis,
	ObjectSearchQuery,
	ObjectSearchResult,
	ObjectCategory,
	DetectionModel,
};
