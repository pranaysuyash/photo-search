import { indexedDBStorage } from "./IndexedDBStorage";

export interface PhotoManifestItem {
	path: string;
	size: number;
	mtime: number;
	width?: number;
	height?: number;
	hash: string;
}

/**
 * Load offline manifest, preferring cached version if available and matching hash
 */
export async function loadOfflineManifest(): Promise<PhotoManifestItem[] | null> {
	try {
		// First, fetch the manifest from the network
			const response = await fetch("/demo_photos/manifest.json");
		if (!response.ok) {
			throw new Error(`Failed to fetch manifest: ${response.status}`);
		}
		const manifest: PhotoManifestItem[] = await response.json();

		// Compute manifest hash
		const manifestContent = JSON.stringify(manifest);
		const manifestHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(manifestContent));
		const manifestHashHex = Array.from(new Uint8Array(manifestHash))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');

		const cacheKey = `manifest_${manifestHashHex}`;

		// Check if we have it cached
		const cached = await indexedDBStorage.getManifest(cacheKey);
		if (cached) {
			console.log('[Manifest] Loaded from cache');
			return cached;
		}

		// Store in cache
		await indexedDBStorage.storeManifest(cacheKey, manifest);
		await indexedDBStorage.storeMetadata('latest_manifest_key', cacheKey);
		console.log('[Manifest] Stored in cache');

		return manifest;
	} catch (error) {
		console.error('[Manifest] Failed to load manifest:', error);

		// Try to load from cache as fallback
		try {
			const latestKey = await indexedDBStorage.getMetadata('latest_manifest_key');
			if (latestKey) {
				const cached = await indexedDBStorage.getManifest(latestKey);
				if (cached) {
					console.log('[Manifest] Loaded from cache (fallback)');
					return cached;
				}
			}
		} catch (cacheError) {
			console.error('[Manifest] Cache fallback failed:', cacheError);
		}

		return null;
	}
}
