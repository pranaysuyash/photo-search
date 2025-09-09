import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

vi.mock('./api', () => ({
  apiFacesBuild: vi.fn(async () => ({ updated: 1, faces: 10, clusters: 2 })),
  apiFacesClusters: vi.fn(async () => ({ clusters: [] })),
  apiFacesName: vi.fn(async () => ({ ok: true })),
  apiLookalikes: vi.fn(async () => ({ groups: [{ id: 'g1', paths: ['/a.jpg'], resolved: false }] })),
  apiResolveLookalike: vi.fn(async () => ({ ok: true, id: 'g1' })),
  apiGetFavorites: vi.fn(async () => ({ favorites: [] })),
  apiGetSaved: vi.fn(async () => ({ saved: [] })),
  apiDiagnostics: vi.fn(async () => ({ folder: '/d', engines: [], free_gb: 100, os: 'macOS' })),
  apiGetMetadata: vi.fn(async () => ({ cameras: [] })),
  apiSearch: vi.fn(async () => ({ search_id: 's', results: [] })),
  thumbUrl: (_d: string, _e: string, p: string, _s: number) => `mock://thumb${p}`,
  thumbFaceUrl: (_d: string, _e: string, p: string, _emb: number, _s: number) => `mock://face${p}`,
}))

describe('Classic App People + Look tabs', () => {
  it('builds and refreshes faces in People tab', async () => {
    const { apiFacesBuild, apiFacesClusters } = await import('./api')
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })
    fireEvent.click(screen.getByText('People'))
    fireEvent.click(screen.getByText('Build/Update'))
    await waitFor(() => expect((apiFacesBuild as any).mock.calls.length).toBeGreaterThan(0))
    fireEvent.click(screen.getByText('Refresh'))
    await waitFor(() => expect((apiFacesClusters as any).mock.calls.length).toBeGreaterThan(0))
  })

  it('scans and resolves in Look tab', async () => {
    const { apiLookalikes, apiResolveLookalike } = await import('./api')
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })
    fireEvent.click(screen.getByText('Look'))
    fireEvent.click(screen.getByText('Scan'))
    await waitFor(() => expect((apiLookalikes as any).mock.calls.length).toBeGreaterThan(0))
    // Click Mark resolved on the group
    fireEvent.click(screen.getByText('Mark resolved'))
    await waitFor(() => expect((apiResolveLookalike as any).mock.calls.length).toBeGreaterThan(0))
  })
})

