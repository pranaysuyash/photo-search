/**
 * UI Store - Manages global UI state
 * 
 * Handles modals, drawers, toasts, loading states, and UI preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // milliseconds, 0 = permanent
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type Modal = 
  | 'collections'
  | 'tags'
  | 'people'
  | 'settings'
  | 'help'
  | 'about'
  | 'advanced-search'
  | 'share'
  | 'export'
  | 'lightbox'
  | null;

export type Drawer = 
  | 'filters'
  | 'metadata'
  | 'history'
  | 'diagnostics'
  | null;

type AnyData = Record<string, unknown>;

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Modals
  activeModal: Modal;
  modalData: AnyData;
  
  // Drawers
  activeDrawer: Drawer;
  drawerData: AnyData;
  
  // Toasts
  toasts: Toast[];
  
  // Loading
  globalLoading: boolean;
  loadingMessage: string | null;
  
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  
  // Command palette
  commandPaletteOpen: boolean;
  
  // Actions - Theme
  setTheme: (theme: UIState['theme']) => void;
  toggleTheme: () => void;
  
  // Actions - Modals
  openModal: (modal: Modal, data?: AnyData) => void;
  closeModal: () => void;
  setModalData: (data: AnyData) => void;
  
  // Actions - Drawers
  openDrawer: (drawer: Drawer, data?: AnyData) => void;
  closeDrawer: () => void;
  toggleDrawer: (drawer: Drawer) => void;
  setDrawerData: (data: AnyData) => void;
  
  // Actions - Toasts
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Actions - Loading
  setGlobalLoading: (loading: boolean, message?: string | null) => void;
  
  // Actions - Sidebar
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  
  // Actions - Command Palette
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  
  // Utility
  reset: () => void;
}

const initialState = {
  theme: 'system' as const,
  activeModal: null,
  modalData: {},
  activeDrawer: null,
  drawerData: {},
  toasts: [],
  globalLoading: false,
  loadingMessage: null,
  sidebarCollapsed: false,
  sidebarWidth: 240,
  commandPaletteOpen: false,
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Theme actions
      setTheme: (theme) => set({ theme }),
      
      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });
      },
      
      // Modal actions
      openModal: (activeModal, data = {}) =>
        set({ 
          activeModal,
          modalData: data 
        }),
      
      closeModal: () =>
        set({ 
          activeModal: null,
          modalData: {} 
        }),
      
      setModalData: (data) =>
        set((state) => ({
          modalData: { ...state.modalData, ...data }
        })),
      
      // Drawer actions
      openDrawer: (activeDrawer, data = {}) =>
        set({ 
          activeDrawer,
          drawerData: data 
        }),
      
      closeDrawer: () =>
        set({ 
          activeDrawer: null,
          drawerData: {} 
        }),
      
      toggleDrawer: (drawer) => {
        const { activeDrawer } = get();
        set({ 
          activeDrawer: activeDrawer === drawer ? null : drawer,
          drawerData: activeDrawer === drawer ? {} : get().drawerData
        });
      },
      
      setDrawerData: (data) =>
        set((state) => ({
          drawerData: { ...state.drawerData, ...data }
        })),
      
      // Toast actions
      addToast: (toast) => {
        const id = `toast_${Date.now()}_${Math.random()}`;
        const newToast: Toast = {
          ...toast,
          id,
          duration: toast.duration ?? 5000, // Default 5 seconds
        };
        
        set((state) => ({
          toasts: [...state.toasts, newToast]
        }));
        
        // Auto-remove after duration
        if (newToast.duration && newToast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, newToast.duration);
        }
      },
      
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter(t => t.id !== id)
        })),
      
      clearToasts: () => set({ toasts: [] }),
      
      // Loading actions
      setGlobalLoading: (globalLoading, loadingMessage = null) =>
        set({ globalLoading, loadingMessage }),
      
      // Sidebar actions
      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed
        })),
      
      setSidebarWidth: (sidebarWidth) =>
        set({ sidebarWidth }),
      
      // Command palette actions
      toggleCommandPalette: () =>
        set((state) => ({
          commandPaletteOpen: !state.commandPaletteOpen
        })),
      
      setCommandPaletteOpen: (commandPaletteOpen) =>
        set({ commandPaletteOpen }),
      
      // Utility
      reset: () => set({
        ...initialState,
        // Keep theme preference
        theme: get().theme,
        sidebarCollapsed: get().sidebarCollapsed,
        sidebarWidth: get().sidebarWidth,
      })
    }),
    {
      name: 'photo-search-ui-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
);

// Selectors
export const useTheme = () => useUIStore(state => state.theme);
export const useActiveModal = () => useUIStore(state => state.activeModal);
export const useActiveDrawer = () => useUIStore(state => state.activeDrawer);
export const useToasts = () => useUIStore(state => state.toasts);
export const useGlobalLoading = () => useUIStore(state => ({
  isLoading: state.globalLoading,
  message: state.loadingMessage,
}));
export const useSidebar = () => useUIStore(state => ({
  collapsed: state.sidebarCollapsed,
  width: state.sidebarWidth,
}));

// Convenience hooks for toast management
export const useToast = () => {
  const addToast = useUIStore(state => state.addToast);
  
  return {
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    
    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message, duration: 7000 }),
    
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
  };
};
