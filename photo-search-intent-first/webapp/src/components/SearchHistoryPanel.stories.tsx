import type { Meta, StoryObj } from "@storybook/react";
import { SearchHistoryPanel } from "../SearchHistoryPanel";

const meta = {
	title: "Components/Search History Panel",
	component: SearchHistoryPanel,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	argTypes: {
		onSearch: { action: "search" },
		onClose: { action: "close" },
	},
} satisfies Meta<typeof SearchHistoryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock search history data
const mockHistory = [
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
	{
		query: "sunset landscapes",
		timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
		resultCount: 8,
	},
	{
		query: "wedding photos",
		timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
		resultCount: 42,
	},
	{
		query: "christmas 2023",
		timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10, // 10 days ago
		resultCount: 18,
	},
];

// Mock the search history service
const _mockSearchHistoryService = {
	getHistory: () => mockHistory,
	clearHistory: () => {},
	addToHistory: () => {},
};

// Override the default implementation for Storybook
export const Default: Story = {
	render: (args: React.ComponentProps<typeof SearchHistoryPanel>) => {
		// Mock the search history service for Storybook
		// In a real implementation, we would use a decorator or provider
		return <SearchHistoryPanel {...args} />;
	},
	args: {
		onSearch: (query: string) => console.log("Searching for:", query),
		onClose: () => console.log("Closing panel"),
	},
};
