import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// jsdom lacks ResizeObserver; provide a minimal stub for components that use it
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  class ResizeObserver {
    callback: any
    constructor(cb: any) { this.callback = cb }
    observe() { /* no-op */ }
    unobserve() { /* no-op */ }
    disconnect() { /* no-op */ }
  }
  ;(globalThis as any).ResizeObserver = ResizeObserver as any
}
