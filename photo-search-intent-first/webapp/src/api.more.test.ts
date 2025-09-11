import { describe, expect, it, vi } from "vitest";
import {
	apiAddSaved,
	apiBuildFast,
	apiBuildOCR,
	apiDeleteSaved,
	apiDiagnostics,
	apiFeedback,
	apiGetFavorites,
	apiGetSaved,
	apiIndex,
	apiLibrary,
	apiMetadataDetail,
	apiSearchLikePlus,
	apiSetFavorite,
	apiWorkspaceAdd,
	apiWorkspaceList,
	apiWorkspaceRemove,
} from "./api";

const mockFetch = (data: unknown) =>
	vi
		.spyOn(global, "fetch" as keyof typeof global)
		.mockResolvedValue({ ok: true, json: async () => data } as Response);

describe("api endpoints (more)", () => {
	it("posts index with batch size and tokens", async () => {
		const spy = mockFetch({ new: 1, updated: 2, total: 3 });
		const out = await apiIndex("/dir", "local", 32, "hf", "oai");
		expect(out.total).toBe(3);
		const [url, init] = spy.mock.calls[0];
		expect(String(url)).toMatch(/\/index$/);
		expect(JSON.parse(init?.body)).toMatchObject({
			dir: "/dir",
			provider: "local",
			batch_size: 32,
			hf_token: "hf",
			openai_key: "oai",
		});
		spy.mockRestore();
	});

	it("feedback posts positives and note", async () => {
		const spy = mockFetch({ ok: true });
		await apiFeedback("/d", "sid", "q", ["/a.jpg"], "good");
		const [, init] = spy.mock.calls[0];
		expect(JSON.parse(init?.body)).toMatchObject({
			dir: "/d",
			search_id: "sid",
			query: "q",
			positives: ["/a.jpg"],
			note: "good",
		});
		spy.mockRestore();
	});

	it("favorites get and set", async () => {
		let spy = mockFetch({ favorites: ["/a"] });
		await apiGetFavorites("/d");
		expect(String(spy.mock.calls[0][0])).toMatch(/favorites\?dir=/);
		spy.mockRestore();
		spy = mockFetch({ ok: true, favorites: ["/a", "/b"] });
		await apiSetFavorite("/d", "/b", true);
		const [, init] = spy.mock.calls[0];
		expect(JSON.parse(init?.body)).toMatchObject({
			dir: "/d",
			path: "/b",
			favorite: true,
		});
		spy.mockRestore();
	});

	it("saved searches add/delete", async () => {
		let spy = mockFetch({ saved: [] });
		await apiGetSaved("/d");
		expect(String(spy.mock.calls[0][0])).toMatch(/saved\?dir=/);
		spy.mockRestore();
		spy = mockFetch({});
		await apiAddSaved("/d", "N", "Q", 10);
		expect(String(spy.mock.calls[0][0])).toMatch(/\/saved$/);
		spy.mockRestore();
		spy = mockFetch({});
		await apiDeleteSaved("/d", "N");
		expect(String(spy.mock.calls[0][0])).toMatch(/\/saved\/delete$/);
		spy.mockRestore();
	});

	it("diagnostics and library GET endpoints", async () => {
		let spy = mockFetch({});
		await apiDiagnostics("/d", "local");
		expect(String(spy.mock.calls[0][0])).toMatch(/diagnostics\?dir=/);
		spy.mockRestore();
		spy = mockFetch({});
		await apiLibrary("/d", "local", 10, 0);
		expect(String(spy.mock.calls[0][0])).toMatch(/library\?/);
		spy.mockRestore();
	});

	it("build endpoints post correct payloads", async () => {
		let spy = mockFetch({});
		await apiBuildFast("/d", "faiss", "local", "hf", "oai");
		expect(JSON.parse(spy.mock.calls[0][1]?.body)).toMatchObject({
			kind: "faiss",
		});
		spy.mockRestore();
		spy = mockFetch({});
		await apiBuildOCR("/d", "local", ["eng"], "hf", "oai");
		expect(JSON.parse(spy.mock.calls[0][1]?.body)).toMatchObject({
			languages: ["eng"],
		});
		spy.mockRestore();
	});

	it("search like plus posts text and weight", async () => {
		const spy = mockFetch({ results: [] });
		await apiSearchLikePlus("/d", "/a.jpg", "local", 24, "caption", 0.6);
		expect(JSON.parse(spy.mock.calls[0][1]?.body)).toMatchObject({
			text: "caption",
			weight: 0.6,
		});
		spy.mockRestore();
	});

	it("workspace list/add/remove", async () => {
		let spy = mockFetch({ folders: [] });
		await apiWorkspaceList();
		expect(String(spy.mock.calls[0][0])).toMatch(/\/workspace$/);
		spy.mockRestore();
		spy = mockFetch({ folders: [] });
		await apiWorkspaceAdd("/p");
		expect(String(spy.mock.calls[0][0])).toMatch(/\/workspace\/add$/);
		spy.mockRestore();
		spy = mockFetch({ folders: [] });
		await apiWorkspaceRemove("/p");
		expect(String(spy.mock.calls[0][0])).toMatch(/\/workspace\/remove$/);
		spy.mockRestore();
	});

	it("metadata detail GET", async () => {
		const spy = mockFetch({ meta: {} });
		await apiMetadataDetail("/d", "/a.jpg");
		expect(String(spy.mock.calls[0][0])).toMatch(/metadata\/detail\?dir=/);
		spy.mockRestore();
	});
});
