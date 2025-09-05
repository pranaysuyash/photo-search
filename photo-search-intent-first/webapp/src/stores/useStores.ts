// Unified store hook to prevent excessive re-renders
import { useSettingsStore } from './settingsStore'
import { usePhotoStore } from './photoStore'
import { useUIStore } from './uiStore'
import { useWorkspaceStore } from './workspaceStore'
import { useShallow } from 'zustand/react/shallow'

// Use these hooks instead of individual hooks to prevent infinite loops
export const useSettings = () => useSettingsStore(useShallow((state) => ({
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
}))

export const usePhoto = () => usePhotoStore(useShallow((state) => ({
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
}))

export const useUI = () => useUIStore(useShallow((state) => ({
  busy: state.busy,
  note: state.note,
  viewMode: state.viewMode,
  showWelcome: state.showWelcome,
  showHelp: state.showHelp,
}))

export const useWorkspace = () => useWorkspaceStore(useShallow((state) => ({
  workspace: state.workspace,
  wsToggle: state.wsToggle,
  persons: state.persons,
  clusters: state.clusters,
  groups: state.groups,
  points: state.points,
  diag: state.diag,
}))

// Export action hooks with shallow comparison
export { useSettingsActions } from './settingsStore'
export { usePhotoActions } from './photoStore'
export { useUIActions } from './uiStore'
export { useWorkspaceActions } from './workspaceStore'
