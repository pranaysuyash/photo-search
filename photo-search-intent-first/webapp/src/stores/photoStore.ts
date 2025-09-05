import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { PhotoState, PhotoActions } from './types'

interface PhotoStore extends PhotoState, PhotoActions {}

export const usePhotoStore = create<PhotoStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    results: [],
    searchId: '',
    query: '',
    topK: 24,
    fav: [],
    favOnly: false,
    tags: {
      allTags: [],
      tagsMap: {},
      tagFilter: '',
    },
    saved: [],
    collections: {},
    smart: {},
    library: [],

    // Actions
    setResults: (results) => set({ results }),
    setSearchId: (searchId) => set({ searchId }),
    setQuery: (query) => set({ query }),
    setTopK: (topK) => set({ topK }),
    setFavorites: (fav) => set({ fav }),
    setFavOnly: (favOnly) => set({ favOnly }),
    
    setAllTags: (allTags) =>
      set((state) => ({
        tags: { ...state.tags, allTags },
      })),
    
    setTagsMap: (tagsMap) =>
      set((state) => ({
        tags: { ...state.tags, tagsMap },
      })),
    
    setTagFilter: (tagFilter) =>
      set((state) => ({
        tags: { ...state.tags, tagFilter },
      })),
    
    setSaved: (saved) => set({ saved }),
    setCollections: (collections) => set({ collections }),
    setSmart: (smart) => set({ smart }),
    setLibrary: (library) => set({ library }),
    
    resetSearch: () => set({
      results: [],
      searchId: '',
      query: '',
    }),
  }))
)

// Selectors for optimized subscriptions
export const useSearchResults = () => usePhotoStore((state) => state.results)
export const useSearchQuery = () => usePhotoStore((state) => state.query)
export const useSearchId = () => usePhotoStore((state) => state.searchId)
export const useFavorites = () => usePhotoStore((state) => state.fav)
export const useFavOnly = () => usePhotoStore((state) => state.favOnly)
export const useTopK = () => usePhotoStore((state) => state.topK)
export const useTagFilter = () => usePhotoStore((state) => state.tags.tagFilter)
export const useAllTags = () => usePhotoStore((state) => state.tags.allTags)
export const useTags = () => usePhotoStore((state) => state.tags)
export const useSavedSearches = () => usePhotoStore((state) => state.saved)
export const useCollections = () => usePhotoStore((state) => state.collections)
export const useSmartCollections = () => usePhotoStore((state) => state.smart)
export const useLibrary = () => usePhotoStore((state) => state.library)

// Stable actions selector
const photoActionsSelector = (state: any) => ({
  setResults: state.setResults,
  setSearchId: state.setSearchId,
  setQuery: state.setQuery,
  setTopK: state.setTopK,
  setFavorites: state.setFavorites,
  setFavOnly: state.setFavOnly,
  setAllTags: state.setAllTags,
  setTagsMap: state.setTagsMap,
  setTagFilter: state.setTagFilter,
  setSaved: state.setSaved,
  setCollections: state.setCollections,
  setSmart: state.setSmart,
  setLibrary: state.setLibrary,
  resetSearch: state.resetSearch,
})

// Actions selectors - use shallow comparison
export const usePhotoActions = () => usePhotoStore(photoActionsSelector)
