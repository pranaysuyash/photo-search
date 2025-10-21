import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PhotoStoreState } from "../types/store";

const initialState = {
  photos: [] as any[],
  selectedPhotos: new Set<string>(),
  currentPhoto: null,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  currentPage: 1,
  totalPhotos: 0,
  error: null,
};

export const usePhotoStore = create<PhotoStoreState>()(
  persist(
    (set) => ({
      ...initialState,

      // Actions
      setPhotos: (photos) => 
        set({ 
          photos,
          totalPhotos: photos.length,
          error: null 
        }),

      addPhotos: (newPhotos) =>
        set((state) => ({
          photos: [...state.photos, ...newPhotos],
          totalPhotos: state.totalPhotos + newPhotos.length,
        })),

      updatePhoto: (photoId, updates) =>
        set((state) => ({
          photos: state.photos.map((photo) =>
            photo.id === photoId ? { ...photo, ...updates } : photo
          ),
        })),

      removePhoto: (photoId) =>
        set((state) => {
          const newSelectedPhotos = new Set(state.selectedPhotos);
          newSelectedPhotos.delete(photoId);
          
          return {
            photos: state.photos.filter((photo) => photo.id !== photoId),
            selectedPhotos: newSelectedPhotos,
            totalPhotos: state.totalPhotos - 1,
          };
        }),

      selectPhoto: (photoId) =>
        set((state) => {
          const newSelectedPhotos = new Set(state.selectedPhotos);
          newSelectedPhotos.add(photoId);
          return { selectedPhotos: newSelectedPhotos };
        }),

      deselectPhoto: (photoId) =>
        set((state) => {
          const newSelectedPhotos = new Set(state.selectedPhotos);
          newSelectedPhotos.delete(photoId);
          return { selectedPhotos: newSelectedPhotos };
        }),

      selectMultiplePhotos: (photoIds) =>
        set((state) => {
          const newSelectedPhotos = new Set(state.selectedPhotos);
          photoIds.forEach(id => newSelectedPhotos.add(id));
          return { selectedPhotos: newSelectedPhotos };
        }),

      clearSelection: () =>
        set({ selectedPhotos: new Set<string>() }),

      setCurrentPhoto: (currentPhoto) =>
        set({ currentPhoto }),

      toggleFavorite: (photoId) =>
        set((state) => ({
          photos: state.photos.map((photo) =>
            photo.id === photoId
              ? { ...photo, favorite: !photo.favorite }
              : photo
          ),
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    {
      name: 'photo-search-photo-store',
      partialize: (state) => ({
        // Don't persist photos or selection, only preferences
        currentPage: state.currentPage,
      }),
    }
  )
);
