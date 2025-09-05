import { describe, it, expect, vi } from 'vitest'
import { apiSearch, thumbUrl, thumbFaceUrl } from './api'

describe('classic api', () => {
  it('builds thumbnail URLs', () => {
    const u = thumbUrl('/pics', 'local', '/a.jpg', 128)
    expect(u).toMatch(/\/thumb\?/) // endpoint
    expect(u).toMatch(/dir=/)
    expect(u).toMatch(/provider=local/)
    expect(u).toMatch(/size=128/)

    const f = thumbFaceUrl('/pics', 'local', '/a.jpg', 3, 196)
    expect(f).toMatch(/\/thumb_face\?/)
    expect(f).toMatch(/emb=3/)
  })

  it('posts to /search with expected payload', async () => {
    const mockJson = { search_id: 's1', results: [] }
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => mockJson } as any)

    const out = await apiSearch('/pics', 'mountains', 'local', 11, undefined, undefined, true, ['snow'], 1, 2, true, 'faiss', true, { hasText: true })

    expect(out).toEqual(mockJson)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toMatch(/\/search$/)
    expect(init?.method).toBe('POST')
    const body = JSON.parse(init!.body)
    expect(body).toMatchObject({
      dir: '/pics',
      provider: 'local',
      query: 'mountains',
      top_k: 11,
      favorites_only: true,
      tags: ['snow'],
      date_from: 1,
      date_to: 2,
      use_fast: true,
      fast_kind: 'faiss',
      use_caps: true,
      has_text: true,
    })

    fetchSpy.mockRestore()
  })
})

