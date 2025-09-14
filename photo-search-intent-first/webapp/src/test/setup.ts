import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

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
if (typeof (globalThis as any).IntersectionObserver === "undefined") {
  class IntersectionObserver {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(_cb: any, _options?: any) {}
    observe() {/* no-op */}
    unobserve() {/* no-op */}
    disconnect() {/* no-op */}
    takeRecords() { return []; }
  }
  (globalThis as any).IntersectionObserver = IntersectionObserver as unknown as typeof window.IntersectionObserver;
  try {
    // Ensure window-scoped too
    (window as any).IntersectionObserver = (globalThis as any).IntersectionObserver;
  } catch {}
}
