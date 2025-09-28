# shadcn/ui Component Usage Guide

## Quick Reference

This guide provides patterns and examples for using shadcn/ui components in the photo-search project.

## 🚀 Getting Started

### Import Patterns

```tsx
// Individual component imports (recommended for tree-shaking)
import { Button } from "@/components/ui/shadcn/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/shadcn/Dialog";
import { Input } from "@/components/ui/shadcn/Input";
import { Label } from "@/components/ui/label";

// Multiple components from shadcn
import { Button, Dialog, Input, Label } from "@/components/ui/shadcn";
```

## 📦 Available Components

### Core Components
- **Button** - Interactive button with variants
- **Card** - Container component
- **Dialog** - Modal/overlay component
- **Input** - Form input field
- **Select** - Dropdown selection
- **Switch** - Toggle switch
- **Checkbox** - Checkbox input
- **Textarea** - Multi-line text input
- **Sheet** - Side panel/drawer
- **Dropdown-Menu** - Dropdown menu
- **Command** - Command palette
- **Separator** - Visual divider
- **Label** - Form label
- **Badge** - Status indicator

## 🎯 Usage Patterns

### Modal Dialog Pattern

```tsx
import { Button } from "@/components/ui/shadcn/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/shadcn/Dialog";
import { Input } from "@/components/ui/shadcn/Input";
import { Label } from "@/components/ui/label";

interface MyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MyModal({ isOpen, onClose }: MyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Modal Title</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="field-name">Field Label</Label>
              <Input
                id="field-name"
                name="fieldName"
                placeholder="Enter value..."
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Button Variants

```tsx
import { Button } from "@/components/ui/shadcn/Button";

// Primary action
<Button variant="default">Save</Button>

// Secondary action
<Button variant="outline">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Secondary style
<Button variant="secondary">Preview</Button>

// Ghost style (minimal)
<Button variant="ghost">Link</Button>

// Sizing
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>

// Disabled state
<Button disabled>Disabled</Button>
```

### Form Controls

```tsx
import { Input } from "@/components/ui/shadcn/Input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/shadcn/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/shadcn/Select";

// Text input with label
<div className="grid gap-2">
  <Label htmlFor="email">Email Address</Label>
  <Input
    id="email"
    type="email"
    placeholder="user@example.com"
    required
  />
</div>

// Textarea
<div className="grid gap-2">
  <Label htmlFor="description">Description</Label>
  <Textarea
    id="description"
    placeholder="Enter detailed description..."
    rows={4}
  />
</div>

// Checkbox
<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">I agree to the terms</Label>
</div>

// Switch
<div className="flex items-center space-x-2">
  <Switch id="notifications" />
  <Label htmlFor="notifications">Enable notifications</Label>
</div>

// Select
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

### Layout Components

```tsx
import { Card } from "@/components/ui/shadcn/Card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Card container
<Card className="p-6">
  <h3 className="text-lg font-semibold">Card Title</h3>
  <p className="text-sm text-gray-600 mt-2">Card content goes here</p>
</Card>

// Section separator
<Separator className="my-4" />

// Status badges
<div className="flex gap-2">
  <Badge variant="default">Active</Badge>
  <Badge variant="secondary">Beta</Badge>
  <Badge variant="destructive">Error</Badge>
  <Badge variant="outline">Pending</Badge>
</div>
```

## ♿ Accessibility Features

### Built-in Accessibility
- **Dialog components** include proper ARIA attributes, focus management, and keyboard navigation
- **Form controls** have proper labels and semantic structure
- **Buttons** include keyboard support and screen reader announcements

### Best Practices
```tsx
// ✅ Good - Proper labeling
<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" />

// ❌ Avoid - Missing label association
<Input placeholder="Email Address" />

// ✅ Good - Semantic button usage
<Button onClick={handleSubmit}>Submit Form</Button>

// ❌ Avoid - Div as button
<div onClick={handleSubmit}>Submit Form</div>
```

## 🎨 Styling & Theming

### className Patterns
```tsx
// Consistent spacing
<div className="grid gap-4">      // Large gaps
<div className="grid gap-2">      // Small gaps

// Responsive sizing
<DialogContent className="sm:max-w-md">  // Mobile-first responsive

// Flexbox layouts
<div className="flex justify-end gap-2">  // Right-aligned with gap
<div className="flex items-center gap-2"> // Vertically centered
```

### Theme Integration
- All components work with existing dark/light theme system
- Use standard Tailwind classes for custom styling
- Leverage CSS custom variables for theming consistency

## 🧪 Testing Guidelines

### Component Testing
- Use the same testing patterns as existing components
- Verify accessibility with keyboard navigation
- Test responsive behavior across viewports
- Ensure proper form validation and error states

### Build Verification
```bash
# Run build to ensure no issues
npm run build

# Run tests to verify functionality
npm run test

# Check accessibility compliance
npm run lint
```

## 📝 Migration Patterns

### When to Use shadcn Components
- **Modals/Dialogs** - Always prefer shadcn Dialog over custom implementations
- **Forms** - Use shadcn form controls for consistency
- **Buttons** - Replace custom button elements with shadcn Button
- **Layout** - Use Card and Separator for structured layouts

### Migration Checklist
1. ✅ Identify custom component to replace
2. ✅ Import appropriate shadcn components
3. ✅ Update JSX structure and props
4. ✅ Preserve all existing functionality
5. ✅ Test keyboard navigation and accessibility
6. ✅ Verify responsive behavior
7. ✅ Run build and test suite

## 🔍 Troubleshooting

### Common Issues

**Import Errors**
```tsx
// ❌ Incorrect import path
import { Button } from "@/components/ui/Button";

// ✅ Correct import path
import { Button } from "@/components/ui/shadcn/Button";
```

**Missing Dependencies**
```bash
# Add missing components
pnpm dlx shadcn@latest add [component-name]
```

**Styling Issues**
- Ensure Tailwind classes are properly applied
- Check for conflicting custom styles
- Verify theme compatibility

## 📚 Additional Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Component Examples](./examples/)
- [Migration Patterns](./migration-patterns/)
- [Accessibility Guidelines](./accessibility/)

For specific questions or complex use cases, refer to the existing implementations in:
- `src/components/modals/SaveModal.tsx`
- `src/components/modals/CollectionModal.tsx`
- `src/components/SettingsModal.tsx`