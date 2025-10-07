import { create } from "zustand";
import type {
  Collection,
  FaceCluster,
  Trip,
  FavoriteEntry,
} from "../services/api";

interface Photo {
  id: number;
  path: string;
  src: string;
  title: string;
  score?: number;
  favorite?: boolean;
}

interface PhotoStore {
  // State
  photos: Photo[];
  currentDirectory: string;
  isLoading: boolean;
  searchQuery: string;
  currentView: string;
  collections: Record<string, Collection>;
  faceClusters: FaceCluster[];
  trips: Trip[];
  favoriteEntries: FavoriteEntry[];
  favoriteMap: Record<string, boolean>;

  // Actions
  setPhotos: (photos: Photo[]) => void;
  setCurrentDirectory: (directory: string) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setCurrentView: (view: string) => void;
  setCollections: (collections: Record<string, Collection>) => void;
  setFaceClusters: (clusters: FaceCluster[]) => void;
  setTrips: (trips: Trip[]) => void;
  setFavoriteEntries: (entries: FavoriteEntry[]) => void;
  updateFavoriteForPath: (
    path: string,
    favorite: boolean,
    metadata?: Partial<FavoriteEntry>
  ) => void;

  // Computed
  photoCount: number;
}

export const usePhotoStore = create<PhotoStore>((set, get) => ({
  // Initial state
  photos: [],
  currentDirectory: "",
  isLoading: false,
  searchQuery: "",
  currentView: "library",
  collections: {},
  faceClusters: [],
  trips: [],
  favoriteEntries: [],
  favoriteMap: {},

  // Actions
  setPhotos: (photos) =>
    set((state) => ({
      photos: photos.map((photo) => ({
        ...photo,
        favorite: state.favoriteMap[photo.path] ?? photo.favorite ?? false,
      })),
    })),
  setCurrentDirectory: (directory) => set({ currentDirectory: directory }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCurrentView: (view) => set({ currentView: view }),
  setCollections: (collections) => set({ collections }),
  setFaceClusters: (faceClusters) => set({ faceClusters }),
  setTrips: (trips) => set({ trips }),
  setFavoriteEntries: (entries) =>
    set((state) => {
      const sortedEntries = [...entries].sort((a, b) => {
        const left = typeof a.mtime === "number" ? a.mtime : 0;
        const right = typeof b.mtime === "number" ? b.mtime : 0;
        return right - left;
      });

      const favoriteMap = sortedEntries.reduce<Record<string, boolean>>(
        (acc, entry) => {
          if (entry.path) {
            acc[entry.path] = true;
          }
          return acc;
        },
        {}
      );

      return {
        favoriteEntries: sortedEntries,
        favoriteMap,
        photos: state.photos.map((photo) => ({
          ...photo,
          favorite: favoriteMap[photo.path] ?? false,
        })),
      };
    }),
  updateFavoriteForPath: (path, favorite, metadata) =>
    set((state) => {
      const favoriteMap = { ...state.favoriteMap };
      let favoriteEntries = state.favoriteEntries;

      if (favorite) {
        favoriteMap[path] = true;
        const existingIndex = favoriteEntries.findIndex(
          (entry) => entry.path === path
        );

        if (existingIndex >= 0) {
          const existing = favoriteEntries[existingIndex];
          const updated: FavoriteEntry = {
            path,
            isFavorite: true,
            mtime: metadata?.mtime ?? existing.mtime,
          };
          favoriteEntries = [
            ...favoriteEntries.slice(0, existingIndex),
            updated,
            ...favoriteEntries.slice(existingIndex + 1),
          ];
        } else {
          favoriteEntries = [
            ...favoriteEntries,
            {
              path,
              isFavorite: true,
              mtime: metadata?.mtime,
            },
          ];
        }
      } else {
        delete favoriteMap[path];
        favoriteEntries = favoriteEntries.filter((entry) => entry.path !== path);
      }

      const sortedEntries = favoriteEntries.sort((a, b) => {
        const left = typeof a.mtime === "number" ? a.mtime : 0;
        const right = typeof b.mtime === "number" ? b.mtime : 0;
        return right - left;
      });

      return {
        favoriteMap,
        favoriteEntries: sortedEntries,
        photos: state.photos.map((photo) =>
          photo.path === path ? { ...photo, favorite } : photo
        ),
      };
    }),

  // Computed values
  get photoCount() {
    return get().photos.length;
  },
}));

export type { Photo };
