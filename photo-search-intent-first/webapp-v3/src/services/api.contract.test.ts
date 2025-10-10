import { describe, expect, it, beforeEach, vi } from "vitest";

// Use direct import from facade; it will pick adapter by env
import { apiClient } from "./api";

declare global {
  interface ImportMetaEnv {
    VITE_API_MODE?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

type MockFetchResponse = { ok: boolean; json: () => Promise<unknown> };

const mockFetch = vi.fn<
  Promise<MockFetchResponse>,
  [RequestInfo | URL, RequestInit | undefined]
>();

global.fetch = mockFetch as unknown as typeof fetch;

describe("API contract (v1 adapter shapes)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    Object.assign(import.meta, {
      env: {
        ...(import.meta.env ?? {}),
        VITE_API_MODE: "v1",
      },
    });
  });

  it("normalizes LibraryResponse", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ paths: ["/a.jpg", "/b.jpg"], total: 2 }),
    });
    const res = await apiClient.getLibrary("/photos");
    expect(res.paths).toEqual(["/a.jpg", "/b.jpg"]);
    expect(res.total).toBe(2);
    expect(typeof res.offset).toBe("number");
    expect(typeof res.limit).toBe("number");
  });

  it("normalizes SearchResponse", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ path: "/a.jpg", score: 0.9 }],
        total: 1,
      }),
    });
    const res = await apiClient.search("/photos", "beach");
    expect(res.results[0]).toEqual({ path: "/a.jpg", score: 0.9 });
    expect(res.total).toBe(1);
    expect(res.query).toBe("beach");
  });

  it("normalizes favorites from data.paths payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          paths: [
            { path: "/fav-a.jpg", mtime: 123, is_favorite: true },
            { path: "/fav-b.jpg", mtime: 99, is_favorite: false },
          ],
        },
      }),
    });
    const res = await apiClient.getFavorites("/photos");
    expect(res.favorites).toEqual([
      { path: "/fav-a.jpg", mtime: 123, isFavorite: true },
    ]);
  });

  it("normalizes legacy favorites array payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ favorites: ["/x.jpg", "/y.jpg"] }),
    });
    const res = await apiClient.getFavorites("/photos");
    expect(res.favorites.map((fav) => fav.path)).toEqual(["/x.jpg", "/y.jpg"]);
  });
});
