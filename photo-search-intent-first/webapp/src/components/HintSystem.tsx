import React, { useState, useEffect, useContext, createContext } from "react";
import { ContextualHint } from "./OnboardingTour";
import { useAccessibilitySettings } from "./AccessibilityPanel";

interface HintContextType {
  showHint: (hint: Omit<HintConfig, "id"> & { id: string }) => void;
  dismissHint: (id: string) => void;
  clearAllHints: () => void;
  activeHints: HintConfig[];
}

interface HintConfig {
  id: string;
  message: string;
  action?: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  target?: string;
  priority: "low" | "medium" | "high";
  autoHide?: number;
  condition?: () => boolean;
  trigger?: string; // User action that triggers this hint
}

const HintContext = createContext<HintContextType | null>(null);

export function HintProvider({ children }: { children: React.ReactNode }) {
  const [activeHints, setActiveHints] = useState<HintConfig[]>([]);
  const { settings } = useAccessibilitySettings();

  const showHint = (hint: HintConfig) => {
    // Don't show hints if reduced motion is enabled and it's not critical
    if (settings.reducedMotion && hint.priority !== "high") return;

    // Check if hint condition is met
    if (hint.condition && !hint.condition()) return;

    // Remove existing hint with same ID
    setActiveHints((prev) => prev.filter((h) => h.id !== hint.id));

    // Add new hint
    setActiveHints((prev) => [...prev, hint]);

    // Auto-hide if specified
    if (hint.autoHide) {
      setTimeout(() => {
        dismissHint(hint.id);
      }, hint.autoHide * 1000);
    }
  };

  const dismissHint = (id: string) => {
    setActiveHints((prev) => prev.filter((hint) => hint.id !== id));
  };

  const clearAllHints = () => {
    setActiveHints([]);
  };

  // Sort hints by priority
  const sortedHints = activeHints.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  // Only show the highest priority hint
  const visibleHint = sortedHints[0];

  return (
    <HintContext.Provider
      value={{ showHint, dismissHint, clearAllHints, activeHints }}
    >
      {children}
      {visibleHint && (
        <ContextualHint
          message={visibleHint.message}
          action={visibleHint.action}
          position={visibleHint.position}
          target={visibleHint.target}
          onDismiss={() => dismissHint(visibleHint.id)}
          autoHide={visibleHint.autoHide}
        />
      )}
    </HintContext.Provider>
  );
}

export function useHints() {
  const context = useContext(HintContext);
  if (!context) {
    throw new Error("useHints must be used within a HintProvider");
  }
  return context;
}

// Predefined hint configurations
export const HINTS = {
  FIRST_SEARCH: {
    id: "first-search",
    message:
      'Try searching for "beach" or "mountains" to see AI-powered search in action!',
    action: "Click here or press Ctrl+K to search",
    position: "bottom" as const,
    target: '[data-tour="search-bar"]',
    priority: "high" as const,
    autoHide: 10,
  },

  UPLOAD_PHOTOS: {
    id: "upload-photos",
    message:
      "Ready to add your photos? Drag and drop files here or click to browse.",
    action: "Supported: JPG, PNG, GIF, WebP, HEIC",
    position: "top" as const,
    target: '[data-tour="upload-button"]',
    priority: "medium" as const,
    autoHide: 15,
  },

  EMPTY_LIBRARY: {
    id: "empty-library",
    message:
      "Your photo library is empty. Let's add some photos to get started!",
    action: "Click the upload button above",
    position: "center" as const,
    priority: "high" as const,
    condition: () => {
      // Check if library is empty
      const libraryState = localStorage.getItem("photo-library-state");
      if (!libraryState) return true;
      try {
        const state = JSON.parse(libraryState);
        return !state.photos || state.photos.length === 0;
      } catch {
        return true;
      }
    },
  },

  ADVANCED_SEARCH: {
    id: "advanced-search",
    message:
      'Try advanced search queries like "sunset with people" or "red car in city"',
    position: "bottom" as const,
    target: '[data-tour="search-bar"]',
    priority: "low" as const,
    trigger: "search-success",
    autoHide: 8,
  },

  BULK_SELECT: {
    id: "bulk-select",
    message: "Select multiple photos by holding Ctrl and clicking",
    action: "Or press Ctrl+A to select all",
    position: "top" as const,
    priority: "low" as const,
    trigger: "photo-selected",
    autoHide: 6,
  },

  ORGANIZE_FOLDERS: {
    id: "organize-folders",
    message:
      "Create folders to organize your photos by events, dates, or themes",
    position: "right" as const,
    target: '[data-tour="sidebar"]',
    priority: "medium" as const,
    trigger: "photos-uploaded",
    autoHide: 12,
  },

  KEYBOARD_SHORTCUTS: {
    id: "keyboard-shortcuts",
    message: "Use keyboard shortcuts for faster navigation",
    action: "Press Ctrl+K for search, Ctrl+B for sidebar",
    position: "center" as const,
    priority: "low" as const,
    trigger: "multiple-actions",
    autoHide: 10,
  },

  EXPORT_PHOTOS: {
    id: "export-photos",
    message: "Export selected photos in different formats and sizes",
    position: "left" as const,
    priority: "low" as const,
    trigger: "photos-selected",
    autoHide: 8,
  },

  SHARE_PHOTOS: {
    id: "share-photos",
    message: "Share photos directly from the app with customizable links",
    position: "left" as const,
    priority: "low" as const,
    trigger: "photos-selected",
    autoHide: 8,
  },
};

