import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { PhotoActions, PhotoState } from "./types";

interface PhotoStore extends PhotoState, PhotoActions {}

export const usePhotoStore = create<PhotoStore>()(
  subscribeWithSelector((set, _get) => ({
    // Initial state
    results: [],
    searchId: "",
    query: "",
    topK: 24,
    // Soft synonym search banner state
    altSearch: { active: false, original: "", applied: "" } as {
      active: boolean;
      original: string;
      applied: string;
    },
    fav: [],
    favOnly: false,
    tags: {
      allTags: [],
      tagsMap: {},
      tagFilter: "",
    },
    saved: [],
    collections: {},
    smart: {},
    library: [],
    libHasMore: true,
    // Offline support
    offlinePhotos: [],
    source: "online" as "online" | "offline" | "mixed",

    // Actions
    setResults: (results) => {
      console.log(
        "🔄 PHOTO STORE: setResults called with",
        results?.length,
        "results"
      );
      console.trace("setResults stack trace:");
      set({ results });
    },
    setSearchId: (searchId) => {
      console.log("🔄 PHOTO STORE: setSearchId called with", searchId);
      console.trace("setSearchId stack trace:");
      set({ searchId });
    },
    setQuery: (query) => {
      console.log("🔄 PHOTO STORE: setQuery called with", query);
      console.trace("setQuery stack trace:");
      set({ query, altSearch: { active: false, original: "", applied: "" } });
    },
    setAltSearch: (alt) => set({ altSearch: alt }),
    setTopK: (topK) => {
      console.log("🔄 PHOTO STORE: setTopK called with", topK);
      console.trace("setTopK stack trace:");
      set({ topK });
    },
    setFavorites: (fav) => {
      console.log(
        "🔄 PHOTO STORE: setFavorites called with",
        fav?.length,
        "favorites"
      );
      console.trace("setFavorites stack trace:");
      set({ fav });
    },
    setFavOnly: (favOnly) => {
      console.log("🔄 PHOTO STORE: setFavOnly called with", favOnly);
      console.trace("setFavOnly stack trace:");
      set({ favOnly });
    },

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
    setLibHasMore: (libHasMore) => set({ libHasMore }),
    appendLibrary: (paths) =>
      set((state) => ({
        library: [...state.library, ...paths],
      })),

    resetSearch: () =>
      set({
        results: [],
        searchId: "",
        query: "",
      }),
    // Offline support
    preloadPhotos: (photos) => {
      console.log(
        "🔄 PHOTO STORE: preloadPhotos called with",
        photos?.length,
        "photos"
      );
      console.trace("preloadPhotos stack trace:");
      set((state) => {
        // Dedupe by path
        const existingPaths = new Set(state.offlinePhotos.map((p) => p.path));
        const newPhotos = photos.filter((p) => !existingPaths.has(p.path));
        return {
          offlinePhotos: [...state.offlinePhotos, ...newPhotos],
          source: newPhotos.length > 0 ? "offline" : state.source,
        };
      });
    },
    setSource: (source) => {
      console.log("🔄 PHOTO STORE: setSource called with", source);
      console.trace("setSource stack trace:");
      set({ source });
    },
  }))
);

// Selectors for optimized subscriptions
export const useSearchResults = () => usePhotoStore((state) => state.results);
export const useSearchQuery = () => usePhotoStore((state) => state.query);
export const useAltSearch = () => usePhotoStore((state) => state.altSearch);
export const useSearchId = () => usePhotoStore((state) => state.searchId);
export const useFavorites = () => usePhotoStore((state) => state.fav);
export const useFavOnly = () => usePhotoStore((state) => state.favOnly);
export const useTopK = () => usePhotoStore((state) => state.topK);
export const useTagFilter = () =>
  usePhotoStore((state) => state.tags.tagFilter);
export const useAllTags = () => usePhotoStore((state) => state.tags.allTags);
export const useTags = () => usePhotoStore((state) => state.tags);
export const useTagsMap = () => usePhotoStore((state) => state.tags.tagsMap);
export const useSavedSearches = () => usePhotoStore((state) => state.saved);
export const useCollections = () => usePhotoStore((state) => state.collections);
export const useSmartCollections = () => usePhotoStore((state) => state.smart);
export const useLibrary = () => usePhotoStore((state) => state.library);
export const useLibHasMore = () => usePhotoStore((state) => state.libHasMore);

// Offline support selectors
export const useOfflinePhotos = () => usePhotoStore((state) => state.offlinePhotos);
export const useSource = () => usePhotoStore((state) => state.source);

// Stable actions selector
const photoActionsSelector = (state: PhotoStore) => ({
	setResults: state.setResults,
	setSearchId: state.setSearchId,
	setQuery: state.setQuery,
	setAltSearch: state.setAltSearch,
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
	setLibHasMore: state.setLibHasMore,
	appendLibrary: state.appendLibrary,
	resetSearch: state.resetSearch,
	// Offline support
	preloadPhotos: state.preloadPhotos,
	setSource: state.setSource,
});// Actions selectors - use shallow comparison
export const usePhotoActions = () =>
  usePhotoStore(useShallow(photoActionsSelector));
