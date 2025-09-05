import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { UIState, UIActions } from './types'

interface UIStore extends UIState, UIActions {}

export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    busy: '',
    note: '',
    viewMode: 'grid',
    showWelcome: false,
    showHelp: false,

    // Actions
    setBusy: (busy) => set({ busy }),
    setNote: (note) => set({ note }),
    setViewMode: (viewMode) => set({ viewMode }),
    setShowWelcome: (showWelcome) => set({ showWelcome }),
    setShowHelp: (showHelp) => set({ showHelp }),
    clearBusy: () => set({ busy: '' }),
  }))
)

// Selectors for optimized subscriptions
export const useBusy = () => useUIStore((state) => state.busy)
export const useNote = () => useUIStore((state) => state.note)
export const useViewMode = () => useUIStore((state) => state.viewMode)
export const useShowWelcome = () => useUIStore((state) => state.showWelcome)
export const useShowHelp = () => useUIStore((state) => state.showHelp)

// Stable actions selector
const uiActionsSelector = (state: any) => ({
  setBusy: state.setBusy,
  setNote: state.setNote,
  setViewMode: state.setViewMode,
  setShowWelcome: state.setShowWelcome,
  setShowHelp: state.setShowHelp,
  clearBusy: state.clearBusy,
})

// Actions selector - use shallow comparison
export const useUIActions = () => useUIStore(uiActionsSelector)

// Computed selectors
export const useIsBusy = () => useUIStore((state) => Boolean(state.busy))
export const useHasNote = () => useUIStore((state) => Boolean(state.note))
