/**
 * Search Service - Advanced search operations
 * 
 * Provides comprehensive search functionality including semantic search,
 * filters, suggestions, and search history management.
 */

import { apiClient } from './apiClient';
import type {
  SearchRequest,
  SearchResponse,
  SearchFilters,
  SearchSuggestion,
  SavedSearch,
  SearchHistoryEntry,
} from '../types/search';

export class SearchService {
  private searchHistory: SearchHistoryEntry[] = [];
  private savedSearches: SavedSearch[] = [];

  /**
   * Perform comprehensive photo search
   */
  async searchPhotos(request: SearchRequest): Promise<SearchResponse | null> {
    try {
      const startTime = Date.now();
      const response = await apiClient.searchPhotos(request);
      const searchTimeMs = Date.now() - startTime;
      
      if (!response.ok) {
        console.error('Search failed:', response.error);
        return null;
      }
      
      const searchResult = response.data;
      if (searchResult) {
        // Add to search history
        this.addToHistory({
          id: `search_${Date.now()}`,
          query: request.query,
          filters: request.filters,
          timestamp: new Date(),
          resultCount: searchResult.results.length,
          searchTimeMs,
        });
      }
      
      return searchResult;
    } catch (error) {
      console.error('Search error:', error);
      return null;
    }
  }

