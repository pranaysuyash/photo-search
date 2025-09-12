import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AllTheProviders } from "../test/test-utils";
import { SearchProvider, useSearchContext } from "./SearchContext";

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
	const { state, actions } = useSearchContext();
	return (
		<button
			type="button"
			data-testid="search-probe-button"
			onClick={() => {
				actions.setQuery("dog");
				actions.setResults([{ path: "/x.jpg", score: 1 }]);
			}}
		>
			{state.query}:{state.results.length}
		</button>
	);
}

describe("SearchContext", () => {
	it("provides default state and allows updates", async () => {
		const { getByTestId } = render(
			<AllTheProviders>
				<SearchProvider>
					<Probe />
				</SearchProvider>
			</AllTheProviders>,
		);
		const btn = getByTestId("search-probe-button") as HTMLButtonElement;
		// Click to update via actions
		fireEvent.click(btn);
		await waitFor(() => expect(btn.textContent).toContain("dog:1"));
	});
});
