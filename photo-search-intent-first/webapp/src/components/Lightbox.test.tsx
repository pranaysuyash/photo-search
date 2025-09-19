import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Lightbox } from "./Lightbox";

vi.mock("../api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../api")>();
	return {
		...actual,
		thumbUrl: (_d: string, _e: string, p: string, _s: number) =>
			`mock://thumb${p}`,
		apiMetadataDetail: vi.fn(async () => ({ meta: { camera: "X", iso: 100 } })),
	};
});

describe("Lightbox", () => {
	it("renders image and supports zoom reset", () => {
		const onClose = vi.fn();
		render(
			<Lightbox
				dir="/d"
				engine="local"
				path="/a.jpg"
				onPrev={() => {}}
				onNext={() => {}}
				onClose={onClose}
				onReveal={() => {}}
				onFavorite={() => {}}
			/>,
		);
		const container = screen.getByRole("img", { name: "Image viewer" });
		const img = screen.getAllByAltText("/a.jpg")[0] as HTMLImageElement;
		// Double click toggles zoom on the container
		fireEvent.doubleClick(container);
		// style transform should include scale(>1)
		expect(img.style.transform).toMatch(/scale\(/);
		// Double click again resets
		fireEvent.doubleClick(img);
		expect(img.style.transform).toMatch(/scale\(1\)/);
	});

	it("toggles info panel and loads metadata", async () => {
		const { apiMetadataDetail } = await import("../api");
		render(
			<Lightbox
				dir="/d"
				engine="local"
				path="/a.jpg"
				onPrev={() => {}}
				onNext={() => {}}
				onClose={() => {}}
				onReveal={() => {}}
				onFavorite={() => {}}
			/>,
		);
		fireEvent.click(screen.getByText("Info"));
		expect(apiMetadataDetail).toHaveBeenCalled();
	});
});
