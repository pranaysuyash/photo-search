/**
 * Store-related type definitions for Zustand state management
 * Based on the design document specifications
 */

import { Photo, Collection, Tag, Person, Place, Trip } from './photo';
import { SearchRequest, SearchResponse, SearchHistoryEntry, SavedSearch, SearchIndexStatus } from './search';
import { AppSettings, WorkspaceConfig, ImportStatus } from './api';

// Photo Store State Interface
export interface PhotoStoreState {
  // Photo data
  photos: Photo[];
  selectedPhotos: Set<string>;
  currentPhoto: Photo | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  
  // Pagination
  hasMore: boolean;
  currentPage: number;
  totalPhotos: number;
  
  // Error handling
  error: string | null;
  
  // Actions
  setPhotos: (photos: Photo[]) => void;
  addPhotos: (photos: Photo[]) => void;
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void;
  removePhoto: (photoId: string) => void;
  selectPhoto: (photoId: string) => void;
  deselectPhoto: (photoId: string) => void;
  selectMultiplePhotos: (photoIds: string[]) => void;
  clearSelection: () => void;
  setCurrentPhoto: (photo: Photo | null) => void;
  toggleFavorite: (photoId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// Search Store State Interface
export interface SearchStoreState {
  // Current search
  currentQuery: string;
  currentFilters: SearchRequest['filters'];
  currentResults: SearchResponse | null;
  
  // Search state
  isSearching: boolean;
  searchError: string | null;
  
  // Search history and saved searches
  searchHistory: SearchHistoryEntry[];
  savedSearches: SavedSearch[];
  
  // Search suggestions
  suggestions: string[];
  isLoadingSuggestions: boolean;
  
  // Index status
  indexStatus: SearchIndexStatus;
  
  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: SearchRequest['filters']) => void;
  performSearch: (request: SearchRequest) => Promise<void>;
  clearSearch: () => void;
  addToHistory: (entry: SearchHistoryEntry) => void;
  saveSearch: (search: SavedSearch) => void;
  removeSavedSearch: (searchId: string) => void;
  loadSuggestions: (query: string) => Promise<void>;
  updateIndexStatus: (status: SearchIndexStatus) => void;
  setSearching: (searching: boolean) => void;
  setSearchError: (error: string | null) => void;
  reset: () => void;
}

// UI Store State Interface
export interface UIStoreState {
  // Layout and view
  sidebarCollapsed: boolean;
  currentView: 'library' | 'search' | 'collections' | 'people' | 'places' | 'favorites' | 'tags' | 'trips';
  viewMode: 'grid' | 'list' | 'timeline' | 'map';
  gridSize: 'small' | 'medium' | 'large';
  
  // Modal and dialog states
  modals: {
    photoViewer: boolean;
    collectionEditor: boolean;
    tagEditor: boolean;
    personEditor: boolean;
    preferences: boolean;
    import: boolean;
    export: boolean;
  };
  
  // Loading and progress states
  globalLoading: boolean;
  progressBars: Record<string, { progress: number; message: string }>;
  
  // Notifications
  notifications: Notification[];
  
  // Theme and appearance
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentView: (view: UIStoreState['currentView']) => void;
  setViewMode: (mode: UIStoreState['viewMode']) => void;
  setGridSize: (size: UIStoreState['gridSize']) => void;
  openModal: (modal: keyof UIStoreState['modals']) => void;
  closeModal: (modal: keyof UIStoreState['modals']) => void;
  setGlobalLoading: (loading: boolean) => void;
  setProgress: (id: string, progress: number, message: string) => void;
  removeProgress: (id: string) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  setTheme: (theme: UIStoreState['theme']) => void;
  reset: () => void;
}

// Notification Interface
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  actions?: NotificationAction[];
  timestamp: Date;
}

// Notification Action Interface
export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'destructive';
}

// Settings Store State Interface
export interface SettingsStoreState {
  // Application settings
  settings: AppSettings;
  
  // Workspace configuration
  workspaces: WorkspaceConfig[];
  currentWorkspace: WorkspaceConfig | null;
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  addWorkspace: (workspace: WorkspaceConfig) => void;
  removeWorkspace: (workspaceId: string) => void;
  setCurrentWorkspace: (workspace: WorkspaceConfig | null) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<WorkspaceConfig>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

// Library Store State Interface
export interface LibraryStoreState {
  // Collections
  collections: Collection[];
  selectedCollection: Collection | null;
  
  // Tags
  tags: Tag[];
  tagSuggestions: string[];
  
  // People
  people: Person[];
  selectedPerson: Person | null;
  
  // Places
  places: Place[];
  selectedPlace: Place | null;
  
  // Trips
  trips: Trip[];
  selectedTrip: Trip | null;
  
  // Import/Export
  importStatus: ImportStatus | null;
  
  // Loading states
  isLoadingCollections: boolean;
  isLoadingTags: boolean;
  isLoadingPeople: boolean;
  isLoadingPlaces: boolean;
  
  // Actions
  // Collections
  setCollections: (collections: Collection[]) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (collectionId: string, updates: Partial<Collection>) => void;
  removeCollection: (collectionId: string) => void;
  setSelectedCollection: (collection: Collection | null) => void;
  
  // Tags
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;
  updateTag: (tagId: string, updates: Partial<Tag>) => void;
  removeTag: (tagId: string) => void;
  loadTagSuggestions: (query: string) => Promise<void>;
  
  // People
  setPeople: (people: Person[]) => void;
  addPerson: (person: Person) => void;
  updatePerson: (personId: string, updates: Partial<Person>) => void;
  removePerson: (personId: string) => void;
  mergePeople: (sourceId: string, targetId: string) => void;
  setSelectedPerson: (person: Person | null) => void;
  
  // Places
  setPlaces: (places: Place[]) => void;
  setSelectedPlace: (place: Place | null) => void;
  
  // Trips
  setTrips: (trips: Trip[]) => void;
  setSelectedTrip: (trip: Trip | null) => void;
  
  // Import/Export
  setImportStatus: (status: ImportStatus | null) => void;
  
  // Loading states
  setLoadingCollections: (loading: boolean) => void;
  setLoadingTags: (loading: boolean) => void;
  setLoadingPeople: (loading: boolean) => void;
  setLoadingPlaces: (loading: boolean) => void;
  
  reset: () => void;
}

// Combined Store State Interface
export interface RootStoreState {
  photo: PhotoStoreState;
  search: SearchStoreState;
  ui: UIStoreState;
  settings: SettingsStoreState;
  library: LibraryStoreState;
}

// Store Action Types
export type StoreAction<T> = (state: T) => void;
export type AsyncStoreAction<T> = (state: T) => Promise<void>;

// Store Middleware Types
export interface StoreMiddleware<T> {
  name: string;
  middleware: (config: any) => (set: any, get: any, api: any) => T;
}

// Persistence Configuration
export interface PersistConfig {
  name: string;
  storage: Storage;
  partialize?: (state: any) => any;
  onRehydrateStorage?: () => void;
  version?: number;
  migrate?: (persistedState: any, version: number) => any;
}

// Store Subscription Types
export type StoreSubscriber<T> = (state: T, prevState: T) => void;
export type StoreSelector<T, U> = (state: T) => U;

// Store Error Types
export interface StoreError {
  type: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'PERMISSION_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  code?: string;
  details?: any;
}