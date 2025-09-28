import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { fireEvent, render, screen } from "./test/test-utils";

describe("App integration flows", () => {
	it("renders search button on /search route", async () => {
		window.history.pushState({}, "", "/search");

		render(<App />);

		// Wait for the app to load and find the search button
		const searchButton = await screen.findByRole("button", {
			name: "Open search",
		});
		expect(searchButton).toBeInTheDocument();

		// Verify the button can be clicked (doesn't throw)
		expect(() => {
			fireEvent.click(searchButton);
		}).not.toThrow();
	});

	it("share route shows password form (password_required)", async () => {
		const originalFetch: typeof fetch | undefined = global.fetch as
			| typeof fetch
			| undefined;
		global.fetch = vi.fn(
			async () =>
				new Response(
					JSON.stringify({ ok: false, error: "password_required" }),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
		) as unknown as typeof fetch;
		try {
			window.history.pushState({}, "", "/share/abc");
			render(<App />);
			expect(await screen.findByText(/Password/i)).toBeInTheDocument();
		} finally {
			if (originalFetch) {
				global.fetch = originalFetch;
			} else {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore - in some environments fetch may be undefined
				delete global.fetch;
			}
		}
	});
});
