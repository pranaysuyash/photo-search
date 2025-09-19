# Visual Testing with Playwright

This project uses Playwright for comprehensive visual testing across both the classic and intent-first webapps.

## Available Commands

### Root Level (runs tests for both webapps)

```bash
# Run visual tests and update snapshots
npm run visual

# Force-update snapshots for both webapps
npm run visual:update

# Run visual tests in CI mode (fail on changes)
npm run visual:ci

# Run visual tests for specific webapp
npm run visual:if        # intent-first webapp
npm run visual:classic   # classic webapp
```

### Intent-First Webapp

```bash
cd photo-search-intent-first/webapp

# Run all visual tests and update snapshots
npm run test:visual

# Force refresh all snapshots (use after intentional UI overhauls)
npm run test:visual:update

# Run visual tests in CI mode
npm run test:visual:ci

# Run all e2e tests (including visual)
npm run test:e2e

# Run e2e tests with UI mode
npm run test:e2e:ui

# Debug e2e tests
npm run test:e2e:debug
```

### Classic Webapp

```bash
cd archive/photo-search-classic/webapp

# Run visual tests and update snapshots
npm run test:visual

# Run visual tests in CI mode
npm run test:visual:ci
```

## Visual Test Categories

### Intent-First Webapp Tests

- **First Run Modal**: Tests the initial onboarding experience
- **Indexed Chip**: Tests the photo indexing status indicator
- **Search Interface**: Tests search bar and results layout
- **Responsive Design**: Tests layout across desktop, tablet, and mobile viewports

### Classic Webapp Tests

- **Main Interface**: Tests the primary application layout
- **Search Functionality**: Tests search-related UI components

## How Visual Testing Works

1. **Screenshot Capture**: Playwright takes screenshots of specific UI elements or full pages
2. **Snapshot Comparison**: Screenshots are compared against previously approved snapshots
3. **Difference Detection**: Any visual differences are flagged for review
4. **CI Integration**: Tests can fail in CI if unexpected visual changes occur

## Best Practices

### When to Update Snapshots

- After intentional UI changes
- When adding new features that change appearance
- When fixing layout or styling issues

### When NOT to Update Snapshots

- For minor pixel differences due to environment changes
- For dynamic content that changes frequently
- For animations or transitions

### Masking Dynamic Content

Use the `mask` option to hide dynamic elements:

```typescript
await expect(page).toHaveScreenshot("component.png", {
  mask: [page.locator(".dynamic-timestamp"), page.locator(".random-id")],
});
```

### Handling Different Viewports

Test across multiple screen sizes:

```typescript
test.use({ viewport: { width: 375, height: 667 } }); // Mobile
test.use({ viewport: { width: 768, height: 1024 } }); // Tablet
test.use({ viewport: { width: 1920, height: 1080 } }); // Desktop
```

## Configuration

Visual testing is configured in `playwright.config.ts` with:

- Screenshot capture on failure
- Video recording on failure
- Multiple browser support (Chrome, Firefox, Safari)
- Mobile device emulation
- Automatic dev server startup

## Troubleshooting

### Common Issues

1. **Flaky Tests**: Use `maxDiffPixelRatio` to allow small differences
2. **Dynamic Content**: Mask or wait for content to stabilize
3. **Loading States**: Wait for `networkidle` or specific elements
4. **Animations**: Disable animations or wait for them to complete

### Debug Mode

```bash
npm run test:e2e:debug  # Opens browser with DevTools
npm run test:e2e:ui     # Opens Playwright UI for test selection
```

## CI/CD Integration

For CI environments:

1. Install browsers: `npx playwright install`
2. Run tests: `npm run visual:ci`
3. Review any visual differences in test reports
4. Update snapshots if changes are expected

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

Reports include:

- Test results
- Screenshots of failures
- Visual diff comparisons
- Trace files for debugging
