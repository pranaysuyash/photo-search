import type { Meta, StoryObj } from "@storybook/react";
import { AdvancedFilterPanel } from "./AdvancedFilterPanel";

const meta = {
	title: "Components/Advanced Filter Panel",
	component: AdvancedFilterPanel,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	argTypes: {
		onApply: { action: "apply" },
		onClose: { action: "close" },
		onClearAll: { action: "clear-all" },
	},
} satisfies Meta<typeof AdvancedFilterPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		favOnly: false,
		setFavOnly: (value: boolean) => console.log("Set favOnly:", value),
		tagFilter: "",
		setTagFilter: (value: string) => console.log("Set tagFilter:", value),
		camera: "",
		setCamera: (value: string) => console.log("Set camera:", value),
		isoMin: "",
		setIsoMin: (value: string) => console.log("Set isoMin:", value),
		isoMax: "",
		setIsoMax: (value: string) => console.log("Set isoMax:", value),
		dateFrom: "",
		setDateFrom: (value: string) => console.log("Set dateFrom:", value),
		dateTo: "",
		setDateTo: (value: string) => console.log("Set dateTo:", value),
		fMin: "",
		setFMin: (value: string) => console.log("Set fMin:", value),
		fMax: "",
		setFMax: (value: string) => console.log("Set fMax:", value),
		place: "",
		setPlace: (value: string) => console.log("Set place:", value),
		useCaps: false,
		setUseCaps: (value: boolean) => console.log("Set useCaps:", value),
		useOcr: false,
		setUseOcr: (value: boolean) => console.log("Set useOcr:", value),
		hasText: false,
		setHasText: (value: boolean) => console.log("Set hasText:", value),
		ratingMin: 0,
		setRatingMin: (value: number) => console.log("Set ratingMin:", value),
		person: "",
		setPerson: (value: string) => console.log("Set person:", value),
		collection: "",
		setCollection: (value: string) => console.log("Set collection:", value),
		color: "",
		setColor: (value: string) => console.log("Set color:", value),
		orientation: "",
		setOrientation: (value: string) => console.log("Set orientation:", value),
		availableCameras: [
			"Canon EOS R5",
			"Sony A7R IV",
			"Nikon D850",
			"Fujifilm X-T4",
		],
		availableCollections: [
			"Vacation 2023",
			"Family Photos",
			"Work Events",
			"Nature",
		],
		popularPersons: ["John Doe", "Jane Smith", "Bob Johnson", "Alice Williams"],
		popularColors: [
			"#FF0000",
			"#00FF00",
			"#0000FF",
			"#FFFF00",
			"#FF00FF",
			"#00FFFF",
		],
		yearRange: [2023, 2020],
		onApply: () => console.log("Apply filters"),
		onClose: () => console.log("Close panel"),
		onClearAll: () => console.log("Clear all filters"),
	},
};
