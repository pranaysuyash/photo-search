/**
 * UI Store - Manages global UI state
 *
 * Handles modals, drawers, toasts, loading states, and UI preferences.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UIStoreState, Notification } from "../types/store";

const initialState: Omit<UIStoreState, keyof UIStoreState> = {
  sidebarCollapsed: false,
  currentView: 'library',
  viewMode: 'grid',
  gridSize: 'medium',
  modals: {
    photoViewer: false,
    collectionEditor: false,
    tagEditor: false,
    personEditor: false,
    preferences: false,
    import: false,
    export: false,
  },
  globalLoading: false,
  progressBars: {},
  notifications: [],
  theme: 'system',
};

export const useUIStore = create<UIStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      setCurrentView: (currentView) => set({ currentView }),

      setViewMode: (viewMode) => set({ viewMode }),

      setGridSize: (gridSize) => set({ gridSize }),

      openModal: (modal) =>
        set((state) => ({
          modals: { ...state.modals, [modal]: true },
        })),

      closeModal: (modal) =>
        set((state) => ({
          modals: { ...state.modals, [modal]: false },
        })),

      setGlobalLoading: (globalLoading) => set({ globalLoading }),

      setProgress: (id, progress, message) =>
        set((state) => ({
          progressBars: {
            ...state.progressBars,
            [id]: { progress, message },
          },
        })),

      removeProgress: (id) =>
        set((state) => {
          const { [id]: removed, ...rest } = state.progressBars;
          return { progressBars: rest };
        }),

      addNotification: (notification) => {
        const id = `notification_${Date.now()}_${Math.random()}`;
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: new Date(),
        };

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove after duration
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration);
        }
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      setTheme: (theme) => set({ theme }),

      reset: () =>
        set({
          ...initialState,
          // Keep persisted preferences
          theme: get().theme,
          sidebarCollapsed: get().sidebarCollapsed,
          viewMode: get().viewMode,
          gridSize: get().gridSize,
        }),
    }),
    {
      name: "photo-search-ui-store",
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        viewMode: state.viewMode,
        gridSize: state.gridSize,
        currentView: state.currentView,
      }),
    }
  )
);

// Selectors
export const useTheme = () => useUIStore((state) => state.theme);
export const useActiveModal = () => useUIStore((state) => state.activeModal);
export const useActiveDrawer = () => useUIStore((state) => state.activeDrawer);
export const useToasts = () => useUIStore((state) => state.toasts);
export const useGlobalLoading = () =>
  useUIStore((state) => ({
    isLoading: state.globalLoading,
    message: state.loadingMessage,
  }));
export const useSidebar = () =>
  useUIStore((state) => ({
    collapsed: state.sidebarCollapsed,
    width: state.sidebarWidth,
  }));

// Convenience hooks for toast management
export const useToast = () => {
  const addToast = useUIStore((state) => state.addToast);

  return {
    success: (title: string, message?: string) =>
      addToast({ type: "success", title, message }),

    error: (title: string, message?: string) =>
      addToast({ type: "error", title, message, duration: 7000 }),

    warning: (title: string, message?: string) =>
      addToast({ type: "warning", title, message }),

    info: (title: string, message?: string) =>
      addToast({ type: "info", title, message }),
  };
};
