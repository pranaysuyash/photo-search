/**
 * API-related type definitions
 * Based on the design document specifications
 */

// Base API Response Interface
export interface APIResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: APIError;
  requestId?: string;
  timestamp: string;
}

// API Error Interface
export interface APIError {
  type: string;
  message: string;
  code: string;
  details?: Record<string, any>;
  suggestions?: string[];
  helpUrl?: string;
}

// API Client Configuration
export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  token?: string;
  headers?: Record<string, string>;
}

// Request Options Interface
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  offline?: boolean;
}

// Offline Queue Entry Interface
export interface OfflineQueueEntry {
  id: string;
  url: string;
  options: RequestOptions;
  timestamp: Date;
  retryCount: number;
  priority: 'low' | 'normal' | 'high';
}

// Cache Entry Interface
export interface CacheEntry<T = any> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  etag?: string;
  lastModified?: string;
}

// API Endpoints Configuration
export interface APIEndpoints {
  // Photo endpoints
  photos: {
    search: string;
    metadata: string;
    thumbnail: string;
    similar: string;
    favorites: string;
  };
  
  // Collection endpoints
  collections: {
    list: string;
    create: string;
    update: string;
    delete: string;
    photos: string;
  };
  
  // Tag endpoints
  tags: {
    list: string;
    create: string;
    update: string;
    delete: string;
    suggestions: string;
  };
  
  // People endpoints
  people: {
    list: string;
    identify: string;
    merge: string;
    photos: string;
  };
  
  // Places endpoints
  places: {
    list: string;
    hierarchy: string;
    photos: string;
  };
  
  // System endpoints
  system: {
    status: string;
    index: string;
    settings: string;
  };
}

// Pagination Interface
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Paginated Response Interface
export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: Pagination;
}

// Batch Operation Request
export interface BatchOperationRequest {
  operation: 'favorite' | 'unfavorite' | 'tag' | 'untag' | 'move' | 'copy' | 'delete';
  photoIds: string[];
  parameters?: Record<string, any>;
}

// Batch Operation Response
export interface BatchOperationResponse {
  successful: string[];
  failed: Array<{
    photoId: string;
    error: string;
  }>;
  totalProcessed: number;
}

// Upload Progress Interface
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  estimatedTimeRemaining?: number;
}

// File Upload Request
export interface FileUploadRequest {
  files: File[];
  destination: string;
  overwrite?: boolean;
  preserveMetadata?: boolean;
  onProgress?: (progress: UploadProgress) => void;
}

// Import Status Interface
export interface ImportStatus {
  isImporting: boolean;
  totalFiles: number;
  processedFiles: number;
  progress: number;
  currentFile?: string;
  errors: Array<{
    file: string;
    error: string;
  }>;
  estimatedTimeRemaining?: number;
}

// System Status Interface
export interface SystemStatus {
  api: {
    status: 'online' | 'offline' | 'error';
    version: string;
    uptime: number;
  };
  database: {
    status: 'connected' | 'disconnected' | 'error';
    size: number;
    photoCount: number;
  };
  models: {
    clip: ModelStatus;
    face: ModelStatus;
    ocr: ModelStatus;
  };
  storage: {
    available: number;
    used: number;
    total: number;
  };
}

// Model Status Interface
export interface ModelStatus {
  loaded: boolean;
  version: string;
  path: string;
  size: number;
  lastUsed?: Date;
  error?: string;
}

// Settings Interface
export interface AppSettings {
  // General settings
  theme: 'light' | 'dark' | 'system';
  language: string;
  
  // Photo settings
  thumbnailQuality: 'low' | 'medium' | 'high';
  thumbnailSize: number;
  autoIndex: boolean;
  
  // Search settings
  enableSemanticSearch: boolean;
  enableFaceRecognition: boolean;
  enableOCR: boolean;
  searchResultLimit: number;
  
  // Privacy settings
  allowTelemetry: boolean;
  allowCrashReports: boolean;
  
  // Performance settings
  maxConcurrentOperations: number;
  cacheSize: number;
  
  // Advanced settings
  apiTimeout: number;
  retryAttempts: number;
  debugMode: boolean;
}

// Workspace Configuration
export interface WorkspaceConfig {
  id: string;
  name: string;
  rootPath: string;
  lastOpened: Date;
  settings: Partial<AppSettings>;
  recentDirectories: string[];
  bookmarkedDirectories: string[];
}

// Health Check Response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    duration?: number;
  }>;
  timestamp: string;
  version: string;
}