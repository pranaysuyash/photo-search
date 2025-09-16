import type { Meta, StoryObj } from '@storybook/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useState } from 'react';

const meta = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Error boundary component that catches JavaScript errors in child components and displays a fallback UI.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    fallback: {
      description: 'Custom fallback component to display on error'
    },
    onError: {
      description: 'Callback function when error occurs'
    }
  },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

// Component that throws an error
const BrokenComponent = ({ shouldError }: { shouldError: boolean }) => {
  if (shouldError) {
    throw new Error('This is a test error!');
  }
  return <div>Component is working fine!</div>;
};

// Interactive component to trigger error
const ErrorTrigger = () => {
  const [hasError, setHasError] = useState(false);

  return (
    <div style={{ padding: '20px' }}>
      <button
        onClick={() => setHasError(true)}
        style={{
          padding: '10px 20px',
          background: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Click to trigger error
      </button>
      <div style={{ marginTop: '20px' }}>
        <ErrorBoundary>
          <BrokenComponent shouldError={hasError} />
        </ErrorBoundary>
      </div>
    </div>
  );
};

// Default error boundary
export const Default: Story = {
  render: () => <ErrorTrigger />,
};

// With custom fallback
export const CustomFallback: Story = {
  args: {
    fallback: (
      <div style={{
        padding: '20px',
        background: '#fef2f2',
        border: '1px solid #dc2626',
        borderRadius: '8px',
        color: '#7f1d1d'
      }}>
        <h3>Oops! Something went wrong</h3>
        <p>We've logged this error and will fix it soon.</p>
      </div>
    ),
  },
  render: (args) => (
    <ErrorBoundary {...args}>
      <BrokenComponent shouldError={true} />
    </ErrorBoundary>
  ),
};

// Working component (no error)
export const NoError: Story = {
  render: () => (
    <ErrorBoundary>
      <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Everything is working!</h3>
        <p>This component renders normally without errors.</p>
      </div>
    </ErrorBoundary>
  ),
};

// With error logging
export const WithErrorLogging: Story = {
  args: {
    onError: (error: Error, errorInfo: React.ErrorInfo) => {
      console.log('Error logged:', error.message);
      console.log('Error component stack:', errorInfo.componentStack);
    },
  },
  render: (args) => (
    <div>
      <p>Check the console for error logs when error is triggered</p>
      <ErrorBoundary {...args}>
        <BrokenComponent shouldError={true} />
      </ErrorBoundary>
    </div>
  ),
};

// Mobile view
export const Mobile: Story = {
  render: () => <ErrorTrigger />,
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

// Accessibility test
export const AccessibilityTest: Story = {
  render: () => (
    <ErrorBoundary>
      <BrokenComponent shouldError={true} />
    </ErrorBoundary>
  ),
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'heading-order',
            enabled: true,
          },
        ],
      },
    },
  },
};