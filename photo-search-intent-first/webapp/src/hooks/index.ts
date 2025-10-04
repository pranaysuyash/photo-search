/**
 * Centralized exports for all custom hooks
 * This file provides a single entry point for all hooks
 */

// Async operation hooks
export {
	useApi,
	useAsync,
	useAsyncOperations,
	useDebouncedAsync,
} from "./useAsync";
// UI hooks
export { useDebounce, useDebouncedCallback } from "./useDebounce";
// Search hooks
export { useSearch } from "./useSearch";
export {
	_useSearchHistory as useSearchHistory,
	_useSearchValidation as useSearchValidation,
	useSearchState,
} from "./useSearchState";

// Job management hooks
export { useJobMetrics } from "./useJobMetrics";
export type { JobMetrics } from "./useJobMetrics";

export type { DataLoadingOptions } from "./useDataLoading";
// Data management hooks
export { useDataLoading } from "./useDataLoading";
export type { PhotoActionsOptions } from "./usePhotoActions";
// Photo actions hooks
export { usePhotoActions } from "./usePhotoActions";
export type { SearchLogicOptions } from "./useSearchLogic";
// Search logic hooks
export { useSearchLogic } from "./useSearchLogic";

// Re-export commonly used types
// Note: These types are not currently exported from their respective modules
// export type {
//   UseSearchOptions,
//   UseSearchReturn
// } from './useSearch';

// export type {
//   UseSearchStateOptions,
//   UseSearchStateReturn
// } from './useSearchState';

// Version for tracking hook updates
export const _HOOKS_VERSION = "1.0.0";
