import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { render, screen } from "./test/test-utils";

// Intentionally delay the lazy MapView import to assert Suspense fallback
vi.mock("./components/MapView", async () => {
	await new Promise((r) => setTimeout(r, 50));
	return {
		default: () => <div data-testid="route-map-delayed">Map Delayed</div>,
	};
});

describe("App lazy route Suspense", () => {
	it("shows SuspenseFallback before MapView resolves", async () => {
		window.history.pushState({}, "", "/map");
		render(<App />);
		// Fallback appears immediately
		expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
		// After module resolves, the route renders and fallback disappears
		expect(await screen.findByTestId("route-map-delayed")).toBeInTheDocument();
		expect(screen.queryByTestId("suspense-fallback")).toBeNull();
	});
});
