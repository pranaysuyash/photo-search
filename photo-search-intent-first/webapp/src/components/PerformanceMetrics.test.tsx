import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PerformanceMetrics } from "./PerformanceMetrics";

// Mock the performance monitor
vi.mock("../utils/performance", () => ({
	performanceMonitor: {
		getRecentMetrics: vi.fn().mockReturnValue([]),
	},
}));

describe("PerformanceMetrics", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the show button when not visible", () => {
		render(<PerformanceMetrics visible={false} />);
		
		expect(screen.getByText("Show Perf")).toBeInTheDocument();
		expect(screen.queryByText("Performance Metrics")).not.toBeInTheDocument();
	});

	it("shows metrics when button is clicked", () => {
		render(<PerformanceMetrics visible={false} />);
		
		const showButton = screen.getByText("Show Perf");
		fireEvent.click(showButton);
		
		expect(screen.getByText("Performance Metrics")).toBeInTheDocument();
		expect(screen.queryByText("Show Perf")).not.toBeInTheDocument();
	});

	it("hides metrics when hide button is clicked", () => {
		render(<PerformanceMetrics visible={false} />);
		
		// Show metrics
		const showButton = screen.getByText("Show Perf");
		fireEvent.click(showButton);
		
		// Hide metrics
		const hideButton = screen.getByText("Hide");
		fireEvent.click(hideButton);
		
		expect(screen.getByText("Show Perf")).toBeInTheDocument();
		expect(screen.queryByText("Performance Metrics")).not.toBeInTheDocument();
	});

	it("displays message when no metrics are available", () => {
		render(<PerformanceMetrics visible={true} />);
		
		expect(screen.getByText("No metrics available")).toBeInTheDocument();
	});
});