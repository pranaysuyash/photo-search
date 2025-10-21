import { Folder, Image, Sparkles, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useElectronBridge } from "@/hooks/useElectronBridge";
import { DEMO_LIBRARY_DIR } from "@/constants/directories";

interface FolderSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDirectorySelect: (dir: string) => void;
}

const RECOMMENDED_FOLDERS = [
  {
    name: "Photos",
    description: "Your main photo library",
    icon: Image,
    path: "/Users/Shared/Photos", // This will be platform-specific in real implementation
  },
  {
    name: "Desktop",
    description: "Files on your desktop",
    icon: File,
    path: "/Users/Shared/Desktop",
  },
  {
    name: "Documents",
    description: "Document folders with images",
    icon: File,
    path: "/Users/Shared/Documents",
  },
];

export function FolderSelector({
  open,
  onOpenChange,
  onDirectorySelect,
}: FolderSelectorProps) {
  const { selectFolder } = useElectronBridge();

  const handleSelectDemo = () => {
    onDirectorySelect(DEMO_LIBRARY_DIR);
    onOpenChange(false);
  };

  const handleCustomFolder = async () => {
    try {
      const selectedDir = await selectFolder();
      if (typeof selectedDir === "string" && selectedDir.trim().length > 0) {
        onDirectorySelect(selectedDir);
        onOpenChange(false);
      }
    } catch (error) {
      console.warn("Directory selection failed:", error);
    }
  };

  const handleQuickSelect = (folderName: string) => {
    // This would need to be implemented with actual platform-specific paths
    // For now, just show a message about the concept
    console.log(`Quick select ${folderName} - would need platform integration`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            Welcome to Photo Search
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600 dark:text-slate-300 mb-6">
            Get started by selecting a photo library to explore
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Demo Library */}
          <Button
            variant="outline"
            className="w-full h-20 justify-start border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
            onClick={handleSelectDemo}
          >
            <div className="flex items-center justify-start w-full">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-lg mr-4">
                <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-200" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900 dark:text-white">
                  Try Demo Library
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Explore with sample photos (recommended for first-time users)
                </div>
              </div>
            </div>
          </Button>

          {/* Custom Folder Selection */}
          <Button
            variant="outline"
            className="w-full h-20 justify-start border-2 border-dashed border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors"
            onClick={handleCustomFolder}
          >
            <div className="flex items-center justify-start w-full">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-800 rounded-lg mr-4">
                <Folder className="h-6 w-6 text-green-600 dark:text-green-200" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900 dark:text-white">
                  Select Your Photos
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Choose any folder on your computer
                </div>
              </div>
            </div>
          </Button>

          {/* Quick Folders (concept for future implementation) */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Quick Access (Concept)
            </div>
            <div className="space-y-2">
              {RECOMMENDED_FOLDERS.map((folder) => (
                <Button
                  key={folder.name}
                  variant="ghost"
                  className="w-full justify-start opacity-50 hover:opacity-100"
                  onClick={() => handleQuickSelect(folder.name)}
                  disabled
                >
                  <folder.icon className="h-4 w-4 mr-3 text-slate-400 dark:text-slate-500" />
                  <div className="text-left">
                    <div className="font-medium text-sm text-gray-700 dark:text-gray-300">
                      {folder.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {folder.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-xs text-center text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>How it works:</strong> Photos are indexed locally on your
              device for fast, private search. No images are uploaded to any
              servers. The first indexing may take a few minutes for large
              libraries.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
