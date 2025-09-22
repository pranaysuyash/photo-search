import { Database, Info, Shield, Trash2 } from "lucide-react";
import type React from "react";
import { searchHistoryService } from "../services/SearchHistoryService";

interface SearchHistoryPrivacyProps {
	onClearHistory: () => void;
}

export function SearchHistoryPrivacy({
	onClearHistory,
}: SearchHistoryPrivacyProps): React.JSX.Element {
	const stats = searchHistoryService.getStorageStats();
	const config = searchHistoryService.getConfig();

	if (!config.ENABLED) {
		return (
			<div className="privacy-notice">
				<div className="flex items-center gap-2 mb-2">
					<Shield className="w-5 h-5 text-green-600" />
					<h3 className="font-semibold">Search History Privacy</h3>
				</div>
				<div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
					<Info className="w-4 h-4 inline mr-1" />
					Search history is currently disabled. No search data is being stored
					locally.
				</div>
			</div>
		);
	}

	return (
		<div className="privacy-notice space-y-4">
			<div className="flex items-center gap-2">
				<Shield className="w-5 h-5 text-blue-600" />
				<h3 className="font-semibold">Search History Privacy</h3>
			</div>

			<div className="text-sm space-y-3">
				<div className="bg-blue-50 p-3 rounded-lg">
					<div className="flex items-start gap-2">
						<Database className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
						<div>
							<p className="font-medium text-blue-900">Local Storage Only</p>
							<p className="text-blue-700">
								Your search history is stored locally in your browser and never
								leaves your device. No data is sent to external servers.
							</p>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
					<div>
						<p className="text-xs text-gray-500 uppercase tracking-wide">
							Stored Searches
						</p>
						<p className="font-semibold text-gray-900">{stats.totalEntries}</p>
					</div>
					<div>
						<p className="text-xs text-gray-500 uppercase tracking-wide">
							Storage Size
						</p>
						<p className="font-semibold text-gray-900">
							{formatBytes(stats.totalSize)}
						</p>
					</div>
				</div>

				<div className="bg-gray-50 p-3 rounded-lg">
					<div className="flex items-start gap-2">
						<Info className="w-4 h-4 mt-0.5 text-gray-600 flex-shrink-0" />
						<div>
							<p className="font-medium text-gray-900">Data Retention</p>
							<p className="text-gray-700">
								Search history is automatically cleaned after{" "}
								{config.MAX_AGE_DAYS} days. Only your most recent{" "}
								{config.MAX_HISTORY_ENTRIES} searches are kept.
							</p>
						</div>
					</div>
				</div>

				<div className="flex justify-between items-center pt-2">
					<p className="text-sm text-gray-600">
						You can clear your search history at any time using the button
						below.
					</p>
					<button
						type="button"
						onClick={onClearHistory}
						className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
						title="Clear all search history"
					>
						<Trash2 className="w-4 h-4" />
						Clear History
					</button>
				</div>
			</div>
		</div>
	);
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / k ** i).toFixed(1)) + " " + sizes[i];
}
