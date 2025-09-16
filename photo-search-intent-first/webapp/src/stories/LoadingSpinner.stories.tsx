import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from '../components/LoadingSpinner';

const meta = {
  title: 'Components/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An accessible loading spinner with customizable message and size.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    message: {
      control: 'text',
      description: 'Loading message to display'
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
      description: 'Size of the spinner'
    },
    overlay: {
      control: 'boolean',
      description: 'Whether to show with overlay background'
    }
  },
} satisfies Meta<typeof LoadingSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default spinner
export const Default: Story = {
  args: {
    message: 'Loading...',
  },
};

// Small size
export const Small: Story = {
  args: {
    message: 'Loading...',
    size: 'small',
  },
};

// Large size with custom message
export const Large: Story = {
  args: {
    message: 'Processing your photos...',
    size: 'large',
  },
};

// With overlay
export const WithOverlay: Story = {
  args: {
    message: 'Please wait...',
    overlay: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', height: '300px', position: 'relative', background: '#f0f0f0' }}>
        <p>Background content here</p>
        <Story />
      </div>
    ),
  ],
};

// No message
export const NoMessage: Story = {
  args: {
    message: '',
  },
};

// Long message
export const LongMessage: Story = {
  args: {
    message: 'Analyzing your photo library and building search index. This may take a few minutes...',
  },
};

// Accessibility test
export const AccessibilityTest: Story = {
  args: {
    message: 'Loading photos...',
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'aria-valid-attr-value',
            enabled: true,
          },
          {
            id: 'role-support-aria-props',
            enabled: true,
          },
        ],
      },
    },
  },
};