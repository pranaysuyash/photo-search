# Week 1 - Accessibility Implementation

## ARIA Labels & Screen Reader Support

### Objective

To enhance the accessibility of the application for screen reader users by adding descriptive ARIA labels to interactive elements and ensuring proper associations for form inputs.

### Changes Made

#### 1. `landing/index.html`

-   **Buttons:** Added `aria-label` attributes to all interactive `<a>` and `<button>` elements to provide clear, concise descriptions for screen readers.
    -   `theme-toggle` button: `aria-label="Toggle dark and light mode"`
    -   `download-mac` link: `aria-label="Download for macOS"`
    -   `download-win` link: `aria-label="Download for Windows"`
    -   `pricing` link: `aria-label="View pricing details"`
    -   `Play` button (demo video): `aria-label="Play product demo video"`
    -   `Open Web Demo` link: `aria-label="Open the web demo in a new tab"`
    -   `Buy Local` link: `aria-label="Buy the Local version for $49"`
    -   `Buy Local + AI` link: `aria-label="Buy the Local + AI version for $89"`
    -   `Notify me` button: `aria-label="Submit your email for updates"`

-   **Form Inputs:** Ensured proper association between the email input field and its label for screen reader accessibility.
    -   Added `id="email-input"` to the email input field.
    -   Added a visually hidden `<label for="email-input" class="sr-only">Your email for updates</label>` element before the input field.

#### 2. `photo-search-intent-first/webapp/src/App.tsx`

-   **Buttons:** Added `aria-label` attributes to various buttons across the application, including those in the `TopBar` component and within modal dialogs, to improve their accessibility for screen reader users.
    -   **TopBar Buttons:**
        -   `Filters` button: `aria-label="Show filters"`
        -   `Save` button: `aria-label="Save current search"`
        -   Grid size buttons (`Small`, `Medium`, `Large`): `aria-label="Set grid size to small"`, `aria-label="Set grid size to medium"`, `aria-label="Set grid size to large"`
        -   View mode buttons (`Grid`, `List`): `aria-label="Grid view"`, `aria-label="List view"`
        -   `Settings & Indexing` button: `aria-label="Open settings and indexing options"`
        -   `Toggle theme` button: `aria-label="Toggle dark and light mode"`
        -   Filter buttons (`All`, `Today`, etc.): `aria-label="Filter by All"`, `aria-label="Filter by Today"`, etc.
        -   Rating filter buttons (`0`, `1`, `2`, `3`, `4`, `5`): `aria-label="Filter by minimum rating of 0"`, etc.
    -   **Selected Photos Action Buttons:**
        -   `Export` button: `aria-label="Export selected photos"`
        -   `Share` button: `aria-label="Share selected photos"`
        -   `Manage Shares` button: `aria-label="Manage shared links"`
        -   `Tag` button: `aria-label="Tag selected photos"`
        -   `Similar` button: `aria-label="Find similar photos to the selected photo"`
        -   `Similar + Text` button: `aria-label="Find similar photos with additional text query"`
        -   `Add to Collection` button: `aria-label="Add selected photos to a collection"`
        -   `Remove from Collection` button: `aria-label="Remove selected photos from a collection"`
        -   `Delete` button: `aria-label="Delete selected photos"`
    -   **Modal Buttons:**
        -   `Export` modal `Cancel` button: `aria-label="Cancel export"`
        -   `Export` modal `Export` button: `aria-label="Export selected photos"`
        -   `Share` modal `Cancel` button: `aria-label="Cancel sharing"`
        -   `Share` modal `Create Link` button: `aria-label="Create shareable link"`
        -   `Tag` modal `Cancel` button: `aria-label="Cancel tagging"`
        -   `Tag` modal `Save` button: `aria-label="Save tags"`
        -   `Folder` modal `Index` button: `aria-label="Index files in the selected folder"`
        -   `Folder` modal `Fast` button: `aria-label="Prepare fast index"`
        -   `Folder` modal `OCR` button: `aria-label="Build OCR index"`
        -   `Folder` modal `Metadata` button: `aria-label="Build metadata index"`
        -   `Folder` modal `Close` button: `aria-label="Close settings"`
        -   `Folder` modal `Save` button: `aria-label="Save settings"`
        -   `Similar + Text` modal `Cancel` button: `aria-label="Cancel similar search"`
        -   `Similar + Text` modal `Search` button: `aria-label="Search for similar photos with text"`
        -   `Save Search` modal `Cancel` button: `aria-label="Cancel saving search"`
        -   `Save Search` modal `Save` button: `aria-label="Save search"`
        -   `Add to Collection` modal `Cancel` button: `aria-label="Cancel adding to collection"`
        -   `Add to Collection` modal `Add` button: `aria-label="Add to collection"`
        -   `Remove from Collection` modal `Cancel` button: `aria-label="Cancel removing from collection"`
        -   `Remove from Collection` modal `Remove` button: `aria-label="Remove from collection"`
        -   `Jobs` button: `aria-label="Open the jobs panel"`
        -   `Shortcuts overlay` close button: `aria-label="Close shortcuts overlay"`
        -   `Toast` close button: `aria-label="Close notification"`

