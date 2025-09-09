import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

vi.mock('./api', () => ({
  apiSearch: vi.fn(async () => ({ search_id: 's', results: [] })),
  apiGetFavorites: vi.fn(async () => ({ favorites: [] })),
  apiGetSaved: vi.fn(async () => ({ saved: [] })),
  apiDiagnostics: vi.fn(async () => ({ folder: '/d', engines: [], free_gb: 100, os: 'macOS' })),
  apiGetMetadata: vi.fn(async () => ({ cameras: [] })),
  apiWorkspaceList: vi.fn(async () => ({ folders: [] })),
  apiWorkspaceAdd: vi.fn(async (p: string) => ({ folders: [p] })),
  apiWorkspaceRemove: vi.fn(async () => ({ folders: [] })),
  thumbUrl: (_d: string, _e: string, p: string, _s: number) => `mock://thumb${p}`,
}))

describe('Classic App Workspace + Diagnostics', () => {
  it('adds and removes workspace folders; refreshes diagnostics', async () => {
    const { apiWorkspaceAdd, apiWorkspaceRemove, apiDiagnostics } = await import('./api')
    render(<App />)
    // Set folder
    fireEvent.change(screen.getByPlaceholderText('/path/to/photos'), { target: { value: '/d' } })

    // Workspace tab
    fireEvent.click(screen.getByText('Ws'))
    const input = screen.getByPlaceholderText('/path/to/folder') as HTMLInputElement
    fireEvent.change(input, { target: { value: '/x' } })
    fireEvent.click(screen.getByText('Add'))
    await waitFor(() => expect((apiWorkspaceAdd as any).mock.calls.length).toBeGreaterThan(0))
    // Remove the folder
    fireEvent.click(screen.getByText('Remove'))
    await waitFor(() => expect((apiWorkspaceRemove as any).mock.calls.length).toBeGreaterThan(0))

    // Diagnostics tab refresh
    fireEvent.click(screen.getByText('Diag'))
    fireEvent.click(screen.getByText('Refresh'))
    await waitFor(() => expect((apiDiagnostics as any).mock.calls.length).toBeGreaterThan(0))
  })
})

