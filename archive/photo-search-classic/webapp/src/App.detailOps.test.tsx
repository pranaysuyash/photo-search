import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from './App'

vi.mock('./api', () => ({
  apiSearch: vi.fn(async () => ({ search_id: 's1', results: [ { path: '/a.jpg', score: 0.9 } ] })),
  apiGetFavorites: vi.fn(async () => ({ favorites: [] })),
  apiGetSaved: vi.fn(async () => ({ saved: [] })),
  apiDiagnostics: vi.fn(async () => ({ folder: '/d', engines: [], free_gb: 100, os: 'macOS' })),
  apiGetMetadata: vi.fn(async () => ({ cameras: [] })),
  apiExif: vi.fn(async () => ({ path: '/a.jpg', width: 640, height: 480, camera: 'iPhone', date: '2024-01-01' })),
  apiOpen: vi.fn(async () => ({ ok: true })),
  apiSetFavorite: vi.fn(async (_d: string, _p: string, _f: boolean) => ({ ok: true, favorites: ['/a.jpg'] })),
  apiEditOps: vi.fn(async () => ({ out_path: '/a_rot.jpg' })),
  apiUpscale: vi.fn(async () => ({ out_path: '/a_up2.jpg' })),
  apiSearchLike: vi.fn(async () => ({ search_id: 's2', results: [] })),
  thumbUrl: (_d: string, _e: string, p: string, _s: number) => `mock://thumb${p}`,
}))

describe('Classic App detail + per-card ops', () => {
  it('opens details (EXIF), runs per-card actions and more-like', async () => {
    const { apiExif, apiOpen, apiSetFavorite, apiEditOps, apiUpscale, apiSearchLike } = await import('./api')
    render(<App />)
    // Prepare search
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })
    fireEvent.change(screen.getByPlaceholderText('friends on beach'), { target: { value: 'beach' } })
    fireEvent.click(screen.getAllByText('Search')[1])

    // Click the result thumb to open details and fetch EXIF
    const thumb = await screen.findByAltText('thumb')
    fireEvent.click(thumb)
    await waitFor(() => expect((apiExif as any).mock.calls.length).toBeGreaterThan(0))
    // Inside details: click Reveal and Favorite
    // Click a visible Reveal (on card) to exercise apiOpen
    fireEvent.click(screen.getAllByText('Reveal')[0])
    await waitFor(() => expect((apiOpen as any).mock.calls.length).toBeGreaterThan(0))
    fireEvent.click(screen.getAllByText('♥ Favorite')[0])
    await waitFor(() => expect((apiSetFavorite as any).mock.calls.length).toBeGreaterThan(0))
    // Close details
    fireEvent.click(screen.getByText('Close'))

    // Card-level actions
    fireEvent.click(screen.getByText('Rotate 90°'))
    await waitFor(() => expect((apiEditOps as any).mock.calls.length).toBeGreaterThan(0))
    fireEvent.click(screen.getByText('Upscale 2×'))
    await waitFor(() => expect((apiUpscale as any).mock.calls.length).toBeGreaterThan(0))
    fireEvent.click(screen.getByText('More like this'))
    await waitFor(() => expect((apiSearchLike as any).mock.calls.length).toBeGreaterThan(0))
  })
})
