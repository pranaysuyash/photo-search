// Storybook is not installed - commenting out to prevent TypeScript errors
// import type { Meta, StoryObj } from '@storybook/react';
import FirstRunSetup from "./FirstRunSetup";

const meta = {
	title: "Modals/FirstRunSetup",
	component: FirstRunSetup,
	args: {
		open: true,
		onClose: () => {},
		onQuickStart: () => {},
		onCustom: () => {},
		onDemo: () => {},
		onTour: () => {},
	},
};

export default meta;
// type Story = StoryObj<typeof meta>;

// export const Default: Story = { };
