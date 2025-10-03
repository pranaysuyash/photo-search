import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiAnalytics } from "../../api";
import EnhancedJobsDrawer from "../EnhancedJobsDrawer";

// Mock the API to avoid network calls
vi.mock("../../api");
const mockApiAnalytics = vi.mocked(apiAnalytics);

// Mock the stores
vi.mock("../../stores/settingsStore", () => ({
	useDir: () => "/test/directory",
}));

// Mock the jobs context
vi.mock("../../contexts/JobsContext", () => ({
	useJobsContext: () => ({
		state: {
			jobs: [
				{
					id: "test-job-1",
					type: "metadata_build",
					title: "Indexing Metadata",
					status: "running",
					progress: 0.5,
					total: 1000,
					startTime: new Date(),
					errorCount: 0,
					warningCount: 1,
					description: "Processing photo metadata",
				},
				{
					id: "test-job-2",
					type: "thumbs_build",
					title: "Generating Thumbnails",
					status: "completed",
					progress: 1.0,
					total: 1000,
					startTime: new Date(),
					errorCount: 0,
					warningCount: 0,
				},
			],
		},
	}),
}));

// Mock the formatting utilities
vi.mock("../../utils/formatting", () => ({
	humanizeDuration: vi.fn(() => "5m"),
	humanizeFileSize: vi.fn(() => "1.5 MB"),
	formatTimestamp: vi.fn(() => "2 minutes ago"),
}));

describe("EnhancedJobsDrawer", () => {
	const defaultProps = {
		open: true,
		onClose: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default API response
		mockApiAnalytics.mockResolvedValue({
			events: [
				{
					type: "metadata_build",
					time: new Date().toISOString(),
					updated: 500,
					total: 1000,
					errors: 0,
					warnings: 1,
				},
				{
					type: "thumbs_build",
					time: new Date().toISOString(),
					made: 250,
					total: 1000,
					errors: 0,
					warnings: 0,
				},
			],
		});
	});

	it("renders enhanced jobs drawer when open", async () => {
		render(<EnhancedJobsDrawer {...defaultProps} />);

		// Check if the main title is present
		expect(screen.getByText("Library Operations")).toBeInTheDocument();
	});

	it("shows loading state initially", () => {
		render(<EnhancedJobsDrawer {...defaultProps} />);

		// Should show loading state
		expect(screen.getByText("Loading jobs...")).toBeInTheDocument();
	});

	it("closes when close button is clicked", async () => {
		const mockOnClose = vi.fn();
		render(<EnhancedJobsDrawer {...defaultProps} onClose={mockOnClose} />);

		const closeButton = screen.getByRole("button", { name: /close jobs/i });
		closeButton.click();

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("shows empty state when no jobs", async () => {
		// Mock empty analytics
		mockApiAnalytics.mockResolvedValue({
			events: [],
		});

		render(<EnhancedJobsDrawer {...defaultProps} />);

		// Wait for loading to complete
		await waitFor(() => {
			expect(screen.getByText("No library operations")).toBeInTheDocument();
		});
	});

	it("renders without crashing with basic props", () => {
		render(<EnhancedJobsDrawer {...defaultProps} />);

		// Should render the main structure
		expect(screen.getByText("Library Operations")).toBeInTheDocument();
	});
});