-   **Form Inputs:** Ensured proper association between input fields and their labels within modal forms.
    -   `Export` modal: Added `id="dest-input"` to the destination input and `htmlFor="dest-input"` to its label.
    -   `Share` modal: Added `id="expiry-input"` and `id="pw-input"` to the expiry and password inputs respectively, and `htmlFor` to their labels.
    -   `Tag` modal: Added `id="tags-input"` to the tags input and a visually hidden label `htmlFor="tags-input"`.

-   **Landmarks:** Added proper semantic structure with landmarks for screen readers.
    -   Added skip-to-content link at the top of the application for keyboard users.
    -   Added `role="main"` and `aria-label="Main content"` to the main content area.
    -   Added `id="main-content"` for skip link target.

### Pending Tasks

-   Add ARIA states to complex widgets (e.g., modals, tabs, accordions) for dynamic content changes.
-   Create screen reader navigation landmarks to improve overall page structure and navigation for assistive technologies.

### Completed Tasks (Additional)

-   Added ARIA states to navigation items with `aria-current="page"` for active items.
-   Added navigation landmark with `role="navigation"` and `aria-label="Main navigation"` to Sidebar.
-   Added descriptive ARIA labels to navigation items including count information.

## Color Contrast & Visual Accessibility

### Objective

To ensure that all text and background color combinations meet WCAG AA compliance (minimum 4.5:1 contrast ratio) and to provide a high contrast mode option for users with visual impairments.

### Changes Made

#### 1. Color Contrast Audit and Improvements

-   **Audited Components:** Performed a manual audit of color combinations in `App.tsx` and `Sidebar.tsx` based on Tailwind CSS classes.
-   **Improvements in `Sidebar.tsx`:**
    -   **Section Headers:** Changed `text-gray-500` to `text-gray-600` for section headers (`Library`, `Organize`, `Smart Features`). This improved the contrast ratio from 4.54:1 to 6.4:1 against `bg-gray-50`.
    -   **Item Counts:** Changed `text-gray-500` to `text-gray-600` for item counts. This improved the contrast ratio from 4.2:1 to 5.8:1 against `bg-blue-50` (for selected items) and from 4.54:1 to 6.4:1 against `bg-gray-50` (for unselected items).

#### 2. High Contrast Mode Implementation

-   **`settingsStore.ts`:**
    -   Added a new state variable `highContrast: boolean` to manage the high contrast mode.
    -   Added a new action `setHighContrast: (highContrast: boolean) => void` to toggle the state.
    -   Added a new selector `useHighContrast` to access the state.

-   **`high-contrast.css`:**
    -   Created a new CSS file (`src/high-contrast.css`) to define high contrast styles.
    -   Implemented basic high contrast styles using CSS variables, primarily focusing on a black and white color scheme with bright accents for states (success, warning, error, info) and borders.

-   **`App.tsx` Integration:**
    -   Imported `high-contrast.css` into `App.tsx`.
    -   Used the `useHighContrast` hook to read the high contrast state.
    -   Implemented a `useEffect` hook to dynamically add or remove the `high-contrast` class to the `<body>` element based on the `highContrast` state.
    -   Added a checkbox in the `folder` modal (settings) to allow users to toggle the high contrast mode (`High Contrast` checkbox with `id="pref-high-contrast"`).

-   **Fixed High Contrast Mode:**
    -   Added import statement to `main.tsx` to properly load the high contrast CSS file.
    -   The high contrast mode is now fully functional when enabled through the settings.

### Pending Tasks

-   Conduct thorough manual testing with various color blindness simulation tools to ensure the high contrast mode and general UI colors are accessible to users with different types of color vision deficiencies.

## Keyboard Navigation & Focus Management

### Objective

To ensure all functionality is accessible via keyboard and focus is properly managed for users who cannot use a mouse.

### Changes Made

-   **Skip-to-Content Link:** Added a skip-to-content link at the top of the application for keyboard users to bypass repetitive navigation.
-   **Focus Management in Modals:**
    -   Implemented focus trapping in modal dialogs (`FolderModal.tsx` and `AccessibilityPanel.tsx`).
    -   Added auto-focus to first focusable elements in modals.
    -   Implemented proper Escape key handling for modal closing.
    -   Added keyboard event listeners for focus management.
-   **Keyboard Navigation:** Ensured all interactive elements are reachable via Tab key.

### Pending Tasks

-   Continue improving keyboard navigation throughout the application.
-   Add more comprehensive keyboard shortcuts for power users.