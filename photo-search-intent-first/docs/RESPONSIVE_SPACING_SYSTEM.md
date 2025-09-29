# Responsive Spacing System Documentation

## Overview

The responsive spacing system provides a comprehensive, standardized approach to handling spacing and layout across different screen sizes in the photo-search application. This system ensures consistent visual design and eliminates layout jank when transitioning between different window sizes.

## Features

### 1. **Consistent Breakpoint System**
- Standardized breakpoints: xs (0px), sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Mobile-first approach with progressive enhancement
- Automatic breakpoint detection via `useBreakpoint` hook

### 2. **Responsive Spacing Utilities**
- Container padding that scales with screen size
- Section spacing between components
- Card and modal padding patterns
- Button and input spacing
- Grid and gap utilities

### 3. **Layout Components**
- `ResponsiveContainer`: Standardized container with responsive padding
- `ResponsiveGrid`: Grid system with responsive columns
- `ResponsiveFlex`: Flexbox utilities with responsive behavior
- `ResponsiveStack`: Vertical spacing components

### 4. **Component-Specific Patterns**
- Pre-defined spacing patterns for common UI components
- Modal, card, form, navigation, and list layouts
- Consistent visual hierarchy across all screen sizes

## Usage

### Basic Usage

```tsx
import { Container, Grid, useResponsiveSpacing } from '@/components/layout';

function MyComponent() {
  const { classes, getLayout } = useResponsiveSpacing();

  return (
    <Container maxWidth="lg" padding="md">
      <Grid cols={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="md">
        {/* Grid items */}
      </Grid>
    </Container>
  );
}
```

### Responsive Classes

```tsx
// Container padding that scales automatically
<div className="px-2 sm:px-3 md:px-6 lg:px-8 xl:px-10 2xl:px-12">

// Responsive gap between elements
<div className="gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8">

// Responsive margins
<div className="mt-2 sm:mt-3 md:mt-4 lg:mt-6 xl:mt-8">
```

### Component Patterns

```tsx
import { useResponsiveSpacing } from '@/hooks/useResponsiveSpacing';

function MyModal() {
  const { getComponentSpacing } = useResponsiveSpacing();
  const modalSpacing = getComponentSpacing('modal');

  return (
    <div className={modalSpacing.container}>
      <div className={modalSpacing.backdrop}>
        <div className={modalSpacing.content}>
          <div className={modalSpacing.header}>
            <h2>Modal Title</h2>
          </div>
          <div className={modalSpacing.body}>
            {/* Modal content */}
          </div>
          <div className={modalSpacing.footer}>
            {/* Modal actions */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## API Reference

### useResponsiveSpacing Hook

```tsx
const {
  getSpacing,           // Get responsive spacing class by type
  getComponentSpacing,  // Get component-specific spacing patterns
  getLayout,           // Get layout pattern classes
  currentBreakpoint,   // Current active breakpoint
  isMobile,            // Is mobile device
  isTablet,            // Is tablet device
  isDesktop,           // Is desktop device
  classes              // Pre-computed responsive classes
} = useResponsiveSpacing();
```

### ResponsiveContainer Props

```tsx
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  centered?: boolean;
}
```

### ResponsiveGrid Props

```tsx
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: 'none' | 'sm' | 'md' | 'lg';
}
```

## Breakpoint System

| Breakpoint | Screen Width | Device Type | Common Usage |
|------------|--------------|-------------|--------------|
| xs | < 640px | Small mobile | Minimal padding, compact layouts |
| sm | 640px - 767px | Large mobile | Standard mobile layouts |
| md | 768px - 1023px | Tablet | Tablet layouts, multi-column |
| lg | 1024px - 1279px | Desktop | Standard desktop layouts |
| xl | 1280px - 1535px | Large desktop | Expanded desktop layouts |
| 2xl | ≥ 1536px | Extra large desktop | Maximum content width |

## Spacing Scale

The spacing scale follows a consistent ratio based on Tailwind's default spacing:

| Size | CSS Value | Pixels | Usage |
|------|-----------|--------|-------|
| xs | 0.25rem | 4px | Tight spacing, compact elements |
| sm | 0.5rem | 8px | Small gaps, compact layouts |
| base | 1rem | 16px | Standard spacing unit |
| md | 1.5rem | 24px | Section spacing, comfortable padding |
| lg | 2rem | 32px | Large sections, modal padding |
| xl | 3rem | 48px | Extra large spacing |
| 2xl | 4rem | 64px | Maximum spacing, hero sections |

## Examples

### Responsive Layout

```tsx
import { Container, Grid, Flex, Stack } from '@/components/layout';

function PhotoGrid() {
  return (
    <Container maxWidth="2xl" padding="lg">
      <Stack spacing="lg">
        <header className="text-center">
          <h1 className="text-3xl font-bold">Photo Gallery</h1>
        </header>

        <Grid cols={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }} gap="md">
          {photos.map(photo => (
            <div key={photo.id} className="bg-card rounded-lg overflow-hidden">
              <img src={photo.url} alt={photo.title} />
              <div className="p-4">
                <h3 className="font-semibold">{photo.title}</h3>
              </div>
            </div>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
```

### Responsive Form

```tsx
import { Container, Stack, useResponsiveSpacing } from '@/components/layout';

function ResponsiveForm() {
  const { getComponentSpacing } = useResponsiveSpacing();
  const formSpacing = getComponentSpacing('form');

  return (
    <Container maxWidth="md" padding="md">
      <form className={formSpacing.container}>
        <Stack spacing="md">
          <div className={formSpacing.group}>
            <label className={formSpacing.label}>Name</label>
            <input type="text" className={formSpacing.input} />
          </div>

          <div className={formSpacing.group}>
            <label className={formSpacing.label}>Email</label>
            <input type="email" className={formSpacing.input} />
            <p className={formSpacing.help}>We'll never share your email</p>
          </div>
        </Stack>
      </form>
    </Container>
  );
}
```

## Integration with Existing Code

The responsive spacing system is designed to integrate seamlessly with existing code:

1. **Gradual Migration**: Replace existing spacing classes progressively
2. **Backward Compatibility**: Existing classes continue to work
3. **Consistent Patterns**: All new components follow the same spacing rules
4. **TypeScript Support**: Full type safety with TypeScript definitions

## Performance Considerations

1. **CSS-in-JS**: Uses Tailwind's utility classes for optimal performance
2. **Tree Shaking**: Unused spacing classes are tree-shaken
3. **Minimal Runtime**: Small JavaScript footprint for hooks and components
4. **CSS Custom Properties**: Efficient dynamic spacing adjustments

## Testing

The responsive spacing system includes:

1. **Visual Regression Tests**: Ensure spacing consistency across breakpoints
2. **Unit Tests**: Hook and component functionality
3. **Integration Tests**: End-to-end responsive behavior
4. **Accessibility Tests**: Proper spacing for accessibility requirements

## Future Enhancements

1. **Dark Mode Support**: Spacing adjustments for dark mode
2. **Reduced Motion**: Animation-friendly spacing patterns
3. **High Contrast Mode**: Accessibility-focused spacing
4. **RTL Support**: Right-to-left layout considerations