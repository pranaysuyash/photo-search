import { create } from "zustand";
import type { Collection, FaceCluster, Trip } from "../services/api";

interface Photo {
  id: number;
  path: string;
  src: string;
  title: string;
  score?: number;
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

  // Actions
  setPhotos: (photos: Photo[]) => void;
  setCurrentDirectory: (directory: string) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setCurrentView: (view: string) => void;
  setCollections: (collections: Record<string, Collection>) => void;
  setFaceClusters: (clusters: FaceCluster[]) => void;
  setTrips: (trips: Trip[]) => void;

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

  // Actions
  setPhotos: (photos) => set({ photos }),
  setCurrentDirectory: (directory) => set({ currentDirectory: directory }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCurrentView: (view) => set({ currentView: view }),
  setCollections: (collections) => set({ collections }),
  setFaceClusters: (faceClusters) => set({ faceClusters }),
  setTrips: (trips) => set({ trips }),

  // Computed values
  get photoCount() {
    return get().photos.length;
  },
}));

export type { Photo };
