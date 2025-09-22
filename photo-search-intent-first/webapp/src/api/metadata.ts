import { API_BASE, get, post } from "./base";
import type {
	BuildParams,
	DiagnosticsResponse,
	FaceClustersParams,
	FavoritesResponse,
	LibraryResponse,
	MapResponse,
	MetadataBatchParams,
	TagsResponse,
} from "./types";

export class MetadataAPI {
	static async getFavorites(dir: string): Promise<FavoritesResponse> {
		const r = await fetch(
			`${API_BASE}/favorites?dir=${encodeURIComponent(dir)}`,
		);
		if (!r.ok) throw new Error(await r.text());
		return r.json() as Promise<FavoritesResponse>;
	}

	static async setFavorite(
		dir: string,
		path: string,
		favorite: boolean,
	): Promise<{ ok: boolean }> {
		return post<{ ok: boolean }>("/favorite", {
			dir,
			path,
			favorite,
		});
	}

	static async getTags(dir: string): Promise<TagsResponse> {
		const r = await fetch(`${API_BASE}/tags?dir=${encodeURIComponent(dir)}`);
		if (!r.ok) throw new Error(await r.text());
		return r.json() as Promise<TagsResponse>;
	}

	static async setTags(
		dir: string,
		paths: string[],
		tags: string[],
	): Promise<{ ok: boolean }> {
		return post<{ ok: boolean }>("/tags", {
			dir,
			paths,
			tags,
		});
	}

	static async getLibrary(
		dir: string,
		options?: { offset?: number; limit?: number },
	): Promise<LibraryResponse> {
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

	static async getMap(dir: string): Promise<MapResponse> {
		const r = await fetch(`${API_BASE}/map?dir=${encodeURIComponent(dir)}`);
		if (!r.ok) throw new Error(await r.text());
		return r.json() as Promise<MapResponse>;
	}

	static async getMetadata(dir: string, path: string): Promise<any> {
		const r = await fetch(
			`${API_BASE}/metadata?dir=${encodeURIComponent(dir)}&path=${encodeURIComponent(path)}`,
		);
		if (!r.ok) throw new Error(await r.text());
		return r.json();
	}

	static async buildMetadata(
		params: BuildParams,
	): Promise<{ ok: boolean; message?: string }> {
		const { dir, options = {} } = params;
		return post<{ ok: boolean; message?: string }>("/build_metadata", {
			dir,
			force: options.force,
			fast: options.fast,
		});
	}

	static async buildOCR(
		params: BuildParams,
	): Promise<{ ok: boolean; message?: string }> {
		const { dir, options = {} } = params;
		return post<{ ok: boolean; message?: string }>("/build_ocr", {
			dir,
			force: options.force,
			fast: options.fast,
		});
	}

	static async buildFast(
		params: BuildParams,
	): Promise<{ ok: boolean; message?: string }> {
		const { dir, options = {} } = params;
		return post<{ ok: boolean; message?: string }>("/build_fast", {
			dir,
			force: options.force,
			fast: options.fast,
		});
	}

	static async getFaceClusters(params: FaceClustersParams): Promise<any> {
		const { dir, options = {} } = params;
		const queryParams = new URLSearchParams({ dir });
		if (options.threshold !== undefined) {
			queryParams.append("threshold", options.threshold.toString());
		}

		const r = await fetch(
			`${API_BASE}/faces/clusters?${queryParams.toString()}`,
		);
		if (!r.ok) throw new Error(await r.text());
		return r.json();
	}

	static async metadataBatch(
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

	static async diagnostics(dir: string): Promise<DiagnosticsResponse> {
		const r = await fetch(
			`${API_BASE}/diagnostics?dir=${encodeURIComponent(dir)}`,
		);
		if (!r.ok) throw new Error(await r.text());
		return r.json() as Promise<DiagnosticsResponse>;
	}

	static async ocrStatus(
		dir: string,
	): Promise<{ status: string; progress?: number }> {
		const r = await fetch(
			`${API_BASE}/ocr/status?dir=${encodeURIComponent(dir)}`,
		);
		if (!r.ok) throw new Error(await r.text());
		return r.json() as Promise<{ status: string; progress?: number }>;
	}
}

// Export convenience functions that maintain backward compatibility
export async function apiGetFavorites(dir: string) {
	return MetadataAPI.getFavorites(dir);
}

export async function apiSetFavorite(
	dir: string,
	path: string,
	favorite: boolean,
) {
	return MetadataAPI.setFavorite(dir, path, favorite);
}

export async function apiGetTags(dir: string) {
	return MetadataAPI.getTags(dir);
}

export async function apiSetTags(dir: string, paths: string[], tags: string[]) {
	return MetadataAPI.setTags(dir, paths, tags);
}

export async function apiLibrary(
	dir: string,
	options?: { offset?: number; limit?: number },
) {
	return MetadataAPI.getLibrary(dir, options);
}

export async function apiMap(dir: string) {
	return MetadataAPI.getMap(dir);
}

export async function apiGetMetadata(dir: string, path: string) {
	return MetadataAPI.getMetadata(dir, path);
}

export async function apiBuildMetadata(
	dir: string,
	options?: { force?: boolean; fast?: boolean },
) {
	return MetadataAPI.buildMetadata({ dir, options });
}

export async function apiBuildOCR(
	dir: string,
	options?: { force?: boolean; fast?: boolean },
) {
	return MetadataAPI.buildOCR({ dir, options });
}

export async function apiBuildFast(
	dir: string,
	options?: { force?: boolean; fast?: boolean },
) {
	return MetadataAPI.buildFast({ dir, options });
}

export async function apiFacesClusters(
	dir: string,
	options?: { threshold?: number },
) {
	return MetadataAPI.getFaceClusters({ dir, options });
}

export async function apiMetadataBatch(
	dir: string,
	paths: string[],
	operation: string,
	value?: any,
) {
	return MetadataAPI.metadataBatch({ dir, paths, operation, value });
}

export async function apiDiagnostics(dir: string) {
	return MetadataAPI.diagnostics(dir);
}

export async function apiOcrStatus(dir: string) {
	return MetadataAPI.ocrStatus(dir);
}
