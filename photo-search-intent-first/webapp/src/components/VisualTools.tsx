/**
 * Visual Tools Component
 * Main hub for advanced visual analysis and creative tools
 */

import {
  Edit3,
  Eye,
  Image as ImageIcon,
  Search,
  Settings,
  Sliders,
  Sparkles,
  Wand2,
} from "lucide-react";
import React, { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import BatchEditor from "./BatchEditor";
import CreativeEditor from "./CreativeEditor";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "./ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import VisualSimilaritySearch from "./VisualSimilaritySearch";

interface VisualToolsProps {
  selectedImages?: string[];
  onImageSelect?: (path: string) => void;
  onPhotoView?: (photo: { path: string }) => void;
  availableImages?: string[];
}

export function VisualTools({
  selectedImages = [],
  onImageSelect,
  onPhotoView,
  availableImages = [],
}: VisualToolsProps) {
  const [activeTab, setActiveTab] = useState("editor");
  const [currentImage, setCurrentImage] = useState<string>("");
  const [selectedImagesForTools, setSelectedImagesForTools] =
    useState<string[]>(selectedImages);

  const { toast } = useToast();

  const handleImageSelect = useCallback(
    (imagePath: string) => {
      setCurrentImage(imagePath);
      if (onImageSelect) {
        onImageSelect(imagePath);
      }
    },
    [onImageSelect]
  );

  const handleBatchImageSelect = useCallback((images: string[]) => {
    setSelectedImagesForTools(images);
  }, []);

  return (
    <div className="visual-tools">
      {/* Header */}
      <div className="tools-header">
        <div className="tools-title">
          <div className="title-icon">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              Visual Analysis & Creative Tools
            </h2>
            <p className="text-sm text-muted-foreground">
              Advanced image editing, visual search, and batch processing
            </p>
          </div>
        </div>
        <div className="tools-actions">
          {currentImage && (
            <div className="current-image-info">
              <Badge variant="outline" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                {currentImage.split("/").pop()}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Tools Overview */}
      <div className="tools-overview">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="tools-grid">
              <div
                className={`tool-card ${
                  activeTab === "editor" ? "active" : ""
                }`}
                onClick={() => setActiveTab("editor")}
                role="button"
                tabIndex={0}
              >
                <div className="tool-icon">
                  <Edit3 className="w-8 h-8" />
                </div>
                <div className="tool-info">
                  <h4 className="font-medium">Creative Editor</h4>
                  <p className="text-xs text-muted-foreground">
                    Apply filters, adjustments, and creative effects to your
                    photos
                  </p>
                  <Badge variant="secondary" className="text-xs mt-2">
                    AI-Powered
                  </Badge>
                </div>
              </div>

              <div
                className={`tool-card ${
                  activeTab === "similarity" ? "active" : ""
                }`}
                onClick={() => setActiveTab("similarity")}
                role="button"
                tabIndex={0}
              >
                <div className="tool-icon">
                  <Search className="w-8 h-8" />
                </div>
                <div className="tool-info">
                  <h4 className="font-medium">Visual Similarity</h4>
                  <p className="text-xs text-muted-foreground">
                    Find visually similar photos using advanced AI analysis
                  </p>
                  <Badge variant="secondary" className="text-xs mt-2">
                    Machine Learning
                  </Badge>
                </div>
              </div>

              <div
                className={`tool-card ${activeTab === "batch" ? "active" : ""}`}
                onClick={() => setActiveTab("batch")}
                role="button"
                tabIndex={0}
              >
                <div className="tool-icon">
                  <Sliders className="w-8 h-8" />
                </div>
                <div className="tool-info">
                  <h4 className="font-medium">Batch Editor</h4>
                  <p className="text-xs text-muted-foreground">
                    Apply edits and operations to multiple photos at once
                  </p>
                  <Badge variant="secondary" className="text-xs mt-2">
                    Time Saver
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tools Interface */}
      <div className="tools-interface">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Creative Editor
            </TabsTrigger>
            <TabsTrigger value="similarity" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Similarity Search
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Batch Editor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-6">
            {currentImage ? (
              <CreativeEditor
                imagePath={currentImage}
                onImageSelect={handleImageSelect}
                onPhotoView={onPhotoView}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Edit3 className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Image Selected
                  </h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Select an image from your library to start using the
                    Creative Editor
                  </p>
                  {availableImages.length > 0 && (
                    <div className="image-selection">
                      <p className="text-xs text-muted-foreground mb-2">
                        Or choose from available images:
                      </p>
                      <div className="quick-select-grid">
                        {availableImages.slice(0, 6).map((image, index) => (
                          <button
                            type="button"
                            key={index}
                            onClick={() => handleImageSelect(image)}
                            className="quick-select-item"
                          >
                            <img
                              src={image}
                              alt={`Option ${index + 1}`}
                              className="w-full h-16 object-cover rounded"
                            />
                            <span className="text-xs text-muted-foreground truncate">
                              {image.split("/").pop()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="similarity" className="mt-6">
            <VisualSimilaritySearch
              queryImagePath={currentImage}
              onImageSelect={handleImageSelect}
              onPhotoView={onPhotoView}
              availableImages={availableImages}
            />
          </TabsContent>

          <TabsContent value="batch" className="mt-6">
            <BatchEditor
              selectedImages={selectedImagesForTools}
              onImagesUpdate={handleBatchImageSelect}
              onPhotoView={onPhotoView}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="quick-action-buttons">
              {availableImages.length > 0 && !currentImage && (
                <Button
                  variant="outline"
                  onClick={() => handleImageSelect(availableImages[0])}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Load First Image
                </Button>
              )}

              {selectedImagesForTools.length > 1 && (
                <Button variant="outline" onClick={() => setActiveTab("batch")}>
                  <Sliders className="w-4 h-4 mr-2" />
                  Batch Edit {selectedImagesForTools.length} Images
                </Button>
              )}

              {currentImage && (
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("similarity")}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Find Similar to Current
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setCurrentImage("");
                  setSelectedImagesForTools([]);
                  setActiveTab("editor");
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                Reset Tools
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VisualTools;
