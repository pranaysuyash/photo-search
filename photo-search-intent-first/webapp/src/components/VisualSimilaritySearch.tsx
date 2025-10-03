/**
 * Visual Similarity Search Component
 * Find visually similar images using AI-powered similarity analysis
 */

import {
  Download,
  Eye,
  Filter,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Settings,
  Sliders,
  ZoomIn,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import VisualAnalysisService, {
  type SimilarityResult,
  type VisualAnalysisOptions,
  type VisualAnalysisResult,
} from "../services/VisualAnalysisService";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Progress } from "./ui/progress";
import { Slider } from "./ui/slider";

interface VisualSimilaritySearchProps {
  queryImagePath?: string;
  onImageSelect?: (path: string) => void;
  onPhotoView?: (photo: { path: string }) => void;
  availableImages?: string[];
}

export interface SimilaritySearchOptions {
  threshold: number;
  maxResults: number;
  searchMode:
    | "visual"
    | "color"
    | "composition"
    | "style"
    | "objects"
    | "mixed";
  includeMetadata: boolean;
  faceMatching: boolean;
  sceneMatching: boolean;
  colorWeight: number;
  compositionWeight: number;
  styleWeight: number;
  objectWeight: number;
}

export function VisualSimilaritySearch({
  queryImagePath,
  onImageSelect,
  onPhotoView,
  availableImages = [],
}: VisualSimilaritySearchProps) {
  const [selectedImage, setSelectedImage] = useState<string>(
    queryImagePath || ""
  );
  const [searchOptions, setSearchOptions] = useState<SimilaritySearchOptions>({
    threshold: 0.75,
    maxResults: 20,
    searchMode: "mixed",
    includeMetadata: true,
    faceMatching: false,
    sceneMatching: true,
    colorWeight: 0.3,
    compositionWeight: 0.25,
    styleWeight: 0.25,
    objectWeight: 0.2,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SimilarityResult | null>(
    null
  );
  const [imageAnalysis, setImageAnalysis] =
    useState<VisualAnalysisResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(
    new Set()
  );

  const { toast } = useToast();
  const analysisService = VisualAnalysisService.getInstance();

  useEffect(() => {
    if (selectedImage) {
      analyzeQueryImage();
    }
  }, [selectedImage]);

  const analyzeQueryImage = async () => {
    if (!selectedImage) return;

    try {
      const analysis = await analysisService.analyzeImage(selectedImage, {
        enableObjectDetection: true,
        enableColorAnalysis: true,
        enableStyleAnalysis: true,
        enableCompositionAnalysis: true,
        enableFaceDetection: true,
        enableSceneAnalysis: true,
      });
      setImageAnalysis(analysis);
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the selected image.",
        variant: "destructive",
      });
    }
  };

  const performSimilaritySearch = async () => {
    if (!selectedImage) {
      toast({
        title: "No Image Selected",
        description: "Please select an image to search for similar photos.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSelectedResults(new Set());

    try {
      // Convert search options to service options
      const serviceOptions: Partial<VisualAnalysisOptions> = {
        enableSimilaritySearch: true,
        similarityThreshold: searchOptions.threshold,
        maxResults: searchOptions.maxResults,
      };

      const result = await analysisService.findSimilarImages(
        selectedImage,
        imageAnalysis?.embedding || [],
        serviceOptions as VisualAnalysisOptions
      );

      setSearchResults(result);

      toast({
        title: "Search Complete",
        description: `Found ${result.similarPhotos.length} similar images in ${result.searchTime}ms.`,
      });
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Could not complete the similarity search.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleResultSelection = (imagePath: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(imagePath)) {
      newSelected.delete(imagePath);
    } else {
      newSelected.add(imagePath);
    }
    setSelectedResults(newSelected);
  };

  const downloadSimilarImages = () => {
    // Create a download of the similar images list
    const data = {
      queryImage: selectedImage,
      searchOptions,
      results: searchResults?.similarPhotos || [],
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `similarity_search_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSimilarityScoreColor = (score: number) => {
    if (score >= 0.9) return "text-green-600";
    if (score >= 0.8) return "text-blue-600";
    if (score >= 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const getSimilarityScoreBadge = (score: number) => {
    if (score >= 0.9)
      return { variant: "default" as const, label: "Very Similar" };
    if (score >= 0.8)
      return { variant: "secondary" as const, label: "Similar" };
    if (score >= 0.7)
      return { variant: "outline" as const, label: "Somewhat Similar" };
    return { variant: "destructive" as const, label: "Dissimilar" };
  };

  return (
    <div className="visual-similarity-search">
      {/* Header */}
      <div className="search-header">
        <div className="search-title">
          <h3 className="text-lg font-semibold">Visual Similarity Search</h3>
          <p className="text-sm text-muted-foreground">
            Find visually similar photos using AI-powered analysis
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Settings className="w-4 h-4 mr-2" />
          {showAdvanced ? "Simple" : "Advanced"}
        </Button>
      </div>

      <div className="search-content">
        {/* Query Image Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Query Image</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedImage ? (
              <div className="query-image-container">
                <div className="query-image">
                  <img
                    src={selectedImage}
                    alt="Query image"
                    className="w-full h-48 object-cover rounded"
                  />
                  {imageAnalysis && (
                    <div className="image-analysis-summary">
                      <div className="analysis-grid">
                        <div className="analysis-item">
                          <span className="text-xs">Quality</span>
                          <Progress
                            value={imageAnalysis.quality.overall * 100}
                            className="h-2"
                          />
                        </div>
                        <div className="analysis-item">
                          <span className="text-xs">Composition</span>
                          <Progress
                            value={imageAnalysis.composition.overallScore * 100}
                            className="h-2"
                          />
                        </div>
                      </div>
                      {imageAnalysis.colors.length > 0 && (
                        <div className="color-palette">
                          {imageAnalysis.colors
                            .slice(0, 6)
                            .map((color, index) => (
                              <div
                                key={index}
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="query-info">
                  <h4 className="font-medium">
                    {selectedImage.split("/").pop()}
                  </h4>
                  {imageAnalysis && (
                    <div className="detected-elements">
                      {imageAnalysis.objects.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {imageAnalysis.objects.length} objects
                        </Badge>
                      )}
                      {imageAnalysis.faces.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {imageAnalysis.faces.length} faces
                        </Badge>
                      )}
                      {imageAnalysis.scene && (
                        <Badge variant="outline" className="text-xs">
                          {imageAnalysis.scene.category}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="no-query-image">
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select an image to start similarity search
                </p>
              </div>
            )}

            {!selectedImage && availableImages.length > 0 && (
              <div className="image-selection">
                <Input
                  placeholder="Enter image path or select from gallery"
                  value={selectedImage}
                  onChange={(e) => setSelectedImage(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="search-mode">
              <label className="text-sm font-medium">Search Mode</label>
              <Select
                value={searchOptions.searchMode}
                onValueChange={(value: string | number) =>
                  setSearchOptions((prev) => ({
                    ...prev,
                    searchMode: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visual">Overall Visual</SelectItem>
                  <SelectItem value="color">Color Palette</SelectItem>
                  <SelectItem value="composition">Composition</SelectItem>
                  <SelectItem value="style">Style & Mood</SelectItem>
                  <SelectItem value="objects">Objects & Content</SelectItem>
                  <SelectItem value="mixed">Mixed Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="threshold-control">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">
                  Similarity Threshold
                </label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(searchOptions.threshold * 100)}%
                </span>
              </div>
              <Slider
                value={[searchOptions.threshold]}
                onValueChange={([value]) =>
                  setSearchOptions((prev) => ({
                    ...prev,
                    threshold: value,
                  }))
                }
                min={0.5}
                max={0.95}
                step={0.05}
                className="w-full"
              />
            </div>

            <div className="max-results">
              <label className="text-sm font-medium">Maximum Results</label>
              <Select
                value={searchOptions.maxResults.toString()}
                onValueChange={(value) =>
                  setSearchOptions((prev) => ({
                    ...prev,
                    maxResults: parseInt(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 results</SelectItem>
                  <SelectItem value="20">20 results</SelectItem>
                  <SelectItem value="50">50 results</SelectItem>
                  <SelectItem value="100">100 results</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showAdvanced && (
              <div className="advanced-options space-y-3">
                <div className="checkbox-options">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeMetadata"
                      checked={searchOptions.includeMetadata}
                      onCheckedChange={(checked) =>
                        setSearchOptions((prev) => ({
                          ...prev,
                          includeMetadata: checked as boolean,
                        }))
                      }
                    />
                    <label htmlFor="includeMetadata" className="text-sm">
                      Include Metadata in Search
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="faceMatching"
                      checked={searchOptions.faceMatching}
                      onCheckedChange={(checked) =>
                        setSearchOptions((prev) => ({
                          ...prev,
                          faceMatching: checked as boolean,
                        }))
                      }
                    />
                    <label htmlFor="faceMatching" className="text-sm">
                      Face Matching
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sceneMatching"
                      checked={searchOptions.sceneMatching}
                      onCheckedChange={(checked) =>
                        setSearchOptions((prev) => ({
                          ...prev,
                          sceneMatching: checked as boolean,
                        }))
                      }
                    />
                    <label htmlFor="sceneMatching" className="text-sm">
                      Scene Matching
                    </label>
                  </div>
                </div>

                {searchOptions.searchMode === "mixed" && (
                  <div className="weight-controls space-y-2">
                    <label className="text-sm font-medium">
                      Analysis Weights
                    </label>
                    {[
                      {
                        key: "colorWeight",
                        label: "Color",
                        value: searchOptions.colorWeight,
                      },
                      {
                        key: "compositionWeight",
                        label: "Composition",
                        value: searchOptions.compositionWeight,
                      },
                      {
                        key: "styleWeight",
                        label: "Style",
                        value: searchOptions.styleWeight,
                      },
                      {
                        key: "objectWeight",
                        label: "Objects",
                        value: searchOptions.objectWeight,
                      },
                    ].map(({ key, label, value }) => (
                      <div key={key} className="weight-control">
                        <div className="flex justify-between">
                          <span className="text-xs">{label}</span>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(value * 100)}%
                          </span>
                        </div>
                        <Slider
                          value={[value]}
                          onValueChange={([newValue]) =>
                            setSearchOptions((prev) => ({
                              ...prev,
                              [key]: newValue,
                            }))
                          }
                          min={0}
                          max={1}
                          step={0.05}
                          className="h-1"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={performSimilaritySearch}
              disabled={!selectedImage || isSearching}
              className="w-full"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Find Similar Images
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">
                  Similar Images ({searchResults.similarPhotos.length})
                </CardTitle>
                <div className="search-stats">
                  <Badge variant="outline" className="text-xs">
                    {searchResults.totalCompared} compared
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {searchResults.searchTime}ms
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {searchResults.similarPhotos.length > 0 ? (
                <div className="similar-images-grid">
                  {searchResults.similarPhotos.map((result, index) => {
                    const badgeInfo = getSimilarityScoreBadge(result.score);
                    return (
                      <div
                        key={index}
                        className={`similar-image-item ${
                          selectedResults.has(result.path) ? "selected" : ""
                        }`}
                        onClick={() => toggleResultSelection(result.path)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="image-container">
                          <img
                            src={result.path}
                            alt={`Similar image ${index + 1}`}
                            className="w-full h-32 object-cover rounded"
                          />
                          <div className="image-overlay">
                            <Eye className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="image-info">
                          <div className="similarity-score">
                            <span
                              className={`score ${getSimilarityScoreColor(
                                result.score
                              )}`}
                            >
                              {Math.round(result.score * 100)}%
                            </span>
                            <Badge
                              variant={badgeInfo.variant}
                              className="text-xs"
                            >
                              {badgeInfo.label}
                            </Badge>
                          </div>
                          <p className="image-path text-xs text-muted-foreground truncate">
                            {result.path.split("/").pop()}
                          </p>
                          <p className="similarity-reason text-xs text-muted-foreground">
                            {result.reason}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-results">
                  <Filter className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No similar images found with the current threshold
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try lowering the similarity threshold
                  </p>
                </div>
              )}

              {selectedResults.size > 0 && (
                <div className="selected-actions">
                  <p className="text-sm text-muted-foreground">
                    {selectedResults.size} images selected
                  </p>
                  <div className="action-buttons">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadSimilarImages}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Results
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default VisualSimilaritySearch;
