import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSearch } from "../../hooks/useSearch";
import { AllTheProviders } from "../../test/test-utils";

describe("useSearch deep-link round-trip", () => {
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<AllTheProviders>{children}</AllTheProviders>
	);

	it("builds and parses search params consistently", () => {
		const { result } = renderHook(() => useSearch(), { wrapper });
		act(() => {
			// simulate some filters
			result.current.filters.setTagFilter("tag:car,tag:summer");
			result.current.filters.setHasText(true);
			result.current.filters.setCamera("Canon");
			result.current.filters.setIsoMin(100);
			result.current.filters.setIsoMax(800);
			result.current.filters.setFMin(1.8 as unknown as number);
			result.current.filters.setFMax(8 as unknown as number);
			result.current.filters.setPlace("Paris");
			result.current.filters.setRatingMin(3);
		});
		const url = result.current.buildSearchUrl("beach sunset");
		expect(url.startsWith("/search?")).toBe(true);

		const qs = url.split("?")[1] || "";
		act(() => {
			result.current.parseSearchParams(qs);
		});

		// After parsing, searchText should be set (round-trip)
		expect(result.current.searchText).toBe("beach sunset");
		// And some representative filters should be reflected
		expect(result.current.filters.camera).toBe("Canon");
		expect(result.current.filters.isoMin).toBe(100);
		expect(result.current.filters.isoMax).toBe(800);
	});
});
