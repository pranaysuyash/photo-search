/**
 * AccessibilityDemo - Comprehensive demo of accessibility features
 * This component demonstrates all the accessibility features implemented in the framework.
 */
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AccessibilitySettings } from "../framework/AccessibilityFramework";
import {
  useAccessibilityContext,
  useAriaAttributes,
  useFocusManager,
  useHighContrast,
  useKeyboardNavigation,
  useLandmarkNavigation,
  useReducedMotion,
  useSkipLinks,
} from "../framework/AccessibilityFramework";

// Accessibility demo component
const AccessibilityDemo: React.FC = () => {
  // State
  const [testMessage, setTestMessage] = useState("");
  const [testProgress, setTestProgress] = useState(0);
  const [testError, setTestError] = useState("");
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Accessibility hooks
  const {
    settings,
    updateSettings,
    announce,
    announceAction,
    announceProgress,
    announceError,
    announceSuccess,
    announceWarning,
    announceInfo,
  } = useAccessibilityContext();

  const { focusNext, focusPrevious, focusFirst, focusLast } = useFocusManager();

  const {
    enableKeyboardNavigation,
    disableKeyboardNavigation,
    isKeyboardNavigationEnabled,
  } = useKeyboardNavigation();

  const { isHighContrast, toggleHighContrast } = useHighContrast();
  const { isReducedMotion, toggleReducedMotion } = useReducedMotion();
  const { skipToMainContent, skipToSearch, skipToNavigation } = useSkipLinks();
  const { goToLandmark } = useLandmarkNavigation();
  const { getAriaAttributes } = useAriaAttributes();

  // Handle settings change
  const handleSettingsChange = (
    newSettings: Partial<AccessibilitySettings>
  ) => {
    updateSettings(newSettings);
    announce("Accessibility settings updated", "polite");
  };

  // Test announcements
  const testAnnouncement = () => {
    if (testMessage.trim()) {
      announce(testMessage, "polite");
      setTestMessage("");
    }
  };

  const testActionAnnouncement = () => {
    announceAction("Test action", "started");
    setTimeout(() => {
      announceAction("Test action", "completed");
    }, 2000);
  };

  const testProgressAnnouncement = () => {
    if (testProgress > 0) {
      announceProgress(testProgress, 100, "Test progress");
      setTestProgress(0);
    }
  };

  const testErrorAnnouncement = () => {
    if (testError.trim()) {
      announceError(testError, "Test error");
      setTestError("");
    }
  };

  const testSuccessAnnouncement = () => {
    announceSuccess("Operation completed successfully!");
  };

  const testWarningAnnouncement = () => {
    announceWarning("This is a warning message.");
  };

  const testInfoAnnouncement = () => {
    announceInfo("This is an informational message.");
  };

  // Focus management
  const handleFocusNext = useCallback(() => {
    focusNext();
    announce("Focused on next element", "polite");
  }, [focusNext, announce]);

  const handleFocusPrevious = useCallback(() => {
    focusPrevious();
    announce("Focused on previous element", "polite");
  }, [focusPrevious, announce]);

  const handleFocusFirst = useCallback(() => {
    focusFirst();
    announce("Focused on first element", "polite");
  }, [focusFirst, announce]);

  const handleFocusLast = useCallback(() => {
    focusLast();
    announce("Focused on last element", "polite");
  }, [focusLast, announce]);

  // Keyboard navigation
  const handleEnableKeyboardNavigation = useCallback(() => {
    enableKeyboardNavigation();
    announce("Keyboard navigation enabled", "polite");
  }, [enableKeyboardNavigation, announce]);

  const handleDisableKeyboardNavigation = useCallback(() => {
    disableKeyboardNavigation();
    announce("Keyboard navigation disabled", "polite");
  }, [disableKeyboardNavigation, announce]);

  // High contrast mode
  const handleToggleHighContrast = useCallback(() => {
    toggleHighContrast();
    announce(
      isHighContrast
        ? "High contrast mode disabled"
        : "High contrast mode enabled",
      "polite"
    );
  }, [toggleHighContrast, isHighContrast, announce]);

  // Reduced motion
  const handleToggleReducedMotion = useCallback(() => {
    toggleReducedMotion();
    announce(
      isReducedMotion ? "Reduced motion disabled" : "Reduced motion enabled",
      "polite"
    );
  }, [toggleReducedMotion, isReducedMotion, announce]);

  // Skip links
  const handleSkipToMainContent = useCallback(() => {
    skipToMainContent();
    announce("Skipped to main content", "polite");
  }, [skipToMainContent, announce]);

  const handleSkipToSearch = useCallback(() => {
    skipToSearch();
    announce("Skipped to search", "polite");
  }, [skipToSearch, announce]);

  const handleSkipToNavigation = useCallback(() => {
    skipToNavigation();
    announce("Skipped to navigation", "polite");
  }, [skipToNavigation, announce]);

  // Landmark navigation
  const handleGoToLandmark = useCallback(
    (
      landmark:
        | "main"
        | "navigation"
        | "search"
        | "banner"
        | "contentinfo"
        | "complementary"
        | "region"
    ) => {
      goToLandmark(landmark);
      announce(`Navigated to ${landmark}`, "polite");
    },
    [goToLandmark, announce]
  );

  // Demo sequence
  const runDemoSequence = useCallback(async () => {
    if (isDemoRunning) return;

    setIsDemoRunning(true);
    setDemoStep(0);

    // Step 1: Announcements
    announce("Starting accessibility demo sequence", "polite");
    setDemoStep(1);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: Action announcements
    announceAction("Demo sequence", "started");
    setDemoStep(2);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 3: Progress announcements
    for (let i = 0; i <= 100; i += 20) {
      announceProgress(i, 100, "Demo sequence");
      setDemoStep(3);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Step 4: Success announcement
    announceAction("Demo sequence", "completed");
    announceSuccess("Demo sequence completed successfully!");
    setDemoStep(4);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 5: Focus management
    announce("Testing focus management", "polite");
    setDemoStep(5);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 6: Keyboard navigation
    announce("Testing keyboard navigation", "polite");
    setDemoStep(6);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 7: High contrast mode
    announce("Testing high contrast mode", "polite");
    setDemoStep(7);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 8: Reduced motion
    announce("Testing reduced motion", "polite");
    setDemoStep(8);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 9: Skip links
    announce("Testing skip links", "polite");
    setDemoStep(9);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 10: Landmark navigation
    announce("Testing landmark navigation", "polite");
    setDemoStep(10);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 11: ARIA attributes
    announce("Testing ARIA attributes", "polite");
    setDemoStep(11);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 12: Demo complete
    announce("Accessibility demo sequence complete", "polite");
    setDemoStep(12);
    setIsDemoRunning(false);
  }, [
    isDemoRunning,
    announce,
    announceAction,
    announceProgress,
    announceSuccess,
  ]);

  // Stop demo sequence
  const stopDemoSequence = useCallback(() => {
    setIsDemoRunning(false);
    setDemoStep(0);
    announce("Demo sequence stopped", "polite");
  }, [announce]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Alt+A - Toggle accessibility settings panel
      if (e.ctrlKey && e.altKey && e.key === "a") {
        e.preventDefault();
        setShowSettings(!showSettings);
        announce(
          showSettings
            ? "Accessibility settings panel closed"
            : "Accessibility settings panel opened",
          "polite"
        );
      }

      // Ctrl+Alt+D - Run demo sequence
      if (e.ctrlKey && e.altKey && e.key === "d") {
        e.preventDefault();
        if (isDemoRunning) {
          stopDemoSequence();
        } else {
          runDemoSequence();
        }
      }

      // Ctrl+Alt+S - Skip to main content
      if (e.ctrlKey && e.altKey && e.key === "s") {
        e.preventDefault();
        handleSkipToMainContent();
      }

      // Ctrl+Alt+N - Skip to navigation
      if (e.ctrlKey && e.altKey && e.key === "n") {
        e.preventDefault();
        handleSkipToNavigation();
      }

      // Ctrl+Alt+F - Skip to search
      if (e.ctrlKey && e.altKey && e.key === "f") {
        e.preventDefault();
        handleSkipToSearch();
      }

      // Ctrl+Alt+H - Toggle high contrast
      if (e.ctrlKey && e.altKey && e.key === "h") {
        e.preventDefault();
        handleToggleHighContrast();
      }

      // Ctrl+Alt+R - Toggle reduced motion
      if (e.ctrlKey && e.altKey && e.key === "r") {
        e.preventDefault();
        handleToggleReducedMotion();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    showSettings,
    isDemoRunning,
    announce,
    handleSkipToMainContent,
    handleSkipToNavigation,
    handleSkipToSearch,
    handleToggleHighContrast,
    handleToggleReducedMotion,
    runDemoSequence,
    stopDemoSequence,
  ]);

  // Initialize accessibility features
  useEffect(() => {
    // Enable keyboard navigation by default
    enableKeyboardNavigation();

    // Announce initialization
    announce("Accessibility demo initialized", "polite");

    return () => {
      disableKeyboardNavigation();
    };
  }, [enableKeyboardNavigation, disableKeyboardNavigation, announce]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header
        {...getAriaAttributes("banner")}
        className="bg-white p-6 rounded-lg shadow"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Accessibility Demo
            </h1>
            <p className="mt-2 text-gray-600">
              Demonstrates comprehensive accessibility features including screen
              reader support, keyboard navigation, and ARIA compliance.
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              aria-label={
                showSettings
                  ? "Close accessibility settings"
                  : "Open accessibility settings"
              }
              aria-expanded={showSettings}
              aria-controls="accessibility-settings-panel"
            >
              {showSettings ? "Close Settings" : "Open Settings"}
            </button>

            <button
              type="button"
              onClick={isDemoRunning ? stopDemoSequence : runDemoSequence}
              disabled={isDemoRunning && demoStep > 0}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isDemoRunning
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              aria-label={
                isDemoRunning ? "Stop demo sequence" : "Run demo sequence"
              }
            >
              {isDemoRunning ? "Stop Demo" : "Run Demo"}
            </button>
          </div>
        </div>

        {isDemoRunning && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="flex items-center">
              <div className="flex-1">
                <div className="flex justify-between text-sm text-blue-700">
                  <span>Demo in progress...</span>
                  <span>Step {demoStep} of 12</span>
                </div>
                <div className="mt-1 w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(demoStep / 12) * 100}%` }}
                  ></div>
                </div>
              </div>
              <button
                type="button"
                onClick={stopDemoSequence}
                className="ml-4 px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                aria-label="Stop demo"
              >
                Stop
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Accessibility Settings Panel */}
      {showSettings && (
        <section
          id="accessibility-settings-panel"
          className="bg-white p-6 rounded-lg shadow"
          {...getAriaAttributes("region")}
          aria-label="Accessibility Settings"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Accessibility Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Display Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Display
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    High Contrast
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleHighContrast}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      isHighContrast ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={isHighContrast}
                    aria-label="Toggle high contrast mode"
                  >
                    <span className="sr-only">Toggle high contrast</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isHighContrast ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Reduced Motion
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleReducedMotion}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      isReducedMotion ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={isReducedMotion}
                    aria-label="Toggle reduced motion"
                  >
                    <span className="sr-only">Toggle reduced motion</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isReducedMotion ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Large Text
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleSettingsChange({ largeText: !settings.largeText })
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      settings.largeText ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={settings.largeText}
                    aria-label="Toggle large text"
                  >
                    <span className="sr-only">Toggle large text</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.largeText ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Dyslexia Friendly
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleSettingsChange({
                        dyslexiaFriendly: !settings.dyslexiaFriendly,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      settings.dyslexiaFriendly
                        ? "bg-indigo-600"
                        : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={settings.dyslexiaFriendly}
                    aria-label="Toggle dyslexia friendly mode"
                  >
                    <span className="sr-only">Toggle dyslexia friendly</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.dyslexiaFriendly
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Navigation
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Keyboard Navigation
                  </span>
                  <button
                    type="button"
                    onClick={
                      isKeyboardNavigationEnabled
                        ? handleDisableKeyboardNavigation
                        : handleEnableKeyboardNavigation
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      isKeyboardNavigationEnabled
                        ? "bg-indigo-600"
                        : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={isKeyboardNavigationEnabled}
                    aria-label="Toggle keyboard navigation"
                  >
                    <span className="sr-only">Toggle keyboard navigation</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isKeyboardNavigationEnabled
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Screen Reader Mode
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleSettingsChange({
                        screenReaderMode: !settings.screenReaderMode,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      settings.screenReaderMode
                        ? "bg-indigo-600"
                        : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={settings.screenReaderMode}
                    aria-label="Toggle screen reader mode"
                  >
                    <span className="sr-only">Toggle screen reader mode</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.screenReaderMode
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Skip Links
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSkipToMainContent}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Skip to main content"
                    >
                      Main Content
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipToSearch}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Skip to search"
                    >
                      Search
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipToNavigation}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Skip to navigation"
                    >
                      Navigation
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Landmark Navigation
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleGoToLandmark("main")}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Go to main content"
                    >
                      Main
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGoToLandmark("navigation")}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Go to navigation"
                    >
                      Navigation
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGoToLandmark("search")}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Go to search"
                    >
                      Search
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGoToLandmark("banner")}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Go to banner"
                    >
                      Banner
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGoToLandmark("contentinfo")}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Go to content information"
                    >
                      Footer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Focus Management */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Focus Management
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Focus Navigation
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleFocusFirst}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Focus first element"
                    >
                      First
                    </button>
                    <button
                      type="button"
                      onClick={handleFocusPrevious}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Focus previous element"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={handleFocusNext}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Focus next element"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={handleFocusLast}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Focus last element"
                    >
                      Last
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Keyboard Shortcuts
                  </h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      <kbd className="px-1 py-0.5 bg-gray-100 rounded">
                        Ctrl+Alt+A
                      </kbd>{" "}
                      Toggle settings
                    </p>
                    <p>
                      <kbd className="px-1 py-0.5 bg-gray-100 rounded">
                        Ctrl+Alt+D
                      </kbd>{" "}
                      Run demo
                    </p>
                    <p>
                      <kbd className="px-1 py-0.5 bg-gray-100 rounded">
                        Ctrl+Alt+S
                      </kbd>{" "}
                      Skip to main
                    </p>
                    <p>
                      <kbd className="px-1 py-0.5 bg-gray-100 rounded">
                        Ctrl+Alt+N
                      </kbd>{" "}
                      Skip to nav
                    </p>
                    <p>
                      <kbd className="px-1 py-0.5 bg-gray-100 rounded">
                        Ctrl+Alt+F
                      </kbd>{" "}
                      Skip to search
                    </p>
                    <p>
                      <kbd className="px-1 py-0.5 bg-gray-100 rounded">
                        Ctrl+Alt+H
                      </kbd>{" "}
                      Toggle high contrast
                    </p>
                    <p>
                      <kbd className="px-1 py-0.5 bg-gray-100 rounded">
                        Ctrl+Alt+R
                      </kbd>{" "}
                      Toggle reduced motion
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search Demo */}
      <section
        ref={searchInputRef}
        id="search-demo"
        className="bg-white p-6 rounded-lg shadow"
        {...getAriaAttributes("search")}
        aria-label="Search Demo"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Accessible Search
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="search-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Search Photos
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="search"
                id="search-input"
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 py-3 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search your photo library..."
                aria-describedby="search-description"
                aria-autocomplete="list"
                aria-controls="search-suggestions"
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <button
                  type="button"
                  className="mr-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full"
                  aria-label="Clear search"
                >
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <p id="search-description" className="mt-1 text-sm text-gray-500">
              Enter keywords to search your photo library. Press Enter to submit
              search.
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              aria-label="Search"
            >
              Search
            </button>

            <button
              type="button"
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              aria-label="Advanced search"
            >
              Advanced Search
            </button>
          </div>
        </div>
      </section>

      {/* Announcement Testing */}
      <section
        className="bg-white p-6 rounded-lg shadow"
        {...getAriaAttributes("region")}
        aria-label="Announcement Testing"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Test Announcements
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Custom Announcement */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Custom Announcement
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="test-message"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Message
                </label>
                <div className="flex rounded-md shadow-sm">
                  <input
                    type="text"
                    id="test-message"
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
                    placeholder="Enter test message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    aria-label="Test message input"
                  />
                  <button
                    type="button"
                    className="-ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    onClick={testAnnouncement}
                    aria-label="Announce message"
                  >
                    Announce
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={testActionAnnouncement}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  aria-label="Test action announcement"
                >
                  Test Action
                </button>

                <button
                  type="button"
                  onClick={testSuccessAnnouncement}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  aria-label="Test success announcement"
                >
                  Test Success
                </button>

                <button
                  type="button"
                  onClick={testWarningAnnouncement}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  aria-label="Test warning announcement"
                >
                  Test Warning
                </button>

                <button
                  type="button"
                  onClick={testInfoAnnouncement}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  aria-label="Test info announcement"
                >
                  Test Info
                </button>
              </div>
            </div>
          </div>

          {/* Progress and Error Testing */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Progress & Error Testing
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="test-progress"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Progress (%)
                </label>
                <div className="flex rounded-md shadow-sm">
                  <input
                    type="number"
                    id="test-progress"
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
                    placeholder="Enter progress percentage"
                    min="0"
                    max="100"
                    value={testProgress || ""}
                    onChange={(e) => setTestProgress(Number(e.target.value))}
                    aria-label="Test progress input"
                  />
                  <button
                    type="button"
                    className="-ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    onClick={testProgressAnnouncement}
                    aria-label="Announce progress"
                  >
                    Announce
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="test-error"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Error Message
                </label>
                <div className="flex rounded-md shadow-sm">
                  <input
                    type="text"
                    id="test-error"
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
                    placeholder="Enter test error message"
                    value={testError}
                    onChange={(e) => setTestError(e.target.value)}
                    aria-label="Test error input"
                  />
                  <button
                    type="button"
                    className="-ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    onClick={testErrorAnnouncement}
                    aria-label="Announce error"
                  >
                    Announce
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form Controls Demo */}
      <section
        className="bg-white p-6 rounded-lg shadow"
        {...getAriaAttributes("region")}
        aria-label="Form Controls Demo"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Accessible Form Controls
        </h2>

        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Text Input */}
            <div>
              <label
                htmlFor="demo-input"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Text Input
              </label>
              <input
                type="text"
                id="demo-input"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Type something..."
                aria-describedby="input-help"
                {...getAriaAttributes("input")}
              />
              <p id="input-help" className="mt-1 text-sm text-gray-500">
                This is a help text for the input field.
              </p>
            </div>

            {/* Select Dropdown */}
            <div>
              <label
                htmlFor="demo-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Dropdown
              </label>
              <select
                id="demo-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                aria-label="Demo select"
                {...getAriaAttributes("select")}
              >
                <option value="">Choose an option...</option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
              </select>
            </div>

            {/* Checkbox */}
            <div>
              <div className="flex items-center">
                <input
                  id="demo-checkbox"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  aria-label="Demo checkbox"
                  {...getAriaAttributes("checkbox")}
                />
                <label
                  htmlFor="demo-checkbox"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Checkbox Option
                </label>
              </div>
            </div>

            {/* Radio Group */}
            <fieldset>
              <legend className="text-sm font-medium text-gray-700 mb-2">
                Radio Group
              </legend>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="radio-option-1"
                    name="radio-group"
                    type="radio"
                    value="option1"
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    aria-label="Option 1"
                    {...getAriaAttributes("radio")}
                  />
                  <label
                    htmlFor="radio-option-1"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Option 1
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="radio-option-2"
                    name="radio-group"
                    type="radio"
                    value="option2"
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    aria-label="Option 2"
                    {...getAriaAttributes("radio")}
                  />
                  <label
                    htmlFor="radio-option-2"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Option 2
                  </label>
                </div>
              </div>
            </fieldset>

            {/* Text Area */}
            <div className="md:col-span-2">
              <label
                htmlFor="demo-textarea"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Text Area
              </label>
              <textarea
                id="demo-textarea"
                rows={3}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                placeholder="Type some text here..."
                aria-label="Demo text area"
                {...getAriaAttributes("textarea")}
              />
            </div>
          </div>

          {/* Form Buttons */}
          <div className="flex space-x-3">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              {...getAriaAttributes("button")}
            >
              Submit Form
            </button>

            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              {...getAriaAttributes("button")}
            >
              Reset Form
            </button>
          </div>
        </form>
      </section>

      {/* Keyboard Navigation Demo */}
      <section
        className="bg-white p-6 rounded-lg shadow"
        {...getAriaAttributes("region")}
        aria-label="Keyboard Navigation Demo"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Keyboard Navigation
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={handleFocusFirst}
              aria-label="Focus first element"
            >
              Focus First
            </button>

            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={handleFocusPrevious}
              aria-label="Focus previous element"
            >
              Focus Previous
            </button>

            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={handleFocusNext}
              aria-label="Focus next element"
            >
              Focus Next
            </button>

            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={handleFocusLast}
              aria-label="Focus last element"
            >
              Focus Last
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Use the buttons above to navigate through focusable elements, or
              try keyboard shortcuts:
            </p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
              <p>
                <kbd className="px-1 py-0.5 bg-gray-200 rounded">Tab</kbd> Move
                to next focusable element
              </p>
              <p>
                <kbd className="px-1 py-0.5 bg-gray-200 rounded">Shift+Tab</kbd>{" "}
                Move to previous focusable element
              </p>
              <p>
                <kbd className="px-1 py-0.5 bg-gray-200 rounded">Enter</kbd>{" "}
                Activate focused element
              </p>
              <p>
                <kbd className="px-1 py-0.5 bg-gray-200 rounded">Space</kbd>{" "}
                Toggle checkbox/radio button
              </p>
              <p>
                <kbd className="px-1 py-0.5 bg-gray-200 rounded">
                  Arrow Keys
                </kbd>{" "}
                Navigate within form controls
              </p>
              <p>
                <kbd className="px-1 py-0.5 bg-gray-200 rounded">Esc</kbd> Close
                modals/popups
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Error Boundary Demo */}
      <ErrorBoundary>
        <section
          className="bg-white p-6 rounded-lg shadow"
          {...getAriaAttributes("region")}
          aria-label="Error Boundary Demo"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Error Boundary Demo
          </h2>

          <div className="space-y-4">
            <p className="text-gray-600">
              This section is wrapped in an error boundary that will catch and
              display any errors.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={() => {
                  throw errorFactory.networkError("Simulated network error", {
                    context: { component: "ErrorBoundaryDemo" },
                    severity: "high",
                  });
                }}
                aria-label="Trigger network error"
              >
                Trigger Network Error
              </button>

              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={() => {
                  throw errorFactory.validationError(
                    "Simulated validation error",
                    {
                      context: { component: "ErrorBoundaryDemo" },
                      severity: "medium",
                    }
                  );
                }}
                aria-label="Trigger validation error"
              >
                Trigger Validation Error
              </button>

              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={() => {
                  throw errorFactory.permissionError(
                    "Simulated permission error",
                    {
                      context: { component: "ErrorBoundaryDemo" },
                      severity: "high",
                    }
                  );
                }}
                aria-label="Trigger permission error"
              >
                Trigger Permission Error
              </button>
            </div>
          </div>
        </section>
      </ErrorBoundary>

      {/* ARIA Attributes Demo */}
      <section
        className="bg-white p-6 rounded-lg shadow"
        {...getAriaAttributes("region")}
        aria-label="ARIA Attributes Demo"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          ARIA Attributes
        </h2>

        <div className="space-y-4">
          <p className="text-gray-600">
            This section demonstrates proper ARIA attributes for accessibility.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              className="p-4 bg-blue-50 rounded-lg"
              {...getAriaAttributes("button")}
              aria-label="Demo button with ARIA attributes"
            >
              <h3 className="font-medium text-blue-800">Button Role</h3>
              <p className="text-sm text-blue-600 mt-1">
                This div has button semantics for screen readers.
              </p>
            </button>

            <a
              href="#demo-link"
              className="p-4 bg-green-50 rounded-lg"
              {...getAriaAttributes("link")}
              aria-label="Demo link with ARIA attributes"
            >
              <h3 className="font-medium text-green-800">Link Role</h3>
              <p className="text-sm text-green-600 mt-1">
                This div has link semantics for screen readers.
              </p>
            </a>

            <div
              className="p-4 bg-purple-50 rounded-lg"
              {...getAriaAttributes("alert")}
              role="alert"
              aria-label="Demo alert with ARIA attributes"
            >
              <h3 className="font-medium text-purple-800">Alert Role</h3>
              <p className="text-sm text-purple-600 mt-1">
                This div has alert semantics for screen readers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AccessibilityDemo;
