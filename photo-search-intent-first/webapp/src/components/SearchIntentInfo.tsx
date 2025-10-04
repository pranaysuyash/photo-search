import type { LucideProps } from "lucide-react";
import {
  Bot,
  Calendar,
  Camera,
  Compass,
  Filter,
  Heart,
  Lightbulb,
  MapPin,
  Star,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import React from "react";
import {
  type SearchIntent,
  SearchIntentRecognizer,
} from "../services/SearchIntentRecognizer";

interface SearchIntentInfoProps {
  intent: SearchIntent | undefined;
  query: string;
  onClose?: () => void;
  className?: string;
}

export function SearchIntentInfo({
  intent,
  query,
  onClose,
  className = "",
}: SearchIntentInfoProps) {
  if (!intent || intent.confidence < 0.3) {
    return null;
  }

  const icon = getIntentIcon(intent.primary);
  const description = getIntentDescription(intent.primary);
  const relevantFilters = getRelevantFilters(intent);

  return (
    <div
      className={`flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg ${className}`}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
        {React.createElement(icon, { className: "w-4 h-4" })}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Intent Recognized
          </span>
          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded">
            {Math.round(intent.confidence * 100)}%
          </span>
        </div>

        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
          {description}
        </p>

        {intent.suggestedQueries.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
              Suggested searches:
            </p>
            <div className="flex flex-wrap gap-1">
              {intent.suggestedQueries.slice(0, 3).map((suggestion, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-white dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700"
                >
                  {suggestion}
                </span>
              ))}
            </div>
          </div>
        )}

        {relevantFilters.length > 0 && (
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
              Applied context:
            </p>
            <div className="flex flex-wrap gap-1">
              {relevantFilters.map((filter, index) => (
                <span
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700"
                >
                  {filter.icon}
                  {filter.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-6 h-6 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          aria-label="Dismiss intent info"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Compact version for inline display
export function SearchIntentBadge({
  intent,
  className = "",
}: {
  intent: SearchIntent | undefined;
  className?: string;
}) {
  if (!intent || intent.confidence < 0.5) {
    return null;
  }

  const icon = getIntentIcon(intent.primary);

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-full text-xs ${className}`}
    >
      {React.createElement(icon, { className: "w-3 h-3" })}
      <span className="font-medium text-blue-700 dark:text-blue-300">
        {getIntentLabel(intent.primary)}
      </span>
    </div>
  );
}

// Tooltip version for hover information
export function SearchIntentTooltip({
  intent,
  children,
}: {
  intent: SearchIntent | undefined;
  children: React.ReactNode;
}) {
  if (!intent || intent.confidence < 0.3) {
    return <>{children}</>;
  }

  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
        <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
          <div className="font-medium mb-1">
            Intent: {getIntentLabel(intent.primary)}
          </div>
          <div className="text-gray-300">
            {getIntentDescription(intent.primary)}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getIntentIcon(
  intent: SearchIntent["primary"]
): React.ComponentType<LucideProps> {
  switch (intent) {
    case "discovery":
      return Compass;
    case "specific":
      return Filter;
    case "temporal":
      return Calendar;
    case "location":
      return MapPin;
    case "person":
      return User;
    case "activity":
      return Star;
    case "technical":
      return Camera;
    case "emotional":
      return Heart;
    case "comparison":
      return TrendingUp;
    default:
      return Bot;
  }
}

function getIntentLabel(intent: SearchIntent["primary"]): string {
  switch (intent) {
    case "discovery":
      return "Discovery";
    case "specific":
      return "Specific Search";
    case "temporal":
      return "Time-based";
    case "location":
      return "Location";
    case "person":
      return "People";
    case "activity":
      return "Activity";
    case "technical":
      return "Technical";
    case "emotional":
      return "Emotional";
    case "comparison":
      return "Comparison";
    default:
      return "Unknown";
  }
}

function getIntentDescription(intent: SearchIntent["primary"]): string {
  switch (intent) {
    case "discovery":
      return "You're exploring and browsing your photo library";
    case "specific":
      return "You're looking for something particular";
    case "temporal":
      return "You're searching based on time";
    case "location":
      return "You're looking for photos from a specific place";
    case "person":
      return "You're searching for photos of people";
    case "activity":
      return "You're looking for photos of events or activities";
    case "technical":
      return "You're interested in camera settings or photo quality";
    case "emotional":
      return "You're searching based on mood or feeling";
    case "comparison":
      return "You're comparing different photos";
    default:
      return "Understanding your search intent";
  }
}

function getRelevantFilters(
  intent: SearchIntent
): Array<{ icon: React.ReactNode; label: string }> {
  const filters: Array<{ icon: React.ReactNode; label: string }> = [];

  if (intent.context.timeFrame) {
    filters.push({
      icon: <Calendar className="w-3 h-3" />,
      label: getTimeFrameLabel(intent.context.timeFrame),
    });
  }

  if (intent.context.location?.value) {
    filters.push({
      icon: <MapPin className="w-3 h-3" />,
      label: intent.context.location.value,
    });
  }

  if (intent.context.people?.value) {
    filters.push({
      icon: <User className="w-3 h-3" />,
      label: intent.context.people.value,
    });
  }

  if (intent.context.mood?.emotion) {
    filters.push({
      icon: <Heart className="w-3 h-3" />,
      label: intent.context.mood.emotion,
    });
  }

  if (intent.context.quality?.type) {
    filters.push({
      icon: <Star className="w-3 h-3" />,
      label: intent.context.quality.type,
    });
  }

  return filters;
}

function getTimeFrameLabel(
  timeFrame: NonNullable<SearchIntent["context"]["timeFrame"]>
): string {
  switch (timeFrame.type) {
    case "recent":
      return "Recent";
    case "specific":
      return (
        (typeof timeFrame.value === "string"
          ? timeFrame.value
          : timeFrame.value?.toISOString()) || "Specific time"
      );
    case "seasonal":
      return (
        (typeof timeFrame.value === "string"
          ? timeFrame.value
          : timeFrame.value?.toISOString()) || "Season"
      );
    case "holiday":
      return timeFrame.holidays?.join(", ") || "Holiday";
    default:
      return "Time-based";
  }
}

export default SearchIntentInfo;
