import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JustifiedResults from "./JustifiedResults";

vi.mock("../api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../api")>();
	return {
		...actual,
		thumbUrl: (_d: string, _e: string, p: string, _s: number) =>
			`mock://thumb${p}`,
	};
});

describe("JustifiedResults", () => {
	it("renders grid cells and handles selection/open", async () => {
		// Force layout metrics in jsdom
		Object.defineProperty(HTMLElement.prototype, "clientWidth", {
			configurable: true,
			get: () => 800,
		});
		Object.defineProperty(HTMLElement.prototype, "clientHeight", {
			configurable: true,
			get: () => 600,
		});
		const scrollRef = {
			current: document.createElement("div"),
		} as React.MutableRefObject<HTMLDivElement>;
		const onToggle = vi.fn();
		const onOpen = vi.fn();
		render(
			<div
				ref={scrollRef as React.RefObject<HTMLDivElement>}
				style={{ width: 800, height: 600 }}
			>
				<JustifiedResults
					dir="/d"
					engine="local"
					items={[
						{ path: "/a.jpg", score: 0.9 },
						{ path: "/b.jpg", score: 0.8 },
						{ path: "/c.jpg", score: 0.7 },
					]}
					scrollContainerRef={scrollRef}
					selected={new Set()}
					onToggleSelect={onToggle}
					onOpen={onOpen}
					showInfoOverlay
				/>
			</div>,
		);
		// Wait for layout to produce rows
		const tiles = await screen.findAllByRole("button", { name: /\.jpg$/ });
		expect(tiles.length).toBeGreaterThan(0);
		fireEvent.click(tiles[0]);
		await waitFor(() => expect(onToggle).toHaveBeenCalled());
		fireEvent.doubleClick(tiles[0]);
		await waitFor(() => expect(onOpen).toHaveBeenCalled());
	});
});
