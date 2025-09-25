import { API_BASE, del, post } from "./base";
import type {
	CollectionsResponse,
	PresetsResponse,
	SavedSearchesResponse,
	SearchPreset,
	SmartCollectionDefinition,
	SmartCollectionsResponse,
} from "./types";

export async function getCollections(
	dir: string,
): Promise<CollectionsResponse> {
	const r = await fetch(
		`${API_BASE}/collections?dir=${encodeURIComponent(dir)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<CollectionsResponse>;
}

export async function setCollection(
	dir: string,
	name: string,
	paths: string[],
): Promise<{ ok: boolean; collections: Record<string, string[]> }> {
	return post<{ ok: boolean; collections: Record<string, string[]> }>(
		"/collections",
		{ dir, name, paths },
	);
}

export async function removeCollection(
	dir: string,
	name: string,
): Promise<{ ok: boolean }> {
	return del<{ ok: boolean }>(
		`/collections/${encodeURIComponent(name)}?dir=${encodeURIComponent(dir)}`,
	);
}

export async function addToCollection(
	dir: string,
	name: string,
	paths: string[],
): Promise<{ ok: boolean }> {
	return post<{ ok: boolean }>(`/collections/${encodeURIComponent(name)}/add`, {
		dir,
		name,
		paths,
	});
}

export async function removeFromCollection(
	dir: string,
	name: string,
	paths: string[],
): Promise<{ ok: boolean }> {
	return post<{ ok: boolean }>(
		`/collections/${encodeURIComponent(name)}/remove`,
		{
			dir,
			name,
			paths,
		},
	);
}

export async function getSavedSearches(
	dir: string,
): Promise<SavedSearchesResponse> {
	const r = await fetch(`${API_BASE}/saved?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<SavedSearchesResponse>;
}

export async function saveSearch(
	dir: string,
	name: string,
	query: string,
	topK?: number,
): Promise<{ ok: boolean }> {
	return post<{ ok: boolean }>("/saved", {
		dir,
		name,
		query,
		top_k: topK,
	});
}

export async function deleteSavedSearch(
	dir: string,
	name: string,
): Promise<{ ok: boolean }> {
	return del<{ ok: boolean }>(
		`/saved/${encodeURIComponent(name)}?dir=${encodeURIComponent(dir)}`,
	);
}

export async function getPresets(dir: string): Promise<PresetsResponse> {
	const r = await fetch(`${API_BASE}/presets?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<PresetsResponse>;
}

export async function savePreset(
	dir: string,
	preset: SearchPreset,
): Promise<{ ok: boolean }> {
	return post<{ ok: boolean }>("/presets", {
		dir,
		preset,
	});
}

export async function deletePreset(
	dir: string,
	id: string,
): Promise<{ ok: boolean }> {
	return del<{ ok: boolean }>(
		`/presets/${encodeURIComponent(id)}?dir=${encodeURIComponent(dir)}`,
	);
}

export async function getSmartCollections(
	dir: string,
): Promise<SmartCollectionsResponse> {
	const r = await fetch(
		`${API_BASE}/smart_collections?dir=${encodeURIComponent(dir)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<SmartCollectionsResponse>;
}

export async function createSmartCollection(
	dir: string,
	name: string,
	definition: SmartCollectionDefinition,
): Promise<{ ok: boolean }> {
	return post<{ ok: boolean }>("/smart_collections", {
		dir,
		name,
		definition,
	});
}

export async function updateSmartCollection(
	dir: string,
	name: string,
	definition: SmartCollectionDefinition,
): Promise<{ ok: boolean }> {
	return post<{ ok: boolean }>(
		`/smart_collections/${encodeURIComponent(name)}`,
		{
			dir,
			definition,
		},
	);
}

export async function deleteSmartCollection(
	dir: string,
	name: string,
): Promise<{ ok: boolean }> {
	return del<{ ok: boolean }>(
		`/smart_collections/${encodeURIComponent(name)}?dir=${encodeURIComponent(
			dir,
		)}`,
	);
} // Export convenience functions that maintain backward compatibility
export async function apiGetCollections(dir: string) {
	return getCollections(dir);
}

export async function apiSetCollection(
	dir: string,
	name: string,
	paths: string[],
) {
	return setCollection(dir, name, paths);
}

export async function apiRemoveCollection(dir: string, name: string) {
	return removeCollection(dir, name);
}

export async function apiAddToCollection(
	dir: string,
	name: string,
	paths: string[],
) {
	return addToCollection(dir, name, paths);
}

export async function apiRemoveFromCollection(
	dir: string,
	name: string,
	paths: string[],
) {
	return removeFromCollection(dir, name, paths);
}

export async function apiGetSaved(dir: string) {
	return getSavedSearches(dir);
}

export async function apiSaveSearch(
	dir: string,
	name: string,
	query: string,
	topK?: number,
) {
	return saveSearch(dir, name, query, topK);
}

export async function apiDeleteSavedSearch(dir: string, name: string) {
	return deleteSavedSearch(dir, name);
}

export async function apiGetPresets(dir: string) {
	return getPresets(dir);
}

export async function apiSavePreset(dir: string, preset: SearchPreset) {
	return savePreset(dir, preset);
}

export async function apiDeletePreset(dir: string, id: string) {
	return deletePreset(dir, id);
}
