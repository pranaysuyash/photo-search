/**
 * Search Store - Manages search state, query, filters, and results
 * 
 * Follows Intent-First principle: Complete search experience management
 * with proper state persistence and real-time updates.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SearchFilter {
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  camera?: string;
  tags?: string[];
  favorites?: boolean;
  people?: string[];
}

export interface SearchResult {
  path: string;
  score: number;
  thumbnail?: string;
  metadata?: {
    date?: string;
    location?: string;
    camera?: string;
    width?: number;
    height?: number;
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: SearchFilter;
  createdAt: number;
}

interface SearchState {
  // Current search
  query: string;
  filters: SearchFilter;
  results: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  
  // Search history
  recentSearches: string[];
  savedSearches: SavedSearch[];
  
  // Pagination
  currentPage: number;
  totalResults: number;
  pageSize: number;
  
  // Actions - Search
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilter) => void;
  updateFilter: <K extends keyof SearchFilter>(key: K, value: SearchFilter[K]) => void;
  clearFilters: () => void;
  
  // Actions - Results
  setResults: (results: SearchResult[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  setSearchError: (error: string | null) => void;
  clearResults: () => void;
  
  // Actions - History
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  
  // Actions - Saved Searches
  saveSearch: (name: string, query: string, filters?: SearchFilter) => void;
  deleteSavedSearch: (id: string) => void;
  loadSavedSearch: (id: string) => void;
  
  // Actions - Pagination
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  // Utility
  reset: () => void;
}

const initialFilters: SearchFilter = {};

const initialState = {
  query: '',
  filters: initialFilters,
  results: [],
  isSearching: false,
  searchError: null,
  recentSearches: [],
  savedSearches: [],
  currentPage: 1,
  totalResults: 0,
  pageSize: 50,
};

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Search actions
      setQuery: (query) => {
        set({ query });
        if (query.trim()) {
          get().addRecentSearch(query);
        }
      },
      
      setFilters: (filters) => set({ filters }),
      
      updateFilter: (key, value) => 
        set((state) => ({
          filters: { ...state.filters, [key]: value }
        })),
      
      clearFilters: () => set({ filters: initialFilters }),
      
      // Results actions
      setResults: (results) => 
        set({ 
          results,
          totalResults: results.length,
          searchError: null 
        }),
      
      setIsSearching: (isSearching) => set({ isSearching }),
      
      setSearchError: (searchError) => 
        set({ searchError, isSearching: false }),
      
      clearResults: () => 
        set({ 
          results: [], 
          totalResults: 0,
          currentPage: 1 
        }),
      
      // History actions
      addRecentSearch: (query) => {
        const { recentSearches } = get();
        const trimmed = query.trim();
        
        if (!trimmed) return;
        
        // Remove duplicates and add to front
        const updated = [
          trimmed,
          ...recentSearches.filter(q => q !== trimmed)
        ].slice(0, 10); // Keep only last 10
        
        set({ recentSearches: updated });
      },
      
      clearRecentSearches: () => set({ recentSearches: [] }),
      
      // Saved searches actions
      saveSearch: (name, query, filters) => {
        const { savedSearches } = get();
        const newSearch: SavedSearch = {
          id: `search_${Date.now()}`,
          name,
          query,
          filters,
          createdAt: Date.now()
        };
        
        set({ 
          savedSearches: [...savedSearches, newSearch]
        });
      },
      
      deleteSavedSearch: (id) => {
        const { savedSearches } = get();
        set({
          savedSearches: savedSearches.filter(s => s.id !== id)
        });
      },
      
      loadSavedSearch: (id) => {
        const { savedSearches } = get();
        const search = savedSearches.find(s => s.id === id);
        
        if (search) {
          set({
            query: search.query,
            filters: search.filters || initialFilters
          });
        }
      },
      
      // Pagination actions
      setPage: (currentPage) => set({ currentPage }),
      
      setPageSize: (pageSize) => 
        set({ pageSize, currentPage: 1 }), // Reset to page 1 when changing size
      
      // Utility
      reset: () => set(initialState)
    }),
    {
      name: 'photo-search-search-store',
      partialize: (state) => ({
        // Only persist these fields
        recentSearches: state.recentSearches,
        savedSearches: state.savedSearches,
        pageSize: state.pageSize,
      }),
    }
  )
);

// Selectors for common derived state
export const useSearchQuery = () => useSearchStore(state => state.query);
export const useSearchResults = () => useSearchStore(state => state.results);
export const useIsSearching = () => useSearchStore(state => state.isSearching);
export const useSearchFilters = () => useSearchStore(state => state.filters);
export const useRecentSearches = () => useSearchStore(state => state.recentSearches);
export const useSavedSearches = () => useSearchStore(state => state.savedSearches);
