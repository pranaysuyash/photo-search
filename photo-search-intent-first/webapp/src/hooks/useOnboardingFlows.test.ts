import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useOnboardingFlows } from "./useOnboardingFlows";

describe("useOnboardingFlows", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	const baseProps = {
		hasCompletedTour: false,
		currentView: "library" as const,
		dir: null as string | null,
		library: [] as string[],
		searchText: "",
	};

	it("initializes help hint as visible and can dismiss it", () => {
		const { result } = renderHook(() => useOnboardingFlows(baseProps));
		expect(result.current.showHelpHint).toBe(true);

		act(() => {
			result.current.dismissHelpHint();
		});

		expect(result.current.showHelpHint).toBe(false);
		expect(localStorage.getItem("ps_hint_help_seen")).toBe("1");
	});

	it("tracks search user action when search text is provided", async () => {
		const { result, rerender } = renderHook(
			(props) => useOnboardingFlows(props),
			{
				initialProps: baseProps,
			},
		);

		expect(result.current.userActions).not.toContain("searched");

		rerender({ ...baseProps, searchText: "sunset" });

		await waitFor(() => {
			expect(result.current.userActions).toContain("searched");
		});
	});
});
