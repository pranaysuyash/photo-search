# Test Utilities

## Overview

This directory contains enhanced testing utilities to improve test stability, reliability, and maintainability for the Photo Search Intent-First application's visual testing suite.

## Available Utilities

### `test-helpers.ts`

Core utilities for stable and reliable visual testing.

#### dismissOverlays(page: Page)
Removes interfering overlay elements that can disrupt testing.

```typescript
import { dismissOverlays } from '../utils/test-helpers';

// Remove welcome screens, modals, debug elements
await dismissOverlays(page);
```

**Handles:**
- Welcome/onboarding screens
- First-run setup modals
- Debug elements (modal-debug)
- Other overlay elements that interfere with clicks

#### safeClick(page: Page, selector: string | Locator, options?: ClickOptions)
Performs robust clicking with retry logic and overlay interference prevention.

```typescript
import { safeClick } from '../utils/test-helpers';

// Click with automatic overlay dismissal and retry logic
await safeClick(page, 'button:has-text("Save")');
```

**Features:**
- Automatic overlay dismissal before clicking
- Retry logic with increasing delays
- Error handling and logging
- Force click options for stubborn elements

#### stableScreenshot(page: Page, options: ScreenshotOptions)
Captures consistent screenshots with proper stability measures.

```typescript
import { stableScreenshot } from '../utils/test-helpers';

// Take stable screenshot with automatic stability measures
await stableScreenshot(page, {
  name: 'component-state.png',
  maxDiffPixelRatio: 0.02,
  fullPage: true
});
```

**Features:**
- Automatic network idle waiting
- Animation completion detection
- Font loading verification
- Configurable masking options
- Automatic animation disabling

#### findBestMatch(page: Page, baseSelector: string, context?: string)
Finds the most appropriate element when multiple matches exist.

```typescript
import { findBestMatch } from '../utils/test-helpers';

// Find the best "Save" button, preferring modal context
const saveButton = await findBestMatch(page, 'button:has-text("Save")', '.modal');
```

**Features:**
- Context-aware element selection
- Visibility-based filtering
- Automatic fallback to base selector
- Logging of selection decisions

#### smartWait(page: Page, condition: () => Promise<boolean>, timeout?: number)
Performance-aware waiting that doesn't timeout too quickly.

```typescript
import { smartWait } from '../utils/test-helpers';

// Wait for condition with smart polling
await smartWait(page, async () => {
  return await page.locator('.results').count() > 0;
}, 10000);
```

**Features:**
- Non-blocking polling
- Graceful error handling
- Configurable timeouts
- Detailed logging

## Usage Patterns

### Basic Test Structure
```typescript
import { expect, test } from "@playwright/test";
import { dismissOverlays, safeClick, stableScreenshot, findBestMatch } from '../utils/test-helpers';

test.describe("Component Testing", () => {
  test("component works correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Clean up any interfering elements
    await dismissOverlays(page);

    // Interact with elements safely
    const button = await findBestMatch(page, 'button:has-text("Action")');
    await safeClick(page, button);

    // Take stable screenshot
    await stableScreenshot(page, {
      name: "component-after-action.png",
      maxDiffPixelRatio: 0.02
    });
  });
});
```

### Handling Complex Interactions
```typescript
test("complex user flow", async ({ page }) => {
  await page.goto("/");
  await dismissOverlays(page);

  // Multi-step interaction with stability
  await safeClick(page, '.search-button');
  await page.fill('input[type="search"]', "test query");
  await safeClick(page, '.search-submit');

  // Wait for results with smart timing
  await smartWait(page, async () => {
    return await page.locator('.result-item').count() > 0;
  });

  // Verify and screenshot
  await expect(page.locator('.result-item').first()).toBeVisible();
  await stableScreenshot(page, {
    name: "search-results.png"
  });
});
```

### Error Resilience
```typescript
test("handles errors gracefully", async ({ page }) => {
  try {
    await page.goto("/");
    await dismissOverlays(page);

    // Attempt interaction that might fail
    await safeClick(page, '.potentially-unstable-button');

    // Continue with test regardless of individual click success
    await stableScreenshot(page, {
      name: "error-handling.png",
      maxDiffPixelRatio: 0.1 // More tolerance for error states
    });
  } catch (error) {
    // Test utilities provide good error messages
    console.log("Test handled error:", error.message);
    // Test can continue or fail appropriately
  }
});
```

## Best Practices

### When to Use Each Utility

