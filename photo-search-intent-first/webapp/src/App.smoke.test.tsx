import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

// Mock stores to avoid zustand render loops in tests
vi.mock('./stores/useStores', () => {
  let settings = {
    dir: '/d', engine: 'local', hfToken: '', openaiKey: '',
    needsHf: false, needsOAI: false,
    camera: '', isoMin: '', isoMax: '', fMin: '', fMax: '', place: '',
    useCaps: false, useOcr: false, hasText: false, useFast: false, fastKind: '',
  }
  let photo = {
    results: [] as any[], searchId: '', query: 'beach', topK: 24,
    fav: [] as string[], favOnly: false,
    tags: { allTags: [] as string[], tagsMap: {} as Record<string,string[]>, tagFilter: '' },
    saved: [] as any[], collections: {} as any, smart: {} as any, library: [] as string[],
  }
  let ui = { busy: '', note: '', showWelcome: false, showHelp: false, viewMode: 'grid' as 'grid'|'film' }
  let workspace = { workspace: [] as string[], wsToggle: false, persons: [] as string[], clusters: [] as any[], groups: [] as any[], points: [] as any[], diag: null as any }

  const settingsActions = { setDir: (v: string) => { settings.dir = v }, setEngine: (v: string) => { settings.engine = v }, setShowWelcome: (_: boolean) => {} } as any
  const photoActions = { setResults: (r: any[]) => { photo.results = r }, setSearchId: (id: string) => { photo.searchId = id }, setFavorites: (f: string[]) => { photo.fav = f }, setAllTags: (_: string[]) => {}, setTagsMap: (_: any) => {}, setSaved: (_: any) => {}, setCollections: (_: any) => {}, setSmart: (s: any) => { photo.smart = s }, setLibrary: (l: string[]) => { photo.library = l }, setQuery: (q: string) => { photo.query = q } } as any
  const uiActions = { setBusy: (v: string) => { ui.busy = v }, setNote: (v: string) => { ui.note = v }, setShowWelcome: (b: boolean) => { ui.showWelcome = b }, setShowHelp: (b: boolean) => { ui.showHelp = b }, setViewMode: (v: 'grid'|'film') => { ui.viewMode = v } } as any
  const workspaceActions = { setWorkspace: (w: string[]) => { workspace.workspace = w }, setPersons: (p: string[]) => { workspace.persons = p }, setDiag: (d: any) => { workspace.diag = d } } as any

  return {
    useSettings: () => settings,
    usePhoto: () => photo,
    useUI: () => ui,
    useWorkspaceState: () => workspace,
    useSettingsActions: () => settingsActions,
    usePhotoActions: () => photoActions,
    useUIActions: () => uiActions,
    useWorkspaceActions: () => workspaceActions,
  }
})

// Mock APIs that App triggers
vi.mock('./api', () => ({
  apiIndex: vi.fn(async () => ({ new: 1, updated: 0, total: 1 })),
  apiSearch: vi.fn(async () => ({ search_id: 's1', results: [{ path: '/a.jpg', score: 0.9 }] })),
  apiSearchWorkspace: vi.fn(async () => ({ search_id: 'w1', results: [] })),
  apiGetFavorites: vi.fn(async () => ({ favorites: [] })),
  apiGetSaved: vi.fn(async () => ({ saved: [] })),
  apiGetTags: vi.fn(async () => ({ tags: {}, all: [] })),
  apiDiagnostics: vi.fn(async () => ({ folder: '/d', engines: [], free_gb: 100, os: 'macOS' })),
  apiWorkspaceList: vi.fn(async () => ({ folders: [] })),
  apiLibrary: vi.fn(async () => ({ total: 0, offset: 0, limit: 120, paths: [] })),
  apiFacesClusters: vi.fn(async () => ({ clusters: [] })),
  apiBuildMetadata: vi.fn(async () => ({ updated: 0 })),
  apiBuildFast: vi.fn(async () => ({ ok: true, kind: 'faiss' })),
  apiBuildOCR: vi.fn(async () => ({ updated: 0 })),
  apiLookalikes: vi.fn(async () => ({ groups: [] })),
  thumbUrl: (_d: string, _e: string, p: string, _s: number) => `mock://thumb${p}`,
}))

describe('App (smoke with mocked stores)', () => {
  it('wires search and index actions without crashing', async () => {
    render(<App />)
    // Click Search in SearchControls
    fireEvent.click(screen.getByText('Search'))
    // Results panel header should appear when results are set
    await waitFor(() => expect(screen.getByText('Results')).toBeInTheDocument())
    // Build Index & Metadata
    fireEvent.click(screen.getByText('Build Index'))
    fireEvent.click(screen.getByText('Build Metadata'))
    expect(screen.getByText('Results')).toBeInTheDocument()
  })
})
