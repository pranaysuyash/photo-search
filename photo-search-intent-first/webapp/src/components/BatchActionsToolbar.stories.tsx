import type { Meta, StoryObj } from "@storybook/react";
import { BatchActionsToolbar } from "./BatchActionsToolbar";

const meta = {
  title: "Components/Batch Actions Toolbar",
  component: BatchActionsToolbar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onAction: { action: "action" },
    onClearSelection: { action: "clear-selection" },
  },
} satisfies Meta<typeof BatchActionsToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selectedCount: 5,
    onAction: (action, options) => console.log("Action:", action, "Options:", options),
    onClearSelection: () => console.log("Clear selection"),
  },
};

export const ManySelected: Story = {
  args: {
    selectedCount: 42,
    onAction: (action, options) => console.log("Action:", action, "Options:", options),
    onClearSelection: () => console.log("Clear selection"),
  },
};

export const SingleSelected: Story = {
  args: {
    selectedCount: 1,
    onAction: (action, options) => console.log("Action:", action, "Options:", options),
    onClearSelection: () => console.log("Clear selection"),
  },
};