// Core types

// --- Inline analytics client (temporary; can be moved to ./analytics.ts) ---
import { API_BASE } from "./base";

/**
 * Fetch recent analytics/events for a given library directory.
 * Mirrors usage in App.tsx polling code.
 */
export async function apiAnalytics(dir: string, limit = 10) {
	const url = `${API_BASE}/analytics?dir=${encodeURIComponent(
		dir,
	)}&limit=${limit}`;
	const r = await fetch(url);
	if (!r.ok) throw new Error(`analytics ${r.status}`);
	return r.json();
}

/**
 * Post a single analytics/progress event so Python jobs can stream updates.
 */
export async function apiPostAnalyticsEvent(payload: Record<string, unknown>) {
	const r = await fetch(`${API_BASE}/analytics/event`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!r.ok) throw new Error(`analytics/event ${r.status}`);
	return r.json();
}
// --- End inline analytics client ---

// Import the search history service
export { searchHistoryService } from "../services/SearchHistoryService";
export { AuthAPI, apiAuthCheck, apiAuthStatus, apiPing } from "./auth";
// Utility functions
export {
	API_BASE,
	computeApiBase,
	isElectron,
	notifyJsonCacheInvalidation,
	shouldInvalidateJsonCache,
} from "./base";
export {
	apiAddToCollection,
	apiDeletePreset,
	apiDeleteSavedSearch,
	apiGetCollections,
	apiGetPresets,
	apiGetSaved,
	apiRemoveCollection,
	apiRemoveFromCollection,
	apiSavePreset,
	apiSaveSearch,
	apiSetCollection,
	CollectionsAPI,
} from "./collections";
export { apiDemoDir, DemoAPI } from "./demo";
export { apiExport, ExportAPI } from "./export";
export {
	apiBuildFast,
	apiBuildMetadata,
	apiBuildOCR,
	apiDiagnostics,
	apiFacesClusters,
	apiGetFavorites,
	apiGetMetadata,
	apiGetTags,
	apiLibrary,
	apiMap,
	apiMetadataBatch,
	apiOcrStatus,
	apiSetFavorite,
	apiSetTags,
	MetadataAPI,
} from "./metadata";
export { apiOperationStatus, OperationsAPI } from "./operations";
// API Classes (for advanced usage)
// Backward compatible convenience functions
export {
	apiSearch,
	apiSearchCached,
	apiSearchLike,
	apiSearchLikePlus,
	apiSearchPaginated,
	apiSearchWorkspace,
	SearchAPI,
} from "./search";
export { apiCreateShare, ShareAPI } from "./share";
export type {
	BuildParams,
	CreateShareParams,
	FaceClustersParams,
	MetadataBatchParams,
	SearchCachedParams,
	SearchLikeParams,
	SearchLikePlusParams,
	SearchOptions,
	SearchPaginatedParams,
	SearchParams,
	SearchResult,
	SearchWorkspaceParams,
	WorkspaceParams,
} from "./types";
export { apiWorkspaceAdd, WorkspaceAPI } from "./workspace";
