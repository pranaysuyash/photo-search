import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AllTheProviders } from "../test/test-utils";
import { UIProvider, useUIContext } from "./UIContext";

// Mock the usePhotoActions hook
vi.mock("../stores/useStores", () => ({
	usePhotoActions: () => ({
		setResults: vi.fn(),
		setQuery: vi.fn(),
	}),
	useDir: () => "/test/dir",
	useEngine: () => "local",
	useHfToken: () => "",
	useOpenaiKey: () => "",
	useNeedsHf: () => false,
	useNeedsOAI: () => false,
	useLibrary: () => [],
	useLibHasMore: () => false,
	useSettingsActions: () => ({ state: { dir: "/test/dir", engine: "local" } }),
}));

function Probe() {
	const { state, actions } = useUIContext();
	return (
		<div>
			<button
				type="button"
				aria-label="toggle"
				onClick={() => actions.toggleSidebar()}
			>
				{String(state.sidebarOpen)}
			</button>
			<button
				type="button"
				aria-label="theme"
				onClick={() =>
					actions.setTheme(state.theme === "light" ? "dark" : "light")
				}
			>
				{state.theme}
			</button>
		</div>
	);
}

describe("UIContext", () => {
	it("toggles sidebar and theme", async () => {
		const { getByLabelText } = render(
			<AllTheProviders>
				<UIProvider>
					<Probe />
				</UIProvider>
			</AllTheProviders>,
		);
		const toggle = getByLabelText("toggle") as HTMLButtonElement;
		const theme = getByLabelText("theme") as HTMLButtonElement;
		const initialToggle = toggle.textContent;
		fireEvent.click(toggle);
		await waitFor(() => expect(toggle.textContent).not.toBe(initialToggle));
		const initialTheme = theme.textContent;
		fireEvent.click(theme);
		await waitFor(() => expect(theme.textContent).not.toBe(initialTheme));
	});
});
