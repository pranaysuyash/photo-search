// Core types
export type { SearchResult } from "./types";
export type {
  SearchOptions,
  SearchParams,
  SearchCachedParams,
  SearchPaginatedParams,
  SearchWorkspaceParams,
  SearchLikeParams,
  SearchLikePlusParams,
  CreateShareParams,
  BuildParams,
  FaceClustersParams,
  MetadataBatchParams,
  WorkspaceParams,
} from "./types";

// Utility functions
export { isElectron, computeApiBase, API_BASE, shouldInvalidateJsonCache, notifyJsonCacheInvalidation } from "./base";

// API Classes (for advanced usage)
export { SearchAPI } from "./search";
export { MetadataAPI } from "./metadata";
export { CollectionsAPI } from "./collections";
export { AuthAPI } from "./auth";
export { ShareAPI } from "./share";
export { WorkspaceAPI } from "./workspace";
export { ExportAPI } from "./export";
export { DemoAPI } from "./demo";
export { OperationsAPI } from "./operations";

// Backward compatible convenience functions
export {
  apiSearch,
  apiSearchCached,
  apiSearchPaginated,
  apiSearchWorkspace,
  apiSearchLike,
  apiSearchLikePlus,
} from "./search";

export {
  apiGetFavorites,
  apiSetFavorite,
  apiGetTags,
  apiSetTags,
  apiLibrary,
  apiMap,
  apiGetMetadata,
  apiBuildMetadata,
  apiBuildOCR,
  apiBuildFast,
  apiFacesClusters,
  apiMetadataBatch,
  apiDiagnostics,
  apiOcrStatus,
} from "./metadata";

export {
  apiGetCollections,
  apiSetCollection,
  apiRemoveCollection,
  apiAddToCollection,
  apiRemoveFromCollection,
  apiGetSaved,
  apiSaveSearch,
  apiDeleteSavedSearch,
  apiGetPresets,
  apiSavePreset,
  apiDeletePreset,
} from "./collections";

export { apiPing, apiAuthStatus, apiAuthCheck } from "./auth";

export { apiCreateShare } from "./share";

export { apiWorkspaceAdd } from "./workspace";

export { apiExport } from "./export";

export { apiDemoDir } from "./demo";

export { apiOperationStatus } from "./operations";

// Import the search history service
export { searchHistoryService } from "../services/SearchHistoryService";