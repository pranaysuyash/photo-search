import { describe, expect, it, vi } from "vitest";
import React from "react";
import App from "./App";
import { render, screen, waitFor } from "./test/test-utils";

// Mock useLibrary to return a non-empty array so RoutesHost renders
vi.mock("./stores/useStores", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useLibrary: () => ["photo1.jpg", "photo2.jpg"], // Mock library with some photos
  };
});

// Mock RoutesHost to use a controlled lazy component for testing Suspense
vi.mock("./components/chrome/RoutesHost", () => ({
  RoutesHost: () => {
    const MapView = React.lazy(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              default: () => (
                <div data-testid="route-map-delayed">Map Delayed</div>
              ),
            });
          }, 50);
        })
    );

    return (
      <React.Suspense
        fallback={<div data-testid="suspense-fallback">Loading…</div>}
      >
        <MapView />
      </React.Suspense>
    );
  },
}));

describe("App lazy route Suspense", () => {
  it("shows SuspenseFallback before MapView resolves", async () => {
    window.history.pushState({}, "", "/map");
    render(<App />);
    // Fallback appears after the lazy import starts loading
    await waitFor(() => {
      expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
    });
    // After module resolves, the route renders and fallback disappears
    expect(await screen.findByTestId("route-map-delayed")).toBeInTheDocument();
    expect(screen.queryByTestId("suspense-fallback")).toBeNull();
  });
});
