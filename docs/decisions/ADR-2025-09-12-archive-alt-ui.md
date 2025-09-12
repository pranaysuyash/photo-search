# ADR: Archive alternate UIs (ModernApp, ProUI, AppWrapper)

- Date: 2025-09-12
- Status: Accepted

## Context

We created `ModernApp`/`ProUI`/`AppWrapper` to prototype motion, glassmorphism, and improved UX flows rapidly. Those patterns have since been integrated into the primary app (`App`), including framer-motion affordances and compact menu styling.

Maintaining parallel UI entry points (`?ui=new`) adds cognitive and maintenance overhead with minimal user/business value.

## Decision

- Disable the `?ui=new` route and remove `AppWrapper` from the main selector in `src/main.tsx`.
- Physically move the alternate UI files to `archive/photo-search-intent-first/webapp/`:
  - `ModernApp.tsx`
  - `ProUI.tsx`
  - `AppWrapper.tsx`
- Keep extracted patterns (styles, animation) in the main app.

## Consequences

- Single, clear UI path lowers complexity and risk of divergence.
- The archived files remain available for reference and can be restored if needed.

## How to restore (if required)

1. Move archived files back to `webapp/src` and re-add the `?ui=new` branch in `src/main.tsx`.
2. Verify no conflicting imports/styles.

