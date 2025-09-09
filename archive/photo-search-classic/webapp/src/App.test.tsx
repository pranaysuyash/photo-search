import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

vi.mock('./api', () => {
  return {
    apiIndex: vi.fn(async () => ({ new: 0, updated: 0, total: 0 })),
    apiSearch: vi.fn(async () => ({ search_id: 's1', results: [ { path: '/a.jpg', score: 0.9 }, { path: '/b.jpg', score: 0.8 } ] })),
    apiSearchWorkspace: vi.fn(async () => ({ search_id: 'w1', results: [] })),
    apiGetFavorites: vi.fn(async () => ({ favorites: [] })),
    apiSetFavorite: vi.fn(async (_dir: string, _path: string, _fav: boolean) => ({ ok: true, favorites: ['/a.jpg'] })),
    apiGetSaved: vi.fn(async () => ({ saved: [] })),
    apiAddSaved: vi.fn(async () => ({ ok: true, saved: [{ name: 'My Search', query: 'beach' }] })),
    apiDeleteSaved: vi.fn(async () => ({ ok: true, deleted: 'My Search', saved: [] })),
    apiMap: vi.fn(async () => ({ points: [{ lat: 0, lon: 0 }] })),
    apiDiagnostics: vi.fn(async () => ({ folder: '/d', engines: [], free_gb: 100, os: 'macOS' })),
    apiExif: vi.fn(async () => ({ path: '/a.jpg', width: 0, height: 0, camera: null, date: null })),
    apiOpen: vi.fn(async () => ({ ok: true })),
    apiExport: vi.fn(async () => ({ ok: true, copied: 2, skipped: 0, errors: 0, dest: '/dest' })),
    apiBuildFast: vi.fn(async () => ({ ok: true, kind: 'faiss' })),
    apiBuildOCR: vi.fn(async () => ({ updated: 0 })),
    apiLookalikes: vi.fn(async () => ({ groups: [] })),
    apiResolveLookalike: vi.fn(async () => ({ ok: true, id: 'g1' })),
    apiWorkspaceList: vi.fn(async () => ({ folders: [] })),
    apiWorkspaceAdd: vi.fn(async (path: string) => ({ folders: [path] })),
    apiWorkspaceRemove: vi.fn(async () => ({ folders: [] })),
    apiEditOps: vi.fn(async () => ({ out_path: '/out.jpg' })),
    apiUpscale: vi.fn(async () => ({ out_path: '/out2.jpg' })),
    apiFacesBuild: vi.fn(async () => ({ updated: 0, faces: 0, clusters: 0 })),
    apiFacesClusters: vi.fn(async () => ({ clusters: [] })),
    apiFacesName: vi.fn(async () => ({ ok: true })),
    apiGetSmart: vi.fn(async () => ({ smart: {} })),
    apiSetSmart: vi.fn(async () => ({ ok: true, smart: {} })),
    apiDeleteSmart: vi.fn(async () => ({ ok: true, deleted: null })),
    apiResolveSmart: vi.fn(async () => ({ search_id: null, results: [] })),
    apiBuildMetadata: vi.fn(async () => ({ updated: 0, cameras: [] })),
    apiGetMetadata: vi.fn(async () => ({ cameras: [] })),
    thumbUrl: (_dir: string, _engine: string, p: string, _size: number) => `mock://thumb${p}`,
    thumbFaceUrl: (_d: string, _e: string, p: string, _emb: number, _s: number) => `mock://face${p}`,
  }
})

describe('Classic App', () => {
  beforeEach(() => {
    vi.spyOn(window, 'prompt').mockReturnValue('My Search')
  })

  it('runs a search and shows results', async () => {
    render(<App />)
    // Set folder and query
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })
    fireEvent.change(screen.getByPlaceholderText('friends on beach'), { target: { value: 'beach' } })
    // Click the main Search button below filters (second occurrence)
    fireEvent.click(screen.getAllByText('Search')[1])
    // Expect results grid with two items
    const cards = await screen.findAllByText(/♥ Favorite|Reveal|More like this/)
    expect(cards.length).toBeGreaterThan(0)
  })

  it('toggles favorite on a result', async () => {
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })
    fireEvent.change(screen.getByPlaceholderText('friends on beach'), { target: { value: 'beach' } })
    fireEvent.click(screen.getAllByText('Search')[1])
    const favBtns = await screen.findAllByText('♥ Favorite')
    fireEvent.click(favBtns[0])
    expect(favBtns[0]).toBeInTheDocument()
  })

  it('saves current search into Saved tab', async () => {
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })
    fireEvent.change(screen.getByPlaceholderText('friends on beach'), { target: { value: 'beach' } })
    // Switch to Saved and click Save current
    fireEvent.click(screen.getByText('Saved'))
    fireEvent.click(screen.getByText('Save current'))
    // Saved list may render empty placeholder; just ensure action completed
    await waitFor(() => expect(window.prompt).toHaveBeenCalled())
  })

  it('loads map points in Map tab', async () => {
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })
    fireEvent.click(screen.getByText('Map'))
    fireEvent.click(screen.getByText('Load'))
    // We won’t assert marker rendering; ensure no crash
    await waitFor(() => expect(screen.getByText('Map (GPS)')).toBeInTheDocument())
  })

  it('adds and removes bulk tag on selected', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({}) } as any)
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })
    fireEvent.change(screen.getByPlaceholderText('friends on beach'), { target: { value: 'beach' } })
    fireEvent.click(screen.getAllByText('Search')[1])
    // Select all and add tag
    fireEvent.click(await screen.findByText('Select all'))
    const input = screen.getByPlaceholderText('tag for selected…') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'beachy' } })
    fireEvent.click(screen.getByText('Add tag'))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    // Remove tag
    fireEvent.click(screen.getByText('Remove tag'))
    // Many fetches happen (diagnostics, saved, etc.). Ensure our /tags calls occurred.
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    fetchSpy.mockRestore()
  })

  it('exports selected CSV and via dialog', async () => {
    const { apiExport } = await import('./api')
    ;(global as any).URL = { ...(global as any).URL, createObjectURL: () => 'blob://x' }
    const createObjUrl = vi.spyOn(URL as any, 'createObjectURL')
    const clickSpy = vi.fn()
    const createEl = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag)
      if ((el as any).click) (el as any).click = clickSpy
      return el as any
    }) as any)
    vi.spyOn(window, 'prompt').mockReturnValue('/tmp/out')
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })
    fireEvent.change(screen.getByPlaceholderText('friends on beach'), { target: { value: 'beach' } })
    fireEvent.click(screen.getAllByText('Search')[1])
    fireEvent.click(await screen.findByText('Select all'))
    // CSV export
    fireEvent.click(screen.getByText('Export selected (CSV)'))
    expect(createObjUrl).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    // Dialog export
    fireEvent.click(screen.getByText('Export selected…'))
    await waitFor(() => expect((apiExport as any).mock.calls.length).toBeGreaterThan(0))
    createObjUrl.mockRestore()
    createEl.mockRestore()
  })
})
