import { beforeEach, describe, expect, it } from "vitest";
import { usePhotoStore } from "./photoStore";

describe("photoStore", () => {
	beforeEach(() => {
		usePhotoStore.setState({
			results: [],
			searchId: "",
			query: "",
			topK: 24,
			fav: [],
			favOnly: false,
			tags: { allTags: [], tagsMap: {}, tagFilter: "" },
			saved: [],
			collections: {},
			smart: {},
			library: [],
		});
	});

	it("has sensible defaults", () => {
		const s = usePhotoStore.getState();
		expect(s.topK).toBe(24);
		expect(s.query).toBe("");
		expect(s.results).toEqual([]);
	});

	it("updates results and query via actions", () => {
		const s = usePhotoStore.getState();
		s.setQuery("beach");
		s.setResults([{ path: "/a.jpg", score: 0.9 }]);
		expect(usePhotoStore.getState().query).toBe("beach");
		expect(usePhotoStore.getState().results).toHaveLength(1);
	});

	it("resets search fields", () => {
		const s = usePhotoStore.getState();
		s.setQuery("foo");
		s.setSearchId("id1");
		s.setResults([{ path: "/x", score: 0.1 }]);
		s.resetSearch();
		const next = usePhotoStore.getState();
		expect(next.query).toBe("");
		expect(next.searchId).toBe("");
		expect(next.results).toEqual([]);
	});
});
