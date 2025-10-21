/**
 * Search-related type definitions
 * Based on the design document specifications
 */

import { DateRange, LocationFilter, CameraFilter } from './photo';

// Search Request Interface
export interface SearchRequest {
  // Core parameters
  directory: string;
  query: string;
  limit?: number;
  offset?: number;
  
  // Search features
  features: SearchFeatures;
  
  // Filters
  filters: SearchFilters;
  
  // Options
  options: SearchOptions;
}

// Search Features Configuration
export interface SearchFeatures {
  useSemanticSearch: boolean;
  useMetadataSearch: boolean;
  useOCRSearch: boolean;
  useCaptionSearch: boolean;
  useFaceSearch: boolean;
  useSimilaritySearch: boolean;
}

// Search Filters Interface
export interface SearchFilters {
  dateRange?: DateRange;
  location?: LocationFilter;
  camera?: CameraFilter;
  people?: string[];
  tags?: string[];
  collections?: string[];
  favoritesOnly?: boolean;
  hasText?: boolean;
  minRating?: number;
  fileTypes?: string[];
}

// Search Options Interface
export interface SearchOptions {
  sortBy?: 'relevance' | 'date' | 'name' | 'size' | 'rating';
  sortOrder?: 'asc' | 'desc';
  includeMetadata?: boolean;
  includeThumbnails?: boolean;
  groupBy?: 'none' | 'date' | 'location' | 'camera' | 'person';
}

// Search Response Interface
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  searchTimeMs: number;
  filtersApplied: number;
  hasMore: boolean;
  nextOffset?: number;
  aggregations?: SearchAggregations;
}

// Search Result Interface
export interface SearchResult {
  path: string;
  score: number;
  matchType: SearchMatchType;
  highlights?: SearchHighlight[];
  thumbnail?: string;
  metadata?: Partial<import('./photo').PhotoMetadata>;
}

// Search Match Type
export type SearchMatchType = 
  | 'semantic'
  | 'metadata'
  | 'ocr'
  | 'caption'
  | 'face'
  | 'filename'
  | 'tag'
  | 'exact';

// Search Highlight Interface
export interface SearchHighlight {
  field: string;
  fragments: string[];
  matchedText: string;
}

// Search Aggregations Interface
export interface SearchAggregations {
  cameras?: Record<string, number>;
  dates?: Record<string, number>;
  locations?: Record<string, number>;
  people?: Record<string, number>;
  tags?: Record<string, number>;
  fileTypes?: Record<string, number>;
}

// Search Suggestion Interface
export interface SearchSuggestion {
  text: string;
  type: 'query' | 'tag' | 'person' | 'location' | 'camera';
  count?: number;
  confidence?: number;
}

// Saved Search Interface
export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

// Search History Entry Interface
export interface SearchHistoryEntry {
  id: string;
  query: string;
  filters: SearchFilters;
  timestamp: Date;
  resultCount: number;
  searchTimeMs: number;
}

// Advanced Search Query Interface
export interface AdvancedSearchQuery {
  terms: SearchTerm[];
  logicalOperator: 'AND' | 'OR';
}

// Search Term Interface
export interface SearchTerm {
  field?: string;
  value: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'not';
  boost?: number;
}

// Search Index Status Interface
export interface SearchIndexStatus {
  isIndexing: boolean;
  totalPhotos: number;
  indexedPhotos: number;
  progress: number;
  estimatedTimeRemaining?: number;
  lastIndexed?: Date;
  errors: string[];
}

// Similar Photo Search Request
export interface SimilarPhotoRequest {
  photoPath: string;
  limit?: number;
  threshold?: number;
  includeOriginal?: boolean;
}

// Face Search Request
export interface FaceSearchRequest {
  personId?: string;
  faceEmbedding?: number[];
  limit?: number;
  threshold?: number;
}

// Search Analytics Interface
export interface SearchAnalytics {
  totalSearches: number;
  averageSearchTime: number;
  popularQueries: Array<{ query: string; count: number }>;
  searchSuccessRate: number;
  mostUsedFilters: Record<string, number>;
}