  /**
   * Get search suggestions based on query
   */
  async getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }
      
      const response = await apiClient.getTagSuggestions(query);
      
      if (!response.ok) {
        console.error('Failed to get search suggestions:', response.error);
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Search suggestions error:', error);
      return [];
    }
  }

  /**
   * Build advanced search query from filters
   */
  buildSearchQuery(filters: SearchFilters): string {
    const queryParts: string[] = [];
    
    // Date range
    if (filters.dateRange) {
      const start = filters.dateRange.start.toISOString().split('T')[0];
      const end = filters.dateRange.end.toISOString().split('T')[0];
      queryParts.push(`date:${start}..${end}`);
    }
    
    // Location
    if (filters.location?.address) {
      queryParts.push(`location:"${filters.location.address}"`);
    }
    
    // Camera
    if (filters.camera?.camera) {
      queryParts.push(`camera:"${filters.camera.camera}"`);
    }
    
    // People
    if (filters.people && filters.people.length > 0) {
      const peopleQuery = filters.people.map(person => `person:"${person}"`).join(' OR ');
      queryParts.push(`(${peopleQuery})`);
    }
    
    // Tags
    if (filters.tags && filters.tags.length > 0) {
      const tagsQuery = filters.tags.map(tag => `tag:"${tag}"`).join(' OR ');
      queryParts.push(`(${tagsQuery})`);
    }
    
    // Collections
    if (filters.collections && filters.collections.length > 0) {
      const collectionsQuery = filters.collections.map(collection => `collection:"${collection}"`).join(' OR ');
      queryParts.push(`(${collectionsQuery})`);
    }
    
    // Favorites only
    if (filters.favoritesOnly) {
      queryParts.push('is:favorite');
    }
    
    // Has text (OCR)
    if (filters.hasText) {
      queryParts.push('has:text');
    }
    
    // Minimum rating
    if (filters.minRating && filters.minRating > 0) {
      queryParts.push(`rating:>=${filters.minRating}`);
    }
    
    // File types
    if (filters.fileTypes && filters.fileTypes.length > 0) {
      const fileTypesQuery = filters.fileTypes.map(type => `type:${type}`).join(' OR ');
      queryParts.push(`(${fileTypesQuery})`);
    }
    
    return queryParts.join(' AND ');
  }

  /**
   * Parse search query into filters
   */
  parseSearchQuery(query: string): { cleanQuery: string; filters: Partial<SearchFilters> } {
    const filters: Partial<SearchFilters> = {};
    let cleanQuery = query;
    
    // Extract date ranges
    const dateMatch = query.match(/date:(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      filters.dateRange = {
        start: new Date(dateMatch[1]),
        end: new Date(dateMatch[2]),
      };
      cleanQuery = cleanQuery.replace(dateMatch[0], '').trim();
    }
    
    // Extract location
    const locationMatch = query.match(/location:"([^"]+)"/);
    if (locationMatch) {
      filters.location = { address: locationMatch[1] };
      cleanQuery = cleanQuery.replace(locationMatch[0], '').trim();
    }
    
    // Extract camera
    const cameraMatch = query.match(/camera:"([^"]+)"/);
    if (cameraMatch) {
      filters.camera = { camera: cameraMatch[1] };
      cleanQuery = cleanQuery.replace(cameraMatch[0], '').trim();
    }
    
    // Extract tags
    const tagMatches = query.match(/tag:"([^"]+)"/g);
    if (tagMatches) {
      filters.tags = tagMatches.map(match => match.replace(/tag:"([^"]+)"/, '$1'));
      tagMatches.forEach(match => {
        cleanQuery = cleanQuery.replace(match, '').trim();
      });
    }
    
    // Extract favorites flag
    if (query.includes('is:favorite')) {
      filters.favoritesOnly = true;
      cleanQuery = cleanQuery.replace('is:favorite', '').trim();
    }
    
    // Extract has text flag
    if (query.includes('has:text')) {
      filters.hasText = true;
      cleanQuery = cleanQuery.replace('has:text', '').trim();
    }
    
    // Clean up extra spaces
    cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();
    
    return { cleanQuery, filters };
  }

  /**
   * Save a search for later use
   */
  saveSearch(name: string, query: string, filters: SearchFilters): SavedSearch {
    const savedSearch: SavedSearch = {
      id: `saved_${Date.now()}`,
      name,
      query,
      filters,
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 0,
    };
    
    this.savedSearches.push(savedSearch);
    return savedSearch;
  }

  /**
   * Load a saved search
   */
  loadSavedSearch(searchId: string): SavedSearch | null {
    const search = this.savedSearches.find(s => s.id === searchId);
    if (search) {
      search.lastUsed = new Date();
      search.useCount++;
    }
    return search || null;
  }

  /**
   * Delete a saved search
   */
  deleteSavedSearch(searchId: string): boolean {
    const index = this.savedSearches.findIndex(s => s.id === searchId);
    if (index >= 0) {
      this.savedSearches.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all saved searches
   */
  getSavedSearches(): SavedSearch[] {
    return [...this.savedSearches].sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  /**
   * Add entry to search history
   */
  private addToHistory(entry: SearchHistoryEntry): void {
    // Remove duplicate queries
    this.searchHistory = this.searchHistory.filter(h => h.query !== entry.query);
    
    // Add new entry at the beginning
    this.searchHistory.unshift(entry);
    
    // Keep only last 50 searches
    this.searchHistory = this.searchHistory.slice(0, 50);
  }

  /**
   * Get search history
   */
  getSearchHistory(): SearchHistoryEntry[] {
    return [...this.searchHistory];
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
  }

  /**
   * Get popular search terms
   */
  getPopularSearchTerms(limit = 10): Array<{ term: string; count: number }> {
    const termCounts = new Map<string, number>();
    
    this.searchHistory.forEach(entry => {
      const words = entry.query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      words.forEach(word => {
        termCounts.set(word, (termCounts.get(word) || 0) + 1);
      });
    });
    
    return Array.from(termCounts.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics(): {
    totalSearches: number;
    averageResultCount: number;
    averageSearchTime: number;
    mostUsedFilters: Record<string, number>;
    searchTrends: Array<{ date: string; count: number }>;
  } {
    const totalSearches = this.searchHistory.length;
    const averageResultCount = totalSearches > 0 
      ? this.searchHistory.reduce((sum, entry) => sum + entry.resultCount, 0) / totalSearches
      : 0;
    const averageSearchTime = totalSearches > 0
      ? this.searchHistory.reduce((sum, entry) => sum + entry.searchTimeMs, 0) / totalSearches
      : 0;
    
    // Count filter usage
    const filterCounts: Record<string, number> = {};
    this.searchHistory.forEach(entry => {
      Object.keys(entry.filters).forEach(filterKey => {
        filterCounts[filterKey] = (filterCounts[filterKey] || 0) + 1;
      });
    });
    
    // Group searches by date for trends
    const searchesByDate = new Map<string, number>();
    this.searchHistory.forEach(entry => {
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      searchesByDate.set(dateKey, (searchesByDate.get(dateKey) || 0) + 1);
    });
    
    const searchTrends = Array.from(searchesByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      totalSearches,
      averageResultCount,
      averageSearchTime,
      mostUsedFilters: filterCounts,
      searchTrends,
    };
  }

  /**
   * Suggest search improvements
   */
  suggestSearchImprovements(query: string, resultCount: number): string[] {
    const suggestions: string[] = [];
    
    if (resultCount === 0) {
      suggestions.push('Try using broader search terms');
      suggestions.push('Check your spelling');
      suggestions.push('Remove some filters to expand results');
    } else if (resultCount > 1000) {
      suggestions.push('Add more specific terms to narrow results');
      suggestions.push('Use date filters to limit time range');
      suggestions.push('Add location or camera filters');
    }
    
    if (query.length < 3) {
      suggestions.push('Try using longer, more descriptive terms');
    }
    
    if (!query.includes(' ') && query.length > 10) {
      suggestions.push('Try breaking long terms into separate words');
    }
    
    return suggestions;
  }

  /**
   * Export search data
   */
  exportSearchData(): {
    history: SearchHistoryEntry[];
    savedSearches: SavedSearch[];
    analytics: ReturnType<SearchService['getSearchAnalytics']>;
  } {
    return {
      history: this.getSearchHistory(),
      savedSearches: this.getSavedSearches(),
      analytics: this.getSearchAnalytics(),
    };
  }

  /**
   * Import search data
   */
  importSearchData(data: {
    history?: SearchHistoryEntry[];
    savedSearches?: SavedSearch[];
  }): void {
    if (data.history) {
      this.searchHistory = data.history;
    }
    if (data.savedSearches) {
      this.savedSearches = data.savedSearches;
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();

// Export class for custom instances
export default SearchService;