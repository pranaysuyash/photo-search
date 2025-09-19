import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecentActivityPanel } from "./RecentActivityPanel";
import { SearchHistoryPanel } from "./SearchHistoryPanel";

// Mock react-window with a simple div replacement
vi.mock("react-window", () => {
	type RecentActivityItemData =
		import("../services/UserManagementService").Activity[];
	type SearchHistoryItemData = {
		items: import("../services/SearchHistoryService").SearchHistoryEntry[];
		onSearch: (query: string) => void;
	};

	type ItemData = RecentActivityItemData | SearchHistoryItemData | undefined;

	interface ChildProps {
		index: number;
		style: React.CSSProperties;
		data: ItemData;
	}

	interface ListProps {
		children: (props: ChildProps) => React.ReactNode;
		itemCount: number;
		itemData?: ItemData;
	}

	const List = ({ children, itemCount, itemData }: ListProps) => (
		<div data-testid="mock-list">
			{Array.from({ length: itemCount }).map((_, index) => {
				// Derive a stable key from itemData when possible
				let key = String(index);
				if (Array.isArray(itemData)) {
					const item = itemData[index] as { id?: string } | undefined;
					if (item && typeof item.id === "string") key = item.id;
				} else if (itemData && "items" in itemData) {
					const entry = itemData.items[index];
					if (entry?.query) key = `q:${entry.query}`;
				}
				return (
					<div key={key} data-testid={`mock-list-item-${index}`}>
						{children({ index, style: {}, data: itemData })}
					</div>
				);
			})}
		</div>
	);
	return { List, FixedSizeList: List };
});

// Mock the performance utilities
vi.mock("../utils/performance", () => ({
	performanceMonitor: {
		start: vi.fn().mockReturnValue(vi.fn()),
		record: vi.fn(),
		getRecentMetrics: vi.fn().mockReturnValue([]),
		getAverageDuration: vi.fn().mockReturnValue(0),
	},
	usePerformanceMonitor: vi.fn().mockReturnValue({
		start: vi.fn().mockReturnValue(vi.fn()),
	}),
	measureRenderTime: vi.fn().mockReturnValue(vi.fn()),
	measureAPICall: vi.fn().mockReturnValue(vi.fn()),
}));

// Mock the UserManagementService
vi.mock("../services/UserManagementService", () => ({
	UserManagementService: {
		getActivityFeed: vi.fn().mockReturnValue([
			{
				id: "1",
				userId: "user1",
				action: "view",
				resourceId: "photo123",
				resourceType: "photo",
				metadata: { fileName: "beach_sunset.jpg" },
				timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
			},
			{
				id: "2",
				userId: "user1",
				action: "favorite",
				resourceId: "photo456",
				resourceType: "photo",
				metadata: { fileName: "mountain_view.jpg" },
				timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
			},
		]),
	},
}));

// Mock the SearchHistoryService
vi.mock("../services/SearchHistoryService", () => ({
	searchHistoryService: {
		getHistory: vi.fn().mockReturnValue([
			{
				query: "beach vacation photos",
				timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
				resultCount: 24,
			},
			{
				query: "family portraits",
				timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
				resultCount: 12,
			},
		]),
		clearHistory: vi.fn(),
	},
}));

describe("RecentActivityPanel", () => {
	it("renders without crashing", () => {
		render(<RecentActivityPanel onClose={vi.fn()} />);

		expect(screen.getByText("Recent Activity")).toBeInTheDocument();
		expect(screen.getByText("Viewed")).toBeInTheDocument();
		expect(screen.getByText("Favorited")).toBeInTheDocument();
	});

	it("handles search input", () => {
		render(<RecentActivityPanel onClose={vi.fn()} />);

		const searchInput = screen.getByPlaceholderText("Search in activity...");
		fireEvent.change(searchInput, { target: { value: "view" } });

		// Inclusive match: action and filenames (e.g., mountain_view.jpg)
		expect(screen.getByText("Viewed")).toBeInTheDocument();
		expect(screen.getByText("Favorited")).toBeInTheDocument();
	});

	it("handles close button click", () => {
		const onClose = vi.fn();
		render(<RecentActivityPanel onClose={onClose} />);

		const closeButton = screen.getByTitle("Close");
		fireEvent.click(closeButton);

		expect(onClose).toHaveBeenCalled();
	});
});

describe("SearchHistoryPanel", () => {
	it("renders without crashing", () => {
		render(<SearchHistoryPanel onSearch={vi.fn()} onClose={vi.fn()} />);

		expect(screen.getByText("Search History")).toBeInTheDocument();
		expect(screen.getByText("beach vacation photos")).toBeInTheDocument();
		expect(screen.getByText("family portraits")).toBeInTheDocument();
	});

	it("handles search input", () => {
		render(<SearchHistoryPanel onSearch={vi.fn()} onClose={vi.fn()} />);

		const searchInput = screen.getByPlaceholderText("Search in history...");
		fireEvent.change(searchInput, { target: { value: "beach" } });

		// Should filter to show only "beach" searches
		expect(screen.getByText("beach vacation photos")).toBeInTheDocument();
		expect(screen.queryByText("family portraits")).not.toBeInTheDocument();
	});

	it("handles search item click", () => {
		const onSearch = vi.fn();
		render(<SearchHistoryPanel onSearch={onSearch} onClose={vi.fn()} />);

		const searchItem = screen.getByText("beach vacation photos");
		fireEvent.click(searchItem);

		expect(onSearch).toHaveBeenCalledWith("beach vacation photos");
	});

	it("handles close button click", () => {
		const onClose = vi.fn();
		render(<SearchHistoryPanel onSearch={vi.fn()} onClose={onClose} />);

		const closeButton = screen.getByTitle("Close");
		fireEvent.click(closeButton);

		expect(onClose).toHaveBeenCalled();
	});
});
