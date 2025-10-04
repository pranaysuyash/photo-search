import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "../mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

afterEach(() => cleanup());

// jsdom lacks ResizeObserver; provide a minimal stub for components that use it
if (typeof (globalThis as unknown).ResizeObserver === "undefined") {
  class ResizeObserver {
    callback: unknown;
    constructor(cb: unknown) {
      this.callback = cb;
    }
    observe() {
      /* no-op */
    }
    unobserve() {
      /* no-op */
    }
    disconnect() {
      /* no-op */
    }
  }
  (globalThis as unknown).ResizeObserver = ResizeObserver as unknown;
}

// jsdom lacks IntersectionObserver; provide a minimal stub for components that use it
if (typeof (globalThis as unknown).IntersectionObserver === "undefined") {
  class IntersectionObserver {
    observe() {
      /* no-op */
    }
    unobserve() {
      /* no-op */
    }
    disconnect() {
      /* no-op */
    }
    takeRecords() {
      return [];
    }
  }
  (globalThis as unknown).IntersectionObserver =
    IntersectionObserver as unknown as typeof window.IntersectionObserver;
  try {
    // Ensure window-scoped too
    (window as unknown).IntersectionObserver = (
      globalThis as unknown
    ).IntersectionObserver;
  } catch {}
}

// jsdom lacks IndexedDB; provide a minimal stub for components that use it
if (
  typeof (globalThis as unknown as { indexedDB?: unknown }).indexedDB ===
  "undefined"
) {
  const mockIndexedDB = {
    open: vi.fn(() => ({
      result: {},
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    })),
    deleteDatabase: vi.fn(),
    cmp: vi.fn(),
  };
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = mockIndexedDB;
  try {
    // Ensure window-scoped too
    (window as unknown as { indexedDB: unknown }).indexedDB = (
      globalThis as unknown as { indexedDB: unknown }
    ).indexedDB;
  } catch {
    // Ignore errors in test environment
  }
}
