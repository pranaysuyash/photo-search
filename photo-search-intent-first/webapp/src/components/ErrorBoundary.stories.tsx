import type { Meta, StoryObj } from "@storybook/react";
import ErrorBoundary from "./ErrorBoundary";
import { Button } from "./ui";

const meta = {
  title: "Components/Error Boundary",
  component: ErrorBoundary,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

// A component that throws an error
const BadComponent = () => {
  throw new Error("This is a test error!");
};

// A component that works fine
const GoodComponent = () => {
  return <div>This component works fine!</div>;
};

export const Default: Story = {
  render: () => (
    <ErrorBoundary componentName="StoryExample">
      <BadComponent />
    </ErrorBoundary>
  ),
};

export const WithCustomFallback: Story = {
  render: () => (
    <ErrorBoundary
      componentName="StoryExample"
      fallback={
        <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">
          <h3 className="font-bold text-yellow-800">Custom Error Message</h3>
          <p className="text-yellow-700">
            Something went wrong, but we're showing a custom message.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-2"
            variant="default"
          >
            Reload
          </Button>
        </div>
      }
    >
      <BadComponent />
    </ErrorBoundary>
  ),
};

export const NoError: Story = {
  render: () => (
    <ErrorBoundary componentName="StoryExample">
      <GoodComponent />
    </ErrorBoundary>
  ),
};
