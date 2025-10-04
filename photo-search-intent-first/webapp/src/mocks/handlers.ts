import { HttpResponse, http } from "msw";

// Import the same API_BASE computation used by the actual API
function computeApiBase(): string {
  const envBase = import.meta.env?.VITE_API_BASE;
  if (envBase) return envBase;
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    // Use real HTTP origin only
    if (origin?.startsWith("http")) return origin;
  } catch {
    // Ignore errors
  }
  // In Electron packaged builds (file:// origin), talk to the bundled API server
  if (
    typeof window !== "undefined" &&
    (window as { electronAPI?: unknown }).electronAPI
  )
    return "http://127.0.0.1:8000";
  // Fallback sensible default for dev server
  return "http://127.0.0.1:5173"; // overridden by env in real deployments
}

const API_BASE = computeApiBase();

// Types for request bodies
interface SearchRequestBody {
  dir: string;
  query: string;
  top_k?: number;
  provider?: string;
  [key: string]: unknown;
}

interface TagsRequestBody {
  dir: string;
  path: string;
  tags: string[];
}

interface FavoritesRequestBody {
  dir: string;
  path: string;
  favorite: boolean;
}

interface IndexRequestBody {
  dir: string;
  provider?: string;
  [key: string]: unknown;
}

// Mock data
const mockSearchResults = {
  search_id: "test-search-123",
  results: [
    {
      path: "/test/photo1.jpg",
      score: 0.95,
    },
    {
      path: "/test/photo2.jpg",
      score: 0.89,
    },
  ],
};

const mockTags = {
  tags: {
    "/test/photo1.jpg": ["vacation", "beach"],
    "/test/photo2.jpg": ["city", "architecture"],
  },
  all: ["vacation", "beach", "city", "architecture"],
};

const mockFavorites = {
  favorites: ["/test/photo1.jpg"],
};

const mockCollections = {
  collections: {
    "Summer 2024": ["/test/photo1.jpg", "/test/photo2.jpg"],
  },
};

// MSW handlers
export const handlers = [
  // Health endpoint
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: "ok" });
  }),

  // Search endpoint - handle errors first
  http.post(`${API_BASE}/search`, async ({ request }) => {
    const body = (await request.json()) as SearchRequestBody;

    // Check for invalid directory first
    if (body && body.dir === "/non/existent/directory") {
      return HttpResponse.json({ detail: "Folder not found" }, { status: 400 });
    }

    // Check for missing required fields
    if (!body || !body.dir) {
      return HttpResponse.json(
        { detail: "Missing required field: dir" },
        { status: 422 }
      );
    }
    if (!body || !body.query) {
      return HttpResponse.json(
        { detail: "Missing required field: query" },
        { status: 422 }
      );
    }

    // Valid request - return mock results
    return HttpResponse.json(mockSearchResults);
  }),

  // Tags endpoints
  http.get(`${API_BASE}/tags`, ({ request }) => {
    const url = new URL(request.url);
    const dir = url.searchParams.get("dir");
    if (!dir) {
      return HttpResponse.json(
        { detail: "dir parameter required" },
        { status: 400 }
      );
    }
    return HttpResponse.json(mockTags);
  }),

  http.post(`${API_BASE}/tags`, async ({ request }) => {
    const body = (await request.json()) as TagsRequestBody;
    // Validate required fields
    if (!body || !body.dir || !body.path || !body.tags) {
      return HttpResponse.json(
        { detail: "Missing required fields" },
        { status: 422 }
      );
    }
    return HttpResponse.json({
      ok: true,
      tags: body.tags,
    });
  }),

  // Favorites endpoints
  http.get(`${API_BASE}/favorites`, ({ request }) => {
    const url = new URL(request.url);
    const dir = url.searchParams.get("dir");
    if (!dir) {
      return HttpResponse.json(
        { detail: "dir parameter required" },
        { status: 400 }
      );
    }
    return HttpResponse.json(mockFavorites);
  }),

  http.post(`${API_BASE}/favorites`, async ({ request }) => {
    const body = (await request.json()) as FavoritesRequestBody;
    // Validate required fields
    if (
      !body ||
      !body.dir ||
      !body.path ||
      typeof body.favorite !== "boolean"
    ) {
      return HttpResponse.json(
        { detail: "Missing required fields" },
        { status: 422 }
      );
    }
    return HttpResponse.json({
      ok: true,
      favorites: body.favorite
        ? [...mockFavorites.favorites, body.path]
        : mockFavorites.favorites.filter((fav) => fav !== body.path),
    });
  }),

  // Collections endpoints
  http.get(`${API_BASE}/collections`, ({ request }) => {
    const url = new URL(request.url);
    const dir = url.searchParams.get("dir");
    if (!dir) {
      return HttpResponse.json(
        { detail: "dir parameter required" },
        { status: 400 }
      );
    }
    return HttpResponse.json(mockCollections);
  }),

  // Index status endpoint
  http.get(`${API_BASE}/index/status`, ({ request }) => {
    const url = new URL(request.url);
    const dir = url.searchParams.get("dir");
    if (!dir) {
      return HttpResponse.json(
        { detail: "dir parameter required" },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      state: "idle",
      total: 100,
      indexed: 95,
    });
  }),

  // Index endpoint
  http.post(`${API_BASE}/index`, async ({ request }) => {
    const body = (await request.json()) as IndexRequestBody;
    if (!body || !body.dir) {
      return HttpResponse.json(
        { detail: "dir parameter required" },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      new: 5,
      updated: 0,
      total: 100,
    });
  }),

  // Metadata detail endpoint
  http.get(`${API_BASE}/metadata/detail`, ({ request }) => {
    const url = new URL(request.url);
    const dir = url.searchParams.get("dir");
    const path = url.searchParams.get("path");
    if (!dir || !path) {
      return HttpResponse.json(
        { detail: "dir and path parameters required" },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      path: path,
      exif: {
        camera: "Test Camera",
        iso: 100,
        aperture: "f/2.8",
        shutter_speed: "1/250",
      },
      size: { width: 1920, height: 1080 },
    });
  }),

  // Workspace endpoint
  http.get(`${API_BASE}/workspace`, () => {
    return HttpResponse.json({
      folders: ["/test/photos", "/test/vacation"],
    });
  }),

  // Demo directory endpoint
  http.get(`${API_BASE}/demo/dir`, () => {
    return HttpResponse.json({
      path: "/demo/photos",
      exists: true,
    });
  }),

  // API ping endpoint
  http.get(`${API_BASE}/api/ping`, () => {
    return HttpResponse.json({ ok: true });
  }),

  // Auth status endpoint
  http.get(`${API_BASE}/auth/status`, () => {
    return HttpResponse.json({
      auth_required: false,
      user: null,
    });
  }),

  // OCR status endpoint
  http.get(`${API_BASE}/ocr/status`, ({ request }) => {
    const url = new URL(request.url);
    const dir = url.searchParams.get("dir");
    if (!dir) {
      return HttpResponse.json(
        { detail: "dir parameter required" },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      status: "idle",
      processed: 50,
      total: 100,
    });
  }),

  // Library endpoint
  http.get(`${API_BASE}/library`, ({ request }) => {
    const url = new URL(request.url);
    const dir = url.searchParams.get("dir");
    if (!dir) {
      return HttpResponse.json(
        { detail: "dir parameter required" },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      photos: [
        {
          path: "/test/photo1.jpg",
          mtime: 1640995200,
          size: 1024000,
        },
        {
          path: "/test/photo2.jpg",
          mtime: 1641081600,
          size: 2048000,
        },
      ],
    });
  }),
];
