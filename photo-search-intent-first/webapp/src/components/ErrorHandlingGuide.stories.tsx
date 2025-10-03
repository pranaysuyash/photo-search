import type { Meta, StoryObj } from "@storybook/react";
import { handleError } from "../utils/errors";
import ErrorBoundary from "./ErrorBoundary";
import { Button } from "./ui";

const meta = {
  title: "Guides/Error Handling",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
# Error Handling Patterns

This guide demonstrates the error handling patterns used throughout the Photo Search application.

## Core Concepts

1. **Centralized Error Utilities** - Unified \`handleError\` function for consistent error handling
2. **Component Error Boundaries** - React Error Boundaries for graceful UI degradation
3. **User-Friendly Messaging** - Clear, actionable error messages
4. **Error Logging** - Comprehensive error reporting and analytics

## Usage Examples

### Basic Error Handling

\`\`\`typescript
import { handleError } from "../utils/errors";

try {
  // Some operation that might fail
  await apiCall();
} catch (error) {
  handleError(error, {
    logToServer: true,
    context: { 
      component: "MyComponent", 
      action: "api_call" 
    },
    fallbackMessage: "Failed to load data"
  });
}
\`\`\`

### Error Boundaries

\`\`\`tsx
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary componentName="MyComponent">
      <MyComponent />
    </ErrorBoundary>
  );
}
\`\`\`

## Best Practices

1. **Always Handle Errors** - Never let errors bubble up unhandled
2. **Provide Context** - Include relevant context when logging errors
3. **Use Appropriate Error Types** - Classify errors correctly for better handling
4. **Graceful Degradation** - Design components to degrade gracefully when errors occur
5. **Monitor Error Rates** - Track error rates to identify issues
        `.trim(),
      },
    },
  },
} satisfies Meta<object>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicErrorHandling: Story = {
  render: () => {
    const handleClick = () => {
      try {
        throw new Error("This is a simulated error for demonstration purposes");
      } catch (error) {
        handleError(error, {
          logToServer: false, // Don't log in Storybook
          context: {
            component: "StoryExample",
            action: "simulate_error",
          },
          fallbackMessage:
            "An error occurred while simulating an error (ironic, isn't it?)",
        });
      }
    };

    return (
      <div className="p-6 max-w-md">
        <h2 className="text-xl font-bold mb-4">Basic Error Handling</h2>
        <p className="mb-4 text-gray-600">
          This example demonstrates how to handle errors using the centralized
          error handling utility.
        </p>
        <Button onClick={handleClick} variant="destructive">
          Simulate Error
        </Button>
      </div>
    );
  },
};

export const ErrorBoundaryExample: Story = {
  render: () => {
    // A component that throws an error
    const BadComponent = () => {
      throw new Error("This is a test error!");
    };

    return (
      <div className="p-6 max-w-md">
        <h2 className="text-xl font-bold mb-4">Error Boundary</h2>
        <p className="mb-4 text-gray-600">
          This example shows how Error Boundaries catch and handle component
          errors.
        </p>
        <ErrorBoundary componentName="StoryExample">
          <BadComponent />
        </ErrorBoundary>
      </div>
    );
  },
};

export const CustomErrorBoundary: Story = {
  render: () => {
    // A component that throws an error
    const BadComponent = () => {
      throw new Error("This is a test error!");
    };

    const customFallback = (
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
    );

    return (
      <div className="p-6 max-w-md">
        <h2 className="text-xl font-bold mb-4">Custom Error Boundary</h2>
        <p className="mb-4 text-gray-600">
          This example shows how to provide custom fallback UI for Error
          Boundaries.
        </p>
        <ErrorBoundary componentName="StoryExample" fallback={customFallback}>
          <BadComponent />
        </ErrorBoundary>
      </div>
    );
  },
};
