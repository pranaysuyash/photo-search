import { Keyboard, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { detectOS, formatShortcut } from "../utils/platform";

interface KeyboardShortcut {
  key: string;
  description: string;
  category: string;
  // Optional macOS-specific shortcut
  macShortcut?: string;
}

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define all keyboard shortcuts with categories
const shortcuts: KeyboardShortcut[] = [
  // Global shortcuts - Work everywhere in the app
  { key: "/", description: "Open search overlay", category: "Global" },
  { key: "?", description: "Show keyboard shortcuts", category: "Global" },
  { key: "I", description: "Toggle info overlay", category: "Global" },
  { key: "A", description: "Open advanced search", category: "Global" },
  { key: "mod+,", description: "Open settings", category: "Global" },
  { key: "mod+S", description: "Save current search", category: "Global" },
  { key: "mod+H", description: "Show search history", category: "Global" },

  // Navigation shortcuts - Moving between different views
  { key: "mod+K", description: "Open command palette", category: "Navigation" },
  {
    key: "mod+T",
    description: "Switch to timeline view",
    category: "Navigation",
  },
  {
    key: "mod+R",
    description: "Switch to results view",
    category: "Navigation",
  },
  {
    key: "mod+L",
    description: "Switch to library view",
    category: "Navigation",
  },
  { key: "mod+M", description: "Switch to map view", category: "Navigation" },
  {
    key: "mod+P",
    description: "Switch to people view",
    category: "Navigation",
  },
  {
    key: "mod+C",
    description: "Switch to collections view",
    category: "Navigation",
  },

  // Timeline navigation - Specific to timeline view
  { key: "T", description: "Jump to today", category: "Timeline Navigation" },
  {
    key: "M",
    description: "Jump to this month",
    category: "Timeline Navigation",
  },
  {
    key: "L",
    description: "Jump to last month",
    category: "Timeline Navigation",
  },
  { key: "O", description: "Jump to oldest", category: "Timeline Navigation" },
  { key: "N", description: "Jump to newest", category: "Timeline Navigation" },

  // Photo navigation - Moving between photos in grids/lists
  {
    key: "↑↓←→",
    description: "Navigate between photos",
    category: "Photo Navigation",
  },
  {
    key: "Home",
    description: "Jump to first photo",
    category: "Photo Navigation",
  },
  {
    key: "End",
    description: "Jump to last photo",
    category: "Photo Navigation",
  },
  {
    key: "Page Up",
    description: "Jump by 3 rows up",
    category: "Photo Navigation",
  },
  {
    key: "Page Down",
    description: "Jump by 3 rows down",
    category: "Photo Navigation",
  },
  {
    key: "Enter",
    description: "Open photo detail view",
    category: "Photo Navigation",
  },
  {
    key: "Space",
    description: "Select/deselect photo",
    category: "Photo Navigation",
  },

  // Selection operations - Working with selected photos
  {
    key: "Shift+Click",
    description: "Range select photos",
    category: "Selection",
  },
  {
    key: "Cmd+A",
    description: "Select all photos",
    category: "Selection",
    macShortcut: "⌘A",
  },
  { key: "Ctrl+A", description: "Select all photos", category: "Selection" },
  {
    key: "Cmd+C",
    description: "Copy selected photos",
    category: "Selection",
    macShortcut: "⌘C",
  },
  { key: "Ctrl+C", description: "Copy selected photos", category: "Selection" },
  {
    key: "F",
    description: "Toggle favorite for selected",
    category: "Selection",
  },
  { key: "D", description: "Delete selected photos", category: "Selection" },
  {
    key: "Escape",
    description: "Clear selection/close detail",
    category: "Selection",
  },

  // Lightbox/Detail view - Working within photo detail view
  {
    key: "←→ or J/K",
    description: "Navigate between photos",
    category: "Detail View",
  },
  { key: "F", description: "Toggle favorite", category: "Detail View" },
  { key: "I", description: "Show photo info", category: "Detail View" },
  { key: "C", description: "Add to collection", category: "Detail View" },
  { key: "T", description: "Add tags", category: "Detail View" },
  { key: "Escape", description: "Close detail view", category: "Detail View" },
  { key: "Space", description: "Zoom photo", category: "Detail View" },

  // Search operations - Working with search functionality
  {
    key: "mod+Enter",
    description: "Search in current view only",
    category: "Search",
  },
  {
    key: "Shift+Enter",
    description: "Search with exact phrase",
    category: "Search",
  },
  {
    key: "Alt+Enter",
    description: "Search with broader terms",
    category: "Search",
  },
  {
    key: "mod+Shift+F",
    description: "Search in filenames only",
    category: "Search",
  },

  // Batch operations - Working with multiple photos at once
  {
    key: "mod+B",
    description: "Batch tag selected photos",
    category: "Batch Operations",
  },
  {
    key: "mod+G",
    description: "Batch geotag selected photos",
    category: "Batch Operations",
  },
  {
    key: "mod+E",
    description: "Export selected photos",
    category: "Batch Operations",
  },

  // Collections - Working with photo collections
  {
    key: "mod+N",
    description: "Create new collection",
    category: "Collections",
  },
  {
    key: "mod+O",
    description: "Open collection manager",
    category: "Collections",
  },

  // People/Faces - Working with face recognition
  { key: "mod+F", description: "Open face recognition", category: "People" },
  { key: "mod+U", description: "Update face recognition", category: "People" },
];

// Define categories in order of importance and logical grouping
const categories = [
  "Global",
  "Navigation",
  "Search",
  "Photo Navigation",
  "Selection",
  "Detail View",
  "Timeline Navigation",
  "Collections",
  "People",
  "Batch Operations",
];

export const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [os, setOs] = useState<"macOS" | "Windows" | "Linux" | "Unknown">(
    "Unknown"
  );

  // Detect OS on mount
  useEffect(() => {
    setOs(detectOS());
  }, []);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle focus trap for accessibility
  useEffect(() => {
    if (!isOpen) return;

    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-blue-600" />
            <h2
              id="keyboard-shortcuts-title"
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close shortcuts"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Platform:</span>{" "}
              {os === "Unknown" ? "Detecting..." : os} • Modifier key:{" "}
              {os === "macOS" ? "⌘ (Cmd)" : "Ctrl"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category) => {
              const categoryShortcuts = shortcuts.filter(
                (shortcut) => shortcut.category === category
              );

              if (categoryShortcuts.length === 0) return null;

              return (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => {
                      // Use OS-specific shortcut if available
                      const displayKey =
                        os === "macOS" && shortcut.macShortcut
                          ? shortcut.macShortcut
                          : shortcut.key;

                      const formattedKey = formatShortcut(displayKey);

                      return (
                        <div
                          key={`${category}-${shortcut.key}-${index}`}
                          className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {shortcut.description}
                          </span>
                          <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs font-mono flex items-center gap-1">
                            {formattedKey.split("+").map((part, i) => (
                              <span key={i}>
                                {part.trim() === "Cmd" && os === "macOS"
                                  ? "⌘"
                                  : part.trim()}
                                {i < formattedKey.split("+").length - 1 && "+"}
                              </span>
                            ))}
                          </kbd>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips section */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Tips
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Shortcuts work when not typing in input fields</li>
              <li>
                • View-specific shortcuts only work in their respective views
              </li>
              <li>
                • Press{" "}
                <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
                  Escape
                </kbd>{" "}
                to close any overlay
              </li>
              <li>
                • Use{" "}
                <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
                  Shift+Click
                </kbd>{" "}
                for range selection
              </li>
              <li>
                • Hold{" "}
                <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
                  Alt
                </kbd>{" "}
                while dragging to pan the map view
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Press{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
              ?
            </kbd>{" "}
            anytime to reopen this help
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};