| Utility | Use Case | Benefits |
|---------|----------|----------|
| `dismissOverlays` | At test start, before critical interactions | Prevents overlay interference |
| `safeClick` | All button/link interactions | Prevents flaky clicks due to overlays |
| `stableScreenshot` | All screenshot capture | Consistent screenshots, automatic stability |
| `findBestMatch` | Multiple elements with same selector | Reduces test fragility |
| `smartWait` | Complex state changes | Better than hardcoded timeouts |

### Test Structure Guidelines

1. **Start with cleanup**: Always call `dismissOverlays()` after page load
2. **Use safe interactions**: Prefer `safeClick()` over direct clicking
3. **Stable screenshots**: Use `stableScreenshot()` for all visual assertions
4. **Smart waiting**: Use `smartWait()` instead of fixed timeouts where possible
5. **Robust selectors**: Use `findBestMatch()` when dealing with ambiguous selectors

### Error Handling

The utilities provide comprehensive error handling:

```typescript
// Utilities automatically log issues
await safeClick(page, selector); // Logs retry attempts and failures

// Graceful degradation for non-critical failures
try {
  await stableScreenshot(page, { name: 'optional.png' });
} catch (error) {
  console.log("Screenshot failed but test continues:", error.message);
}
```

## Configuration

### Customizing Behavior

The utilities are designed to be configurable:

```typescript
// Custom screenshot options
await stableScreenshot(page, {
  name: 'custom.png',
  maxDiffPixelRatio: 0.05, // Custom tolerance
  fullPage: false,        // Element-only screenshot
  mask: [page.locator('.dynamic-content')] // Custom masking
});

// Custom wait timeout
await smartWait(page, async () => {
  return await someCondition();
}, 20000); // 20 second custom timeout
```

### Environment Considerations

The utilities automatically adapt to different environments:

- **CI/CD**: Reduced logging, optimized performance
- **Development**: Detailed logging, debugging information
- **Headless**: Consistent behavior across browsers
- **Headed**: Visual debugging support

## Troubleshooting

### Common Issues

**Overlays not dismissed:**
```typescript
// Add custom overlay handling
await dismissOverlays(page);

// Or manually handle specific overlays
const customOverlay = page.locator('.custom-overlay');
if (await customOverlay.isVisible()) {
  await customOverlay.evaluate(el => el.style.display = 'none');
}
```

**Clicks still failing:**
```typescript
// Increase force or add custom wait
await safeClick(page, selector, { force: true, timeout: 10000 });

// Or ensure element is ready first
await page.waitForSelector(selector, { state: 'visible' });
await safeClick(page, selector);
```

**Screenshots inconsistent:**
```typescript
// Add more wait time or custom masking
await page.waitForTimeout(1000);
await stableScreenshot(page, {
  name: 'stable.png',
  mask: [page.locator('.timestamp'), page.locator('.counter')]
});
```

### Debug Mode

Enable verbose logging for troubleshooting:

```typescript
// In your test file
process.env.DEBUG_TEST_UTILS = 'true';

// Utilities will provide detailed logging
await safeClick(page, selector); // Verbose output
```

## Extending Utilities

### Adding New Helpers

Create additional utilities following the same pattern:

```typescript
// Example: New utility for form handling
export async function safeFormFill(page: Page, selector: string, value: string) {
  await dismissOverlays(page);
  const input = await findBestMatch(page, selector);
  await input.fill(value);
  // Add any additional stability measures
}
```

### Custom Overlay Handlers

Extend `dismissOverlays` for application-specific needs:

```typescript
// Add to dismissOverlays function
const overlays = [
  // Existing overlays...
  {
    locator: page.locator('.app-specific-modal'),
    buttonSelector: '.app-close-button'
  }
];
```

## Integration

### With Existing Tests

Gradually migrate existing tests to use the new utilities:

```typescript
// Before
await page.click('.button');
await expect(page).toHaveScreenshot('test.png');

// After
await safeClick(page, '.button');
await stableScreenshot(page, { name: 'test.png' });
```

### With Test Frameworks

The utilities are framework-agnostic and work with:

- Playwright Test (current)
- Jest + Playwright
- Cypress (with adaptation)
- Other testing frameworks

## Performance Impact

The utilities are designed to minimize performance overhead:

- **Lazy Loading**: Utilities only load what's needed
- **Efficient Waits**: Smart polling reduces unnecessary waits
- **Caching**: Some optimizations for repeated operations
- **Parallel Safe**: Can be used in parallel test execution

---

These utilities significantly improve test reliability while maintaining developer productivity. They address common testing pain points and provide a foundation for stable, maintainable visual tests.