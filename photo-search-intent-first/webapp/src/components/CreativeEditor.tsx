/**
 * Creative Editor Component
 * Advanced visual editing with filters, adjustments, and creative effects
 */

import {
  Crop,
  Download,
  Eye,
  EyeOff,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Share2,
  Sliders,
  Undo2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import VisualAnalysisService, {
  type CreativeFilter,
  type EditOperation,
  type VisualAnalysisResult,
} from "../services/VisualAnalysisService";
import { Button, Card, CardContent, CardHeader, CardTitle } from "./ui";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Slider } from "./ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface CreativeEditorProps {
  imagePath: string;
  onImageSelect?: (path: string) => void;
  onPhotoView?: (photo: { path: string }) => void;
}

export interface EditHistory {
  operation: EditOperation;
  timestamp: number;
  thumbnail?: string;
}

export function CreativeEditor({
  imagePath,
  onImageSelect,
  onPhotoView,
}: CreativeEditorProps) {
  const [analysis, setAnalysis] = useState<VisualAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("");
  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    sharpness: 0,
    warmth: 0,
    clarity: 0,
    vignette: 0,
  });
  const [cropMode, setCropMode] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedImagePath, setEditedImagePath] = useState<string>("");

  const { toast } = useToast();
  const analysisService = useRef(VisualAnalysisService.getInstance());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const filters = analysisService.current.getCreativeFilters();

  useEffect(() => {
    if (imagePath) {
      analyzeImage();
    }
  }, [imagePath]);

  const analyzeImage = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analysisService.current.analyzeImage(imagePath, {
        enableObjectDetection: true,
        enableColorAnalysis: true,
        enableStyleAnalysis: true,
        enableCompositionAnalysis: true,
        enableQualityAnalysis: true,
      });
      setAnalysis(result);
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyFilter = useCallback(
    (filter: CreativeFilter) => {
      setSelectedFilter(filter.id);
      const operation: EditOperation = {
        type: "filter",
        filter,
        adjustments: { ...adjustments },
      };
      addToHistory(operation);
    },
    [adjustments]
  );

  const updateAdjustment = useCallback(
    (key: keyof typeof adjustments, value: number) => {
      const newAdjustments = { ...adjustments, [key]: value };
      setAdjustments(newAdjustments);

      if (selectedFilter) {
        // Create a combined operation if a filter is active
        const operation: EditOperation = {
          type: "filter",
          filter: filters.find((f) => f.id === selectedFilter),
          adjustments: newAdjustments,
        };
        addToHistory(operation);
      } else {
        // Create adjustment-only operation
        const operation: EditOperation = {
          type: "adjustment",
          adjustments: newAdjustments,
        };
        addToHistory(operation);
      }
    },
    [adjustments, selectedFilter]
  );

  const addToHistory = useCallback(
    (operation: EditOperation) => {
      const historyItem: EditHistory = {
        operation,
        timestamp: Date.now(),
      };

      // If we're not at the end of history, truncate
      const newHistory = editHistory.slice(0, historyIndex + 1);
      newHistory.push(historyItem);

      setEditHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [editHistory, historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      applyHistoryState(historyIndex - 1);
    }
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < editHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      applyHistoryState(historyIndex + 1);
    }
  }, [historyIndex, editHistory]);

  const applyHistoryState = useCallback(
    (index: number) => {
      if (index < 0 || index >= editHistory.length) return;

      const state = editHistory[index];
      if (state.operation.filter) {
        setSelectedFilter(state.operation.filter.id);
      }
      if (state.operation.adjustments) {
        setAdjustments(state.operation.adjustments);
      }
      if (state.operation.rotation) {
        setRotation(state.operation.rotation);
      }
    },
    [editHistory]
  );

  const resetAll = useCallback(() => {
    setAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      sharpness: 0,
      warmth: 0,
      clarity: 0,
      vignette: 0,
    });
    setSelectedFilter("");
    setRotation(0);
    setZoom(1);
    setCropMode(false);
    setEditHistory([]);
    setHistoryIndex(-1);
  }, []);

  const applyEdits = async () => {
    setIsProcessing(true);
    try {
      const edits: EditOperation[] = [];

      if (selectedFilter) {
        const filter = filters.find((f) => f.id === selectedFilter);
        if (filter) {
          edits.push({
            type: "filter",
            filter,
            adjustments,
          });
        }
      } else if (Object.values(adjustments).some((v) => v !== 0)) {
        edits.push({
          type: "adjustment",
          adjustments,
        });
      }

      if (rotation !== 0) {
        edits.push({
          type: "rotate",
          rotation,
        });
      }

      if (edits.length > 0) {
        const result = await analysisService.current.applyCreativeEdits(
          imagePath,
          edits
        );
        setEditedImagePath(result);

        toast({
          title: "Edits Applied Successfully",
          description: "Your creative edits have been applied to the image.",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Apply Edits",
        description:
          "An error occurred while applying your edits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = editedImagePath || imagePath;
    link.download = `edited_${Date.now()}.jpg`;
    link.click();
  };

  const getFilterStyle = () => {
    if (!selectedFilter) return {};

    const filter = filters.find((f) => f.id === selectedFilter);
    if (!filter) return {};

    const cssFilters = [];

    if (adjustments.brightness)
      cssFilters.push(`brightness(${1 + adjustments.brightness})`);
    if (adjustments.contrast)
      cssFilters.push(`contrast(${1 + adjustments.contrast})`);
    if (adjustments.saturation)
      cssFilters.push(`saturate(${1 + adjustments.saturation})`);
    if (adjustments.hue)
      cssFilters.push(`hue-rotate(${adjustments.hue * 360}deg)`);
    if (adjustments.sharpness)
      cssFilters.push(`contrast(${1 + adjustments.sharpness * 0.5})`);
    if (adjustments.warmth)
      cssFilters.push(`sepia(${Math.abs(adjustments.warmth * 0.3)})`);
    if (adjustments.vignette)
      cssFilters.push(
        `radial-gradient(circle, transparent 50%, rgba(0,0,0,${adjustments.vignette}) 100%)`
      );

    return {
      filter: cssFilters.join(" "),
    };
  };

  return (
    <div className="creative-editor">
      {/* Header */}
      <div className="editor-header">
        <div className="editor-controls">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= editHistory.length - 1}
          >
            <Redo2 className="w-4 h-4" />
            Redo
          </Button>
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <div className="editor-zoom">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span>{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewEnabled(!isPreviewEnabled)}
          >
            {isPreviewEnabled ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            {isPreviewEnabled ? "Hide Preview" : "Show Preview"}
          </Button>
        </div>
        <div className="editor-actions">
          <Button
            onClick={applyEdits}
            disabled={
              isProcessing ||
              (!selectedFilter &&
                Object.values(adjustments).every((v) => v === 0) &&
                rotation === 0)
            }
          >
            {isProcessing ? (
              <>
                <div className="animate-spin mr-2">⟳</div>
                Processing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Apply Edits
              </>
            )}
          </Button>
          {editedImagePath && (
            <>
              <Button variant="outline" onClick={downloadImage}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="editor-content">
        {/* Image Preview */}
        <div className="image-preview">
          <div
            className="image-container"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          >
            <img
              ref={imageRef}
              src={editedImagePath || imagePath}
              alt="Edit preview"
              style={isPreviewEnabled ? getFilterStyle() : {}}
            />
            {cropMode && (
              <div className="crop-overlay">
                <div className="crop-box"></div>
              </div>
            )}
          </div>

          {analysis && (
            <Card className="analysis-panel">
              <CardHeader>
                <CardTitle className="text-sm">Image Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="quality-metrics">
                  <div className="metric">
                    <span>Quality</span>
                    <Progress
                      value={analysis.quality.overall * 100}
                      className="h-2"
                    />
                  </div>
                  <div className="metric">
                    <span>Sharpness</span>
                    <Progress
                      value={analysis.quality.sharpness * 100}
                      className="h-2"
                    />
                  </div>
                  <div className="metric">
                    <span>Composition</span>
                    <Progress
                      value={analysis.composition.overallScore * 100}
                      className="h-2"
                    />
                  </div>
                </div>

                {analysis.colors.length > 0 && (
                  <div className="color-palette">
                    <span className="text-xs font-medium">Colors</span>
                    <div className="flex gap-1">
                      {analysis.colors.slice(0, 5).map((color, index) => (
                        <div
                          key={index}
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: color.hex }}
                          title={color.name || color.hex}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {analysis.objects.length > 0 && (
                  <div className="detected-objects">
                    <span className="text-xs font-medium">Objects</span>
                    <div className="flex flex-wrap gap-1">
                      {analysis.objects.slice(0, 3).map((obj, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {obj.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Editing Controls */}
        <div className="editing-controls">
          <Tabs defaultValue="filters" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="adjust">Adjust</TabsTrigger>
              <TabsTrigger value="transform">Transform</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Creative Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {filters.map((filter) => (
                      <button
                        type="button"
                        key={filter.id}
                        className={`filter-option ${
                          selectedFilter === filter.id ? "active" : ""
                        }`}
                        onClick={() => applyFilter(filter)}
                      >
                        <div className="filter-preview" />
                        <span className="filter-name">{filter.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {filter.category}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjust" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Adjustments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(adjustments).map(([key, value]) => (
                    <div key={key} className="adjustment-control">
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </label>
                        <span className="text-sm text-muted-foreground">
                          {value > 0 ? "+" : ""}
                          {Math.round(value * 100)}%
                        </span>
                      </div>
                      <Slider
                        value={[value]}
                        onValueChange={([newValue]) =>
                          updateAdjustment(
                            key as keyof typeof adjustments,
                            newValue
                          )
                        }
                        min={-1}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transform" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Transform</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="transform-controls">
                    <div className="control-group">
                      <label>Rotation</label>
                      <div className="button-group">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRotation(rotation - 90)}
                        >
                          <RotateCw className="w-4 h-4" />
                          -90°
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRotation(0)}
                        >
                          Reset
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRotation(rotation + 90)}
                        >
                          <RotateCw className="w-4 h-4" />
                          +90°
                        </Button>
                      </div>
                    </div>

                    <div className="control-group">
                      <label>Crop</label>
                      <Button
                        variant={cropMode ? "default" : "outline"}
                        onClick={() => setCropMode(!cropMode)}
                      >
                        <Crop className="w-4 h-4 mr-2" />
                        {cropMode ? "Exit Crop" : "Crop Image"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Visual Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {isAnalyzing ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin mr-2">⟳</div>
                      Analyzing image...
                    </div>
                  ) : analysis ? (
                    <div className="analysis-details">
                      <div className="section">
                        <h4>Composition</h4>
                        <div className="metrics">
                          <div className="metric">
                            <span>Rule of Thirds</span>
                            <Progress
                              value={analysis.composition.ruleOfThirds * 100}
                            />
                          </div>
                          <div className="metric">
                            <span>Balance</span>
                            <Progress
                              value={analysis.composition.balance * 100}
                            />
                          </div>
                          <div className="metric">
                            <span>Depth</span>
                            <Progress
                              value={analysis.composition.depth * 100}
                            />
                          </div>
                        </div>
                      </div>

                      {analysis.faces.length > 0 && (
                        <div className="section">
                          <h4>Detected Faces</h4>
                          <div className="face-info">
                            {analysis.faces.map((face, index) => (
                              <div key={index} className="face-item">
                                <Badge variant="outline">
                                  Face {index + 1}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {face.emotion} • {face.age} years
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysis.scene && (
                        <div className="section">
                          <h4>Scene Analysis</h4>
                          <div className="scene-info">
                            <Badge>{analysis.scene.category}</Badge>
                            <p className="text-sm text-muted-foreground">
                              {analysis.scene.description}
                            </p>
                            <div className="scene-details">
                              <span>Lighting: {analysis.scene.lighting}</span>
                              {analysis.scene.timeOfDay && (
                                <span>Time: {analysis.scene.timeOfDay}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No analysis available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default CreativeEditor;
