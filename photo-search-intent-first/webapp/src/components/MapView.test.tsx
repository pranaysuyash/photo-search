import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MapView from "./MapView";

describe("MapView", () => {
	it("renders points and refresh", () => {
		const onLoad = vi.fn();
		const { rerender } = render(<MapView points={[]} onLoadMap={onLoad} />);
		expect(screen.getByText(/No GPS points/)).toBeInTheDocument();
		fireEvent.click(screen.getByText("Load"));
		expect(onLoad).toHaveBeenCalled();
		rerender(
			<MapView points={[{ lat: 1.23456, lon: 2.34567 }]} onLoadMap={onLoad} />,
		);
		expect(screen.getByText(/1.23456/)).toBeInTheDocument();
	});
});
