import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Collections from "./Collections";

describe("Collections", () => {
	it("shows onboarding empty state", () => {
		render(
			<Collections
				dir="/test"
				engine="local"
				collections={{}}
				onLoadCollections={() => {}}
				onOpen={() => {}}
			/>,
		);
		expect(screen.getByText(/Bring your photo library to life/i)).toBeTruthy();
		expect(screen.getByText(/Select photo folder/i)).toBeTruthy();
	});

	it("renders items and refresh calls handler", () => {
		const onLoad = vi.fn();
		render(
			<Collections
				dir="/test"
				engine="local"
				collections={{ Summer: ["/a.jpg", "/b.jpg"] }}
				onLoadCollections={onLoad}
				onOpen={() => {}}
			/>,
		);
		expect(screen.getByText("Summer")).toBeInTheDocument();
		expect(screen.getByText("2 items")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Refresh"));
		expect(onLoad).toHaveBeenCalled();
	});
});
