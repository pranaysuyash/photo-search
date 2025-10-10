/**
 * Library Store - Manages photo library state, directories, and indexing
 * 
 * Handles library selection, photo loading, indexing status, and directory management.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Photo {
  path: string;
  mtime: number;
  thumbnail?: string;
  width?: number;
  height?: number;
  metadata?: PhotoMetadata;
}

export interface PhotoMetadata {
  date?: string;
  camera?: string;
  location?: {
    lat?: number;
    lon?: number;
    name?: string;
  };
  tags?: string[];
  isFavorite?: boolean;
  collections?: string[];
  faces?: string[];
}

export interface IndexStatus {
  isIndexing: boolean;
  progress: number; // 0-100
  currentFile?: string;
  indexed: number;
  total: number;
  error?: string;
}

interface LibraryState {
  // Current library
  currentDir: string | null;
  recentDirs: string[];
  
  // Photos
  photos: Photo[];
  isLoading: boolean;
  loadError: string | null;
  
  // Selection
  selectedPhotos: Set<string>;
  lastSelectedIndex: number | null;
  
  // Indexing
  indexStatus: IndexStatus;
  
  // View settings
  viewMode: 'grid' | 'list' | 'timeline';
  gridSize: 'small' | 'medium' | 'large';
  sortBy: 'date' | 'name' | 'size' | 'random';
  sortOrder: 'asc' | 'desc';
  
  // Actions - Directory
  setCurrentDir: (dir: string | null) => void;
  addRecentDir: (dir: string) => void;
  clearRecentDirs: () => void;
  
  // Actions - Photos
  setPhotos: (photos: Photo[]) => void;
  addPhotos: (photos: Photo[]) => void;
  updatePhoto: (path: string, updates: Partial<Photo>) => void;
  removePhoto: (path: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setLoadError: (error: string | null) => void;
  clearPhotos: () => void;
  
  // Actions - Selection
  selectPhoto: (path: string, multiSelect?: boolean) => void;
  selectRange: (startIndex: number, endIndex: number) => void;
  togglePhotoSelection: (path: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isPhotoSelected: (path: string) => boolean;
  
  // Actions - Indexing
  setIndexStatus: (status: Partial<IndexStatus>) => void;
  startIndexing: () => void;
  stopIndexing: () => void;
  
  // Actions - View Settings
  setViewMode: (mode: 'grid' | 'list' | 'timeline') => void;
  setGridSize: (size: 'small' | 'medium' | 'large') => void;
  setSortBy: (sortBy: LibraryState['sortBy']) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  toggleSortOrder: () => void;
  
  // Utility
  reset: () => void;
}

const initialIndexStatus: IndexStatus = {
  isIndexing: false,
  progress: 0,
  indexed: 0,
  total: 0,
};

const initialState = {
  currentDir: null,
  recentDirs: [],
  photos: [],
  isLoading: false,
  loadError: null,
  selectedPhotos: new Set<string>(),
  lastSelectedIndex: null,
  indexStatus: initialIndexStatus,
  viewMode: 'grid' as const,
  gridSize: 'medium' as const,
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
};

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Directory actions
      setCurrentDir: (currentDir) => {
        set({ currentDir });
        if (currentDir) {
          get().addRecentDir(currentDir);
        }
      },
      
      addRecentDir: (dir) => {
        const { recentDirs } = get();
        const updated = [
          dir,
          ...recentDirs.filter(d => d !== dir)
        ].slice(0, 10); // Keep last 10
        
        set({ recentDirs: updated });
      },
      
      clearRecentDirs: () => set({ recentDirs: [] }),
      
      // Photos actions
      setPhotos: (photos) => 
        set({ 
          photos,
          loadError: null 
        }),
      
      addPhotos: (newPhotos) =>
        set((state) => ({
          photos: [...state.photos, ...newPhotos]
        })),
      
      updatePhoto: (path, updates) =>
        set((state) => ({
          photos: state.photos.map(photo =>
            photo.path === path
              ? { ...photo, ...updates }
              : photo
          )
        })),
      
      removePhoto: (path) =>
        set((state) => ({
          photos: state.photos.filter(p => p.path !== path),
          selectedPhotos: new Set(
            Array.from(state.selectedPhotos).filter(p => p !== path)
          )
        })),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      setLoadError: (loadError) => 
        set({ loadError, isLoading: false }),
      
      clearPhotos: () => 
        set({ 
          photos: [],
          selectedPhotos: new Set(),
          lastSelectedIndex: null 
        }),
      
      // Selection actions
      selectPhoto: (path, multiSelect = false) => {
        const { photos, selectedPhotos } = get();
        const index = photos.findIndex(p => p.path === path);
        
        if (multiSelect) {
          const newSelected = new Set(selectedPhotos);
          newSelected.add(path);
          set({ 
            selectedPhotos: newSelected,
            lastSelectedIndex: index 
          });
        } else {
          set({ 
            selectedPhotos: new Set([path]),
            lastSelectedIndex: index 
          });
        }
      },
      
      selectRange: (startIndex, endIndex) => {
        const { photos } = get();
        const [start, end] = startIndex < endIndex 
          ? [startIndex, endIndex]
          : [endIndex, startIndex];
        
        const rangePhotos = photos.slice(start, end + 1).map(p => p.path);
        set({ 
          selectedPhotos: new Set(rangePhotos),
          lastSelectedIndex: endIndex 
        });
      },
      
      togglePhotoSelection: (path) => {
        const { selectedPhotos, photos } = get();
        const newSelected = new Set(selectedPhotos);
        const index = photos.findIndex(p => p.path === path);
        
        if (newSelected.has(path)) {
          newSelected.delete(path);
        } else {
          newSelected.add(path);
        }
        
        set({ 
          selectedPhotos: newSelected,
          lastSelectedIndex: index 
        });
      },
      
      selectAll: () => {
        const { photos } = get();
        set({ 
          selectedPhotos: new Set(photos.map(p => p.path))
        });
      },
      
      clearSelection: () => 
        set({ 
          selectedPhotos: new Set(),
          lastSelectedIndex: null 
        }),
      
      isPhotoSelected: (path) => {
        const { selectedPhotos } = get();
        return selectedPhotos.has(path);
      },
      
      // Indexing actions
      setIndexStatus: (status) =>
        set((state) => ({
          indexStatus: { ...state.indexStatus, ...status }
        })),
      
      startIndexing: () =>
        set({ 
          indexStatus: { 
            ...initialIndexStatus, 
            isIndexing: true 
          } 
        }),
      
      stopIndexing: () =>
        set((state) => ({
          indexStatus: { 
            ...state.indexStatus, 
            isIndexing: false 
          }
        })),
      
      // View settings actions
      setViewMode: (viewMode) => set({ viewMode }),
      
      setGridSize: (gridSize) => set({ gridSize }),
      
      setSortBy: (sortBy) => set({ sortBy }),
      
      setSortOrder: (sortOrder) => set({ sortOrder }),
      
      toggleSortOrder: () =>
        set((state) => ({
          sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc'
        })),
      
      // Utility
      reset: () => set({
        ...initialState,
        // Keep these persisted values
        recentDirs: get().recentDirs,
        viewMode: get().viewMode,
        gridSize: get().gridSize,
        sortBy: get().sortBy,
        sortOrder: get().sortOrder,
      })
    }),
    {
      name: 'photo-search-library-store',
      partialize: (state) => ({
        // Persist these fields
        currentDir: state.currentDir,
        recentDirs: state.recentDirs,
        viewMode: state.viewMode,
        gridSize: state.gridSize,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);

// Selectors
export const useCurrentDir = () => useLibraryStore(state => state.currentDir);
export const usePhotos = () => useLibraryStore(state => state.photos);
export const useIsLoading = () => useLibraryStore(state => state.isLoading);
export const useSelectedPhotos = () => useLibraryStore(state => state.selectedPhotos);
export const useIndexStatus = () => useLibraryStore(state => state.indexStatus);
export const useViewSettings = () => useLibraryStore(state => ({
  viewMode: state.viewMode,
  gridSize: state.gridSize,
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
}));
