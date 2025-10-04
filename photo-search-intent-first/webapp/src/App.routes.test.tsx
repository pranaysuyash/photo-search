import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { render, screen } from "./test/test-utils";

// Mock RoutesHost to return test elements for routing tests
vi.mock("./components/chrome/RoutesHost", () => ({
	RoutesHost: () => {
		// Return different test elements based on current location
		const path = window.location.pathname;
		switch (path) {
			case "/map":
				return <div data-testid="route-map">Map Route</div>;
			case "/smart":
				return <div data-testid="route-smart">Smart Route</div>;
			case "/trips":
				return <div data-testid="route-trips">Trips Route</div>;
			case "/videos":
				return <div data-testid="route-videos">Videos Route</div>;
			default:
				return <div data-testid="route-default">Default Route</div>;
		}
	},
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
