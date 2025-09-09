import React, { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  Lightbulb,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

interface ContextualHelpProps {
  isVisible: boolean;
  onDismiss: () => void;
  context: "search" | "library" | "results" | "settings" | "collections";
  userActions: string[];
}

export function ContextualHelp({
  isVisible,
  onDismiss,
  context,
  userActions,
}: ContextualHelpProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);

  // Get contextual tips based on current context and user actions
  const getContextualTips = () => {
    const tips = {
      search: [
        {
          title: "Natural Language Search",
          content:
            "Try searching for 'sunset at beach' or 'family birthday party' - our AI understands what you're looking for naturally.",
          trigger: !userActions.includes("searched"),
        },
        {
          title: "Search by Colors & Objects",
          content:
            "Search for colors like 'red car' or objects like 'mountains' - our AI can find visual elements in your photos.",
          trigger:
            userActions.includes("searched") &&
            !userActions.includes("filtered"),
        },
        {
          title: "Advanced Filters",
          content:
            "Use the filter panel to narrow by date, camera, location, or rating for more precise results.",
          trigger: userActions.includes("searched") && userActions.length > 3,
        },
      ],
      library: [
        {
          title: "Getting Started",
          content:
            "Select a folder with your photos to begin. We'll analyze them to make them searchable.",
          trigger: !userActions.includes("selected_directory"),
        },
        {
          title: "Indexing Process",
          content:
            "After selecting photos, we'll index them using AI. This takes about 30 seconds per 100 photos.",
          trigger:
            userActions.includes("selected_directory") &&
            !userActions.includes("indexed"),
        },
        {
          title: "Browse Your Photos",
          content:
            "Once indexed, you can browse all your photos here. Use the search bar above to find specific ones.",
          trigger: userActions.includes("indexed"),
        },
      ],
      results: [
        {
          title: "Photo Actions",
          content:
            "Select photos to share, favorite, tag, or organize them into collections.",
          trigger: !userActions.includes("selected_photo"),
        },
        {
          title: "Quick Actions",
          content:
            "Use keyboard shortcuts: Space to select, Enter to view full size, F to favorite.",
          trigger:
            userActions.includes("selected_photo") &&
            !userActions.includes("used_keyboard"),
        },
        {
          title: "Save Searches",
          content:
            "Save your favorite searches to quickly access them later from the Saved Searches section.",
          trigger: userActions.includes("searched") && userActions.length > 5,
        },
      ],
      collections: [
        {
          title: "Organize Your Photos",
          content:
            "Create collections to group related photos together, like 'Vacation 2024' or 'Family Events'.",
          trigger: !userActions.includes("created_collection"),
        },
        {
          title: "Smart Collections",
          content:
            "Set up smart collections that automatically include photos based on your criteria.",
          trigger: userActions.includes("created_collection"),
        },
      ],
      settings: [
        {
          title: "Customize Your Experience",
          content:
            "Configure AI models, indexing preferences, and interface settings to match your needs.",
          trigger: !userActions.includes("changed_setting"),
        },
        {
          title: "Performance Tuning",
          content:
            "Adjust indexing speed and search accuracy based on your hardware and preferences.",
          trigger: userActions.includes("changed_setting"),
        },
      ],
    };

    return tips[context]?.filter((tip) => tip.trigger) || [];
  };

  const tips = getContextualTips();

  useEffect(() => {
    if (tips.length > 0 && !hasBeenSeen) {
      // Auto-advance tips every 8 seconds
      const interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
      }, 8000);

      return () => clearInterval(interval);
    }
  }, [tips.length, hasBeenSeen]);

  if (!isVisible || tips.length === 0) return null;

  const currentTip = tips[currentTipIndex];

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Tip
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Dismiss tip"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tip Content */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            {currentTip.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {currentTip.content}
          </p>
        </div>

        {/* Navigation */}
        {tips.length > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {tips.map((tip, index) => (
                <button
                  key={`tip-${tip.title}-${index}`}
                  type="button"
                  onClick={() => setCurrentTipIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentTipIndex
                      ? "bg-blue-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  aria-label={`Go to tip ${index + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setCurrentTipIndex((currentTipIndex + 1) % tips.length)
              }
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Next
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              setHasBeenSeen(true);
              onDismiss();
            }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Don't show tips like this
          </button>
        </div>
      </div>
    </div>
  );
}

interface OnboardingChecklistProps {
  isVisible: boolean;
  onComplete: () => void;
  completedSteps: string[];
  onStepComplete: (step: string) => void;
  // Optional: trigger a navigation or task for a given step
  onStepAction?: (step: string) => void;
}

export function OnboardingChecklist({
  isVisible,
  onComplete,
  completedSteps,
  onStepComplete,
  onStepAction,
}: OnboardingChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const steps = [
    {
      id: "select_directory",
      title: "Select Photo Directory",
      description: "Choose a folder containing your photos",
      action: "Get Started",
    },
    {
      id: "index_photos",
      title: "Index Your Photos",
      description: "Let AI analyze your photos for search",
      action: "Start Indexing",
    },
    {
      id: "first_search",
      title: "Try Your First Search",
      description: 'Search for something like "beach sunset"',
      action: "Search Now",
    },
    {
      id: "explore_features",
      title: "Explore Features",
      description: "Try collections, favorites, and sharing",
      action: "Explore",
    },
  ];

  const completedCount = completedSteps.length;
  const totalSteps = steps.length;
  const isFullyComplete = completedCount === totalSteps;

  useEffect(() => {
    if (isFullyComplete) {
      // Auto-complete after a short delay
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [isFullyComplete, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-40 max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isFullyComplete
                  ? "bg-green-100 dark:bg-green-900/20"
                  : "bg-blue-100 dark:bg-blue-900/20"
              }`}
            >
              {isFullyComplete ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Getting Started
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {completedCount} of {totalSteps} steps complete
              </p>
            </div>
          </div>
          <ChevronRight
            className={`w-4 h-4 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
        </button>

        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="max-h-80 overflow-y-auto">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isNext = completedSteps.length === index;

                return (
                  <div
                    key={step.id}
                    className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      isCompleted
                        ? "bg-green-50 dark:bg-green-900/10"
                        : isNext
                        ? "bg-blue-50 dark:bg-blue-900/10"
                        : "bg-gray-50 dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isCompleted
                            ? "bg-green-100 dark:bg-green-900/20"
                            : "bg-gray-200 dark:bg-gray-600"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {index + 1}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4
                          className={`font-medium text-sm ${
                            isCompleted
                              ? "text-green-800 dark:text-green-200"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {step.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {step.description}
                        </p>

                        {!isCompleted && isNext && (
                          <button
                            type="button"
                            onClick={() =>
                              onStepAction
                                ? onStepAction(step.id)
                                : onStepComplete(step.id)
                            }
                            className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            {step.action}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
