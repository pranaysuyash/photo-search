import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AllTheProviders } from "../test/test-utils";
import { SettingsProvider, useSettingsContext } from "./SettingsContext";

// Mock the usePhotoActions hook
vi.mock("../stores/useStores", () => ({
	usePhotoActions: () => ({
		setResults: vi.fn(),
		setQuery: vi.fn(),
	}),
	// Selectors used widely in providers/components
	useDir: () => "/test/dir",
	useEngine: () => "local",
	useHfToken: () => "",
	useOpenaiKey: () => "",
	useNeedsHf: () => false,
	useNeedsOAI: () => false,
	// Library provider dependencies
	useLibrary: () => [],
	useLibHasMore: () => false,
	useSettingsActions: () => ({ state: { dir: "/test/dir", engine: "local" } }),
}));

function Probe() {
	const { state, actions } = useSettingsContext();
	return (
		<div>
			<button
				type="button"
				aria-label="engine"
				onClick={() => actions.setEngine("openai")}
			>
				{state.engine}
			</button>
			<button
				type="button"
				aria-label="fast"
				onClick={() => actions.setUseFast(!state.useFast)}
			>
				{String(state.useFast)}
			</button>
			<button
				type="button"
				aria-label="ocr"
				onClick={() => actions.setUseOcr(!state.useOcr)}
			>
				{String(state.useOcr)}
			</button>
		</div>
	);
}

describe("SettingsContext", () => {
	it("updates settings flags", async () => {
		const { getByLabelText } = render(
			<AllTheProviders>
				<SettingsProvider>
					<Probe />
				</SettingsProvider>
			</AllTheProviders>,
		);
		const engine = getByLabelText("engine") as HTMLButtonElement;
		const fast = getByLabelText("fast") as HTMLButtonElement;
		const ocr = getByLabelText("ocr") as HTMLButtonElement;
		fireEvent.click(engine);
		await waitFor(() => expect(engine.textContent).toBe("openai"));
		const f0 = fast.textContent;
		fireEvent.click(fast);
		await waitFor(() => expect(fast.textContent).not.toBe(f0));
		const o0 = ocr.textContent;
		fireEvent.click(ocr);
		await waitFor(() => expect(ocr.textContent).not.toBe(o0));
	});
});
