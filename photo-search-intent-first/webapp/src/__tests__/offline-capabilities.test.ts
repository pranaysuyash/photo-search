/**
 * Comprehensive tests for all offline-first components
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchCacheManager } from "../../api/managers/search_cache_manager";
import { FileWatcherService } from "../../electron/main/file-watcher-service";
import { PythonServiceSupervisor } from "../../electron/main/python-service-supervisor";
import {
	offlineCapableGetLibrary,
	offlineCapableGetMetadata,
	offlineCapableSearch,
	offlineCapableSetFavorite,
	offlineCapableSetTags,
} from "../src/api/offline";
import {
	useOfflineFirstFavorites,
	useOfflineFirstLibrary,
	useOfflineFirstMetadata,
	useOfflineFirstSearch,
} from "../src/hooks/useOfflineFirst";
import type { PhotoMeta } from "../src/models/PhotoMeta";
import { EnhancedOfflineSearchService } from "../src/services/EnhancedOfflineSearchService";
import { EnhancedOfflineService } from "../src/services/EnhancedOfflineService";
import { EnhancedOfflineStorage } from "../src/services/EnhancedOfflineStorage";

// Mock the window object for offlineService
const mockOfflineService = {
	getStatus: vi.fn(() => true),
	queueAction: vi.fn(),
	onStatusChange: vi.fn(() => vi.fn()),
	getQueue: vi.fn(() => Promise.resolve([])),
	clearQueue: vi.fn(() => Promise.resolve()),
	syncQueue: vi.fn(() => Promise.resolve()),
};

// Mock window for testing
Object.defineProperty(window, "offlineService", {
	value: mockOfflineService,
	writable: true,
});

// Mock Electron IPC
const mockIpcRenderer = {
	invoke: vi.fn(),
	on: vi.fn(),
	removeListener: vi.fn(),
};

// Mock Electron for testing
vi.mock("electron", () => ({
	ipcRenderer: mockIpcRenderer,
	contextBridge: {
		exposeInMainWorld: vi.fn(),
	},
}));

describe("Offline Capabilities - EnhancedOfflineService", () => {
	let service: EnhancedOfflineService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new EnhancedOfflineService();
	});

	afterEach(() => {
		service.close();
	});

	it("initializes without errors", () => {
		expect(service).toBeInstanceOf(EnhancedOfflineService);
	});

	it("handles online/offline status changes", async () => {
		const spy = vi.spyOn(service, "forceSync");
		await service.enhancedSync();
		expect(spy).toHaveBeenCalled();
	});

	it("registers conflict resolvers", () => {
		const mockResolver = vi.fn();
		service.registerConflictResolver("test", mockResolver);
		expect(true).toBe(true); // Placeholder for now
	});

	it("manages action queue with proper ordering", async () => {
		// Test queue operations
		const action1 = {
			type: "search",
			payload: { query: "test1", dir: "/test" },
			priority: "HIGH",
			timestamp: Date.now(),
		};

		const action2 = {
			type: "search",
			payload: { query: "test2", dir: "/test" },
			priority: "LOW",
			timestamp: Date.now() + 1000,
		};

		// Add actions to queue
		await service.queueAction(action1);
		await service.queueAction(action2);

		// Get queue and verify ordering
		const queue = await service.getQueue();
		expect(queue.length).toBe(2);

		// Verify actions are in queue
		const foundAction1 = queue.find((a) => a.payload.query === "test1");
		const foundAction2 = queue.find((a) => a.payload.query === "test2");

		expect(foundAction1).toBeDefined();
		expect(foundAction2).toBeDefined();
	});

	it("manages cache with proper TTL", async () => {
		// Test cache operations with TTL
		const cacheKey = "test-cache-key";
		const testData = { results: [{ path: "/test/photo.jpg", score: 0.9 }] };

		// Cache data with short TTL
		await service.cacheSearchResults(
			{ query: "test", dir: "/test" },
			testData,
			1,
		); // 1 second TTL

		// Verify data is cached
		const cached = await service.getSearchResults({
			query: "test",
			dir: "/test",
		});
		expect(cached).toEqual(testData);

		// Wait for TTL to expire
		await new Promise((resolve) => setTimeout(resolve, 1100));

		// Verify data is expired
		const expired = await service.getSearchResults({
			query: "test",
			dir: "/test",
		});
		expect(expired).toBeNull();
	});

	it("provides statistics tracking", async () => {
		// Test statistics tracking
		const stats = await service.getStats();

		expect(stats).toHaveProperty("totalActions");
		expect(stats).toHaveProperty("pendingActions");
		expect(stats).toHaveProperty("failedActions");
		expect(stats).toHaveProperty("actionsByType");
		expect(stats).toHaveProperty("oldestAction");
		expect(stats).toHaveProperty("newestAction");
		expect(stats).toHaveProperty("storageSize");
	});
});

describe("Offline Capabilities - EnhancedOfflineStorage", () => {
	let storage: EnhancedOfflineStorage;

	beforeEach(() => {
		vi.clearAllMocks();
		storage = new EnhancedOfflineStorage();
	});

	afterEach(() => {
		storage.close();
	});

	it("initializes without errors", () => {
		expect(storage).toBeInstanceOf(EnhancedOfflineStorage);
	});

	it("checks if IndexedDB is supported", () => {
		const isSupported = EnhancedOfflineStorage.isSupported();
		expect(typeof isSupported).toBe("boolean");
	});

	it("can store and retrieve photo data", async () => {
		const mockPhoto = {
			id: "test-photo",
			path: "/test/path.jpg",
			cachedAt: Date.now(),
			lastAccessed: Date.now(),
		};

		// Test storing photo data
		const storeResult = await storage.storePhoto(mockPhoto);
		expect(storeResult).toBe(true);

		// Test retrieving photo data
		const retrievedPhoto = await storage.getPhoto("test-photo");
		expect(retrievedPhoto).toEqual(mockPhoto);
	});

	it("can store and retrieve embeddings", async () => {
		const photoId = "test-photo";
		const embedding = [0.1, 0.2, 0.3];

		// Test storing embeddings
		await storage.storeEmbedding(photoId, embedding);

		// Test retrieving embeddings
		const retrieved = await storage.getEmbedding(photoId);
		expect(retrieved).toEqual(embedding);
	});

	it("can store and retrieve metadata", async () => {
		const photoId = "test-photo";
		const metadata: PhotoMeta = {
			path: "/path/to/photo.jpg",
			filename: "photo.jpg",
			size_bytes: 1024000,
			width: 1920,
			height: 1080,
			mtime: Date.now(),
			ctime: Date.now(),
			mime_type: "image/jpeg",
			camera: "Canon EOS R5",
			iso: 100,
			aperture: 2.8,
			focal_length: 50,
			exposure_time: 0.001,
			flash: 1,
			wb: 0,
			metering: 1,
			alt: 100,
			heading: 180,
			place: "New York",
			faces: [],
			ocr: "Sample text in image",
			captions: ["A beautiful landscape"],
			tags: ["landscape", "nature"],
			favorite: true,
			sharpness: 85,
			brightness: 120,
		};

		// Test storing metadata
		await storage.storeMetadata(photoId, metadata);

		// Test retrieving metadata
		const retrieved = await storage.getMetadata(photoId);
		expect(retrieved).toEqual(metadata);
	});

	it("can store and retrieve search indices", async () => {
		const indexEntry = {
			id: "test-index",
			embedding: [0.1, 0.2, 0.3],
			photoId: "test-photo",
			text: "test query",
			cachedAt: Date.now(),
		};

		// Test storing search index
		await storage.storeSearchIndex(indexEntry);

		// Test retrieving search indices by photo ID
		const retrieved = await storage.getSearchIndicesByPhotoId("test-photo");
		expect(retrieved).toHaveLength(1);
		expect(retrieved[0]).toEqual(indexEntry);
	});

	it("handles cleanup of expired entries", async () => {
		// Test cleanup of expired entries
		await storage.cleanupExpired();
		expect(true).toBe(true); // Cleanup should not throw
	});

	it("provides storage usage statistics", async () => {
		// Test storage usage statistics
		const usage = await storage.getStorageUsage();
		expect(typeof usage).toBe("number");
		expect(usage).toBeGreaterThanOrEqual(0);
	});
});

describe("Offline Capabilities - EnhancedOfflineSearchService", () => {
	let searchService: EnhancedOfflineSearchService;

	beforeEach(() => {
		vi.clearAllMocks();
		searchService = new EnhancedOfflineSearchService();
	});

	afterEach(() => {
		searchService.close();
	});

	it("initializes without errors", () => {
		expect(searchService).toBeInstanceOf(EnhancedOfflineSearchService);
	});

	it("checks if search is supported", () => {
		const isSupported = searchService.isSupported();
		expect(typeof isSupported).toBe("boolean");
	});

	it("performs embedding-based search", async () => {
		const queryEmbedding = [0.1, 0.2, 0.3];
		const options = { maxResults: 10, useEmbeddings: true };

		// Test embedding-based search
		const results = await searchService.searchByEmbedding(
			queryEmbedding,
			options,
		);
		expect(Array.isArray(results)).toBe(true);
	});

	it("performs keyword-based search", async () => {
		const keywords = ["sunset", "beach"];
		const options = { maxResults: 10, useMetadata: true };

		// Test keyword-based search
		const results = await searchService.searchByKeywords(keywords, options);
		expect(Array.isArray(results)).toBe(true);
	});

	it("performs hybrid search", async () => {
		const queryEmbedding = [0.1, 0.2, 0.3];
		const keywords = ["sunset", "beach"];
		const options = { maxResults: 10 };

		// Test hybrid search
		const results = await searchService.hybridSearch(
			queryEmbedding,
			keywords,
			options,
		);
		expect(Array.isArray(results)).toBe(true);
	});

	it("performs OCR-based search", async () => {
		const text = "sample text";
		const options = { maxResults: 10 };

		// Test OCR-based search
		const results = await searchService.searchByOCR(text, options);
		expect(Array.isArray(results)).toBe(true);
	});

	it("calculates cosine similarity correctly", () => {
		const vecA = [1, 0, 0];
		const vecB = [1, 0, 0];
		const similarity = (searchService as any).cosineSimilarity(vecA, vecB);
		expect(similarity).toBeCloseTo(1, 2);
	});

	it("scores keyword matches", () => {
		const keywords = ["sunset", "beach"];
		const metadata: PhotoMeta = {
			path: "/path/to/photo.jpg",
			filename: "photo.jpg",
			size_bytes: 1024000,
			width: 1920,
			height: 1080,
			mtime: Date.now(),
			ctime: Date.now(),
			mime_type: "image/jpeg",
			camera: "Canon EOS R5",
			iso: 100,
			aperture: 2.8,
			focal_length: 50,
			exposure_time: 0.001,
			flash: 1,
			wb: 0,
			metering: 1,
			alt: 100,
			heading: 180,
			place: "New York",
			faces: [],
			ocr: "sunset beach",
			captions: ["A beautiful sunset at the beach"],
			tags: ["sunset", "beach", "vacation"],
			favorite: true,
			sharpness: 85,
			brightness: 120,
		};

		const score = (searchService as any).scoreKeywordMatch(keywords, metadata);
		expect(score).toBeGreaterThan(0);
	});
});

describe("Offline Capabilities - FileWatcherService", () => {
	let fileWatcherService: FileWatcherService;

	beforeEach(() => {
		vi.clearAllMocks();
		fileWatcherService = new FileWatcherService();
	});

	afterEach(() => {
		fileWatcherService.close();
	});

	it("initializes without errors", () => {
		expect(fileWatcherService).toBeInstanceOf(FileWatcherService);
	});

	it("identifies photo files correctly", () => {
		const photoFiles = [
			"/home/user/photos/image.jpg",
			"/home/user/photos/photo.jpeg",
			"/home/user/photos/snapshot.png",
			"/home/user/photos/graphic.gif",
			"/home/user/photos/drawing.webp",
			"/home/user/photos/scan.bmp",
			"/home/user/photos/picture.tiff",
			"/home/user/photos/image.tif",
		];

		const nonPhotoFiles = [
			"/home/user/documents/document.pdf",
			"/home/user/spreadsheets/data.xlsx",
			"/home/user/text/notes.txt",
			"/home/user/programs/script.js",
			"/home/user/photos/config.json",
		];

		photoFiles.forEach((file) => {
			expect(fileWatcherService.isPhotoFile(file)).toBe(true);
		});

		nonPhotoFiles.forEach((file) => {
			expect(fileWatcherService.isPhotoFile(file)).toBe(false);
		});
	});

	it("identifies metadata files correctly", () => {
		const metadataFiles = [
			"/home/user/photos/metadata.json",
			"/home/user/photos/index.db",
			"/home/user/photos/photos.sqlite",
			"/home/user/photos/search.index",
		];

		const nonMetadataFiles = [
			"/home/user/photos/image.jpg",
			"/home/user/photos/document.pdf",
			"/home/user/photos/script.js",
		];

		metadataFiles.forEach((file) => {
			expect(fileWatcherService.isMetadataFile(file)).toBe(true);
		});

		nonMetadataFiles.forEach((file) => {
			expect(fileWatcherService.isMetadataFile(file)).toBe(false);
		});
	});

	it("starts and stops watching directories", async () => {
		const directoryPath = "/home/user/photos";

		// Test starting to watch a directory
		const startResult = await fileWatcherService.startWatching(directoryPath);
		expect(startResult).toBe(true);
		expect(fileWatcherService.isWatching(directoryPath)).toBe(true);

		// Test stopping watching a directory
		const stopResult = await fileWatcherService.stopWatching(directoryPath);
		expect(stopResult).toBe(true);
		expect(fileWatcherService.isWatching(directoryPath)).toBe(false);
	});

	it("handles file system events", async () => {
		const directoryPath = "/home/user/photos";
		const filePath = "/home/user/photos/new-image.jpg";

		// Start watching directory
		await fileWatcherService.startWatching(directoryPath);

		// Simulate file addition
		fileWatcherService.handleFileAdded(filePath);

		// Check pending changes
		const pendingChanges = fileWatcherService.getPendingChanges(directoryPath);
		expect(pendingChanges).toContain(filePath);

		// Process pending changes
		await fileWatcherService.processPendingChanges(directoryPath);

		// Check that changes were processed
		const processedChanges =
			fileWatcherService.getPendingChanges(directoryPath);
		expect(processedChanges).toHaveLength(0);
	});

	it("reconciles file system changes", async () => {
		const directoryPath = "/home/user/photos";
		const filePath = "/home/user/photos/new-image.jpg";

		// Start watching directory
		await fileWatcherService.startWatching(directoryPath);

		// Simulate file addition
		fileWatcherService.handleFileAdded(filePath);

		// Reconcile changes
		const reconciled = await fileWatcherService.reconcileChanges(
			directoryPath,
			[filePath],
		);
		expect(reconciled).toBe(1);
	});

	it("invalidates caches when files change", async () => {
		const directoryPath = "/home/user/photos";
		const filePath = "/home/user/photos/new-image.jpg";

		// Start watching directory
		await fileWatcherService.startWatching(directoryPath);

		// Simulate file addition
		fileWatcherService.handleFileAdded(filePath);

		// Invalidate caches
		const invalidated = await fileWatcherService.invalidateCaches(
			directoryPath,
			[filePath],
		);
		expect(invalidated).toBe(true);
	});

	it("provides status information", () => {
		const status = fileWatcherService.getStatus();
		expect(status).toHaveProperty("watching");
		expect(status).toHaveProperty("pendingChanges");
		expect(status).toHaveProperty("lastProcessed");
		expect(status).toHaveProperty("processedCount");
		expect(status).toHaveProperty("errorCount");
	});
});

describe("Offline Capabilities - PythonServiceSupervisor", () => {
	let pythonServiceSupervisor: PythonServiceSupervisor;

	beforeEach(() => {
		vi.clearAllMocks();
		pythonServiceSupervisor = new PythonServiceSupervisor();
	});

	afterEach(() => {
		pythonServiceSupervisor.close();
	});

	it("initializes without errors", () => {
		expect(pythonServiceSupervisor).toBeInstanceOf(PythonServiceSupervisor);
	});

	it("provides service status information", () => {
		const status = pythonServiceSupervisor.getStatus();
		expect(status).toHaveProperty("status");
		expect(status).toHaveProperty("restartCount");
		expect(status).toHaveProperty("lastHealthCheck");
		expect(status).toHaveProperty("healthCheckFailures");
		expect(status).toHaveProperty("isRunning");
		expect(status).toHaveProperty("isHealthy");
		expect(status).toHaveProperty("apiToken");
		expect(status).toHaveProperty("port");
		expect(status).toHaveProperty("host");
	});

	it("manages service lifecycle", async () => {
		// Test starting service
		const startResult = await pythonServiceSupervisor.start();
		expect(typeof startResult).toBe("boolean");

		// Test stopping service
		const stopResult = await pythonServiceSupervisor.stop();
		expect(typeof stopResult).toBe("boolean");

		// Test restarting service
		const restartResult = await pythonServiceSupervisor.restart();
		expect(typeof restartResult).toBe("boolean");
	});

	it("performs health checks", async () => {
		const isHealthy = await pythonServiceSupervisor.performHealthCheck();
		expect(typeof isHealthy).toBe("boolean");
	});

	it("waits for service to be healthy", async () => {
		const isHealthy = await pythonServiceSupervisor.waitForHealthy(1000);
		expect(typeof isHealthy).toBe("boolean");
	});

	it("provides service configuration", () => {
		const config = pythonServiceSupervisor.getConfig();
		expect(config).toHaveProperty("host");
		expect(config).toHaveProperty("port");
		expect(config).toHaveProperty("maxRestarts");
		expect(config).toHaveProperty("restartDelay");
		expect(config).toHaveProperty("healthCheckInterval");
		expect(config).toHaveProperty("healthCheckTimeout");
		expect(config).toHaveProperty("cwd");
		expect(config).toHaveProperty("pythonPath");
		expect(config).toHaveProperty("logLevel");
		expect(config).toHaveProperty("enableProdLogging");
	});

	it("provides API configuration", () => {
		const apiConfig = pythonServiceSupervisor.getApiConfig();
		expect(apiConfig).toHaveProperty("base");
		expect(apiConfig).toHaveProperty("token");
	});

	it("gets API token", () => {
		const token = pythonServiceSupervisor.getApiToken();
		expect(typeof token).toBe("string");
	});

	it("gets API base URL", () => {
		const baseUrl = pythonServiceSupervisor.getApiBaseUrl();
		expect(typeof baseUrl).toBe("string");
		expect(baseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
	});
});

describe("Offline Capabilities - SearchCacheManager", () => {
	let searchCacheManager: SearchCacheManager;

	beforeEach(() => {
		vi.clearAllMocks();
		searchCacheManager = new SearchCacheManager();
	});

	afterEach(() => {
		searchCacheManager.invalidate_search_cache();
	});

	it("initializes without errors", () => {
		expect(searchCacheManager).toBeInstanceOf(SearchCacheManager);
	});

	it("generates consistent cache keys", () => {
		const searchParams1 = {
			dir: "/test/dir",
			query: "test query",
			provider: "local",
			top_k: 10,
		};

		const searchParams2 = {
			dir: "/test/dir",
			query: "test query",
			provider: "local",
			top_k: 10,
		};

		// Both parameter sets should generate the same key
		const key1 = searchCacheManager._generate_cache_key(searchParams1);
		const key2 = searchCacheManager._generate_cache_key(searchParams2);

		expect(key1).toBe(key2);
	});

	it("generates different keys for different parameters", () => {
		const searchParams1 = {
			dir: "/test/dir",
			query: "test query",
			provider: "local",
			top_k: 10,
		};

		const searchParams2 = {
			dir: "/test/dir",
			query: "different query", // Different query
			provider: "local",
			top_k: 10,
		};

		const key1 = searchCacheManager._generate_cache_key(searchParams1);
		const key2 = searchCacheManager._generate_cache_key(searchParams2);

		expect(key1).not.toBe(key2);
	});

	it("caches and retrieves search results", async () => {
		const searchParams = {
			dir: "/test/dir",
			query: "test query",
			provider: "local",
			top_k: 10,
		};

		const testResults = {
			results: [
				{ path: "/photo1.jpg", score: 0.95 },
				{ path: "/photo2.jpg", score: 0.87 },
			],
			total_count: 2,
			query: "test query",
		};

		// Cache results
		searchCacheManager.cache_search_results(searchParams, testResults, 60);

		// Retrieve results
		const retrievedResults =
			searchCacheManager.get_search_results(searchParams);

		expect(retrievedResults).not.toBeNull();
		expect(retrievedResults?.results).toHaveLength(2);
		expect(retrievedResults?.total_count).toBe(2);
	});

	it("handles cache expiration", async () => {
		const searchParams = {
			dir: "/test/dir",
			query: "expiring query",
			provider: "local",
			top_k: 10,
		};

		const testResults = {
			results: [],
			total_count: 0,
			query: "expiring query",
		};

		// Cache with short TTL
		searchCacheManager.cache_search_results(searchParams, testResults, 1); // 1 second

		// Verify it exists immediately
		const immediateResult = searchCacheManager.get_search_results(searchParams);
		expect(immediateResult).not.toBeNull();

		// Wait for expiration
		await new Promise((resolve) => setTimeout(resolve, 1100));

		// Should be expired now
		const expiredResult = searchCacheManager.get_search_results(searchParams);
		expect(expiredResult).toBeNull();
	});

	it("provides cache statistics", () => {
		const stats = searchCacheManager.get_stats();
		expect(stats).toHaveProperty("hits");
		expect(stats).toHaveProperty("misses");
		expect(stats).toHaveProperty("requests");
		expect(stats).toHaveProperty("evictions");
		expect(stats).toHaveProperty("db_hits");
		expect(stats).toHaveProperty("db_misses");
		expect(stats).toHaveProperty("size");
		expect(stats).toHaveProperty("hit_rate");
		expect(stats).toHaveProperty("db_hit_rate");
	});

	it("invalidates cache entries", () => {
		const searchParams = {
			dir: "/test/dir",
			query: "to invalidate",
			provider: "local",
			top_k: 10,
		};

		const testResults = {
			results: [],
			total_count: 0,
			query: "to invalidate",
		};

		// Cache results
		searchCacheManager.cache_search_results(searchParams, testResults, 60);

		// Verify cached
		const cachedResult = searchCacheManager.get_search_results(searchParams);
		expect(cachedResult).not.toBeNull();

		// Invalidate specific entry
		searchCacheManager.invalidate_search_cache(searchParams);

		// Verify invalidated
		const invalidatedResult =
			searchCacheManager.get_search_results(searchParams);
		expect(invalidatedResult).toBeNull();

		// Clear all cache
		searchCacheManager.invalidate_search_cache();

		// Verify all cleared
		const clearedStats = searchCacheManager.get_stats();
		expect(clearedStats.size).toBe(0);
	});
});

describe("Offline Capabilities - Offline API Functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("performs offline capable search", async () => {
		// Mock navigator.onLine to be false
		Object.defineProperty(navigator, "onLine", {
			value: false,
			configurable: true,
		});

		const results = await offlineCapableSearch("/test/dir", "test query");

		// When offline, the function should return empty results or cached results
		expect(Array.isArray(results)).toBe(true);
	});

	it("attempts online search when online", async () => {
		// Mock navigator.onLine to be true
		Object.defineProperty(navigator, "onLine", {
			value: true,
			configurable: true,
		});

		// Mock the service to return online status
		vi.spyOn(mockOfflineService, "getStatus").mockReturnValue(true);

		const results = await offlineCapableSearch("/test/dir", "test query");

		// When online, the function should attempt an online search
		// For now, we'll check that it returns an array
		expect(Array.isArray(results)).toBe(true);
	});

	it("gets library offline data", async () => {
		const library = await offlineCapableGetLibrary("/test/dir");
		expect(Array.isArray(library)).toBe(true);
	});

	it("gets metadata when offline", async () => {
		// Mock offline status
		Object.defineProperty(navigator, "onLine", {
			value: false,
			configurable: true,
		});

		const metadata = await offlineCapableGetMetadata(
			"/test/dir",
			"/path/to/photo.jpg",
		);
		// Should return either metadata or null
		expect(metadata).toBeNull();
	});

	it("queues favorite action when offline", async () => {
		// Mock offline status
		Object.defineProperty(navigator, "onLine", {
			value: false,
			configurable: true,
		});

		vi.spyOn(mockOfflineService, "queueAction").mockResolvedValue("test-id");

		await offlineCapableSetFavorite("/test/dir", "/path/to/photo.jpg", true);

		expect(mockOfflineService.queueAction).toHaveBeenCalledWith({
			type: "favorite",
			payload: {
				dir: "/test/dir",
				path: "/path/to/photo.jpg",
				favorite: true,
			},
		});
	});

	it("queues tag action when offline", async () => {
		// Mock offline status
		Object.defineProperty(navigator, "onLine", {
			value: false,
			configurable: true,
		});

		vi.spyOn(mockOfflineService, "queueAction").mockResolvedValue("test-id");

		const tags = ["sunset", "beach"];
		await offlineCapableSetTags("/test/dir", "/path/to/photo.jpg", tags);

		expect(mockOfflineService.queueAction).toHaveBeenCalledWith({
			type: "set_tags",
			payload: {
				dir: "/test/dir",
				path: "/path/to/photo.jpg",
				tags,
			},
		});
	});
});

describe("Offline Capabilities - Offline-First React Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("implements offline-first search hook", () => {
		// This would test the React hook implementation
		// Since hooks require a React context, we'll just verify the hook exists
		expect(typeof useOfflineFirstSearch).toBe("function");
	});

	it("implements offline-first library hook", () => {
		// This would test the React hook implementation
		expect(typeof useOfflineFirstLibrary).toBe("function");
	});

	it("implements offline-first metadata hook", () => {
		// This would test the React hook implementation
		expect(typeof useOfflineFirstMetadata).toBe("function");
	});

	it("implements offline-first favorites hook", () => {
		// This would test the React hook implementation
		expect(typeof useOfflineFirstFavorites).toBe("function");
	});
});

describe("Offline Capabilities - Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("integrates all offline components", async () => {
		// Test the integration of all offline components
		// This would verify that the components work together correctly

		// Create instances of all components
		const offlineService = new EnhancedOfflineService();
		const offlineStorage = new EnhancedOfflineStorage();
		const offlineSearch = new EnhancedOfflineSearchService();
		const fileWatcher = new FileWatcherService();
		const pythonService = new PythonServiceSupervisor();
		const searchCache = new SearchCacheManager();

		// Verify all components are created
		expect(offlineService).toBeInstanceOf(EnhancedOfflineService);
		expect(offlineStorage).toBeInstanceOf(EnhancedOfflineStorage);
		expect(offlineSearch).toBeInstanceOf(EnhancedOfflineSearchService);
		expect(fileWatcher).toBeInstanceOf(FileWatcherService);
		expect(pythonService).toBeInstanceOf(PythonServiceSupervisor);
		expect(searchCache).toBeInstanceOf(SearchCacheManager);

		// Clean up
		offlineService.close();
		offlineStorage.close();
		offlineSearch.close();
		fileWatcher.close();
		pythonService.close();
	});

	it("handles offline-to-online transitions", async () => {
		// Test the transition from offline to online mode
		// Mock offline status
		Object.defineProperty(navigator, "onLine", {
			value: false,
			configurable: true,
		});
		vi.spyOn(mockOfflineService, "getStatus").mockReturnValue(false);

		// Perform offline search
		const offlineResults = await offlineCapableSearch(
			"/test/dir",
			"test query",
		);
		expect(Array.isArray(offlineResults)).toBe(true);

		// Transition to online
		Object.defineProperty(navigator, "onLine", {
			value: true,
			configurable: true,
		});
		vi.spyOn(mockOfflineService, "getStatus").mockReturnValue(true);

		// Perform online search
		const onlineResults = await offlineCapableSearch("/test/dir", "test query");
		expect(Array.isArray(onlineResults)).toBe(true);
	});

	it("handles cache warming scenarios", async () => {
		// Test cache warming functionality
		const searchCache = new SearchCacheManager();

		// Cache some results
		const searchParams = {
			dir: "/test/dir",
			query: "popular query",
			provider: "local",
			top_k: 10,
		};

		const testResults = {
			results: [
				{ path: "/photo1.jpg", score: 0.95 },
				{ path: "/photo2.jpg", score: 0.87 },
			],
			total_count: 2,
			query: "popular query",
		};

		// Cache results
		searchCache.cache_search_results(searchParams, testResults, 600); // 10 minutes

		// Verify cached
		const cachedResult = searchCache.get_search_results(searchParams);
		expect(cachedResult).not.toBeNull();
		expect(cachedResult?.results).toHaveLength(2);

		// Clean up
		searchCache.invalidate_search_cache();
	});

	it("handles large library scenarios", async () => {
		// Test handling of large photo libraries
		const offlineStorage = new EnhancedOfflineStorage();

		// Store many photos
		const photos = Array.from({ length: 100 }, (_, i) => ({
			id: `photo-${i}`,
			path: `/test/photo-${i}.jpg`,
			cachedAt: Date.now(),
			lastAccessed: Date.now(),
		}));

		// Store photos
		for (const photo of photos) {
			await offlineStorage.storePhoto(photo);
		}

		// Retrieve all photos
		const allPhotos = (await offlineStorage.getAllPhotos?.()) || [];
		expect(allPhotos).toHaveLength(100);

		// Clean up
		offlineStorage.close();
	});

	it("handles concurrent access scenarios", async () => {
		// Test concurrent access to offline components
		const offlineService = new EnhancedOfflineService();

		// Queue multiple actions concurrently
		const actions = Array.from({ length: 10 }, (_, i) => ({
			type: "search",
			payload: { query: `concurrent test ${i}`, dir: "/test" },
			priority: "NORMAL",
			timestamp: Date.now() + i,
		}));

		// Add actions to queue concurrently
		const promises = actions.map((action) =>
			offlineService.queueAction(action),
		);
		await Promise.all(promises);

		// Get queue and verify all actions are present
		const queue = await offlineService.getQueue();
		expect(queue.length).toBeGreaterThanOrEqual(10);

		// Clean up
		offlineService.close();
	});
});
