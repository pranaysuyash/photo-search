import { describe, expect, it, beforeEach, vi } from 'vitest';

// Use direct import from facade; it will pick adapter by env
import { apiClient } from './api';

declare global {
  interface ImportMetaEnv {
    VITE_API_MODE?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const mockFetch = vi.fn();

global.fetch = mockFetch as any;

describe('API contract (v1 adapter shapes)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Force v1 for tests
    (import.meta as any).env = { ...(import.meta as any).env, VITE_API_MODE: 'v1' };
  });

  it('normalizes LibraryResponse', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ paths: ['/a.jpg', '/b.jpg'], total: 2 }) });
    const res = await apiClient.getLibrary('/photos');
    expect(res.paths).toEqual(['/a.jpg', '/b.jpg']);
    expect(res.total).toBe(2);
    expect(typeof res.offset).toBe('number');
    expect(typeof res.limit).toBe('number');
  });

  it('normalizes SearchResponse', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{ path: '/a.jpg', score: 0.9 }], total: 1 }) });
    const res = await apiClient.search('/photos', 'beach');
    expect(res.results[0]).toEqual({ path: '/a.jpg', score: 0.9 });
    expect(res.total).toBe(1);
    expect(res.query).toBe('beach');
  });
});
