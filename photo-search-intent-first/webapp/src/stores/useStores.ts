// Unified store hooks to prevent excessive re-renders
// Use individual hooks for specific values to avoid object recreation
export { 
  useDir, 
  useEngine, 
  useHfToken, 
  useOpenaiKey, 
  useFastIndexEnabled, 
  useFastKind, 
  useCaptionsEnabled, 
  useOcrEnabled, 
  useHasText, 
  usePlace,
  useCamera,
  useIsoMin,
  useIsoMax,
  useFMin,
  useFMax,
  useNeedsHf,
  useNeedsOAI,
  useSettingsActions
} from './settingsStore'

export {
  useSearchResults,
  useSearchQuery,
  useSearchId,
  useFavorites,
  useFavOnly,
  useTopK,
  useTags,
  useSavedSearches,
  useCollections,
  useSmartCollections,
  useLibrary,
  usePhotoActions
} from './photoStore'

export {
  useBusy,
  useNote,
  useViewMode,
  useShowWelcome,
  useShowHelp,
  useUIActions
} from './uiStore'

export {
  useWorkspace,
  useWsToggle,
  usePersons,
  useClusters,
  useGroups,
  usePoints,
  useDiag,
  useWorkspaceActions
} from './workspaceStore'

// For components that need grouped state, provide stable selectors
import { useSettingsStore } from './settingsStore'
import { usePhotoStore } from './photoStore'
import { useUIStore } from './uiStore'
import { useWorkspaceStore } from './workspaceStore'
import { shallow } from 'zustand/shallow'
import { 
  SettingsState, 
  PhotoState, 
  UIState, 
  WorkspaceState 
} from './types'

// Type definitions for grouped selectors with computed properties
interface SettingsWithComputed extends SettingsState {
  needsHf: boolean
  needsOAI: boolean
}

// Create stable selector functions outside of the hook
const settingsSelector = (state: any): SettingsWithComputed => ({
  dir: state.dir,
  engine: state.engine,
  hfToken: state.hfToken,
  openaiKey: state.openaiKey,
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
  // Computed
  needsHf: state.engine.startsWith('hf'),
  needsOAI: state.engine === 'openai',
})

const photoSelector = (state: any): PhotoState => ({
  results: state.results,
  searchId: state.searchId,
  query: state.query,
  topK: state.topK,
  fav: state.fav,
  favOnly: state.favOnly,
  tags: state.tags,
  saved: state.saved,
  collections: state.collections,
  smart: state.smart,
  library: state.library,
})

const uiSelector = (state: any): UIState => ({
  busy: state.busy,
  note: state.note,
  viewMode: state.viewMode,
  showWelcome: state.showWelcome,
  showHelp: state.showHelp,
})

const workspaceSelector = (state: any): WorkspaceState => ({
  workspace: state.workspace,
  wsToggle: state.wsToggle,
  persons: state.persons,
  clusters: state.clusters,
  groups: state.groups,
  points: state.points,
  diag: state.diag,
})

// Use these only when you need ALL values from a store
export const useSettings = (): SettingsWithComputed => 
  useSettingsStore(settingsSelector)

export const usePhoto = (): PhotoState => 
  usePhotoStore(photoSelector)

export const useUI = (): UIState => 
  useUIStore(uiSelector)

export const useWorkspaceState = (): WorkspaceState => 
  useWorkspaceStore(workspaceSelector)
