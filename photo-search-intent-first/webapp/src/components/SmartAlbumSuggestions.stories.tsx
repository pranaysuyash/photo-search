import type { Meta, StoryObj } from "@storybook/react";
import { SmartAlbumSuggestions } from "./SmartAlbumSuggestions";

const meta = {
	title: "Components/Smart Album Suggestions",
	component: SmartAlbumSuggestions,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	argTypes: {
		onSuggestionSelect: { action: "suggestion-select" },
	},
} satisfies Meta<typeof SmartAlbumSuggestions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		onSuggestionSelect: (suggestion) =>
			console.log("Selected suggestion:", suggestion),
		photoCount: 1250,
		availableTags: [
			"beach",
			"mountains",
			"family",
			"vacation",
			"wedding",
			"portrait",
		],
		availablePersons: [
			"John Doe",
			"Jane Smith",
			"Bob Johnson",
			"Alice Williams",
		],
		availableLocations: ["New York", "Paris", "Tokyo", "London", "Sydney"],
		availableCameras: ["Canon EOS R5", "Sony A7R IV", "Nikon D850"],
	},
};
