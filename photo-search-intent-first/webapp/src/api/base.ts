// Utility function to detect Electron environment
export function isElectron(): boolean {
  const windowElectron = window as WindowWithElectron;
  return (
    typeof window !== "undefined" &&
    (windowElectron.electronAPI !== undefined ||
      windowElectron.engine !== undefined ||
      windowElectron.process?.type === "renderer" ||
      navigator.userAgent.toLowerCase().includes("electron"))
  );
}

const LOOPBACK_PROTOCOL = "http";
const LOOPBACK_HOST = "127.0.0.1";
const LOOPBACK_PORT = "8000";
const DEFAULT_LOOPBACK_BASE = `${LOOPBACK_PROTOCOL}://${LOOPBACK_HOST}:${LOOPBACK_PORT}`;

interface WindowWithElectron extends Window {
  electronAPI?: {
    selectFolder: () => Promise<string | null>;
  };
  process?: {
    type?: string;
  };
}

// Compute API base URL robustly across web, dev, and Electron (file://) contexts
export function computeApiBase(): string {
  const envBase = import.meta.env?.VITE_API_BASE;
  if (envBase) return envBase;

  // During local development always use the FastAPI loopback server.
  if (import.meta.env?.DEV) {
    return DEFAULT_LOOPBACK_BASE;
  }

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (origin?.startsWith("http")) {
      // If the UI is still served from the Vite dev server, prefer the backend loopback host.
      if (origin.includes(":5173")) {
        return DEFAULT_LOOPBACK_BASE;
      }
      return origin;
    }
  } catch {
    /* ignore window access errors */
  }

  // In Electron packaged builds (file:// origin), talk to the bundled API server
  if (isElectron()) return DEFAULT_LOOPBACK_BASE;
  // Fallback sensible default for standalone static hosting
  return DEFAULT_LOOPBACK_BASE;
}

export const API_BASE = computeApiBase();

function authHeaders() {
  try {
    // Runtime token from localStorage should take precedence in dev
    const ls =
      typeof window !== "undefined" ? localStorage.getItem("api_token") : null;
    const envTok = import.meta.env?.VITE_API_TOKEN;
    const token = ls || envTok;
    if (token)
      return { Authorization: `Bearer ${token}` } as Record<string, string>;
  } catch {}
  return {} as Record<string, string>;
}

const JSON_CACHE_INVALIDATION_PATTERN =
  /^\/(favorites|saved|presets|collections|smart_collections|library|tags|trips|workspace)/;

export function shouldInvalidateJsonCache(path: string): boolean {
  return JSON_CACHE_INVALIDATION_PATTERN.test(path);
}

export function notifyJsonCacheInvalidation() {
  if (typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const sw = navigator.serviceWorker;
    if (!sw) return;
    const message = { type: "ps:invalidate-json-cache" } as const;
    if (sw.controller) {
      sw.controller.postMessage(message);
      return;
    }
    sw.ready
      .then((registration) => {
        registration?.active?.postMessage(message);
      })
      .catch(() => undefined);
  } catch {
    // Ignore SW messaging failures
  }
}

// Generic POST request handler
export async function post<T>(
  path: string,
  body?: Record<string, unknown> | string | number | boolean | null,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options?.headers || {}),
    },
    body: JSON.stringify(body),
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Generic GET request handler
export async function get<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      ...authHeaders(),
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Generic DELETE request handler
export async function del<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}
