import { enhancedOfflineSearchService } from "./services/EnhancedOfflineSearchService";
import { enhancedOfflineService } from "./services/EnhancedOfflineService";
import { enhancedOfflineStorage } from "./services/EnhancedOfflineStorage";
import { IndexedDBStorage } from "./services/IndexedDBStorage";
import { offlineService } from "./services/OfflineService";

/**
 * Initialize all offline services when the app starts
 */
export async function initializeOfflineServices(): Promise<void> {
	console.log("[OfflineSetup] Initializing offline services...");

	try {
		// Initialize the enhanced offline storage
		await enhancedOfflineStorage.initialize();
		console.log("[OfflineSetup] Enhanced offline storage initialized");

		// Initialize the base offline service if needed
		// (it might already be initialized by other parts of the app)

		// Pre-cache essential data if online
		if (navigator.onLine) {
			console.log("[OfflineSetup] Device is online, preparing for offline use");
			// In a real implementation, you might want to pre-cache certain data
			// await precacheLibraryForOffline('/default-library-path');
		}

		// Listen for online/offline events to handle transitions
		window.addEventListener("online", handleOnlineEvent);
		window.addEventListener("offline", handleOfflineEvent);

		console.log("[OfflineSetup] Offline services initialized successfully");
	} catch (error) {
		console.error(
			"[OfflineSetup] Failed to initialize offline services:",
			error,
		);
		throw error;
	}
}

/**
 * Handle when the app comes online
 */
async function handleOnlineEvent(): Promise<void> {
	console.log("[OfflineSetup] Network connection restored");

	// Perform any cleanup or sync operations
	try {
		// Force sync of any queued offline operations
		await enhancedOfflineService.forceSync();
		console.log("[OfflineSetup] Offline sync completed");
	} catch (error) {
		console.error("[OfflineSetup] Error during online sync:", error);
	}
}

/**
 * Handle when the app goes offline
 */
async function handleOfflineEvent(): Promise<void> {
	console.log("[OfflineSetup] Network connection lost");

	// Switch to offline mode operations
	// In a real implementation, you might want to warn the user about limitations
}

/**
 * Check if all offline services are properly initialized and supported
 */
export function checkOfflineSupport(): {
	isSupported: boolean;
	hasRequiredApis: boolean;
	storageAvailable: boolean;
} {
	const hasRequiredApis =
		typeof indexedDB !== "undefined" &&
		typeof caches !== "undefined" &&
		"serviceWorker" in navigator;

	const storageAvailable = enhancedOfflineStorage.isSupported();

	return {
		isSupported: hasRequiredApis && storageAvailable,
		hasRequiredApis,
		storageAvailable,
	};
}

/**
 * Pre-cache library data for offline use
 * This should be called when the user is online and wants to prepare for offline use
 */
export async function prepareOfflineLibrary(dir: string): Promise<void> {
	if (!navigator.onLine) {
		throw new Error("Cannot prepare offline library while offline");
	}

	console.log(`[OfflineSetup] Preparing library at ${dir} for offline use`);

	try {
		// Implement precaching logic here
		// This would typically fetch the library data and store it offline
		// await precacheLibraryForOffline(dir);
		// await precacheEmbeddingsForOffline(dir);

		console.log(
			`[OfflineSetup] Successfully prepared library at ${dir} for offline use`,
		);
	} catch (error) {
		console.error(
			`[OfflineSetup] Failed to prepare library at ${dir} for offline use:`,
			error,
		);
		throw error;
	}
}

// Initialize services when this module is imported
// This is done in an async context without awaiting to avoid blocking
initializeOfflineServices().catch((error) => {
	console.error("[OfflineSetup] Error during initialization:", error);
});
