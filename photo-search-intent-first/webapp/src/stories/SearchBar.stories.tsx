import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";
import { SearchBar } from "../components/SearchBar";

const meta = {
	title: "Components/SearchBar",
	component: SearchBar,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"The main search bar component for photo searching with natural language queries.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		initialQuery: {
			control: "text",
			description: "Initial search query",
		},
		placeholder: {
			control: "text",
			description: "Placeholder text for the search input",
		},
		disabled: {
			control: "boolean",
			description: "Whether the search bar is disabled",
		},
		showFilters: {
			control: "boolean",
			description: "Whether to show filter options",
		},
	},
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default state
export const Default: Story = {
	args: {
		onSearchNow: action("search"),
		placeholder: "Search photos...",
		initialQuery: "",
	},
};

// With initial query
export const WithQuery: Story = {
	args: {
		onSearchNow: action("search"),
		placeholder: "Search photos...",
		initialQuery: "sunset at the beach",
	},
};

// Disabled state
export const Disabled: Story = {
	args: {
		onSearchNow: action("search"),
		placeholder: "Search disabled...",
		disabled: true,
	},
};

// With filters visible
export const WithFilters: Story = {
	args: {
		onSearchNow: action("search"),
		placeholder: "Search photos...",
		showFilters: true,
	},
};

// Mobile view
export const Mobile: Story = {
	args: {
		onSearchNow: action("search"),
		placeholder: "Search...",
	},
	parameters: {
		viewport: {
			defaultViewport: "mobile1",
		},
	},
};

// With long query
export const LongQuery: Story = {
	args: {
		onSearchNow: action("search"),
		initialQuery:
			"Find all photos from my summer vacation in Hawaii with palm trees and sunset on the beach",
	},
};

// Accessibility test
export const AccessibilityFocus: Story = {
	args: {
		onSearchNow: action("search"),
		placeholder: "Search photos (press Enter to search)",
	},
	parameters: {
		a11y: {
			config: {
				rules: [
					{
						id: "color-contrast",
						enabled: true,
					},
					{
						id: "label",
						enabled: true,
					},
				],
			},
		},
	},
};
