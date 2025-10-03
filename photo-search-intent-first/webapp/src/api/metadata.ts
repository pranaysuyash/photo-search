import { API_BASE, post } from "./base";
import {
	offlineCapableGetLibrary,
	offlineCapableGetMetadata,
	offlineCapableSetFavorite,
	offlineCapableSetTags,
} from "./offline";
import type {
	BuildParams,
	DiagnosticsResponse,
	FaceClustersParams,
	FaceClustersResponse,
	FavoritesResponse,
	LibraryResponse,
	MapResponse,
	MetadataBatchParams,
	PhotoMetadata,
	TagsResponse,
} from "./types";

export async function getFavorites(dir: string): Promise<FavoritesResponse> {
	// Check if we're online
	const isOnline =
		(window as unknown).offlineService?.getStatus?.() || navigator.onLine;

	if (!isOnline) {
		// Fetch from offline storage
		const library = await offlineCapableGetLibrary(dir);
		const favorites = library.filter((photo) => photo.metadata?.favorite);

		return {
			favorites: favorites.map((photo) => ({
				path: photo.path,
				metadata: photo.metadata,
			})),
		} as FavoritesResponse;
	}

	const r = await fetch(`${API_BASE}/favorites?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<FavoritesResponse>;
}

export async function setFavorite(
	dir: string,
	path: string,
	favorite: boolean,
): Promise<{ ok: boolean }> {
	// Check if we're online
	const isOnline =
		(window as unknown).offlineService?.getStatus?.() || navigator.onLine;

	if (!isOnline) {
		// Queue the action for offline processing
		await offlineCapableSetFavorite(dir, path, favorite);
		return { ok: true };
	}

	return post<{ ok: boolean }>("/favorite", {
		dir,
		path,
		favorite,
	});
}

export async function getTags(dir: string): Promise<TagsResponse> {
	const r = await fetch(`${API_BASE}/tags?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<TagsResponse>;
}

export async function setTags(
	dir: string,
	paths: string[],
	tags: string[],
): Promise<{ ok: boolean }> {
	// Check if we're online
	const isOnline =
		(window as unknown).offlineService?.getStatus?.() || navigator.onLine;

	if (!isOnline) {
		// Queue the action for offline processing
		// Process each path individually
		for (const path of paths) {
			await offlineCapableSetTags(dir, path, tags);
		}
		return { ok: true };
	}

	return post<{ ok: boolean }>("/tags", {
		dir,
		paths,
		tags,
	});
}

export async function getLibrary(
	dir: string,
	options?: { offset?: number; limit?: number },
): Promise<LibraryResponse> {
	// Check if we're online
	const isOnline =
		(window as unknown).offlineService?.getStatus?.() || navigator.onLine;

	if (!isOnline) {
		// Fetch from offline storage
		const library = await offlineCapableGetLibrary(dir);

		// Apply offset and limit if specified
		let result = library;
		if (options?.offset !== undefined) {
			result = result.slice(options.offset);
		}
		if (options?.limit !== undefined) {
			result = result.slice(0, options.limit);
		}

		return {
			photos: result.map((photo) => ({
				path: photo.path,
				metadata: photo.metadata,
			})),
			total: library.length,
		} as LibraryResponse;
	}

	const params = new URLSearchParams();
	if (options?.offset !== undefined)
		params.append("offset", options.offset.toString());
	if (options?.limit !== undefined)
		params.append("limit", options.limit.toString());

	const r = await fetch(
		`${API_BASE}/library?dir=${encodeURIComponent(dir)}&${params.toString()}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<LibraryResponse>;
}

export async function getMap(dir: string): Promise<MapResponse> {
	const r = await fetch(`${API_BASE}/map?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<MapResponse>;
}

export async function getMetadata(
	dir: string,
	path: string,
): Promise<PhotoMetadata> {
	// Check if we're online
	const isOnline =
		(window as unknown).offlineService?.getStatus?.() || navigator.onLine;

	if (!isOnline) {
		// Fetch from offline storage
		const metadata = await offlineCapableGetMetadata(dir, path);
		if (metadata) {
			return metadata as PhotoMetadata;
		}
		// If not in offline cache, return empty metadata
		return {
			path,
			exif: {},
			faces: [],
			tags: [],
			favorite: false,
		} as PhotoMetadata;
	}

	const r = await fetch(
		`${API_BASE}/metadata?dir=${encodeURIComponent(
			dir,
		)}&path=${encodeURIComponent(path)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<PhotoMetadata>;
}

export async function buildMetadata(
	params: BuildParams,
): Promise<{ ok: boolean; message?: string }> {
	const { dir, options = {} } = params;
	return post<{ ok: boolean; message?: string }>("/build_metadata", {
		dir,
		force: options.force,
		fast: options.fast,
	});
}

export async function buildOCR(
	params: BuildParams,
): Promise<{ ok: boolean; message?: string }> {
	const { dir, options = {} } = params;
	return post<{ ok: boolean; message?: string }>("/build_ocr", {
		dir,
		force: options.force,
		fast: options.fast,
	});
}

export async function buildFast(
	params: BuildParams,
): Promise<{ ok: boolean; message?: string }> {
	const { dir, options = {} } = params;
	return post<{ ok: boolean; message?: string }>("/build_fast", {
		dir,
		force: options.force,
		fast: options.fast,
	});
}

export async function getFaceClusters(
	params: FaceClustersParams,
): Promise<FaceClustersResponse> {
	const { dir, options = {} } = params;
	const queryParams = new URLSearchParams({ dir });
	if (options.threshold !== undefined) {
		queryParams.append("threshold", options.threshold.toString());
	}

	const r = await fetch(`${API_BASE}/faces/clusters?${queryParams.toString()}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<FaceClustersResponse>;
}

export async function metadataBatch(
	params: MetadataBatchParams,
): Promise<{ ok: boolean }> {
	const { dir, paths, operation, value } = params;
	return post<{ ok: boolean }>("/metadata_batch", {
		dir,
		paths,
		operation,
		value,
	});
}

export async function diagnostics(dir: string): Promise<DiagnosticsResponse> {
	const r = await fetch(
		`${API_BASE}/diagnostics?dir=${encodeURIComponent(dir)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<DiagnosticsResponse>;
}

export async function ocrStatus(
	dir: string,
): Promise<{ status: string; progress?: number }> {
	const r = await fetch(
		`${API_BASE}/ocr/status?dir=${encodeURIComponent(dir)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{ status: string; progress?: number }>;
} // Export convenience functions that maintain backward compatibility
export async function apiGetFavorites(dir: string) {
	return getFavorites(dir);
}

export async function apiSetFavorite(
	dir: string,
	path: string,
	favorite: boolean,
) {
	return setFavorite(dir, path, favorite);
}

export async function apiGetTags(dir: string) {
	return getTags(dir);
}

export async function apiSetTags(dir: string, paths: string[], tags: string[]) {
	return setTags(dir, paths, tags);
}

export async function apiLibrary(
	dir: string,
	options?: { offset?: number; limit?: number },
) {
	return getLibrary(dir, options);
}

export async function apiMap(dir: string) {
	return getMap(dir);
}

export async function apiGetMetadata(dir: string, path: string) {
	return getMetadata(dir, path);
}

export async function apiBuildMetadata(
	dir: string,
	options?: { force?: boolean; fast?: boolean },
) {
	return buildMetadata({ dir, options });
}

export async function apiBuildOCR(
	dir: string,
	options?: { force?: boolean; fast?: boolean },
) {
	return buildOCR({ dir, options });
}

export async function apiBuildFast(
	dir: string,
	options?: { force?: boolean; fast?: boolean },
) {
	return buildFast({ dir, options });
}

export async function apiFacesClusters(
	dir: string,
	options?: { threshold?: number },
) {
	return getFaceClusters({ dir, options });
}

export async function apiMetadataBatch(
	dir: string,
	paths: string[],
	operation: string,
	value?: string | number | boolean | string[] | Record<string, unknown>,
) {
	return metadataBatch({ dir, paths, operation, value });
}

export async function apiDiagnostics(dir: string) {
	return diagnostics(dir);
}

export async function apiOcrStatus(dir: string) {
	return ocrStatus(dir);
}
