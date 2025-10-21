import { Image, Folder, RefreshCw, AlertCircle } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { FolderSelector } from "./FolderSelector";

interface EmptyLibraryStateProps {
  currentDirectory: string | null;
  onDirectorySelect: (dir: string) => void;
  onRetry?: () => void;
  error?: string | null;
  isLoading?: boolean;
}

export function EmptyLibraryState({
  currentDirectory,
  onDirectorySelect,
  onRetry,
  error,
  isLoading = false
}: EmptyLibraryStateProps) {
  const [showFolderSelector, setShowFolderSelector] = React.useState(false);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          {error}
        </p>
        <Button onClick={onRetry} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="max-w-md mx-auto">
        <Image className="h-24 w-24 text-gray-300 dark:text-gray-600 mb-6 mx-auto" />
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {currentDirectory
            ? "No photos found in this folder"
            : "Welcome to Photo Search"}
        </h3>

        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          {currentDirectory
            ? "This folder doesn't contain any photos we can process. Try selecting a different folder or check the folder permissions."
            : "Your personal photo library is just a few clicks away. Start by selecting a folder to explore your photos with AI-powered search."}
        </p>

        <Button
          onClick={() => setShowFolderSelector(true)}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-6 px-8 text-lg"
        >
          <Folder className="h-5 w-5 mr-3" />
          {currentDirectory ? "Select Different Folder" : "Get Started"}
        </Button>

        <p className="text-sm text-gray-400 dark:text-gray-500 mt-6">
          Photos are processed locally on your device. No images are uploaded to any servers.
        </p>
      </div>

      <FolderSelector
        open={showFolderSelector}
        onOpenChange={setShowFolderSelector}
        onDirectorySelect={onDirectorySelect}
      />
    </div>
  );
}