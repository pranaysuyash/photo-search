import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Camera,
  MapPin,
  Users,
  Tag,
  Image,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { usePhotoStore } from "../store/photoStore";
import { apiClient, type AnalyticsResponse } from "../services/api";

export function Analytics() {
  const { currentDirectory } = usePhotoStore();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load analytics when directory changes
  useEffect(() => {
    const loadAnalytics = async () => {
      if (currentDirectory) {
        setIsLoading(true);
        try {
          const response = await apiClient.getAnalytics(currentDirectory);
          setAnalytics(response);
        } catch (error) {
          console.error("Failed to load analytics:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadAnalytics();
  }, [currentDirectory]);

  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB < 1024) {
      return `${sizeInMB.toFixed(1)} MB`;
    }
    return `${(sizeInMB / 1024).toFixed(1)} GB`;
  };

  if (!currentDirectory) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No directory selected
          </h3>
          <p className="text-gray-500">
            Please select a photo directory to view analytics
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No analytics available
          </h3>
          <p className="text-gray-500">
            Analytics data could not be loaded for this directory
          </p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Photos",
      value: analytics.total_photos.toLocaleString(),
      icon: Image,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Indexed Photos",
      value: analytics.total_indexed.toLocaleString(),
      icon: Camera,
      color: "text-green-600",
      bgColor: "bg-green-50",
      subtitle: `${(
        (analytics.total_indexed / analytics.total_photos) *
        100
      ).toFixed(1)}% indexed`,
    },
    {
      title: "Index Size",
      value: formatFileSize(analytics.index_size_mb),
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Unique Cameras",
      value: analytics.cameras.length.toString(),
      icon: Camera,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Places",
      value: analytics.places.length.toString(),
      icon: MapPin,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "People Clusters",
      value: analytics.people_clusters.length.toString(),
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Tags",
      value: analytics.tags.length.toString(),
      icon: Tag,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Real-time
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    {stat.subtitle && (
                      <p className="text-sm text-gray-500 mt-1">
                        {stat.subtitle}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cameras */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Models
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {analytics.cameras.length > 0 ? (
              analytics.cameras.map((camera) => (
                <div
                  key={camera}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm">{camera}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">
                No camera information available
              </p>
            )}
          </div>
        </Card>

        {/* Places */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Locations
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {analytics.places.length > 0 ? (
              analytics.places.map((place) => (
                <div
                  key={`place-${place}`}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm">{place}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">
                No location information available
              </p>
            )}
          </div>
        </Card>

        {/* People */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            People
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {analytics.people_clusters.length > 0 ? (
              analytics.people_clusters.map((person, index) => (
                <div
                  key={`person-${person.name || index}`}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm">
                    {person.name || `Person ${index + 1}`}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No people detected yet</p>
            )}
          </div>
        </Card>

        {/* Tags */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {analytics.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {analytics.tags.slice(0, 20).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {analytics.tags.length > 20 && (
                  <Badge variant="secondary" className="text-xs">
                    +{analytics.tags.length - 20} more
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No tags available</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
