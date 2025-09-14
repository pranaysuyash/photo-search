# shadcn/ui Integration Documentation

This document provides an overview of the shadcn/ui components that have been integrated into the Photo Search application.

## Overview

We've integrated a subset of shadcn/ui components to enhance the UI/UX of the application. These components follow modern design principles and provide a consistent, accessible interface.

## Components Integrated

### Button
A versatile button component with multiple variants and sizes.

```tsx
import { Button } from "@/components/ui/shadcn/Button";

// Usage examples
<Button>Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon</Button>
```

### Card
A container component for grouping related content.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/shadcn/Card";

// Usage example
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>
```

### Dialog
A modal dialog component for displaying important information or collecting user input.

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/shadcn/Dialog";

// Usage example
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog Description</DialogDescription>
    </DialogHeader>
    <div>Dialog content</div>
    <DialogFooter>
      <Button>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Input
A styled input field component.

```tsx
import { Input } from "@/components/ui/shadcn/Input";

// Usage example
<Input placeholder="Enter text..." />
```

### Select
A dropdown selection component.

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/shadcn/Select";

// Usage example
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

## Usage in Existing Components

We've updated several existing components to use the new shadcn/ui components:

1. **AdvancedFilterPanel** - Uses Button and Select components
2. **UIDemo** - Demonstrates all integrated components

## Benefits

1. **Consistency** - All components follow the same design language
2. **Accessibility** - Built-in accessibility features
3. **Customization** - Easy to customize with Tailwind CSS
4. **Type Safety** - Full TypeScript support
5. **Performance** - Lightweight implementation

## Future Improvements

1. Gradually replace more existing components with shadcn/ui equivalents
2. Create custom themes to match the application's branding
3. Add more complex components like DataTable, Form, etc.
4. Implement component variants for different use cases