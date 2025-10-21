import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PhotoStoreState } from "../types/store";
import { offlineModeHandler } from "../services/offlineModeHandler";
import { fileSystemService } from "../services/fileSystemService";

const initialState = {
  photos: [] as any[],
  selectedPhotos: new Set<string>(),
  currentPhoto: null,
  currentDirectory: null as string | null,
  favoriteEntries: [] as any[],
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  currentPage: 1,
  totalPhotos: 0,
  error: null,
  isOfflineMode: typeof window !== 'undefined' && !!window.electronAPI, // Default to true in Electron
  offlineCapabilities: {
    canScanDirectories: typeof window !== 'undefined' && !!window.electronAPI,
    canDisplayPhotos: typeof window !== 'undefined' && !!window.electronAPI,
    canGenerateThumbnails: typeof window !== 'undefined' && !!window.electronAPI,
    canAccessMetadata: typeof window !== 'undefined' && !!window.electronAPI,
    hasFileSystemAccess: typeof window !== 'undefined' && !!window.electronAPI,
  },
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

      // Directory management
      setCurrentDirectory: (currentDirectory) => set({ currentDirectory }),

      // Favorites management
      setFavoriteEntries: (favoriteEntries) => set({ favoriteEntries }),

      updateFavoriteForPath: (path, isFavorite) =>
        set((state) => {
          const updatedPhotos = state.photos.map(photo =>
            photo.path === path ? { ...photo, favorite: isFavorite } : photo
          );
          
          let updatedFavorites;
          if (isFavorite) {
            // Add to favorites if not already there
            const existingFavorite = state.favoriteEntries.find(fav => fav.path === path);
            if (!existingFavorite) {
              updatedFavorites = [...state.favoriteEntries, { path, favorite: true }];
            } else {
              updatedFavorites = state.favoriteEntries;
            }
          } else {
            // Remove from favorites
            updatedFavorites = state.favoriteEntries.filter(fav => fav.path !== path);
          }

          return {
            photos: updatedPhotos,
            favoriteEntries: updatedFavorites,
          };
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

      // Offline mode actions
      loadPhotosOffline: async () => {
        console.log('🔄 Starting loadPhotosOffline...');
        set({ isLoading: true, error: null });
        
        try {
          if (!offlineModeHandler.isOfflineCapable()) {
            throw new Error('Offline mode not available - not running in Electron');
          }

          console.log('🔄 Scanning directories offline...');
          const photos = await offlineModeHandler.scanDirectoriesOffline();
          console.log('📸 Found photos:', photos.length);
          
          // Preload thumbnails for better performance
          if (photos.length > 0) {
            console.log('🖼️ Preloading thumbnails for first 50 photos...');
            offlineModeHandler.preloadThumbnailsOffline(photos.slice(0, 50)); // Preload first 50
          }
          
          set({ 
            photos, 
            totalPhotos: photos.length,
            isLoading: false,
            error: null 
          });
          
          console.log('✅ Successfully loaded', photos.length, 'photos in offline mode');
        } catch (error) {
          console.error('❌ Failed to load photos in offline mode:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load photos',
            isLoading: false 
          });
        }
      },

      updateOfflineMode: (offlineMode) => {
        set({ 
          isOfflineMode: offlineMode.isOffline,
          offlineCapabilities: offlineMode.capabilities 
        });
      },

      addPhotoDirectory: async (dirPath?: string) => {
        try {
          let selectedPaths: string[] = [];
          
          if (dirPath) {
            console.log('📁 Adding specific directory:', dirPath);
            selectedPaths = [dirPath];
          } else {
            console.log('📁 Opening directory selector...');
            const paths = await fileSystemService.selectPhotoDirectories();
            if (!paths) {
              console.log('📁 No directories selected');
              return false;
            }
            selectedPaths = paths;
          }

          console.log('📁 Selected paths:', selectedPaths);
          
          for (const path of selectedPaths) {
            console.log('📁 Adding directory to file system service:', path);
            const success = await fileSystemService.addPhotoDirectory(path);
            console.log('📁 Add directory result:', success);
          }

          // Verify directories were added
          const currentDirs = await fileSystemService.getPhotoDirectories();
          console.log('📁 Current photo directories after add:', currentDirs);

          return true;
        } catch (error) {
          console.error('❌ Failed to add photo directory:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to add directory' });
          return false;
        }
      },

      removePhotoDirectory: async (dirPath: string) => {
        try {
          const success = await fileSystemService.removePhotoDirectory(dirPath);
          if (success) {
            // Reload photos after removing directory
            const get = usePhotoStore.getState();
            if (get.isOfflineMode) {
              get.loadPhotosOffline();
            }
          }
          return success;
        } catch (error) {
          console.error('Failed to remove photo directory:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to remove directory' });
          return false;
        }
      },

      getPhotoDirectories: async () => {
        try {
          return await fileSystemService.getPhotoDirectories();
        } catch (error) {
          console.error('Failed to get photo directories:', error);
          return [];
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: 'photo-search-photo-store',
      partialize: (state) => ({
        // Don't persist photos or selection, only preferences and directory
        currentPage: state.currentPage,
        currentDirectory: state.currentDirectory,
      }),
    }
  )
);
