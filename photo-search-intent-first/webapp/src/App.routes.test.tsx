import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { render, screen } from "./test/test-utils";

// Mock route-mounted components to avoid heavy behavior
vi.mock("./components/MapView", () => ({
	default: () => <div data-testid="route-map">Map Route</div>,
}));
vi.mock("./components/SmartCollections", () => ({
	default: () => <div data-testid="route-smart">Smart Route</div>,
}));
vi.mock("./components/TripsView", () => ({
	default: () => <div data-testid="route-trips">Trips Route</div>,
}));
vi.mock("./components/VideoManager", () => ({
	VideoManager: () => <div data-testid="route-videos">Videos Route</div>,
}));

describe("App routing", () => {
	it.each([
		["/map", "route-map"],
		["/smart", "route-smart"],
		["/trips", "route-trips"],
		["/videos", "route-videos"],
	])("renders %s container", async (path, testId) => {
		window.history.pushState({}, "", String(path));
		render(<App />);
		expect(await screen.findByTestId(String(testId))).toBeInTheDocument();
	});
});
