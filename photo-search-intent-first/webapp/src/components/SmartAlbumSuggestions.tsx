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
  Tag, 
  User,
  Zap
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    date: true,
    location: true,
    person: true,
    event: true,
    metadata: true,
    ai: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
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
      criteria: { dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.3)),
      type: "date"
    },
    {
      id: "this-year",
      title: "This Year",
      description: "All photos from " + new Date().getFullYear(),
      icon: <Calendar className="w-5 h-5" />,
      criteria: { 
        dateFrom: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        dateTo: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
      },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.4)),
      type: "date"
    },
    {
      id: "last-summer",
      title: "Last Summer",
      description: "Photos from June-August " + (new Date().getFullYear() - 1),
      icon: <Calendar className="w-5 h-5" />,
      criteria: { 
        dateFrom: new Date(new Date().getFullYear() - 1, 5, 1).toISOString().split('T')[0],
        dateTo: new Date(new Date().getFullYear() - 1, 7, 31).toISOString().split('T')[0]
      },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.1)),
      type: "date"
    },
    
    // Location-based suggestions
    ...availableLocations.slice(0, 3).map((location, index) => ({
      id: `location-${index}`,
      title: location,
      description: `Photos taken in ${location}`,
      icon: <MapPin className="w-5 h-5" />,
      criteria: { place: location },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.05)),
      type: "location" as const
    })),
    
    // Person-based suggestions
    ...availablePersons.slice(0, 3).map((person, index) => ({
      id: `person-${index}`,
      title: person,
      description: `Photos with ${person}`,
      icon: <User className="w-5 h-5" />,
      criteria: { person },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.1)),
      type: "person" as const
    })),
    
    // Event-based suggestions (using tags)
    ...availableTags.filter(tag => 
      ['birthday', 'wedding', 'vacation', 'party', 'christmas', 'halloween'].includes(tag.toLowerCase())
    ).slice(0, 3).map((tag, index) => ({
      id: `event-${index}`,
      title: tag.charAt(0).toUpperCase() + tag.slice(1),
      description: `Photos tagged with "${tag}"`,
      icon: <Star className="w-5 h-5" />,
      criteria: { tags: [tag] },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.03)),
      type: "event" as const
    })),
    
    // Metadata-based suggestions
    ...availableCameras.slice(0, 2).map((camera, index) => ({
      id: `camera-${index}`,
      title: camera,
      description: `Photos taken with ${camera}`,
      icon: <Camera className="w-5 h-5" />,
      criteria: { camera },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.15)),
      type: "metadata" as const
    })),
    
    // AI-based suggestions
    {
      id: "favorites",
      title: "Favorites",
      description: "Your most favorited photos",
      icon: <Heart className="w-5 h-5 text-red-500" />,
      criteria: { favOnly: true },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.1)),
      type: "ai"
    },
    {
      id: "high-rated",
      title: "High Rated",
      description: "Photos rated 4 stars or higher",
      icon: <Star className="w-5 h-5 text-yellow-500" />,
      criteria: { ratingMin: 4 },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.08)),
      type: "ai"
    },
    {
      id: "portraits",
      title: "Portraits",
      description: "AI detected portrait photos",
      icon: <User className="w-5 h-5" />,
      criteria: { tags: ["portrait"] },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.12)),
      type: "ai"
    },
    {
      id: "landscapes",
      title: "Landscapes",
      description: "AI detected landscape photos",
      icon: <Image className="w-5 h-5" />,
      criteria: { tags: ["landscape"] },
      estimatedCount: Math.min(photoCount, Math.floor(photoCount * 0.1)),
      type: "ai"
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
    <div className="smart-album-suggestions">
      <div className="suggestions-header p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <FolderPlus className="w-5 h-5" />
          Smart Album Suggestions
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {suggestions.length} smart album suggestions based on your library
        </p>
      </div>

      <div className="suggestions-content flex-1 overflow-y-auto">
        {Object.entries(groupedSuggestions).map(([type, suggestions]) => (
          <div key={type} className="suggestions-section border-b last:border-b-0">
            <div 
              className="section-header flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSection(type)}
            >
              <div className="flex items-center gap-2">
                {sectionInfo[type as keyof typeof sectionInfo]?.icon}
                <span className="font-medium">
                  {sectionInfo[type as keyof typeof sectionInfo]?.title}
                </span>
              </div>
              <button className="text-gray-500">
                {expandedSections[type] ? "−" : "+"}
              </button>
            </div>
            
            {expandedSections[type] && (
              <div className="section-content p-2 space-y-2">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="suggestion-item p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onSuggestionSelect(suggestion)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-blue-600">
                        {suggestion.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          {suggestion.title}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {suggestion.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          ~{suggestion.estimatedCount} photos
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          type="button"
                          className="p-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                          title="Create smart album"
                        >
                          <FolderPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .smart-album-suggestions {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .suggestions-header {
          background: #f9fafb;
        }

        .suggestions-content {
          flex: 1;
          overflow-y: auto;
        }

        .suggestions-section {
          border-bottom: 1px solid #e5e7eb;
        }

        .section-header {
          background: white;
        }

        .suggestion-item {
          background: white;
          border: 1px solid #e5e7eb;
        }

        .suggestion-item:hover {
          background: #f9fafb;
        }
      `}</style>
    </div>
  );
}