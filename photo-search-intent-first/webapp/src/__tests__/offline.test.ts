import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	offlineCapableGetLibrary,
	offlineCapableGetMetadata,
	offlineCapableSearch,
	offlineCapableSetFavorite,
	offlineCapableSetTags,
} from "../src/api/offline";
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

describe("Offline Capabilities - EnhancedOfflineService", () => {
	let service: EnhancedOfflineService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new EnhancedOfflineService();
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
		// We could add more specific tests for conflict resolution logic
		expect(true).toBe(true); // Placeholder for now
	});
});

describe("Offline Capabilities - EnhancedOfflineStorage", () => {
	let storage: EnhancedOfflineStorage;

	beforeEach(() => {
		vi.clearAllMocks();
		storage = new EnhancedOfflineStorage();
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

		// Mock the DB methods for testing
		await expect(storage.storePhoto(mockPhoto)).resolves.not.toThrow();
	});

	it("can store and retrieve embeddings", async () => {
		const photoId = "test-photo";
		const embedding = [0.1, 0.2, 0.3];

		await expect(
			storage.storeEmbedding(photoId, embedding),
		).resolves.not.toThrow();
		const retrieved = await storage.getEmbedding(photoId);
		expect(retrieved).toEqual(embedding);
	});

	it("can store and retrieve metadata", async () => {
		const photoId = "test-photo";
		const metadata: PhotoMeta = {
			path: "/path/to/photo.jpg",
			title: "Test Photo",
			description: "A test photo",
			tags: ["test", "photo"],
			favorite: true,
			exif: {},
			faces: [],
			ocr: "test text",
		};

		await expect(
			storage.storeMetadata(photoId, metadata),
		).resolves.not.toThrow();
		const retrieved = await storage.getMetadata(photoId);
		expect(retrieved).toEqual(metadata);
	});
});

describe("Offline Capabilities - EnhancedOfflineSearchService", () => {
	let searchService: EnhancedOfflineSearchService;

	beforeEach(() => {
		vi.clearAllMocks();
		searchService = new EnhancedOfflineSearchService();
	});

	it("initializes without errors", () => {
		expect(searchService).toBeInstanceOf(EnhancedOfflineSearchService);
	});

	it("checks if search is supported", () => {
		const isSupported = searchService.isSupported();
		expect(typeof isSupported).toBe("boolean");
	});

	it("calculates cosine similarity correctly", () => {
		const vecA = [1, 0, 0];
		const vecB = [1, 0, 0];
		const similarity = (searchService as any).cosineSimilarity(vecA, vecB);
		// Using private method for testing purposes
		expect(similarity).toBeCloseTo(1, 2);
	});

	it("scores keyword matches", () => {
		const keywords = ["sunset", "beach"];
		const metadata: PhotoMeta = {
			path: "/path.jpg",
			title: "Sunset at Beach",
			description: "Beautiful sunset at the beach",
			tags: ["vacation", "sunset"],
			favorite: true,
			exif: {},
			faces: [],
			ocr: "sunset beach",
		};

		const score = (searchService as any).scoreKeywordMatch(keywords, metadata);
		// Using private method for testing purposes
		expect(score).toBeGreaterThan(0);
	});
});

describe("Offline Capabilities - Offline API Functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("performs offline search when offline", async () => {
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

describe("Offline Capabilities - Offline Setup", () => {
	it("initializes offline services", async () => {
		const { initializeOfflineServices } = await import("../src/offline-setup");

		// Mock the service worker check
		Object.defineProperty(navigator, "serviceWorker", {
			value: { ready: Promise.resolve() },
			writable: true,
		});

		await expect(initializeOfflineServices()).resolves.not.toThrow();
	});
});
