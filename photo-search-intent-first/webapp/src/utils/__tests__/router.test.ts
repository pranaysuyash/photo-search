import { describe, expect, it } from "vitest";
import {
	isMobileTestPath,
	isSharePath,
	pathToView,
	shareTokenFromPath,
	viewToPath,
} from "../../utils/router";

describe("router helpers", () => {
	it("detects share paths and extracts tokens", () => {
		expect(isSharePath("/share/abc")).toBe(true);
		expect(shareTokenFromPath("/share/abc")).toBe("abc");

		expect(isSharePath("/share/")).toBe(false);
		expect(shareTokenFromPath("/share/")).toBeNull();

		expect(isSharePath("/share")).toBe(false);
		expect(shareTokenFromPath("/share")).toBeNull();

		expect(isSharePath("/share//")).toBe(false);
	});

	it("detects mobile test path", () => {
		expect(isMobileTestPath("/mobile-test")).toBe(true);
		expect(isMobileTestPath("/mobile-test/anything")).toBe(true); // still true for any subpath
		expect(isMobileTestPath("/library")).toBe(false);
	});

	it("maps views to paths and back consistently", () => {
		const views = [
			"results",
			"library",
			"people",
			"collections",
			"smart",
			"saved",
			"map",
			"trips",
			"videos",
		] as const;

		for (const v of views) {
			const p = viewToPath(v);
			const roundTrip = pathToView(p);
			expect(roundTrip).toBe(v === "results" ? "results" : v);
		}

		// pathToView remaps /search to results
		expect(pathToView("/search")).toBe("results");
		// default fallback
		expect(pathToView("/unknown" as unknown as string)).toBe("library");
	});
});
