/**
 * Auto-Curation Panel
 * Provides UI for intelligent photo organization and curation
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Calendar,
  Camera,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Filter,
  FolderPlus,
  Heart,
  Info,
  MapPin,
  RefreshCw,
  Settings,
  Sparkles,
  Star,
  Target,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AutoCurationEngine,
  type AutoCurationOptions,
  type AutoCurationResult,
  type CurationAction,
  type CurationProgress,
  type SmartCollectionSuggestion,
} from "../services/AutoCurationEngine";
import { Button } from "./ui";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Progress } from "./ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface AutoCurationPanelProps {
  photoPaths: string[];
  onCreateCollection?: (name: string, photos: string[]) => void;
  onDeletePhotos?: (paths: string[]) => void;
  onRatePhotos?: (paths: string[], rating: number) => void;
  onTagPhotos?: (paths: string[], tags: string[]) => void;
  className?: string;
}

export function AutoCurationPanel({
  photoPaths,
  onCreateCollection,
  onDeletePhotos,
  onRatePhotos,
  onTagPhotos,
  className,
}: AutoCurationPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AutoCurationResult | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(
    new Set()
  );
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set()
  );
  const [options, setOptions] = useState<AutoCurationOptions>({
    enableQualityAssessment: true,
    enableDuplicateDetection: true,
    enableEventDetection: true,
    enableSmartGrouping: true,
    qualityThreshold: 50,
    duplicateThreshold: 85,
    maxPhotosPerCollection: 100,
  });
  const [progress, setProgress] = useState<CurationProgress | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const { toast } = useToast();

  const curationEngine = AutoCurationEngine.getInstance(options);

  const startAnalysis = useCallback(async () => {
    if (photoPaths.length === 0) {
      toast({
        title: "No Photos Selected",
        description: "Please select photos to analyze for auto-curation.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setSelectedActions(new Set());
    setSelectedCollections(new Set());

    try {
      const analysisResult = await curationEngine.analyzePhotos(
        photoPaths,
        (progress) => {
          setProgress(progress);
        }
      );

      setResult(analysisResult);
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${analysisResult.summary.total_photos_analyzed} photos and found ${analysisResult.summary.duplicates_found} duplicates.`,
      });
    } catch (error) {
      console.error("Auto-curation analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze photos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  }, [photoPaths, curationEngine, toast]);

  const executeSelectedActions = useCallback(async () => {
    if (!result || selectedActions.size === 0) return;

    const actions = result.actions.filter((action) =>
      selectedActions.has(action.description)
    );

    try {
      for (const action of actions) {
        switch (action.type) {
          case "create_collection":
            if (onCreateCollection) {
              onCreateCollection(
                `Auto-Created Collection (${new Date().toLocaleDateString()})`,
                action.photos
              );
            }
            break;
          case "delete_duplicates":
            if (onDeletePhotos) {
              onDeletePhotos(action.photos);
            }
            break;
          case "rate_photos":
            if (onRatePhotos) {
              const rating = action.description.includes("5-star") ? 5 : 1;
              onRatePhotos(action.photos, rating);
            }
            break;
          case "tag_photos":
            if (onTagPhotos) {
              const tags = ["auto-curation"];
              onTagPhotos(action.photos, tags);
            }
            break;
        }
      }

      toast({
        title: "Actions Completed",
        description: `Successfully executed ${actions.length} auto-curation actions.`,
      });

      setSelectedActions(new Set());
    } catch (error) {
      console.error("Failed to execute actions:", error);
      toast({
        title: "Execution Failed",
        description: "Failed to execute some actions. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    result,
    selectedActions,
    onCreateCollection,
    onDeletePhotos,
    onRatePhotos,
    onTagPhotos,
    toast,
  ]);

  const createSelectedCollections = useCallback(async () => {
    if (!result || selectedCollections.size === 0) return;

    const collections = result.collections.filter((collection) =>
      selectedCollections.has(collection.name)
    );

    try {
      for (const collection of collections) {
        if (onCreateCollection) {
          onCreateCollection(collection.name, collection.photos);
        }
      }

      toast({
        title: "Collections Created",
        description: `Successfully created ${collections.length} smart collections.`,
      });

      setSelectedCollections(new Set());
    } catch (error) {
      console.error("Failed to create collections:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create some collections. Please try again.",
        variant: "destructive",
      });
    }
  }, [result, selectedCollections, onCreateCollection, toast]);

  const toggleActionSelection = useCallback((actionId: string) => {
    setSelectedActions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  }, []);

  const toggleCollectionSelection = useCallback((collectionName: string) => {
    setSelectedCollections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(collectionName)) {
        newSet.delete(collectionName);
      } else {
        newSet.add(collectionName);
      }
      return newSet;
    });
  }, []);

  const getActionIcon = (actionType: CurationAction["type"]) => {
    switch (actionType) {
      case "create_collection":
        return <FolderPlus className="w-4 h-4" />;
      case "delete_duplicates":
        return <Trash2 className="w-4 h-4" />;
      case "rate_photos":
        return <Star className="w-4 h-4" />;
      case "tag_photos":
        return <Target className="w-4 h-4" />;
      case "move_photos":
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getActionColor = (actionType: CurationAction["type"]) => {
    switch (actionType) {
      case "delete_duplicates":
        return "bg-red-100 text-red-800 border-red-200";
      case "rate_photos":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "create_collection":
        return "bg-green-100 text-green-800 border-green-200";
      case "tag_photos":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCollectionIcon = (type: SmartCollectionSuggestion["type"]) => {
    switch (type) {
      case "event":
        return <Calendar className="w-4 h-4" />;
      case "location":
        return <MapPin className="w-4 h-4" />;
      case "people":
        return <Users className="w-4 h-4" />;
      case "quality":
        return <Star className="w-4 h-4" />;
      case "time":
        return <Clock className="w-4 h-4" />;
      case "theme":
        return <Sparkles className="w-4 h-4" />;
      case "cleanup":
        return <Trash2 className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getCollectionColor = (type: SmartCollectionSuggestion["type"]) => {
    switch (type) {
      case "event":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "location":
        return "bg-green-100 text-green-800 border-green-200";
      case "people":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "quality":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "time":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "theme":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "cleanup":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isAnalyzing) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500 animate-pulse" />
            Analyzing Photos...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {progress && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{progress.current_step}</span>
                <span>
                  {progress.processed_photos}/{progress.total_photos}
                </span>
              </div>
              <Progress
                value={
                  (progress.processed_photos / progress.total_photos) * 100
                }
                className="w-full"
              />
              {progress.estimated_time_remaining > 0 && (
                <p className="text-xs text-gray-500">
                  Estimated time remaining:{" "}
                  {Math.round(progress.estimated_time_remaining / 1000)} seconds
                </p>
              )}
              {progress.actions_suggested > 0 && (
                <p className="text-xs text-green-600">
                  {progress.actions_suggested} actions suggested so far
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(options).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox checked={Boolean(value)} disabled />
                <span className="text-sm text-gray-600">
                  {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500" />
            Auto-Curation Engine
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="w-4 h-4 mr-2" />
              Options
            </Button>
            <Button onClick={startAnalysis} disabled={photoPaths.length === 0}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Analyze Photos
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b bg-gray-50 px-6 py-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Auto-Curation Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature Toggles */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="quality-assessment"
                  checked={options.enableQualityAssessment}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, enableQualityAssessment: checked as boolean }))
                  }
                />
                <label htmlFor="quality-assessment" className="text-sm text-gray-700">
                  Quality Assessment
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="duplicate-detection"
                  checked={options.enableDuplicateDetection}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, enableDuplicateDetection: checked as boolean }))
                  }
                />
                <label htmlFor="duplicate-detection" className="text-sm text-gray-700">
                  Duplicate Detection
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="event-detection"
                  checked={options.enableEventDetection}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, enableEventDetection: checked as boolean }))
                  }
                />
                <label htmlFor="event-detection" className="text-sm text-gray-700">
                  Event Detection
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="smart-grouping"
                  checked={options.enableSmartGrouping}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, enableSmartGrouping: checked as boolean }))
                  }
                />
                <label htmlFor="smart-grouping" className="text-sm text-gray-700">
                  Smart Grouping
                </label>
              </div>
            </div>

            {/* Threshold Settings */}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-700 block mb-1">
                  Quality Threshold: {options.qualityThreshold}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={options.qualityThreshold}
                  onChange={(e) =>
                    setOptions(prev => ({ ...prev, qualityThreshold: Number(e.target.value) }))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 block mb-1">
                  Duplicate Threshold: {options.duplicateThreshold}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={options.duplicateThreshold}
                  onChange={(e) =>
                    setOptions(prev => ({ ...prev, duplicateThreshold: Number(e.target.value) }))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 block mb-1">
                  Max Photos per Collection: {options.maxPhotosPerCollection}
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={options.maxPhotosPerCollection}
                  onChange={(e) =>
                    setOptions(prev => ({ ...prev, maxPhotosPerCollection: Number(e.target.value) }))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <CardContent>
        {!result ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ready to Analyze
            </h3>
            <p className="text-gray-500 mb-4">
              Select photos and click "Analyze Photos" to start intelligent
              photo organization
            </p>
            <p className="text-sm text-gray-400">
              {photoPaths.length} photos selected for analysis
            </p>
          </div>
        ) : (
          <Tabs defaultValue="actions" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="actions">
                Actions ({result.actions.length})
              </TabsTrigger>
              <TabsTrigger value="collections">
                Collections ({result.collections.length})
              </TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-600">
                  Suggested actions based on AI analysis of your photos
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedActions(
                        new Set(result.actions.map((a) => a.description))
                      )
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    onClick={executeSelectedActions}
                    disabled={selectedActions.size === 0}
                  >
                    Execute Selected ({selectedActions.size})
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {result.actions.map((action, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedActions.has(action.description)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => toggleActionSelection(action.description)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${getActionColor(
                            action.type
                          )}`}
                        >
                          {getActionIcon(action.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {action.description}
                          </h4>
                          <p className="text-sm text-gray-500 mb-2">
                            {action.photos.length} photos affected
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {Math.round(action.confidence * 100)}% confidence
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {action.impact} impact
                            </span>
                          </div>
                        </div>
                      </div>
                      <Checkbox
                        checked={selectedActions.has(action.description)}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="collections" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-600">
                  Smart collections created based on patterns and content
                  analysis
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedCollections(
                        new Set(result.collections.map((c) => c.name))
                      )
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    onClick={createSelectedCollections}
                    disabled={selectedCollections.size === 0}
                  >
                    Create Selected ({selectedCollections.size})
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {result.collections.map((collection, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCollections.has(collection.name)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => toggleCollectionSelection(collection.name)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${getCollectionColor(
                            collection.type
                          )}`}
                        >
                          {getCollectionIcon(collection.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {collection.name}
                          </h4>
                          <p className="text-sm text-gray-500 mb-2">
                            {collection.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {collection.estimated_size} photos
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {Math.round(collection.confidence * 100)}% match
                            </span>
                            {collection.quality_score && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {Math.round(collection.quality_score)}% quality
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {collection.tags
                              .slice(0, 4)
                              .map((tag, tagIndex) => (
                                <Badge
                                  key={tagIndex}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            {collection.tags.length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{collection.tags.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Checkbox
                        checked={selectedCollections.has(collection.name)}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.summary.total_photos_analyzed}
                  </div>
                  <div className="text-sm text-gray-600">Photos Analyzed</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {result.summary.duplicates_found}
                  </div>
                  <div className="text-sm text-gray-600">Duplicates Found</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.summary.events_detected}
                  </div>
                  <div className="text-sm text-gray-600">Events Detected</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {result.summary.smart_collections_suggested}
                  </div>
                  <div className="text-sm text-gray-600">
                    Collections Suggested
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <h3 className="text-lg font-medium">Analysis Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Processing Time:</span>
                    <span className="ml-2 font-medium">
                      {(result.summary.processing_time / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">
                      Quality Ratings Assigned:
                    </span>
                    <span className="ml-2 font-medium">
                      {result.summary.quality_ratings_assigned}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Photos per Second:</span>
                    <span className="ml-2 font-medium">
                      {(
                        result.summary.total_photos_analyzed /
                        (result.summary.processing_time / 1000)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">
                      Average Quality Score:
                    </span>
                    <span className="ml-2 font-medium">
                      {result.analysis.length > 0
                        ? Math.round(
                            result.analysis.reduce(
                              (sum, a) => sum + a.quality.overall,
                              0
                            ) / result.analysis.length
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <h3 className="text-lg font-medium">Configuration</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(options).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox checked={Boolean(value)} disabled />
                      <span className="text-sm text-gray-600">
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .toLowerCase()
                          .replace(/^./, (str) => str.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default AutoCurationPanel;
