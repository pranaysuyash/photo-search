/**
 * Unit tests for useOcrStatus hook
 */
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useOcrStatus } from "../lifecycle/useOcrStatus";

// Mock the API and dependencies
vi.mock("../../api", () => ({
  apiOcrStatus: vi.fn(),
}));

vi.mock("../../framework/EnhancedErrorHandling", () => ({
  errorFactory: {
    networkError: vi.fn(() => ({
      getUserFacingMessage: () => "Mock error message",
    })),
  },
}));

import { apiOcrStatus } from "../../api";

const mockApiOcrStatus = vi.mocked(apiOcrStatus);

describe("useOcrStatus", () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useOcrStatus({ dir: null, showToast: mockShowToast })
    );

    expect(result.current.ocrReady).toBe(false);
    expect(result.current.ocrTextCount).toBeUndefined();
  });

  it("should not call API when dir is null", () => {
    renderHook(() => useOcrStatus({ dir: null, showToast: mockShowToast }));

    expect(mockApiOcrStatus).not.toHaveBeenCalled();
  });

  it("should call API when dir is provided", async () => {
    mockApiOcrStatus.mockResolvedValueOnce({ ready: true, count: 5 });

    const { result } = renderHook(() =>
      useOcrStatus({ dir: "/test/dir", showToast: mockShowToast })
    );

    await waitFor(() => {
      expect(mockApiOcrStatus).toHaveBeenCalledWith("/test/dir");
    });

    await waitFor(() => {
      expect(result.current.ocrReady).toBe(true);
      expect(result.current.ocrTextCount).toBe(5);
    });
  });

  it("should handle API errors gracefully", async () => {
    const error = new Error("Network error");
    mockApiOcrStatus.mockRejectedValueOnce(error);

    const { result } = renderHook(() =>
      useOcrStatus({ dir: "/test/dir", showToast: mockShowToast })
    );

    await waitFor(() => {
      expect(result.current.ocrReady).toBe(false);
      expect(result.current.ocrTextCount).toBeUndefined();
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        "OCR status check failed. Some features may be limited.",
        "destructive"
      );
    });
  });

  it("should prevent duplicate error toasts", async () => {
    const error = new Error("Network error");
    mockApiOcrStatus.mockRejectedValue(error);

    const { rerender } = renderHook(
      ({ dir }) => useOcrStatus({ dir, showToast: mockShowToast }),
      { initialProps: { dir: "/test/dir" } }
    );

    // Wait for first error
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    // Clear mock and trigger re-render with same dir
    mockShowToast.mockClear();
    rerender({ dir: "/test/dir" });

    // Should not show duplicate toast for same error
    await waitFor(() => {
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  it("should cancel in-flight requests on unmount", async () => {
    let resolvePromise:
      | ((value: { ready: boolean; count?: number }) => void)
      | undefined;
    const pendingPromise = new Promise<{ ready: boolean; count?: number }>(
      (resolve) => {
        resolvePromise = resolve;
      }
    );
    mockApiOcrStatus.mockReturnValueOnce(pendingPromise);

    const { unmount } = renderHook(() =>
      useOcrStatus({ dir: "/test/dir", showToast: mockShowToast })
    );

    // Unmount before promise resolves
    unmount();

    // Resolve promise after unmount
    if (resolvePromise) {
      resolvePromise({ ready: true, count: 10 });
    }

    // Should not cause state updates or errors
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
