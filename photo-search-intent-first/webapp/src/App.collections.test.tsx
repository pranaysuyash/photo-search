import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from './App'

// Mock stores (same pattern as smoke) to control setCollections
vi.mock('./stores/useStores', () => {
  let settings = { dir: '/d', engine: 'local', needsHf: false, needsOAI: false } as any
  let photo = { results: [], searchId: '', query: '', topK: 24, fav: [], favOnly: false, tags: { allTags: [], tagsMap: {}, tagFilter: '' }, saved: [], collections: {}, smart: {}, library: [] } as any
  let ui = { busy: '', note: '', showWelcome: false, showHelp: false, viewMode: 'grid' as 'grid'|'film' }
  let workspace = { workspace: [], wsToggle: false, persons: [], clusters: [], groups: [], points: [], diag: null } as any
  const photoActions = { setCollections: vi.fn((c: any)=>{ photo.collections = c }), setResults: (r: any)=>{ photo.results = r }, setSearchId: (s: string)=>{ photo.searchId = s } } as any
  const uiActions = { setShowHelp: (_: boolean)=>{}, setShowWelcome: (_: boolean)=>{}, setBusy: (_: string)=>{}, setNote: (_: string)=>{} } as any
  const workspaceActions = { setWorkspace: (_: string[])=>{}, setPersons: (_: string[])=>{}, setDiag: (_: any)=>{} } as any
  return {
    useSettings: () => settings,
    usePhoto: () => photo,
    useUI: () => ui,
    useWorkspaceState: () => workspace,
    useSettingsActions: () => ({}),
    usePhotoActions: () => photoActions,
    useUIActions: () => uiActions,
    useWorkspaceActions: () => workspaceActions,
  }
})

vi.mock('./api', () => ({
  apiGetCollections: vi.fn(async () => ({ collections: { Summer: ['/a.jpg'] } })),
  apiWorkspaceList: vi.fn(async () => ({ folders: [] })),
  apiGetTags: vi.fn(async () => ({ tags: {}, all: [] })),
  apiGetFavorites: vi.fn(async () => ({ favorites: [] })),
  apiGetSaved: vi.fn(async () => ({ saved: [] })),
  apiDiagnostics: vi.fn(async () => ({ folder: '/d', engines: [], free_gb: 100, os: 'macOS' })),
  apiLibrary: vi.fn(async () => ({ total: 0, offset: 0, limit: 120, paths: [] })),
}))

describe('App Collections wiring (mocked stores)', () => {
  it('refreshes collections via App', async () => {
    const { apiGetCollections } = await import('./api')
    const { usePhotoActions } = await import('./stores/useStores') as any
    render(<App />)
    // Scope to the Collections section to avoid other "Refresh" buttons
    const collectionsHeading = screen.getByText('Collections')
    const collectionsSection = collectionsHeading.closest('div') as HTMLElement
    const refreshBtn = within(collectionsSection).getByText('Refresh')
    fireEvent.click(refreshBtn)
    await waitFor(() => expect((apiGetCollections as any).mock.calls.length).toBeGreaterThan(0))
    // setCollections was called on actions
    const actions = usePhotoActions()
    expect(actions.setCollections).toHaveBeenCalled()
  })
})
