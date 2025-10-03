import {
  AlertTriangle,
  Badge,
  CheckCircle,
  Info,
  Loader2,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import {
  largeLibraryOptimizer,
  type OptimizationRecommendation,
} from "../services/LargeLibraryOptimizer";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Switch,
} from "./ui";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Progress } from "./ui/progress";
interface LargeLibraryOptimizerProps {
  className?: string;
}

export default function LargeLibraryOptimizer({
  className,
}: LargeLibraryOptimizerProps) {
  const [metrics, setMetrics] = useState(largeLibraryOptimizer.getMetrics());
  const [recommendations, setRecommendations] = useState<
    OptimizationRecommendation[]
  >([]);
  const [status, setStatus] = useState(
    largeLibraryOptimizer.getOptimizationStatus()
  );
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Load saved settings
    largeLibraryOptimizer.loadSettings();

    // Subscribe to optimization notifications
    const unsubscribe = largeLibraryOptimizer.subscribe(
      (newMetrics, newRecommendations) => {
        setMetrics(newMetrics);
        setRecommendations(newRecommendations);
        setStatus(largeLibraryOptimizer.getOptimizationStatus());
      }
    );

    // Initial status update
    setStatus(largeLibraryOptimizer.getOptimizationStatus());

    return unsubscribe;
  }, []);

  const handleApplyOptimization = async (
    recommendation: OptimizationRecommendation
  ) => {
    setIsApplying(recommendation.type);
    try {
      await largeLibraryOptimizer.applyOptimizationManually(recommendation);
      // Update status after applying
      setStatus(largeLibraryOptimizer.getOptimizationStatus());
      setRecommendations(largeLibraryOptimizer.generateRecommendations());
    } catch (error) {
      console.error("Failed to apply optimization:", error);
    } finally {
      setIsApplying(null);
    }
  };

  const handleSettingChange = (setting: string, value: boolean | number) => {
    const settings = largeLibraryOptimizer.getSettings();
    const updatedSettings = { ...settings, [setting]: value };

    // Note: In a real implementation, we would update the service settings
    // For now, we'll just trigger a re-render
    setStatus(largeLibraryOptimizer.getOptimizationStatus());
  };

  const getPriorityColor = (
    priority: OptimizationRecommendation["priority"]
  ) => {
    switch (priority) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const getPriorityIcon = (
    priority: OptimizationRecommendation["priority"]
  ) => {
    switch (priority) {
      case "critical":
        return <AlertTriangle className="w-4 h-4" />;
      case "high":
        return <Zap className="w-4 h-4" />;
      case "medium":
        return <Info className="w-4 h-4" />;
      case "low":
        return <Settings className="w-4 h-4" />;
    }
  };

  const isLargeLibrary = largeLibraryOptimizer.isLargeLibrary();
  const settings = largeLibraryOptimizer.getSettings();

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading optimization data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card
        className={`border-2 ${
          isLargeLibrary
            ? "border-orange-200 bg-orange-50/30"
            : "border-green-200 bg-green-50/30"
        }`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  isLargeLibrary ? "bg-orange-600" : "bg-green-600"
                }`}
              >
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Performance Optimizer</CardTitle>
                <p className="text-sm text-gray-600">
                  {isLargeLibrary
                    ? `Large library detected (${metrics.totalPhotos.toLocaleString()} photos)`
                    : `Standard library (${metrics.totalPhotos.toLocaleString()} photos)`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={status.isOptimized ? "default" : "secondary"}
                className="text-sm"
              >
                {status.isOptimized ? "Optimized" : "Needs Optimization"}
              </Badge>
              <div className="text-sm text-gray-600">
                Score: {status.performanceScore}/100
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Performance Score */}
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Performance Score</span>
              <span
                className={`text-sm font-bold ${
                  status.performanceScore > 80
                    ? "text-green-600"
                    : status.performanceScore > 60
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {status.performanceScore}/100
              </span>
            </div>
            <Progress
              value={status.performanceScore}
              className="h-2"
              // @ts-ignore
              indicatorClassName={
                status.performanceScore > 80
                  ? "bg-green-600"
                  : status.performanceScore > 60
                  ? "bg-yellow-600"
                  : "bg-red-600"
              }
            />
          </div>

          {/* Library Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {metrics.totalPhotos.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">Photos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {metrics.totalFolders}
              </div>
              <div className="text-xs text-gray-600">Folders</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {(metrics.librarySize / 1024).toFixed(1)}GB
              </div>
              <div className="text-xs text-gray-600">Size</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {metrics.searchPerformance.averageSearchTime.toFixed(0)}ms
              </div>
              <div className="text-xs text-gray-600">Avg Search</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applied Optimizations */}
      {status.optimizationsApplied.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Applied Optimizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {status.optimizationsApplied.map((optimization, index) => (
                <Badge
                  key={index}
                  variant="default"
                  className="text-green-700 bg-green-100"
                >
                  {optimization}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Optimization Recommendations ({recommendations.length})
            </CardTitle>
            <p className="text-sm text-gray-600">
              Suggested improvements to enhance performance
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getPriorityColor(
                  recommendation.priority
                )}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(recommendation.priority)}
                      <h4 className="font-semibold capitalize">
                        {recommendation.type.replace("-", " ")}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {recommendation.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        +{recommendation.estimatedImprovement}% improvement
                      </Badge>
                    </div>
                    <p className="text-sm">{recommendation.description}</p>
                    <p className="text-xs text-gray-600">
                      <strong>Impact:</strong> {recommendation.impact}
                    </p>
                    <p className="text-xs text-gray-600">
                      <strong>Implementation:</strong>{" "}
                      {recommendation.implementation}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyOptimization(recommendation)}
                    disabled={isApplying === recommendation.type}
                    className="ml-4"
                  >
                    {isApplying === recommendation.type ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Already Optimized State */}
      {recommendations.length === 0 && status.isOptimized && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              All Optimizations Applied
            </h3>
            <p className="text-sm text-green-700">
              Your library is fully optimized for current performance levels.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span>Advanced Settings</span>
            <Settings className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Optimization Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="ann-enabled">ANN Indexing</Label>
                <Switch
                  id="ann-enabled"
                  checked={settings.annEnabled}
                  onCheckedChange={(checked) =>
                    handleSettingChange("annEnabled", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="virtual-scrolling">Virtual Scrolling</Label>
                <Switch
                  id="virtual-scrolling"
                  checked={settings.virtualScrollingEnabled}
                  onCheckedChange={(checked) =>
                    handleSettingChange("virtualScrollingEnabled", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="lazy-loading">Lazy Loading</Label>
                <Switch
                  id="lazy-loading"
                  checked={settings.lazyLoadingEnabled}
                  onCheckedChange={(checked) =>
                    handleSettingChange("lazyLoadingEnabled", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="compression">Compression</Label>
                <Switch
                  id="compression"
                  checked={settings.compressionEnabled}
                  onCheckedChange={(checked) =>
                    handleSettingChange("compressionEnabled", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="background-indexing">Background Indexing</Label>
                <Switch
                  id="background-indexing"
                  checked={settings.backgroundIndexing}
                  onCheckedChange={(checked) =>
                    handleSettingChange("backgroundIndexing", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
