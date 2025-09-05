import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

vi.mock('./api', () => ({
    apiSearch: vi.fn(async () => ({ search_id: 's', results: [] })),
    apiGetFavorites: vi.fn(async () => ({ favorites: [] })),
    apiGetSaved: vi.fn(async () => ({ saved: [] })),
    apiDiagnostics: vi.fn(async () => ({ folder: '/d', engines: [], free_gb: 100, os: 'macOS' })),
    apiGetMetadata: vi.fn(async () => ({ cameras: [] })),
    apiGetSmart: vi.fn(async () => ({ smart: { MySmart: { query: 'q' } } })),
    apiSetSmart: vi.fn(async () => ({ ok: true })),
    apiResolveSmart: vi.fn(async () => ({ search_id: 'sm1', results: [] })),
    apiDeleteSmart: vi.fn(async () => ({ ok: true })),
    thumbUrl: (_d: string, _e: string, p: string, _s: number) => `mock://thumb${p}`,
}))

describe('Classic App Smart Collections', () => {
  it('saves, opens, and deletes a smart collection', async () => {
    const { apiSetSmart, apiResolveSmart, apiDeleteSmart } = await import('./api')
    vi.spyOn(window, 'prompt').mockReturnValue('MySmart')
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })
    fireEvent.change(screen.getByPlaceholderText('friends on beach'), { target: { value: 'q' } })

    fireEvent.click(screen.getByText('Smart'))
    // Refresh to load smart items from API
    fireEvent.click(screen.getByText('Refresh'))
    await screen.findByText('MySmart')
    // Optional: also test save call (without relying on it to populate UI)
    fireEvent.click(screen.getByText('Save current as Smart'))
    await waitFor(() => expect((apiSetSmart as any).mock.calls.length).toBeGreaterThan(0))
    fireEvent.click(screen.getByText('Open'))
    await waitFor(() => expect((apiResolveSmart as any).mock.calls.length).toBeGreaterThan(0))

    fireEvent.click(screen.getByText('Delete'))
    await waitFor(() => expect((apiDeleteSmart as any).mock.calls.length).toBeGreaterThan(0))
  })
})
