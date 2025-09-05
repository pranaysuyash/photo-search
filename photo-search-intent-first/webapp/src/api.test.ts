import { describe, it, expect, vi } from 'vitest'
import { apiSearch } from './api'

describe('api', () => {
  it('posts to /search with expected payload', async () => {
    const mockJson = { search_id: 's1', results: [] }
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => mockJson,
    } as any)

    const out = await apiSearch('/photos', 'beach', 'local', 10, {
      favoritesOnly: true,
      tags: ['friends'],
      dateFrom: 1,
      dateTo: 2,
      useFast: true,
      fastKind: 'faiss',
      useCaptions: true,
      camera: 'iPhone',
      isoMin: 100,
      isoMax: 800,
      fMin: 1.8,
      fMax: 8.0,
      place: 'SF',
      hasText: true,
      person: 'Alice',
      persons: ['Bob'],
      sharpOnly: true,
      excludeUnder: true,
      excludeOver: true,
    })

    expect(out).toEqual(mockJson)
    expect(fetchSpy).toHaveBeenCalled()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toMatch(/\/search$/)
    expect(init?.method).toBe('POST')
    expect(init?.headers?.['Content-Type']).toBe('application/json')
    const body = JSON.parse(init!.body)
    expect(body).toMatchObject({
      dir: '/photos',
      provider: 'local',
      query: 'beach',
      top_k: 10,
      favorites_only: true,
      tags: ['friends'],
      date_from: 1,
      date_to: 2,
      use_fast: true,
      fast_kind: 'faiss',
      use_captions: true,
      camera: 'iPhone',
      iso_min: 100,
      iso_max: 800,
      f_min: 1.8,
      f_max: 8.0,
      place: 'SF',
      has_text: true,
      person: 'Alice',
      persons: ['Bob'],
      sharp_only: true,
      exclude_underexp: true,
      exclude_overexp: true,
    })

    fetchSpy.mockRestore()
  })
})

