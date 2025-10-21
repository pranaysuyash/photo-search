/**
 * Modern API Client with Offline-First Architecture
 * 
 * Provides a comprehensive API client with offline capabilities, caching,
 * retry logic, and proper error handling based on our type definitions.
 */

import type {
  APIResponse,
  APIError,
  APIClientConfig,
  RequestOptions,
  OfflineQueueEntry,
  CacheEntry,
  APIEndpoints,
  PaginatedResponse,
  BatchOperationRequest,
  BatchOperationResponse,
  SystemStatus,
  HealthCheckResponse,
} from '../types/api';

import type {
  SearchRequest,
  SearchResponse,
  SearchSuggestion,
  SimilarPhotoRequest,
  FaceSearchRequest,
} from '../types/search';

import type {
  Photo,
  Collection,
  Tag,
  Person,
  Place,
  Trip,
} from '../types/photo';

// Default configuration
const DEFAULT_CONFIG: APIClientConfig = {
  baseURL: '/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// API endpoints configuration
const ENDPOINTS: APIEndpoints = {
  photos: {
    search: '/search',
    metadata: '/photos/metadata',
    thumbnail: '/photos/thumbnail',
    similar: '/photos/similar',
    favorites: '/photos/favorites',
  },
  collections: {
    list: '/collections',
    create: '/collections',
    update: '/collections/{id}',
    delete: '/collections/{id}',
    photos: '/collections/{id}/photos',
  },
  tags: {
    list: '/tags',
    create: '/tags',
    update: '/tags/{id}',
    delete: '/tags/{id}',
    suggestions: '/tags/suggestions',
  },
  people: {
    list: '/people',
    identify: '/people/identify',
    merge: '/people/merge',
    photos: '/people/{id}/photos',
  },
  places: {
    list: '/places',
    hierarchy: '/places/hierarchy',
    photos: '/places/{id}/photos',
  },
  system: {
    status: '/system/status',
    index: '/system/index',
    settings: '/system/settings',
  },
};

/**
 * Modern API Client with offline-first capabilities
 */
export class APIClient {
  private config: APIClientConfig;
  private cache = new Map<string, CacheEntry>();
  private offlineQueue: OfflineQueueEntry[] = [];
  private isOnline = navigator.onLine;

  constructor(config: Partial<APIClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupOfflineHandling();
  }

  /**
   * Setup offline/online event handling
   */
  private setupOfflineHandling(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Process queued offline requests when coming back online
   */
  private async processOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.offlineQueue.length === 0) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const entry of queue) {
      try {
        await this.request(entry.url, entry.options);
      } catch (error) {
        // Re-queue failed requests with incremented retry count
        if (entry.retryCount < this.config.retryAttempts) {
          this.offlineQueue.push({
            ...entry,
            retryCount: entry.retryCount + 1,
          });
        }
      }
    }
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(url: string, options: RequestOptions): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Check if cached response is valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    return new Date() < entry.expiresAt;
  }

  /**
   * Core request method with retry logic and caching
   */
  private async request<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseURL}${url}`;
    const cacheKey = this.getCacheKey(fullUrl, options);

    // Check cache for GET requests
    if ((!options.method || options.method === 'GET') && options.cache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached.data as APIResponse<T>;
      }
    }

    // If offline and not cached, queue the request
    if (!this.isOnline && options.offline !== false) {
      const queueEntry: OfflineQueueEntry = {
        id: `${Date.now()}_${Math.random()}`,
        url: fullUrl,
        options,
        timestamp: new Date(),
        retryCount: 0,
        priority: options.method === 'GET' ? 'low' : 'normal',
      };
      this.offlineQueue.push(queueEntry);
      
      throw new Error('Request queued for when online');
    }

    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        ...this.config.headers,
        ...options.headers,
      },
      signal: AbortSignal.timeout(options.timeout || this.config.timeout),
    };

    if (options.body && options.method !== 'GET') {
      requestOptions.body = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
    }

    let lastError: Error;
    const maxRetries = options.retries ?? this.config.retryAttempts;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(fullUrl, requestOptions);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const apiError: APIError = {
            type: 'HTTP_ERROR',
            message: errorData.message || response.statusText,
            code: response.status.toString(),
            details: errorData,
          };
          
          const errorResponse: APIResponse<T> = {
            ok: false,
            error: apiError,
            timestamp: new Date().toISOString(),
          };
          
          return errorResponse;
        }

        const data = await response.json();
        const successResponse: APIResponse<T> = {
          ok: true,
          data,
          timestamp: new Date().toISOString(),
        };

        // Cache successful GET requests
        if ((!options.method || options.method === 'GET') && options.cache !== false) {
          const cacheEntry: CacheEntry<APIResponse<T>> = {
            data: successResponse,
            timestamp: new Date(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes default
            etag: response.headers.get('etag') || undefined,
            lastModified: response.headers.get('last-modified') || undefined,
          };
          this.cache.set(cacheKey, cacheEntry);
        }

        return successResponse;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const apiError: APIError = {
      type: 'NETWORK_ERROR',
      message: lastError.message,
      code: 'FETCH_FAILED',
    };

    return {
      ok: false,
      error: apiError,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Search photos with comprehensive options
   */
  async searchPhotos(request: SearchRequest): Promise<APIResponse<SearchResponse>> {
    return this.request<SearchResponse>(ENDPOINTS.photos.search, {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Get photo metadata
   */
  async getPhotoMetadata(photoPath: string): Promise<APIResponse<Photo>> {
    return this.request<Photo>(`${ENDPOINTS.photos.metadata}?path=${encodeURIComponent(photoPath)}`);
  }

  /**
   * Get photo thumbnail URL
   */
  getThumbnailUrl(photoPath: string, size = 300): string {
    // In Electron, use direct file access for offline capability
    if (this.isElectronEnvironment()) {
      return `file://${photoPath}`;
    }
    
    return `${this.config.baseURL}${ENDPOINTS.photos.thumbnail}?path=${encodeURIComponent(photoPath)}&size=${size}`;
  }

  /**
   * Get full photo URL
   */
  getPhotoUrl(photoPath: string): string {
    // In Electron, use direct file access for offline capability
    if (this.isElectronEnvironment()) {
      return `file://${photoPath}`;
    }
    
    return `${this.config.baseURL}/photo?path=${encodeURIComponent(photoPath)}`;
  }

  /**
   * Find similar photos
   */
  async findSimilarPhotos(request: SimilarPhotoRequest): Promise<APIResponse<SearchResponse>> {
    return this.request<SearchResponse>(ENDPOINTS.photos.similar, {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Toggle photo favorite status
   */
  async toggleFavorite(photoPath: string, favorite: boolean): Promise<APIResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(ENDPOINTS.photos.favorites, {
      method: 'POST',
      body: { path: photoPath, favorite },
    });
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<APIResponse<Collection[]>> {
    return this.request<Collection[]>(ENDPOINTS.collections.list);
  }

  /**
   * Create a new collection
   */
  async createCollection(collection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Promise<APIResponse<Collection>> {
    return this.request<Collection>(ENDPOINTS.collections.create, {
      method: 'POST',
      body: collection,
    });
  }

  /**
   * Update collection
   */
  async updateCollection(collectionId: string, updates: Partial<Collection>): Promise<APIResponse<Collection>> {
    const url = ENDPOINTS.collections.update.replace('{id}', collectionId);
    return this.request<Collection>(url, {
      method: 'PUT',
      body: updates,
    });
  }

  /**
   * Delete collection
   */
  async deleteCollection(collectionId: string): Promise<APIResponse<{ success: boolean }>> {
    const url = ENDPOINTS.collections.delete.replace('{id}', collectionId);
    return this.request<{ success: boolean }>(url, {
      method: 'DELETE',
    });
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<APIResponse<Tag[]>> {
    return this.request<Tag[]>(ENDPOINTS.tags.list);
  }

  /**
   * Get tag suggestions
   */
  async getTagSuggestions(query: string): Promise<APIResponse<SearchSuggestion[]>> {
    return this.request<SearchSuggestion[]>(`${ENDPOINTS.tags.suggestions}?q=${encodeURIComponent(query)}`);
  }

  /**
   * Create a new tag
   */
  async createTag(tag: Omit<Tag, 'id' | 'createdAt' | 'photoCount'>): Promise<APIResponse<Tag>> {
    return this.request<Tag>(ENDPOINTS.tags.create, {
      method: 'POST',
      body: tag,
    });
  }

  /**
   * Get all people
   */
  async getPeople(): Promise<APIResponse<Person[]>> {
    return this.request<Person[]>(ENDPOINTS.people.list);
  }

  /**
   * Search for faces
   */
  async searchFaces(request: FaceSearchRequest): Promise<APIResponse<SearchResponse>> {
    return this.request<SearchResponse>(ENDPOINTS.people.identify, {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Get all places
   */
  async getPlaces(): Promise<APIResponse<Place[]>> {
    return this.request<Place[]>(ENDPOINTS.places.list);
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<APIResponse<SystemStatus>> {
    return this.request<SystemStatus>(ENDPOINTS.system.status);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<APIResponse<HealthCheckResponse>> {
    return this.request<HealthCheckResponse>('/health');
  }

  /**
   * Batch operations on multiple photos
   */
  async batchOperation(request: BatchOperationRequest): Promise<APIResponse<BatchOperationResponse>> {
    return this.request<BatchOperationResponse>('/batch', {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += JSON.stringify(entry.data).length;
    }
    
    return {
      size: totalSize,
      entries: this.cache.size,
    };
  }

  /**
   * Check if running in Electron environment
   */
  private isElectronEnvironment(): boolean {
    return typeof window !== 'undefined' && 
           window.navigator.userAgent.includes('Electron');
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<APIClientConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): APIClientConfig {
    return { ...this.config };
  }
}

// Create and export default instance
export const apiClient = new APIClient();

// Export class for custom instances
export default APIClient;