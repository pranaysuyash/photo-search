import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./EnhancedMapView", () => ({
  EnhancedMapView: () => <div data-testid="enhanced-map">Enhanced map</div>,
  SimpleMapFallback: ({
    points,
    onLoadMap,
  }: {
    points: { lat: number; lon: number }[];
    onLoadMap: () => void;
  }) => (
    <div>
      {points.length === 0
        ? "No GPS points"
        : points.map((p) => p.lat).join(",")}
      <button type="button" onClick={onLoadMap}>
        Load
      </button>
    </div>
  ),
}));

import MapView from "./MapView";

describe("MapView", () => {
  it("renders points and refresh", () => {
    const onLoad = vi.fn();
    const { rerender } = render(
      <MapView dir="/d" engine="local" points={[]} onLoadMap={onLoad} />
    );
    expect(screen.getByText(/No GPS points/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Load"));
    expect(onLoad).toHaveBeenCalled();
    rerender(
      <MapView
        dir="/d"
        engine="local"
        points={[{ lat: 1.23456, lon: 2.34567 }]}
        onLoadMap={onLoad}
      />
    );
    expect(screen.getByText(/1.23456/)).toBeInTheDocument();
  });
});
