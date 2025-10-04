import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Edit3, User, UserCheck, Play, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { usePhotoStore } from "../store/photoStore";
import { apiClient, type FaceCluster } from "../services/api";

export function People() {
  const {
    currentDirectory,
    faceClusters,
    setFaceClusters,
    setPhotos,
    setLoading,
  } = usePhotoStore();

  const [isBuilding, setIsBuilding] = useState(false);
  const [isFaceDialogOpen, setIsFaceDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<FaceCluster | null>(
    null
  );
  const [newName, setNewName] = useState("");
  const [isNaming, setIsNaming] = useState(false);

  // Load face clusters when directory changes
  useEffect(() => {
    const loadFaceClusters = async () => {
      if (currentDirectory) {
        try {
          const response = await apiClient.getFaceClusters(currentDirectory);
          setFaceClusters(response.clusters);
        } catch (error) {
          console.error("Failed to load face clusters:", error);
        }
      }
    };
    loadFaceClusters();
  }, [currentDirectory, setFaceClusters]);

  const handleBuildFaces = async () => {
    if (!currentDirectory) return;

    setIsBuilding(true);
    try {
      const response = await apiClient.buildFaces(currentDirectory, "local");
      setFaceClusters(response.clusters);
    } catch (error) {
      console.error("Failed to build faces:", error);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleNameCluster = async () => {
    if (!selectedCluster || !newName.trim() || !currentDirectory) return;

    setIsNaming(true);
    try {
      await apiClient.nameFaceCluster(
        currentDirectory,
        selectedCluster.id,
        newName
      );

      // Update local state
      const updatedClusters = faceClusters.map((cluster: FaceCluster) =>
        cluster.id === selectedCluster.id
          ? { ...cluster, name: newName }
          : cluster
      );
      setFaceClusters(updatedClusters);

      setNewName("");
      setSelectedCluster(null);
      setIsFaceDialogOpen(false);
    } catch (error) {
      console.error("Failed to name face cluster:", error);
    } finally {
      setIsNaming(false);
    }
  };

  const handleOpenCluster = async (cluster: FaceCluster) => {
    setLoading(true);
    try {
      // Create photo objects from cluster examples
      const clusterPhotos = cluster.examples.map(([path, score], index) => ({
        id: index + 1,
        path,
        src: apiClient.getPhotoUrl(path),
        title: path.split("/").pop() || `Photo ${index + 1}`,
        score,
      }));
      setPhotos(clusterPhotos);
    } catch (error) {
      console.error("Failed to open cluster:", error);
    } finally {
      setLoading(false);
    }
  };

  const openNameDialog = (cluster: FaceCluster) => {
    setSelectedCluster(cluster);
    setNewName(cluster.name || "");
    setIsFaceDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">People</h1>
          <Badge variant="secondary">{faceClusters.length}</Badge>
        </div>

        <Button
          onClick={handleBuildFaces}
          disabled={!currentDirectory || isBuilding}
        >
          {isBuilding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Building...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Build Faces
            </>
          )}
        </Button>
      </div>

      {!currentDirectory ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No directory selected
          </h3>
          <p className="text-gray-500">
            Please select a photo directory to detect faces
          </p>
        </div>
      ) : faceClusters.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No faces detected yet
          </h3>
          <p className="text-gray-500 mb-4">
            Build face clusters to automatically group photos by people
          </p>
          <Button onClick={handleBuildFaces} disabled={isBuilding}>
            {isBuilding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Building faces...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Build Faces
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {faceClusters.map((cluster) => (
              <motion.div
                key={cluster.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-4 hover:shadow-lg transition-shadow">
                  <button
                    type="button"
                    className="w-full text-left mb-3"
                    onClick={() => handleOpenCluster(cluster)}
                  >
                    <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                      {cluster.examples.length > 0 ? (
                        <div className="relative">
                          <img
                            src={apiClient.getThumbnailUrl(
                              cluster.examples[0][0],
                              200
                            )}
                            alt="Person"
                            className="w-full h-full object-cover"
                          />
                          {cluster.examples.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                              +{cluster.examples.length - 1}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate">
                        {cluster.name || `Person ${cluster.id}`}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openNameDialog(cluster)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{cluster.size} photos</span>
                      {cluster.name ? (
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800"
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Named
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <User className="h-3 w-3 mr-1" />
                          Unnamed
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Name Face Dialog */}
      <Dialog open={isFaceDialogOpen} onOpenChange={setIsFaceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCluster?.name ? "Rename Person" : "Name Person"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCluster && (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                  {selectedCluster.examples.length > 0 ? (
                    <img
                      src={apiClient.getThumbnailUrl(
                        selectedCluster.examples[0][0],
                        100
                      )}
                      alt="Person"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {selectedCluster.name || `Person ${selectedCluster.id}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedCluster.size} photos
                  </p>
                </div>
              </div>
            )}

            <Input
              placeholder="Enter person's name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  handleNameCluster();
                }
              }}
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsFaceDialogOpen(false);
                  setSelectedCluster(null);
                  setNewName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleNameCluster}
                disabled={!newName.trim() || isNaming}
              >
                {isNaming ? "Saving..." : "Save Name"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