// Hook for triggering hints based on user actions
export function useHintTriggers() {
  const { showHint } = useHints();

  const triggerHint = (action: string, context?: any) => {
    switch (action) {
      case "app-loaded":
        // Show welcome hint after a short delay
        setTimeout(() => {
          showHint(HINTS.FIRST_SEARCH);
        }, 2000);
        break;

      case "library-empty":
        showHint(HINTS.EMPTY_LIBRARY);
        break;

      case "photos-uploaded":
        showHint(HINTS.ORGANIZE_FOLDERS);
        break;

      case "search-success":
        // Show advanced search hint after successful search
        setTimeout(() => {
          showHint(HINTS.ADVANCED_SEARCH);
        }, 3000);
        break;

      case "photo-selected":
        showHint(HINTS.BULK_SELECT);
        break;

      case "multiple-photos-selected":
        showHint(HINTS.EXPORT_PHOTOS);
        setTimeout(() => {
          showHint(HINTS.SHARE_PHOTOS);
        }, 2000);
        break;

      case "keyboard-shortcut-used":
        showHint(HINTS.KEYBOARD_SHORTCUTS);
        break;

      default:
        break;
    }
  };

  return { triggerHint };
}

// Component for managing hint triggers based on app state
export function HintManager({ children }: { children: React.ReactNode }) {
  const { triggerHint } = useHintTriggers();

  useEffect(() => {
    // Trigger initial hints
    triggerHint("app-loaded");

    // Listen for custom events
    const handlePhotoUpload = () => triggerHint("photos-uploaded");
    const handleSearchSuccess = () => triggerHint("search-success");
    const handlePhotoSelect = () => triggerHint("photo-selected");
    const handleMultipleSelect = () => triggerHint("multiple-photos-selected");
    const handleKeyboardShortcut = () => triggerHint("keyboard-shortcut-used");

    document.addEventListener("photo-uploaded", handlePhotoUpload);
    document.addEventListener("search-success", handleSearchSuccess);
    document.addEventListener("photo-selected", handlePhotoSelect);
    document.addEventListener("multiple-photos-selected", handleMultipleSelect);
    document.addEventListener("keyboard-shortcut-used", handleKeyboardShortcut);

    return () => {
      document.removeEventListener("photo-uploaded", handlePhotoUpload);
      document.removeEventListener("search-success", handleSearchSuccess);
      document.removeEventListener("photo-selected", handlePhotoSelect);
      document.removeEventListener(
        "multiple-photos-selected",
        handleMultipleSelect
      );
      document.removeEventListener(
        "keyboard-shortcut-used",
        handleKeyboardShortcut
      );
    };
  }, [triggerHint]);

  return <>{children}</>;
}

// Progress tracking for user onboarding
export function useOnboardingProgress() {
  const [progress, setProgress] = useState({
    hasSearched: false,
    hasUploadedPhotos: false,
    hasCreatedFolder: false,
    hasUsedKeyboardShortcut: false,
    hasExportedPhotos: false,
    hasSharedPhotos: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem("onboarding-progress");
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to parse onboarding progress:", e);
      }
    }
  }, []);

  const updateProgress = (key: keyof typeof progress, value: boolean) => {
    const newProgress = { ...progress, [key]: value };
    setProgress(newProgress);
    localStorage.setItem("onboarding-progress", JSON.stringify(newProgress));
  };

  const getCompletionPercentage = () => {
    const total = Object.keys(progress).length;
    const completed = Object.values(progress).filter(Boolean).length;
    return Math.round((completed / total) * 100);
  };

  const getNextSteps = () => {
    const steps = [];
    if (!progress.hasUploadedPhotos) {
      steps.push("Upload your first photos");
    }
    if (!progress.hasSearched) {
      steps.push("Try searching for photos");
    }
    if (!progress.hasCreatedFolder) {
      steps.push("Create a folder to organize photos");
    }
    if (!progress.hasUsedKeyboardShortcut) {
      steps.push("Use a keyboard shortcut");
    }
    return steps.slice(0, 3); // Show max 3 next steps
  };

  return {
    progress,
    updateProgress,
    getCompletionPercentage,
    getNextSteps,
  };
}
