# Storybook Guide

## Overview
Storybook is configured for the Photo Search application to provide an isolated development environment for UI components. It includes accessibility testing, interaction testing, and comprehensive documentation.

## Setup & Installation

### Initial Setup (Already Complete)
```bash
npx storybook@latest init
npm install -D @storybook/addon-a11y
```

### Running Storybook
```bash
# Start Storybook development server
npm run storybook

# Build static Storybook
npm run build-storybook
```

## Configuration

### Main Configuration
Located at `.storybook/main.ts`:
- **Stories**: All `*.stories.tsx` files in `src/`
- **Addons**:
  - `@storybook/addon-docs` - Documentation
  - `@storybook/addon-a11y` - Accessibility testing
  - `@storybook/addon-essentials` - Core addons
  - `@storybook/addon-interactions` - Interaction testing

### Preview Configuration
Located at `.storybook/preview.ts`:
- Global decorators
- Parameter defaults
- Viewport configurations

## Writing Stories

### Basic Story Structure
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from '../components/MyComponent';

const meta = {
  title: 'Category/ComponentName',
  component: MyComponent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Component description here'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    // Define controls for props
    propName: {
      control: 'text',
      description: 'Prop description'
    }
  },
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Default props
  },
};
```

### Story Categories
- **Components/** - UI components
- **Layouts/** - Layout components
- **Modals/** - Modal dialogs
- **Forms/** - Form components
- **Utils/** - Utility components

## Existing Stories

### Core Components
1. **SearchBar** (`SearchBar.stories.tsx`)
   - Default, WithQuery, Disabled, WithFilters
   - Mobile responsive variants
   - Accessibility testing

2. **LoadingSpinner** (`LoadingSpinner.stories.tsx`)
   - Size variants (small, medium, large)
   - With/without overlay
   - Custom messages

3. **ErrorBoundary** (`ErrorBoundary.stories.tsx`)
   - Error states
   - Custom fallback UI
   - Error logging examples

### Components To Add Stories For

#### High Priority
- [ ] ResultsGrid - Photo grid display
- [ ] Lightbox - Photo viewer
- [ ] Collections - Collection management
- [ ] TopBar - Main navigation
- [ ] Sidebar - Side navigation

#### Medium Priority
- [ ] FilterPanel - Search filters
- [ ] MetadataPanel - Photo metadata
- [ ] FaceClusterManager - Face clustering
- [ ] TripsView - Trip organization
- [ ] VideoLightbox - Video player

#### Low Priority
- [ ] HelpModal - Help documentation
- [ ] SettingsModal - App settings
- [ ] KeyboardShortcutsModal - Shortcuts guide
- [ ] OnboardingTour - User onboarding

## Accessibility Testing

### Using the A11y Addon
The accessibility addon automatically checks for:
- Color contrast (WCAG AA/AAA)
- ARIA attributes
- Keyboard navigation
- Screen reader compatibility

### Custom A11y Rules
```typescript
export const AccessibilityTest: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'label', enabled: true },
          { id: 'aria-valid-attr-value', enabled: true },
        ],
      },
    },
  },
};
```

## Interaction Testing

### Writing Interaction Tests
```typescript
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';

export const SearchInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('searchbox');

    await userEvent.type(input, 'sunset photos');
    await userEvent.keyboard('{Enter}');

    await expect(input).toHaveValue('sunset photos');
  },
};
```

## Best Practices

### 1. Component Organization
- One story file per component
- Group related stories
- Use consistent naming

### 2. Props Documentation
- Document all props with descriptions
- Provide sensible defaults
- Show edge cases

### 3. Accessibility
- Include accessibility test story
- Test keyboard navigation
- Verify ARIA attributes

### 4. Responsive Design
- Include mobile viewport stories
- Test at different breakpoints
- Document responsive behavior

### 5. States & Variants
- Show all component states
- Include error states
- Document loading states

## Decorators

### Global Decorators
Applied to all stories:
```typescript
// .storybook/preview.ts
export const decorators = [
  (Story) => (
    <div style={{ padding: '1rem' }}>
      <Story />
    </div>
  ),
];
```

### Story-Specific Decorators
```typescript
export const WithBackground: Story = {
  decorators: [
    (Story) => (
      <div style={{ background: '#f0f0f0', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
};
```

## Testing Workflow

### Development
1. Write component
2. Create story file
3. Define variants
4. Test accessibility
5. Add interactions

### Review Process
1. Run `npm run storybook`
2. Review all stories
3. Check accessibility panel
4. Test interactions
5. Verify documentation

## Deployment

### Build Static Storybook
```bash
npm run build-storybook
```

Output in `storybook-static/` directory.

### Deploy Options
- **GitHub Pages**: Push to `gh-pages` branch
- **Netlify**: Auto-deploy from repository
- **Vercel**: Connect repository
- **Chromatic**: Visual regression testing

## Troubleshooting

### Common Issues

#### Stories Not Appearing
- Check file naming (`*.stories.tsx`)
- Verify story export structure
- Check console for errors

#### Addon Not Working
- Verify addon installation
- Check `.storybook/main.ts` configuration
- Restart Storybook server

#### Build Failures
- Clear cache: `rm -rf node_modules/.cache`
- Reinstall dependencies
- Check for TypeScript errors

## Resources

### Documentation
- [Storybook Docs](https://storybook.js.org/docs)
- [Addon Gallery](https://storybook.js.org/addons)
- [Best Practices](https://storybook.js.org/docs/react/writing-stories/introduction)

### Tools
- [Chromatic](https://www.chromatic.com/) - Visual testing
- [Storybook Test Runner](https://github.com/storybookjs/test-runner) - Automated testing
- [Storybook Deployer](https://github.com/storybookjs/storybook-deployer) - Deployment

## Next Steps

1. **Add More Stories**: Create stories for remaining components
2. **Interaction Tests**: Add play functions for user interactions
3. **Visual Testing**: Set up Chromatic for regression testing
4. **Documentation**: Enhance component documentation
5. **CI Integration**: Add Storybook to CI/CD pipeline

## Conclusion

Storybook is now configured and ready for use in the Photo Search application. It provides:
- Component isolation
- Accessibility testing
- Interactive documentation
- Development efficiency

Use `npm run storybook` to start developing and testing components in isolation.