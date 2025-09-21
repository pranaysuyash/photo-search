import {
  Calendar,
  Camera,
  Clock,
  FolderPlus,
  Hash,
  Heart,
  Image,
  MapPin,
  Star,
  User,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

interface SmartAlbumSuggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  criteria: Record<string, unknown>;
  estimatedCount: number;
  type: "date" | "location" | "person" | "event" | "metadata" | "ai";
}

interface SmartAlbumSuggestionsProps {
  onSuggestionSelect: (suggestion: SmartAlbumSuggestion) => void;
  photoCount: number;
  availableTags: string[];
  availablePersons: string[];
  availableLocations: string[];
  availableCameras: string[];
}

export function SmartAlbumSuggestions({
  onSuggestionSelect,
  photoCount,
  availableTags,
  availablePersons,
  availableLocations,
  availableCameras,
}: SmartAlbumSuggestionsProps) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    date: true,
    location: true,
    person: true,
    event: true,
    metadata: true,
    ai: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Generate smart album suggestions based on available data
  const suggestions: SmartAlbumSuggestion[] = [
    // Date-based suggestions
    {
      id: "recent-photos",
      title: "Recent Photos",
      description: "Photos from the last 30 days",
      icon: <Clock className="w-5 h-5" />,
      criteria: {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.3)),
      type: "date",
    },
    {
      id: "this-year",
      title: "This Year",
      description: `All photos from ${new Date().getFullYear()}`,
      icon: <Calendar className="w-5 h-5" />,
      criteria: {
        dateFrom: new Date(new Date().getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0],
        dateTo: new Date(new Date().getFullYear(), 11, 31)
          .toISOString()
          .split("T")[0],
      },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.4)),
      type: "date",
    },
    {
      id: "last-summer",
      title: "Last Summer",
      description: `Photos from June-August ${new Date().getFullYear() - 1}`,
      icon: <Calendar className="w-5 h-5" />,
      criteria: {
        dateFrom: new Date(new Date().getFullYear() - 1, 5, 1)
          .toISOString()
          .split("T")[0],
        dateTo: new Date(new Date().getFullYear() - 1, 7, 31)
          .toISOString()
          .split("T")[0],
      },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.1)),
      type: "date",
    },

    // Location-based suggestions
    ...availableLocations.slice(0, 3).map((location, index) => ({
      id: `location-${index}`,
      title: location,
      description: `Photos taken in ${location}`,
      icon: <MapPin className="w-5 h-5" />,
      criteria: { place: location },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.05)),
      type: "location" as const,
    })),

    // Person-based suggestions
    ...availablePersons.slice(0, 3).map((person, index) => ({
      id: `person-${index}`,
      title: person,
      description: `Photos with ${person}`,
      icon: <User className="w-5 h-5" />,
      criteria: { person },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.1)),
      type: "person" as const,
    })),

    // Event-based suggestions (using tags)
    ...availableTags
      .filter((tag) =>
        [
          "birthday",
          "wedding",
          "vacation",
          "party",
          "christmas",
          "halloween",
        ].includes(tag.toLowerCase())
      )
      .slice(0, 3)
      .map((tag, index) => ({
        id: `event-${index}`,
        title: tag.charAt(0).toUpperCase() + tag.slice(1),
        description: `Photos tagged with "${tag}"`,
        icon: <Star className="w-5 h-5" />,
        criteria: { tags: [tag] },
        estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.03)),
        type: "event" as const,
      })),

    // Metadata-based suggestions
    ...availableCameras.slice(0, 2).map((camera, index) => ({
      id: `camera-${index}`,
      title: camera,
      description: `Photos taken with ${camera}`,
      icon: <Camera className="w-5 h-5" />,
      criteria: { camera },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.15)),
      type: "metadata" as const,
    })),

    // AI-based suggestions
    {
      id: "favorites",
      title: "Favorites",
      description: "Your most favorited photos",
      icon: <Heart className="w-5 h-5 text-red-500" />,
      criteria: { favOnly: true },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.1)),
      type: "ai",
    },
    {
      id: "high-rated",
      title: "High Rated",
      description: "Photos rated 4 stars or higher",
      icon: <Star className="w-5 h-5 text-yellow-500" />,
      criteria: { ratingMin: 4 },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.08)),
      type: "ai",
    },
    {
      id: "portraits",
      title: "Portraits",
      description: "AI detected portrait photos",
      icon: <User className="w-5 h-5" />,
      criteria: { tags: ["portrait"] },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.12)),
      type: "ai",
    },
    {
      id: "landscapes",
      title: "Landscapes",
      description: "AI detected landscape photos",
      icon: <Image className="w-5 h-5" />,
      criteria: { tags: ["landscape"] },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.1)),
      type: "ai",
    },
  ];

  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) {
      acc[suggestion.type] = [];
    }
    acc[suggestion.type].push(suggestion);
    return acc;
  }, {} as Record<string, SmartAlbumSuggestion[]>);

  const sectionInfo = {
    date: { title: "By Date", icon: <Calendar className="w-4 h-4" /> },
    location: { title: "By Location", icon: <MapPin className="w-4 h-4" /> },
    person: { title: "By Person", icon: <User className="w-4 h-4" /> },
    event: { title: "Events", icon: <Star className="w-4 h-4" /> },
    metadata: { title: "By Metadata", icon: <Hash className="w-4 h-4" /> },
    ai: { title: "AI Suggestions", icon: <Zap className="w-4 h-4" /> },
  };

  return (
    <div 
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      role="region"
      aria-labelledby="smart-album-suggestions-heading"
    >
      <div className="border-b border-border px-3 py-3 sm:px-4 sm:py-4 flex-shrink-0">
        <h3 
          id="smart-album-suggestions-heading"
          className="flex items-center gap-2 text-sm sm:text-base font-semibold text-foreground"
        >
          <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderPlus className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span className="truncate">Smart Album Suggestions</span>
        </h3>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
          {suggestions.length} smart album suggestions based on your library
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {Object.entries(groupedSuggestions).map(
          ([type, sectionSuggestions]) => {
            const info = sectionInfo[type as keyof typeof sectionInfo];
            const isExpanded = expandedSections[type];
            const sectionId = `smart-album-section-${type}`;

            return (
              <div
                key={type}
                className="border-b border-border last:border-b-0"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => toggleSection(type)}
                  aria-expanded={isExpanded}
                  aria-controls={sectionId}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${info?.title ?? type} section`}
                >
                  <span className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium text-foreground">
                    <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      {info?.icon}
                    </span>
                    <span className="truncate">{info?.title ?? type}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span className="sr-only">Hide</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span className="sr-only">Show</span>
                      </>
                    )}
                  </span>
                </button>

                {isExpanded && (
                  <div
                    id={sectionId}
                    className="space-y-1.5 sm:space-y-2 px-3 pb-3 sm:px-4 sm:pb-4"
                  >
                    {sectionSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 sm:px-4 sm:py-3 text-left transition hover:border-primary/40 hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onSuggestionSelect(suggestion)}
                        aria-label={`Create smart album: ${suggestion.title}`}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                            {suggestion.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-medium text-foreground truncate">
                              {suggestion.title}
                            </div>
                            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {suggestion.description}
                            </p>
                            <div className="mt-1.5 sm:mt-2 text-xs font-medium text-muted-foreground">
                              ~{suggestion.estimatedCount} photos
                            </div>
                          </div>
                          <FolderPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
