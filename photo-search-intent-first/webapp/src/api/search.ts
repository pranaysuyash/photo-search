import { API_BASE } from "./base";
import { post } from "./base";
import type {
  SearchParams,
  SearchCachedParams,
  SearchPaginatedParams,
  SearchWorkspaceParams,
  SearchLikeParams,
  SearchLikePlusParams,
  SearchResponse,
  SearchCachedResponse,
} from "./types";

export class SearchAPI {
  static async search(params: SearchParams): Promise<SearchResponse> {
    const { dir, query, provider, topK = 24, options = {} } = params;

    return post<SearchResponse>("/search", {
      dir,
      query,
      top_k: topK,
      provider,
      favorites_only: options.favoritesOnly,
      tags: options.tags,
      date_from: options.dateFrom,
      date_to: options.dateTo,
      hf_token: options.hfToken,
      openai_key: options.openaiKey,
      use_fast: options.useFast,
      fast_kind: options.fastKind,
      use_captions: options.useCaptions,
      camera: options.camera,
      iso_min: options.isoMin,
      iso_max: options.isoMax,
      f_min: options.fMin,
      f_max: options.fMax,
      flash: options.flash,
      wb: options.wb,
      metering: options.metering,
      alt_min: options.altMin,
      alt_max: options.altMax,
      heading_min: options.headingMin,
      heading_max: options.headingMax,
      place: options.place,
      use_ocr: options.useOcr,
      has_text: options.hasText,
      person: options.person,
    });
  }

  static async searchCached(params: SearchCachedParams): Promise<SearchCachedResponse> {
    const { dir, query, provider, topK = 24, cacheKey, options = {} } = params;

    return post<SearchCachedResponse>("/search/cached", {
      dir,
      query,
      top_k: topK,
      provider,
      cache_key: cacheKey,
      hf_token: options.hfToken,
      openai_key: options.openaiKey,
      use_fast: options.useFast,
      fast_kind: options.fastKind,
      use_captions: options.useCaptions,
      use_ocr: options.useOcr,
    });
  }

  static async searchPaginated(params: SearchPaginatedParams): Promise<SearchResponse> {
    const { dir, query, provider, limit = 24, offset = 0, options = {} } = params;

    return post<SearchResponse>("/search_paginated", {
      dir,
      query,
      provider,
      limit,
      offset,
      favorites_only: options.favoritesOnly,
      tags: options.tags,
      date_from: options.dateFrom,
      date_to: options.dateTo,
      hf_token: options.hfToken,
      openai_key: options.openaiKey,
      use_fast: options.useFast,
      fast_kind: options.fastKind,
      use_captions: options.useCaptions,
      camera: options.camera,
      iso_min: options.isoMin,
      iso_max: options.isoMax,
      f_min: options.fMin,
      f_max: options.fMax,
      flash: options.flash,
      wb: options.wb,
      metering: options.metering,
      alt_min: options.altMin,
      alt_max: options.altMax,
      heading_min: options.headingMin,
      heading_max: options.headingMax,
      place: options.place,
      use_ocr: options.useOcr,
      has_text: options.hasText,
    });
  }

  static async searchWorkspace(params: SearchWorkspaceParams): Promise<SearchResponse> {
    const { dir, query, provider, topK = 24, options = {} } = params;

    return post<SearchResponse>("/search_workspace", {
      dir,
      provider,
      query,
      top_k: topK,
      favorites_only: options.favoritesOnly,
      tags: options.tags,
      date_from: options.dateFrom,
      date_to: options.dateTo,
      place: options.place,
      has_text: options.hasText,
      person: options.person,
      persons: options.persons,
    });
  }

  static async searchLike(params: SearchLikeParams): Promise<{ results: any[] }> {
    const { dir, path, provider, topK = 24 } = params;

    return post<{ results: any[] }>("/search_like", {
      dir,
      path,
      provider,
      top_k: topK,
    });
  }

  static async searchLikePlus(params: SearchLikePlusParams): Promise<{ results: any[] }> {
    const { dir, path, provider, topK = 24, text, weight = 0.5 } = params;

    return post<{ results: any[] }>("/search_like_plus", {
      dir,
      path,
      provider,
      top_k: topK,
      text,
      weight,
    });
  }
}

// Export convenience functions that maintain backward compatibility
export async function apiSearch(
  dir: string,
  query: string,
  provider: string,
  topK = 24,
  options?: import("./types").SearchOptions,
) {
  return SearchAPI.search({ dir, query, provider, topK, options });
}

export async function apiSearchCached(
  dir: string,
  query: string,
  provider: string,
  topK = 24,
  cacheKey?: string,
  options?: Parameters<typeof SearchAPI.searchCached>[0]["options"],
) {
  return SearchAPI.searchCached({ dir, query, provider, topK, cacheKey, options });
}

export async function apiSearchPaginated(
  dir: string,
  query: string,
  provider: string,
  limit = 24,
  offset = 0,
  options?: import("./types").SearchOptions,
) {
  return SearchAPI.searchPaginated({ dir, query, provider, limit, offset, options });
}

export async function apiSearchWorkspace(
  dir: string,
  query: string,
  provider: string,
  topK = 24,
  options?: Parameters<typeof SearchAPI.searchWorkspace>[0]["options"],
) {
  return SearchAPI.searchWorkspace({ dir, query, provider, topK, options });
}

export async function apiSearchLike(
  dir: string,
  path: string,
  provider: string,
  topK = 24,
) {
  return SearchAPI.searchLike({ dir, path, provider, topK });
}

export async function apiSearchLikePlus(
  dir: string,
  path: string,
  provider: string,
  topK = 24,
  text?: string,
  weight = 0.5,
) {
  return SearchAPI.searchLikePlus({ dir, path, provider, topK, text, weight });
}