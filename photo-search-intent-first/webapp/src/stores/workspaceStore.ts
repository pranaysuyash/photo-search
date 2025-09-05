import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { WorkspaceState, WorkspaceActions } from './types'

interface WorkspaceStore extends WorkspaceState, WorkspaceActions {}

export const useWorkspaceStore = create<WorkspaceStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    workspace: [],
    wsToggle: false,
    persons: [],
    clusters: [],
    groups: [],
    points: [],
    diag: null,

    // Actions
    setWorkspace: (workspace) => set({ workspace }),
    setWsToggle: (wsToggle) => set({ wsToggle }),
    setPersons: (persons) => set({ persons }),
    
    addPerson: (person) => 
      set((state) => ({
        persons: state.persons.includes(person) 
          ? state.persons.filter(p => p !== person)
          : [...state.persons, person]
      })),
    
    removePerson: (person) =>
      set((state) => ({
        persons: state.persons.filter(p => p !== person)
      })),
    
    setClusters: (clusters) => set({ clusters }),
    setGroups: (groups) => set({ groups }),
    setPoints: (points) => set({ points }),
    setDiag: (diag) => set({ diag }),
  }))
)

// Selectors for optimized subscriptions
export const useWorkspace = () => useWorkspaceStore((state) => state.workspace)
export const useWsToggle = () => useWorkspaceStore((state) => state.wsToggle)
export const usePersons = () => useWorkspaceStore((state) => state.persons)
export const useClusters = () => useWorkspaceStore((state) => state.clusters)
export const useGroups = () => useWorkspaceStore((state) => state.groups)
export const usePoints = () => useWorkspaceStore((state) => state.points)
export const useDiag = () => useWorkspaceStore((state) => state.diag)

// Computed selectors
export const useHasPersons = () => useWorkspaceStore((state) => state.persons.length > 0)
export const useHasWorkspace = () => useWorkspaceStore((state) => state.workspace.length > 0)
export const useHasClusters = () => useWorkspaceStore((state) => state.clusters.length > 0)
export const useHasGroups = () => useWorkspaceStore((state) => state.groups.length > 0)
export const useHasPoints = () => useWorkspaceStore((state) => state.points.length > 0)

// Fast index status from diagnostics
export const useFastIndexStatus = () => useWorkspaceStore((state) => {
  const firstEngine = state.diag?.engines?.[0]
  return firstEngine?.fast || undefined
})

// Stable actions selector
const workspaceActionsSelector = (state: any) => ({
  setWorkspace: state.setWorkspace,
  setWsToggle: state.setWsToggle,
  setPersons: state.setPersons,
  addPerson: state.addPerson,
  removePerson: state.removePerson,
  setClusters: state.setClusters,
  setGroups: state.setGroups,
  setPoints: state.setPoints,
  setDiag: state.setDiag,
})

// Actions selector - use shallow comparison
export const useWorkspaceActions = () => useWorkspaceStore(workspaceActionsSelector, shallow)