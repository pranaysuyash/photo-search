import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, FolderOpen, Image } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { usePhotoStore } from "../store/photoStore";
import { apiClient, type Collection as CollectionType } from "../services/api";

export function Collections() {
  const {
    currentDirectory,
    collections,
    setCollections,
    photos,
    setPhotos,
    setLoading,
  } = usePhotoStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Load collections when directory changes
  useEffect(() => {
    const loadCollections = async () => {
      if (currentDirectory) {
        try {
          const response = await apiClient.getCollections(currentDirectory);
          setCollections(response.collections);
        } catch (error) {
          console.error("Failed to load collections:", error);
        }
      }
    };
    loadCollections();
  }, [currentDirectory, setCollections]);

  const handleCreateCollection = async () => {
    if (
      !newCollectionName.trim() ||
      selectedPhotos.length === 0 ||
      !currentDirectory
    ) {
      return;
    }

    setIsCreating(true);
    try {
      await apiClient.setCollection(
        currentDirectory,
        newCollectionName,
        selectedPhotos
      );

      // Update local state
      const newCollection: CollectionType = {
        name: newCollectionName,
        photos: selectedPhotos,
        created: new Date().toISOString(),
      };
      setCollections({
        ...collections,
        [newCollectionName]: newCollection,
      });

      // Reset form
      setNewCollectionName("");
      setSelectedPhotos([]);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Failed to create collection:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCollection = async (name: string) => {
    if (!currentDirectory) return;

    try {
      await apiClient.deleteCollection(currentDirectory, name);

      // Update local state
      const updatedCollections = { ...collections };
      delete updatedCollections[name];
      setCollections(updatedCollections);
    } catch (error) {
      console.error("Failed to delete collection:", error);
    }
  };

  const handleOpenCollection = async (collection: CollectionType) => {
    setLoading(true);
    try {
      // Create photo objects from collection paths
      const collectionPhotos = collection.photos.map((path, index) => ({
        id: index + 1,
        path,
        src: apiClient.getPhotoUrl(path),
        title: path.split("/").pop() || `Photo ${index + 1}`,
      }));
      setPhotos(collectionPhotos);
    } catch (error) {
      console.error("Failed to open collection:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePhotoSelection = (photoPath: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoPath)
        ? prev.filter((path) => path !== photoPath)
        : [...prev, photoPath]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Collections</h1>
          <Badge variant="secondary">{Object.keys(collections).length}</Badge>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
              />

              <div className="space-y-2">
                <h3 className="font-medium">
                  Select Photos ({selectedPhotos.length} selected)
                </h3>
                <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                  {photos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      className={`relative rounded-md overflow-hidden border-2 ${
                        selectedPhotos.includes(photo.path)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => togglePhotoSelection(photo.path)}
                    >
                      <img
                        src={photo.src}
                        alt={photo.title}
                        className="w-full h-24 object-cover"
                      />
                      {selectedPhotos.includes(photo.path) && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCollection}
                  disabled={
                    !newCollectionName.trim() ||
                    selectedPhotos.length === 0 ||
                    isCreating
                  }
                >
                  {isCreating ? "Creating..." : "Create Collection"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(collections).length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No collections yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first collection to organize your photos
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {Object.entries(collections).map(([name, collection]) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-4 hover:shadow-lg transition-shadow">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => handleOpenCollection(collection)}
                  >
                    <div className="aspect-video bg-gray-100 rounded-md mb-3 overflow-hidden">
                      {collection.photos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1 h-full">
                          {collection.photos.slice(0, 4).map((photoPath) => (
                            <img
                              key={photoPath}
                              src={apiClient.getThumbnailUrl(photoPath, 150)}
                              alt="Collection item"
                              className="w-full h-full object-cover"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold truncate">{name}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{collection.photos.length} images</span>
                        {collection.created && (
                          <span>
                            {new Date(collection.created).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex justify-end mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCollection(name);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
