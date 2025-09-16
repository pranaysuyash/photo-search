# Electron App Integration Test Plan

## Overview

This document outlines a comprehensive, step-by-step integration test plan for the Electron-based Photo Search application, starting from the Electron entry point and covering all major dependencies and flows. The plan is designed for a test engineer to follow and validate the end-to-end functionality of the application, including backend, frontend, IPC, and UI integration.

---

## 1. Preparation

### 1.1. Environment Setup

- Ensure Node.js, npm, and Python (with venv) are installed.
- Install all dependencies:
  - `cd photo-search-intent-first/webapp && npm install`
  - `cd .. && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Build the frontend:
  - `cd webapp && npm run build`

### 1.2. Tools

- Use Playwright for E2E and visual tests (already configured in `webapp/tests/`).
- Use Spectron or Playwright Electron for Electron-level integration (if available).
- Use Vitest for frontend integration/unit tests.

---

## 2. Electron Entry Point (main.js)

### 2.1. Startup Sequence

- Launch the Electron app via `electron .` or the appropriate npm script.
- Verify:
  - The main window is created and not shown until ready.
  - The splash screen (`splash.html`) is loaded initially.
  - The backend API server is started if not already running.
  - The correct UI target is determined (dev server, built UI, or fallback).

### 2.2. IPC and Protocols

- Test IPC handlers:
  - `select-folder` opens a folder dialog and returns the selected path.
  - `get-api-token` returns a valid token.
  - `set-allowed-root` sets the allowed root for the custom protocol.
- Test custom `app://` protocol:
  - Files are served only from allowed roots in production.
  - Invalid or out-of-root requests are denied.

### 2.3. Menu and License

- Test application menu actions:
  - "Check for Updates" triggers update check.
  - "Manage License" opens file dialog and applies license.
- Test license logic:
  - Valid and invalid license files are handled correctly.
  - Signature verification works (simulate with test keys if needed).

---

## 3. Backend API Integration (api/server.py)

### 3.1. API Startup

- Confirm the Electron app starts the API server if not running.
- Confirm the API is reachable at `http://127.0.0.1:8000`.

### 3.2. API Endpoints

- Test `/docs` endpoint for health check.
- Test `/search` and other business endpoints for correct responses.
- Simulate API errors and confirm Electron app handles them gracefully.

---

## 4. Preload Script (preload.js)

### 4.1. Context Bridge

- Verify `electronAPI` is exposed in the renderer process.
- Test all exposed methods:
  - `selectFolder()` opens dialog and returns path.
  - `getApiToken()` returns token.
  - `setAllowedRoot(p)` sets protocol root.

---

## 5. Frontend Integration (webapp/src/)

### 5.1. App Boot

- Confirm the frontend loads in the Electron window (dev, built, or fallback).
- Test that the splash screen is replaced by the main UI.

### 5.2. UI Functionality

- Use Playwright to:
  - Test onboarding flows (`onboarding.e2e.test.ts`).
  - Test search, navigation, and error handling.
  - Test visual regressions (`tests/visual/`).

### 5.3. State and IPC

- Confirm frontend can call `electronAPI` methods and receive correct results.
- Test state persistence and error boundaries.

---

## 6. Visual and E2E Testing

### 6.1. Visual Regression

- Run all tests in `tests/visual/` and review snapshots.
- Confirm UI matches expected appearance across flows.

### 6.2. End-to-End

- Run all E2E tests in `tests/` and `src/` (e.g., onboarding, search, error cases).
- Confirm all major user flows work as expected.

---

## 7. Error and Edge Case Handling

- Simulate API failures, missing files, and invalid user actions.
- Confirm the app shows appropriate error messages and recovers gracefully.

---

## 8. Reporting

- Document all test results, failures, and issues found.
- File bugs or tasks for any integration issues.

---

## 9. Automation

- Integrate all tests into CI/CD pipeline if not already present.
- Ensure tests run on every build and before releases.

---

## References

- See `photo-search-intent-first/webapp/tests/` for Playwright and visual test examples.
- See `electron/main.js` for startup and integration logic.
- See `api/server.py` for backend API endpoints.

---

This plan ensures all integration points from the Electron entry to the backend, frontend, and UI are thoroughly tested, providing confidence in the application's end-to-end functionality.
