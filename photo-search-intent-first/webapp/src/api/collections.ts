import { API_BASE } from "./base";
import { get, post, del } from "./base";
import type {
  CollectionsResponse,
  SavedSearchesResponse,
} from "./types";

export class CollectionsAPI {
  static async getCollections(dir: string): Promise<CollectionsResponse> {
    const r = await fetch(
      `${API_BASE}/collections?dir=${encodeURIComponent(dir)}`,
    );
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<CollectionsResponse>;
  }

  static async setCollection(dir: string, name: string, paths: string[]): Promise<{ ok: boolean; collections: Record<string, string[]> }> {
    return post<{ ok: boolean; collections: Record<string, string[]> }>>(
      "/collections",
      { dir, name, paths },
    );
  }

  static async removeCollection(dir: string, name: string): Promise<{ ok: boolean }> {
    return del<{ ok: boolean }>(`/collections/${encodeURIComponent(name)}?dir=${encodeURIComponent(dir)}`);
  }

  static async addToCollection(dir: string, name: string, paths: string[]): Promise<{ ok: boolean }> {
    return post<{ ok: boolean }>(`/collections/${encodeURIComponent(name)}/add`, {
      dir,
      name,
      paths,
    });
  }

  static async removeFromCollection(dir: string, name: string, paths: string[]): Promise<{ ok: boolean }> {
    return post<{ ok: boolean }>(`/collections/${encodeURIComponent(name)}/remove`, {
      dir,
      name,
      paths,
    });
  }

  static async getSavedSearches(dir: string): Promise<SavedSearchesResponse> {
    const r = await fetch(
      `${API_BASE}/saved?dir=${encodeURIComponent(dir)}`,
    );
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<SavedSearchesResponse>;
  }

  static async saveSearch(dir: string, name: string, query: string, topK?: number): Promise<{ ok: boolean }> {
    return post<{ ok: boolean }>("/saved", {
      dir,
      name,
      query,
      top_k: topK,
    });
  }

  static async deleteSavedSearch(dir: string, name: string): Promise<{ ok: boolean }> {
    return del<{ ok: boolean }>(`/saved/${encodeURIComponent(name)}?dir=${encodeURIComponent(dir)}`);
  }

  static async getPresets(dir: string): Promise<{ presets: any[] }> {
    const r = await fetch(
      `${API_BASE}/presets?dir=${encodeURIComponent(dir)}`,
    );
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<{ presets: any[] }>;
  }

  static async savePreset(dir: string, preset: any): Promise<{ ok: boolean }> {
    return post<{ ok: boolean }>("/presets", {
      dir,
      preset,
    });
  }

  static async deletePreset(dir: string, id: string): Promise<{ ok: boolean }> {
    return del<{ ok: boolean }>(`/presets/${encodeURIComponent(id)}?dir=${encodeURIComponent(dir)}`);
  }

  static async getSmartCollections(dir: string): Promise<{ smart_collections: Record<string, unknown> }> {
    const r = await fetch(
      `${API_BASE}/smart_collections?dir=${encodeURIComponent(dir)}`,
    );
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<{ smart_collections: Record<string, unknown> }>;
  }

  static async createSmartCollection(dir: string, name: string, definition: any): Promise<{ ok: boolean }> {
    return post<{ ok: boolean }>("/smart_collections", {
      dir,
      name,
      definition,
    });
  }

  static async updateSmartCollection(dir: string, name: string, definition: any): Promise<{ ok: boolean }> {
    return post<{ ok: boolean }>(`/smart_collections/${encodeURIComponent(name)}`, {
      dir,
      definition,
    });
  }

  static async deleteSmartCollection(dir: string, name: string): Promise<{ ok: boolean }> {
    return del<{ ok: boolean }>(`/smart_collections/${encodeURIComponent(name)}?dir=${encodeURIComponent(dir)}`);
  }
}

// Export convenience functions that maintain backward compatibility
export async function apiGetCollections(dir: string) {
  return CollectionsAPI.getCollections(dir);
}

export async function apiSetCollection(dir: string, name: string, paths: string[]) {
  return CollectionsAPI.setCollection(dir, name, paths);
}

export async function apiRemoveCollection(dir: string, name: string) {
  return CollectionsAPI.removeCollection(dir, name);
}

export async function apiAddToCollection(dir: string, name: string, paths: string[]) {
  return CollectionsAPI.addToCollection(dir, name, paths);
}

export async function apiRemoveFromCollection(dir: string, name: string, paths: string[]) {
  return CollectionsAPI.removeFromCollection(dir, name, paths);
}

export async function apiGetSaved(dir: string) {
  return CollectionsAPI.getSavedSearches(dir);
}

export async function apiSaveSearch(dir: string, name: string, query: string, topK?: number) {
  return CollectionsAPI.saveSearch(dir, name, query, topK);
}

export async function apiDeleteSavedSearch(dir: string, name: string) {
  return CollectionsAPI.deleteSavedSearch(dir, name);
}

export async function apiGetPresets(dir: string) {
  return CollectionsAPI.getPresets(dir);
}

export async function apiSavePreset(dir: string, preset: any) {
  return CollectionsAPI.savePreset(dir, preset);
}

export async function apiDeletePreset(dir: string, id: string) {
  return CollectionsAPI.deletePreset(dir, id);
}