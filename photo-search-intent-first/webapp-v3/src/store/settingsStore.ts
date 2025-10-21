/**
 * Settings Store - Manages application settings and workspace configuration
 * 
 * Handles user preferences, workspace management, and application configuration.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SettingsStoreState } from '../types/store';
import type { AppSettings, WorkspaceConfig } from '../types/api';

const defaultSettings: AppSettings = {
  // General settings
  theme: 'system',
  language: 'en',
  
  // Photo settings
  thumbnailQuality: 'medium',
  thumbnailSize: 200,
  autoIndex: true,
  
  // Search settings
  enableSemanticSearch: true,
  enableFaceRecognition: true,
  enableOCR: true,
  searchResultLimit: 100,
  
  // Privacy settings
  allowTelemetry: false,
  allowCrashReports: false,
  
  // Performance settings
  maxConcurrentOperations: 4,
  cacheSize: 1000,
  
  // Advanced settings
  apiTimeout: 30000,
  retryAttempts: 3,
  debugMode: false,
};

const initialState: Omit<SettingsStoreState, keyof SettingsStoreState> = {
  settings: defaultSettings,
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,
};

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      resetSettings: () =>
        set({ settings: defaultSettings }),

      addWorkspace: (workspace) =>
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
        })),

      removeWorkspace: (workspaceId) =>
        set((state) => ({
          workspaces: state.workspaces.filter(w => w.id !== workspaceId),
          currentWorkspace: state.currentWorkspace?.id === workspaceId 
            ? null 
            : state.currentWorkspace,
        })),

      setCurrentWorkspace: (currentWorkspace) =>
        set({ currentWorkspace }),

      updateWorkspace: (workspaceId, updates) =>
        set((state) => ({
          workspaces: state.workspaces.map(workspace =>
            workspace.id === workspaceId
              ? { ...workspace, ...updates, lastOpened: new Date() }
              : workspace
          ),
          currentWorkspace: state.currentWorkspace?.id === workspaceId
            ? { ...state.currentWorkspace, ...updates, lastOpened: new Date() }
            : state.currentWorkspace,
        })),

      loadSettings: async () => {
        set({ isLoading: true });
        
        try {
          // This would load settings from the API or local storage
          // For now, just simulate loading
          await new Promise(resolve => setTimeout(resolve, 100));
          
          set({ isLoading: false });
        } catch (error) {
          console.error('Failed to load settings:', error);
          set({ isLoading: false });
        }
      },

      saveSettings: async () => {
        set({ isLoading: true });
        
        try {
          // This would save settings to the API or local storage
          // For now, just simulate saving
          await new Promise(resolve => setTimeout(resolve, 100));
          
          set({ isLoading: false });
        } catch (error) {
          console.error('Failed to save settings:', error);
          set({ isLoading: false });
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      reset: () => set(initialState),
    }),
    {
      name: 'photo-search-settings-store',
      // All fields are persisted for settings
    }
  )
);

// Selectors for common settings
export const useThemeSetting = () => useSettingsStore(state => state.settings.theme);
export const useSearchSettings = () => useSettingsStore(state => ({
  enableSemanticSearch: state.settings.enableSemanticSearch,
  enableFaceRecognition: state.settings.enableFaceRecognition,
  enableOCR: state.settings.enableOCR,
  searchResultLimit: state.settings.searchResultLimit,
}));
export const usePrivacySettings = () => useSettingsStore(state => ({
  allowTelemetry: state.settings.allowTelemetry,
  allowCrashReports: state.settings.allowCrashReports,
}));
export const useCurrentWorkspace = () => useSettingsStore(state => state.currentWorkspace);
export const useWorkspaces = () => useSettingsStore(state => state.workspaces);