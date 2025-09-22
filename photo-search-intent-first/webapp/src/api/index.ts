// Core types

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
