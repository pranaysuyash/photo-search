import { create } from 'zustand'
import { subscribeWithSelector, persist } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { SettingsState, SettingsActions } from './types'

interface SettingsStore extends SettingsState, SettingsActions {}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // Initial state
      dir: '',
      engine: 'local',
      hfToken: '',
      openaiKey: '',
      useFast: false,
      fastKind: '',
      useCaps: false,
      vlmModel: 'Qwen/Qwen2-VL-2B-Instruct',
      useOcr: false,
      hasText: false,
      
      // EXIF filters
      camera: '',
      isoMin: '',
      isoMax: '',
      fMin: '',
      fMax: '',
      place: '',

      // Actions
      setDir: (dir) => set({ dir }),
      setEngine: (engine) => set({ engine }),
      setHfToken: (hfToken) => set({ hfToken }),
      setOpenaiKey: (openaiKey) => set({ openaiKey }),
      setUseFast: (useFast) => set({ useFast }),
      setFastKind: (fastKind) => set({ fastKind }),
      setUseCaps: (useCaps) => set({ useCaps }),
      setVlmModel: (vlmModel) => set({ vlmModel }),
      setUseOcr: (useOcr) => set({ useOcr }),
      setHasText: (hasText) => set({ hasText }),
      setCamera: (camera) => set({ camera }),
      setIsoMin: (isoMin) => set({ isoMin }),
      setIsoMax: (isoMax) => set({ isoMax }),
      setFMin: (fMin) => set({ fMin }),
      setFMax: (fMax) => set({ fMax }),
      setPlace: (place) => set({ place }),
    })),
    {
      name: 'photo-search-settings', // unique name for localStorage key
      // Only persist non-sensitive settings
      partialize: (state) => ({
        dir: state.dir,
        engine: state.engine,
        useFast: state.useFast,
        fastKind: state.fastKind,
        useCaps: state.useCaps,
        vlmModel: state.vlmModel,
        useOcr: state.useOcr,
        hasText: state.hasText,
        camera: state.camera,
        isoMin: state.isoMin,
        isoMax: state.isoMax,
        fMin: state.fMin,
        fMax: state.fMax,
        place: state.place,
        // Don't persist sensitive tokens
        // hfToken and openaiKey are not included
      }),
    }
  )
)

// Selectors for optimized subscriptions
export const useDir = () => useSettingsStore((state) => state.dir)
export const useEngine = () => useSettingsStore((state) => state.engine)
export const useHfToken = () => useSettingsStore((state) => state.hfToken)
export const useOpenaiKey = () => useSettingsStore((state) => state.openaiKey)
export const useUseFast = () => useSettingsStore((state) => state.useFast)
export const useFastKind = () => useSettingsStore((state) => state.fastKind)
export const useUseCaps = () => useSettingsStore((state) => state.useCaps)
export const useVlmModel = () => useSettingsStore((state) => state.vlmModel)
export const useUseOcr = () => useSettingsStore((state) => state.useOcr)
export const useHasText = () => useSettingsStore((state) => state.hasText)
export const useCamera = () => useSettingsStore((state) => state.camera)
export const useIsoMin = () => useSettingsStore((state) => state.isoMin)
export const useIsoMax = () => useSettingsStore((state) => state.isoMax)
export const useFMin = () => useSettingsStore((state) => state.fMin)
export const useFMax = () => useSettingsStore((state) => state.fMax)
export const usePlace = () => useSettingsStore((state) => state.place)

// Computed selectors
export const useNeedsHf = () => useSettingsStore((state) => state.engine.startsWith('hf'))
export const useNeedsOAI = () => useSettingsStore((state) => state.engine === 'openai')

// EXIF filters combined
export const useExifFilters = () => useSettingsStore((state) => ({
  camera: state.camera,
  isoMin: state.isoMin,
  isoMax: state.isoMax,
  fMin: state.fMin,
  fMax: state.fMax,
  place: state.place,
}))

// Actions selector - use shallow comparison
export const useSettingsActions = () => useSettingsStore((state) => ({
  setDir: state.setDir,
  setEngine: state.setEngine,
  setHfToken: state.setHfToken,
  setOpenaiKey: state.setOpenaiKey,
  setUseFast: state.setUseFast,
  setFastKind: state.setFastKind,
  setUseCaps: state.setUseCaps,
  setVlmModel: state.setVlmModel,
  setUseOcr: state.setUseOcr,
  setHasText: state.setHasText,
  setCamera: state.setCamera,
  setIsoMin: state.setIsoMin,
  setIsoMax: state.setIsoMax,
  setFMin: state.setFMin,
  setFMax: state.setFMax,
  setPlace: state.setPlace,
}), shallow)