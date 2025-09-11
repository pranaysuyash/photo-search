# Linting Error Guide - Biome Linter

## Overview
Your codebase uses **Biome** (formerly Rome), a modern linter and formatter for JavaScript/TypeScript. The red marks you see in files are linting errors that indicate code quality issues, accessibility problems, or potential bugs.

## How to Find Linting Errors

### 1. In Your Editor
- **Red squiggly lines**: Immediate visual indicators
- **Red marks in scrollbar**: Shows error locations in file
- **Problems panel**: Lists all errors with descriptions
- **Hover over red marks**: Shows specific error details

### 2. Via Command Line
```bash
# Check all files
npx @biomejs/biome check src

# Check with detailed diagnostics
npx @biomejs/biome check src --max-diagnostics=1000

# Check specific file
npx @biomejs/biome check src/components/App.tsx

# Auto-fix safe issues
npx @biomejs/biome check src --write

# Fix with unsafe changes (use carefully)
npx @biomejs/biome check src --write --unsafe
```

## Current Error Summary in Your Codebase

### Top Issues (Total: ~994 errors)
1. **`noExplicitAny`** (354 instances) - TypeScript `any` type usage
2. **`useButtonType`** (305 instances) - Missing button type attribute
3. **`noArrayIndexKey`** (50 instances) - Using array index as React key
4. **`noStaticElementInteractions`** (48 instances) - Click handlers on non-interactive elements
5. **`noLabelWithoutControl`** (38 instances) - Labels without form controls
6. **`useKeyWithClickEvents`** (37 instances) - Click without keyboard support

## Error Categories

### 1. Accessibility (a11y) Errors
These ensure your app is usable by people with disabilities.

#### `useSemanticElements`
**Problem**: Using div with role instead of semantic HTML
```tsx
// ❌ Bad
<div role="navigation">...</div>

// ✅ Good
<nav>...</nav>
```

#### `useButtonType`
**Problem**: Button without explicit type
```tsx
// ❌ Bad
<button onClick={handleClick}>Click</button>

// ✅ Good
<button type="button" onClick={handleClick}>Click</button>
```

#### `useKeyWithClickEvents`
**Problem**: Click handler without keyboard support
```tsx
// ❌ Bad
<div onClick={handleClick}>Clickable</div>

// ✅ Good
<div 
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabIndex={0}
>
  Clickable
</div>
```

#### `noStaticElementInteractions`
**Problem**: Interactive handlers on non-interactive elements
```tsx
// ❌ Bad
<div onClick={handleClick}>Click me</div>

// ✅ Good - Option 1: Use button
<button onClick={handleClick}>Click me</button>

// ✅ Good - Option 2: Add role and keyboard support
<div 
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={handleKeyDown}
>
  Click me
</div>
```

#### `useAltText`
**Problem**: Images without alt text
```tsx
// ❌ Bad
<img src="photo.jpg" />

// ✅ Good
<img src="photo.jpg" alt="Description of photo" />
```

### 2. TypeScript/Suspicious Errors

#### `noExplicitAny`
**Problem**: Using `any` type defeats TypeScript's purpose
```tsx
// ❌ Bad
const handleData = (data: any) => {...}

// ✅ Good
interface DataType {
  id: string;
  name: string;
}
const handleData = (data: DataType) => {...}

// ✅ Good - When type is truly unknown
const handleData = (data: unknown) => {
  // Type guard
  if (typeof data === 'object' && data !== null) {...}
}
```

#### `noArrayIndexKey`
**Problem**: Using array index as React key
```tsx
// ❌ Bad
items.map((item, index) => <div key={index}>{item}</div>)

// ✅ Good
items.map((item) => <div key={item.id}>{item.name}</div>)
```

### 3. Correctness Errors

#### `useExhaustiveDependencies`
**Problem**: Missing dependencies in React hooks
```tsx
// ❌ Bad
useEffect(() => {
  console.log(value);
}, []); // Missing 'value' dependency

// ✅ Good
useEffect(() => {
  console.log(value);
}, [value]);
```

#### `noUnusedVariables`
**Problem**: Declared but unused variables
```tsx
// ❌ Bad
const unused = 'value';

// ✅ Good - Remove if truly unused
// Or prefix with underscore if intentionally unused
const _unused = 'value';
```

### 4. Style/Complexity Errors

#### `noNonNullAssertion`
**Problem**: Using `!` to bypass null checks
```tsx
// ❌ Bad
const value = data!.property;

// ✅ Good
const value = data?.property;
// Or with proper null check
if (data) {
  const value = data.property;
}
```

## Fixing Strategy

### Phase 1: Auto-fix Safe Issues
```bash
npx @biomejs/biome check src --write
```

### Phase 2: Fix TypeScript Types
1. Replace `any` with proper types
2. Add missing type definitions
3. Use `unknown` for truly unknown types

### Phase 3: Fix Accessibility
1. Add button types
2. Replace divs with semantic HTML
3. Add keyboard support to clickable elements
4. Add alt text to images

### Phase 4: Fix React Issues
1. Fix useEffect dependencies
2. Replace array index keys with stable IDs
3. Remove unused variables

## VS Code Integration

### Install Biome Extension
1. Install "Biome" extension from marketplace
2. Set as default formatter:
```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": true,
    "source.organizeImports.biome": true
  }
}
```

## Biome Configuration

Your `biome.json` controls which rules are enabled:
```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "a11y": {
        "useButtonType": "warn",
        "useSemanticElements": "warn"
      },
      "suspicious": {
        "noExplicitAny": "error"
      }
    }
  }
}
```

## Quick Commands Reference

```bash
# Check for errors
npx @biomejs/biome check src

# Auto-fix what's safe
npx @biomejs/biome check src --write

# Format code
npx @biomejs/biome format src --write

# Check specific rule category
npx @biomejs/biome check src 2>&1 | grep "a11y"

# Count errors by type
npx @biomejs/biome check src 2>&1 | grep -E "lint/" | cut -d' ' -f1 | sort | uniq -c
```

## Benefits of Fixing These

1. **Better Accessibility**: App usable by everyone
2. **Type Safety**: Catch bugs at compile time
3. **Code Quality**: Maintainable, professional code
4. **Performance**: Some fixes improve runtime performance
5. **SEO**: Semantic HTML improves search rankings
6. **Team Consistency**: Everyone follows same standards

## Next Steps

1. Start with auto-fixable issues
2. Focus on one error type at a time
3. Test after each major fix
4. Consider adding pre-commit hooks
5. Update team coding standards
