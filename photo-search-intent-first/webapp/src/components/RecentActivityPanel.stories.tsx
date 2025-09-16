import type { Meta, StoryObj } from "@storybook/react";
import { RecentActivityPanel } from "./RecentActivityPanel";

const meta = {
  title: "Components/Recent Activity Panel",
  component: RecentActivityPanel,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    onClose: { action: "close" },
  },
} satisfies Meta<typeof RecentActivityPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock activity data
const mockActivities = [
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
  {
    id: "3",
    userId: "user1",
    action: "edit",
    resourceId: "photo789",
    resourceType: "photo",
    metadata: { fileName: "family_portrait.jpg", editType: "crop" },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: "4",
    userId: "user1",
    action: "share",
    resourceId: "album1",
    resourceType: "album",
    metadata: { sharedWith: "family@example.com" },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
  },
  {
    id: "5",
    userId: "user1",
    action: "delete",
    resourceId: "photo321",
    resourceType: "photo",
    metadata: { fileName: "old_photo.jpg" },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
  },
];

// Mock the UserManagementService
const mockUserManagementService = {
  getActivityFeed: () => mockActivities,
};

// Override the default implementation for Storybook
export const Default: Story = {
  render: (args) => {
    // Mock the UserManagementService for Storybook
    // In a real implementation, we would use a decorator or provider
    return <RecentActivityPanel {...args} />;
  },
  args: {
    onClose: () => console.log("Closing panel"),
  },
};