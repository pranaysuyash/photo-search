/**
 * Central type definitions export
 * Provides a single import point for all application types
 */

// Photo and metadata types
export * from './photo';

// Search-related types
export * from './search';

// API and network types
export * from './api';

// Store and state management types
export * from './store';

// Component prop types
export * from './components';

// Re-export commonly used types for convenience
export type {
  Photo,
  PhotoMetadata,
  Collection,
  Tag,
  Person,
  Place,
  Trip
} from './photo';

export type {
  SearchRequest,
  SearchResponse,
  SearchFilters,
  SearchResult
} from './search';

export type {
  APIResponse,
  APIError,
  AppSettings,
  SystemStatus
} from './api';

export type {
  PhotoStoreState,
  SearchStoreState,
  UIStoreState,
  SettingsStoreState,
  LibraryStoreState,
  RootStoreState
} from './store';

export type {
  PhotoGridProps,
  SearchBarProps,
  CollectionListProps,
  ModalProps,
  ButtonProps
} from './components';