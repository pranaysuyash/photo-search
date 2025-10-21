/**
 * Search Store - Manages search state, query, filters, and results
 * 
 * Follows Intent-First principle: Complete search experience management
 * with proper state persistence and real-time updates.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SearchStoreState } from '../types/store';

const initialState = {
  currentQuery: '',
  currentFilters: {},
  currentResults: null,
  isSearching: false,
  searchError: null,
  searchHistory: [] as any[],
  savedSearches: [] as any[],
  suggestions: [] as string[],
  isLoadingSuggestions: false,
  indexStatus: {
    isIndexing: false,
    totalPhotos: 0,
    indexedPhotos: 0,
    progress: 0,
    errors: [] as string[],
  },
};

export const useSearchStore = create<SearchStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Actions
      setQuery: (currentQuery) => {
        set({ currentQuery });
        if (currentQuery.trim()) {
          // Add to history when query is set
          const entry = {
            id: `history_${Date.now()}`,
            query: currentQuery,
            filters: get().currentFilters,
            timestamp: new Date(),
            resultCount: 0,
            searchTimeMs: 0,
          };
          get().addToHistory(entry);
        }
      },
      
      setFilters: (currentFilters) => set({ currentFilters }),
      
      performSearch: async (request) => {
        set({ isSearching: true, searchError: null });
        
        try {
          // This would be implemented to call the actual search API
          // For now, just simulate the structure
          const startTime = Date.now();
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const searchTimeMs = Date.now() - startTime;
          
          // Update history with results
          const historyEntry = {
            id: `history_${Date.now()}`,
            query: request.query,
            filters: request.filters,
            timestamp: new Date(),
            resultCount: 0, // Would be filled by actual API response
            searchTimeMs,
          };
          
          get().addToHistory(historyEntry);
          
          set({ 
            isSearching: false,
            currentQuery: request.query,
            currentFilters: request.filters,
          });
        } catch (error) {
          set({ 
            isSearching: false,
            searchError: error instanceof Error ? error.message : 'Search failed',
          });
        }
      },
      
      clearSearch: () => 
        set({ 
          currentQuery: '',
          currentFilters: {},
          currentResults: null,
          searchError: null,
        }),
      
      addToHistory: (entry) =>
        set((state) => ({
          searchHistory: [entry, ...state.searchHistory.slice(0, 49)], // Keep last 50
        })),
      
      saveSearch: (search) =>
        set((state) => ({
          savedSearches: [...state.savedSearches, search],
        })),
      
      removeSavedSearch: (searchId) =>
        set((state) => ({
          savedSearches: state.savedSearches.filter(s => s.id !== searchId),
        })),
      
      loadSuggestions: async (query) => {
        set({ isLoadingSuggestions: true });
        
        try {
          // This would call the actual suggestions API
          // For now, just simulate
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Mock suggestions based on query
          const mockSuggestions = query ? [
            `${query} photos`,
            `${query} from last year`,
            `${query} with people`,
          ] : [];
          
          set({ 
            suggestions: mockSuggestions,
            isLoadingSuggestions: false,
          });
        } catch (error) {
          set({ 
            suggestions: [],
            isLoadingSuggestions: false,
          });
        }
      },
      
      updateIndexStatus: (indexStatus) => set({ indexStatus }),
      
      setSearching: (isSearching) => set({ isSearching }),
      
      setSearchError: (searchError) => set({ searchError }),
      
      reset: () => set({
        ...initialState,
        // Keep persisted data
        searchHistory: get().searchHistory,
        savedSearches: get().savedSearches,
      }),
    }),
    {
      name: 'photo-search-search-store',
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        savedSearches: state.savedSearches,
      }),
    }
  )
);

// Selectors for common derived state
export const useSearchQuery = () => useSearchStore(state => state.currentQuery);
export const useSearchResults = () => useSearchStore(state => state.currentResults);
export const useIsSearching = () => useSearchStore(state => state.isSearching);
export const useSearchFilters = () => useSearchStore(state => state.currentFilters);
export const useSearchHistory = () => useSearchStore(state => state.searchHistory);
export const useSavedSearches = () => useSearchStore(state => state.savedSearches);
