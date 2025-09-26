/**
 * Unit tests for useMountFlag hook
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMountFlag } from "../lifecycle/useMountFlag";

describe("useMountFlag", () => {
  it("should set isMounted to true after mount", () => {
    const { result } = renderHook(() => useMountFlag());

    // Effect runs immediately in test environment
    expect(result.current.isMounted).toBe(true);
  });

  it("should provide skipToContentRef", () => {
    const { result } = renderHook(() => useMountFlag());

    expect(result.current.skipToContentRef).toBeDefined();
    expect(result.current.skipToContentRef.current).toBeNull(); // No element attached
  });

  it("should provide skipToContent callback", () => {
    const { result } = renderHook(() => useMountFlag());

    expect(typeof result.current.skipToContent).toBe("function");

    // Should not throw when called with null ref
    expect(() => result.current.skipToContent()).not.toThrow();
  });

  it("should maintain stable references", () => {
    const { result, rerender } = renderHook(() => useMountFlag());

    const firstRef = result.current.skipToContentRef;
    const firstCallback = result.current.skipToContent;

    rerender();

    expect(result.current.skipToContentRef).toBe(firstRef);
    expect(result.current.skipToContent).toBe(firstCallback);
  });
});
