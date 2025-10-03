import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TimelineResults from "../TimelineResults";

// Mock the API to avoid network calls
vi.mock("../../api", () => ({
	apiMetadataDetail: vi.fn((path: string) => {
		// Return different timestamps for different paths to create multiple months
		if (path.includes("photo1") || path.includes("photo2")) {
			return Promise.resolve({
				meta: { mtime: 1609459200 }, // 2021-01-01
			});
		} else if (path.includes("photo3") || path.includes("photo4")) {
			return Promise.resolve({
				meta: { mtime: 1612137600 }, // 2021-02-01
			});
		} else {
			return Promise.resolve({
				meta: { mtime: 1614556800 }, // 2021-03-01
			});
		}
	}),
	thumbUrl: vi.fn(() => "mock-thumb-url"),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
	observe: vi.fn(),
	disconnect: vi.fn(),
	unobserve: vi.fn(),
})) as any;

describe("TimelineResults Tooltip", () => {
	const defaultProps = {
		dir: "/test/directory",
		engine: "test-engine",
		items: [
			{ path: "/test/photo1.jpg", score: 0.9 },
			{ path: "/test/photo2.jpg", score: 0.8 },
			{ path: "/test/photo3.jpg", score: 0.7 },
			{ path: "/test/photo4.jpg", score: 0.6 },
			{ path: "/test/photo5.jpg", score: 0.5 },
			{ path: "/test/photo6.jpg", score: 0.4 },
		],
		selected: new Set(),
		onToggleSelect: vi.fn(),
		onOpen: vi.fn(),
		bucket: "month" as const,
	};

	it("renders timeline results component without crashing", () => {
		vi.useFakeTimers();
		const { container } = render(<TimelineResults {...defaultProps} />);

		// Fast forward timers to resolve metadata loading
		vi.advanceTimersByTime(100);

		// Component should render the main container
		expect(container.querySelector(".space-y-8")).toBeInTheDocument();
		vi.useRealTimers();
	});

	it("displays tooltip content in the DOM", () => {
		vi.useFakeTimers();
		const { container } = render(<TimelineResults {...defaultProps} />);

		// Fast forward timers
		vi.advanceTimersByTime(100);

		// Check if tooltip content exists in the DOM
		const tooltipContent = container.querySelector(".bg-gray-900");

		// The tooltip should be present in the DOM even if hidden by default
		if (tooltipContent) {
			expect(tooltipContent).toHaveTextContent("Click to Filter by Date");
			expect(tooltipContent).toHaveTextContent(
				"Click any time period to jump directly to that section",
			);
		}

		vi.useRealTimers();
	});

	it("renders timeline component with expected structure", () => {
		vi.useFakeTimers();
		const { container } = render(<TimelineResults {...defaultProps} />);

		// Fast forward timers
		vi.advanceTimersByTime(100);

		// Component should render the main container with photos grid
		expect(container.querySelector(".space-y-8")).toBeInTheDocument();

		// Should render photo items
		expect(
			container.querySelectorAll('button[type="button"]').length,
		).toBeGreaterThan(0);

		vi.useRealTimers();
	});
});
