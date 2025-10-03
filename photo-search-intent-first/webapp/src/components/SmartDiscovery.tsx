/**
 * Smart Discovery Component
 * Main UI for the Smart Photo Discovery & Recommendation Engine
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookmarkPlus,
  Camera,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Filter,
  Heart,
  Info,
  MapPin,
  MoreVertical,
  RefreshCw,
  Settings,
  Share2,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  type DiscoveryAlgorithm,
  type DiscoveryInsights,
  DiscoveryOptions,
  type DiscoveryResult,
  SmartDiscoveryService,
} from "../services/SmartDiscoveryService";
import { Button } from "./ui";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface SmartDiscoveryProps {
  className?: string;
  onPhotoSelect?: (photo: DiscoveryResult) => void;
  onPhotoView?: (photo: DiscoveryResult) => void;
  compact?: boolean;
}

const DISCOVERY_ALGORITHMS: {
  value: DiscoveryAlgorithm;
  label: string;
  description: string;
}[] = [
  {
    value: "hybrid",
    label: "Smart Mix",
    description: "Balanced recommendations from multiple sources",
  },
  {
    value: "content_based",
    label: "Similar Content",
    description: "Photos similar to your recent views",
  },
  {
    value: "collaborative_filtering",
    label: "Trending",
    description: "Popular photos based on activity",
  },
  {
    value: "serendipity",
    label: "Serendipity",
    description: "Unexpected discoveries and hidden gems",
  },
  {
    value: "time_decay",
    label: "Time Machine",
    description: "Photos from this time in history",
  },
  {
    value: "diversity_focused",
    label: "Diverse Mix",
    description: "Balanced recommendations across categories",
  },
  {
    value: "quality_focused",
    label: "Best Quality",
    description: "Technically excellent photos",
  },
  {
    value: "context_aware",
    label: "Context Aware",
    description: "Adapted to current time and mood",
  },
];

export function SmartDiscovery({
  className,
  onPhotoSelect,
  onPhotoView,
  compact = false,
}: SmartDiscoveryProps) {
  const [recommendations, setRecommendations] = useState<DiscoveryResult[]>([]);
  const [trending, setTrending] = useState<DiscoveryResult[]>([]);
  const [forgottenGems, setForgottenGems] = useState<DiscoveryResult[]>([]);
  const [insights, setInsights] = useState<DiscoveryInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [algorithm, setAlgorithm] = useState<DiscoveryAlgorithm>("hybrid");
  const [activeTab, setActiveTab] = useState("recommendations");
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const discoveryService = useMemo(
    () => SmartDiscoveryService.getInstance(),
    []
  );

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);

      const [recs, trendingPhotos, gems, userInsights] = await Promise.all([
        discoveryService.getRecommendations({
          algorithm,
          limit: compact ? 6 : 12,
        }),
        discoveryService.getTrendingPhotos(compact ? 4 : 8),
        discoveryService.getForgottenGems(compact ? 4 : 8),
        discoveryService.getDiscoveryInsights(),
      ]);

      setRecommendations(recs);
      setTrending(trendingPhotos);
      setForgottenGems(gems);
      setInsights(userInsights);
    } catch (error) {
      console.error("Failed to load recommendations:", error);
      toast({
        title: "Discovery Failed",
        description: "Could not load recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [algorithm, compact, discoveryService, toast]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handlePhotoInteraction = useCallback(
    (
      photo: DiscoveryResult,
      action: "view" | "favorite" | "share" | "download"
    ) => {
      // Record interaction
      discoveryService.recordInteraction(photo.id, action, 0);

      // Track view for personalization
      if (action === "view") {
        onPhotoView?.(photo);
      }

      // Handle different actions
      switch (action) {
        case "view":
          onPhotoSelect?.(photo);
          break;
        case "favorite":
          toast({
            title: "Added to Favorites",
            description: "Photo has been added to your favorites",
          });
          break;
        case "share":
          // Implement share functionality
          toast({
            title: "Share Ready",
            description: "Share link copied to clipboard",
          });
          break;
        case "download":
          // Implement download functionality
          toast({
            title: "Download Started",
            description: "Photo download has started",
          });
          break;
      }
    },
    [discoveryService, onPhotoSelect, onPhotoView, toast]
  );

  const getReasonIcon = (reasonType: string) => {
    switch (reasonType) {
      case "trending_in_library":
        return <TrendingUp className="w-4 h-4" />;
      case "forgotten_gems":
        return <Star className="w-4 h-4" />;
      case "time_based":
        return <Clock className="w-4 h-4" />;
      case "similar_to_recently_viewed":
        return <Eye className="w-4 h-4" />;
      case "serendipity":
        return <Sparkles className="w-4 h-4" />;
      case "quality_highlights":
        return <Camera className="w-4 h-4" />;
      case "people_based":
        return <Users className="w-4 h-4" />;
      case "location_based":
        return <MapPin className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getReasonColor = (reasonType: string) => {
    switch (reasonType) {
      case "trending_in_library":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "forgotten_gems":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "time_based":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "similar_to_recently_viewed":
        return "bg-green-100 text-green-800 border-green-200";
      case "serendipity":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "quality_highlights":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const renderPhotoCard = (photo: DiscoveryResult, index: number) => {
    return (
      <motion.div
        key={photo.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ y: -4, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
        className="group cursor-pointer"
        onClick={() => handlePhotoInteraction(photo, "view")}
      >
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="relative aspect-square overflow-hidden">
            <img
              src={photo.thumbnail}
              alt={photo.metadata.description || "Photo"}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {/* Overlay with quick actions */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-between items-end">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePhotoInteraction(photo, "favorite");
                    }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                  >
                    <Heart className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePhotoInteraction(photo, "share");
                    }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(true);
                  }}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                >
                  <Info className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>

            {/* Confidence score */}
            {photo.reason.confidence > 0.7 && (
              <div className="absolute top-2 right-2">
                <Badge
                  variant="secondary"
                  className="bg-white/90 backdrop-blur-sm"
                >
                  {Math.round(photo.reason.confidence * 100)}% match
                </Badge>
              </div>
            )}
          </div>

          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Badge
                  variant="outline"
                  className={`mb-2 text-xs ${getReasonColor(
                    photo.reason.type
                  )}`}
                >
                  <span className="flex items-center gap-1">
                    {getReasonIcon(photo.reason.type)}
                    {photo.reason.title}
                  </span>
                </Badge>

                <h3 className="font-medium text-sm text-gray-900 line-clamp-1 mb-1">
                  {photo.metadata.description || "Photo"}
                </h3>

                <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                  {photo.reason.description}
                </p>

                {/* Photo metadata */}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {photo.metadata.dateTaken && (
                    <span>
                      {new Date(photo.metadata.dateTaken).toLocaleDateString()}
                    </span>
                  )}
                  {photo.metadata.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {photo.metadata.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                {photo.score > 0.8 && (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
                <span className="text-xs font-medium text-gray-500">
                  {Math.round(photo.score * 100)}%
                </span>
              </div>
            </div>

            {/* Personalization indicators */}
            {(photo.personalizedScore ||
              photo.diversityScore ||
              photo.serendipityScore) && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  {photo.personalizedScore && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-blue-500" />
                      <span className="text-gray-600">
                        {Math.round(photo.personalizedScore * 100)}%
                      </span>
                    </div>
                  )}
                  {photo.diversityScore && (
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3 text-green-500" />
                      <span className="text-gray-600">
                        {Math.round(photo.diversityScore * 100)}%
                      </span>
                    </div>
                  )}
                  {photo.serendipityScore && photo.serendipityScore > 0.5 && (
                    <Sparkles className="w-3 h-3 text-purple-500" />
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderInsights = () => {
    if (!insights) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Your Discovery Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {insights.discoveredPhotos}
              </div>
              <div className="text-sm text-gray-500">Photos Discovered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(insights.diversityScore * 100)}%
              </div>
              <div className="text-sm text-gray-500">Diversity Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(insights.personalizationScore * 100)}%
              </div>
              <div className="text-sm text-gray-500">Personalization</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(insights.userEngagementPrediction * 100)}%
              </div>
              <div className="text-sm text-gray-500">Engagement</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (compact) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Discover Photos
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRecommendations}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-200 animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recommendations.map((photo, index) =>
              renderPhotoCard(photo, index)
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-blue-500" />
            Smart Discovery
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered photo recommendations tailored just for you
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={algorithm}
            onValueChange={(value: DiscoveryAlgorithm) => setAlgorithm(value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISCOVERY_ALGORITHMS.map((algo) => (
                <SelectItem key={algo.value} value={algo.value}>
                  <div className="flex flex-col items-start">
                    <span>{algo.label}</span>
                    <span className="text-xs text-gray-500">
                      {algo.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={loadRecommendations}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Insights Card */}
      {!loading && renderInsights()}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations">For You</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="gems">Hidden Gems</TabsTrigger>
          <TabsTrigger value="explore">Explore</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-200 animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-gray-600">
                  Personalized recommendations based on your viewing history and
                  preferences
                </p>
                <Badge variant="secondary">
                  {recommendations.length} photos
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {recommendations.map((photo, index) =>
                  renderPhotoCard(photo, index)
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Recommendations Yet
                </h3>
                <p className="text-gray-500 text-center max-w-md">
                  Start viewing and interacting with photos to get personalized
                  recommendations.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          {trending.length > 0 ? (
            <>
              <p className="text-gray-600">
                Photos gaining attention based on recent activity and similar
                users
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {trending.map((photo, index) => renderPhotoCard(photo, index))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-400" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    No Trending Photos
                  </h3>
                  <p className="text-gray-500">
                    Check back later for trending content
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="gems" className="space-y-4">
          {forgottenGems.length > 0 ? (
            <>
              <p className="text-gray-600">
                High-quality photos you haven't seen in a while
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {forgottenGems.map((photo, index) =>
                  renderPhotoCard(photo, index)
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Star className="w-12 h-12 text-gray-400" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    No Hidden Gems Found
                  </h3>
                  <p className="text-gray-500">
                    Continue exploring to discover hidden gems
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="explore" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Explore New Ways
              </h3>
              <p className="text-gray-500 text-center max-w-md mb-6">
                Try different recommendation algorithms to discover photos in
                new ways.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                {DISCOVERY_ALGORITHMS.slice(0, 4).map((algo) => (
                  <Button
                    key={algo.value}
                    variant={algorithm === algo.value ? "default" : "outline"}
                    onClick={() => setAlgorithm(algo.value)}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    <div className="font-medium">{algo.label}</div>
                    <div className="text-xs text-center opacity-70">
                      {algo.description}
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SmartDiscovery;
