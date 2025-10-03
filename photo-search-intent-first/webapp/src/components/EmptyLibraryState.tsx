import { FolderOpen, Search } from "lucide-react";
import type React from "react";

interface EmptyLibraryStateProps {
	onSelectFolder: () => void;
}

export const EmptyLibraryState: React.FC<EmptyLibraryStateProps> = ({
	onSelectFolder,
}) => {
	return (
		<div className="flex flex-col items-center justify-center h-full p-8 gap-6">
			<div className="mb-6">
				<div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
					<FolderOpen className="w-12 h-12 text-blue-500" />
				</div>
				<h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
					No photos yet
				</h2>
				<p className="text-gray-600 dark:text-gray-400 max-w-md">
					Select a folder to start exploring your photos with AI-powered search.
				</p>
			</div>

			<div className="flex flex-col sm:flex-row gap-3">
				<button
					type="button"
					onClick={onSelectFolder}
					className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
				>
					<FolderOpen className="w-5 h-5" />
					Select Folder
				</button>

				<div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
					<Search className="w-4 h-4" />
					<span>Try searching: "beach sunset" or "family photos"</span>
				</div>
			</div>
		</div>
	);
};
