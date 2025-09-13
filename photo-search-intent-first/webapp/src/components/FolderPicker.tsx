import { AlertCircle, FolderOpen, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { API_BASE } from "../api";

interface FolderInfo {
	path: string;
	exists: boolean;
	files: number;
	bytes: number;
}

interface FolderPickerProps {
	onFolderSelect: (path: string) => void;
	currentPath?: string;
}

export default function FolderPicker({
	onFolderSelect,
	currentPath,
}: FolderPickerProps) {
	const [inputPath, setInputPath] = useState(currentPath || "");
	const [scanning, setScanning] = useState(false);
	const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null);
	const [error, setError] = useState<string>("");

	const scanFolder = useCallback(async (path: string) => {
		if (!path.trim()) return;

		setScanning(true);
		setError("");

		try {
			const response = await fetch(`${API_BASE}/scan_count`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify([path]),
			});

			if (!response.ok) {
				throw new Error("Failed to scan folder");
			}

			const data = await response.json();
			if (data.items && data.items.length > 0) {
				setFolderInfo(data.items[0]);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to scan folder");
			setFolderInfo(null);
		} finally {
			setScanning(false);
		}
	}, []);

	const handleScan = useCallback(() => {
		scanFolder(inputPath);
	}, [inputPath, scanFolder]);

	const handleSelect = useCallback(() => {
		if (folderInfo?.exists && folderInfo.files > 0) {
			onFolderSelect(folderInfo.path);
		}
	}, [folderInfo, onFolderSelect]);

	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	const commonFolders = [
		{ name: "Pictures", path: "~/Pictures" },
		{ name: "Desktop", path: "~/Desktop" },
		{ name: "Downloads", path: "~/Downloads" },
		{ name: "Documents", path: "~/Documents" },
	];

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<label
					htmlFor="folder-path-input"
					className="block text-sm font-medium text-gray-700"
				>
					Folder Path
				</label>
				<div className="flex gap-2">
					<input
						id="folder-path-input"
						type="text"
						value={inputPath}
						onChange={(e) => setInputPath(e.target.value)}
						placeholder="/path/to/your/photos or ~/Pictures"
						className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						onKeyPress={(e) => e.key === "Enter" && handleScan()}
					/>
					<button
						type="button"
						onClick={handleScan}
						disabled={scanning || !inputPath.trim()}
						className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{scanning ? (
							<>
								<RefreshCw className="w-4 h-4 animate-spin" />
								Scanning
							</>
						) : (
							<>
								<FolderOpen className="w-4 h-4" />
								Scan
							</>
						)}
					</button>
				</div>
			</div>

			{error && (
				<div className="flex items-center gap-2 text-red-600 text-sm">
					<AlertCircle className="w-4 h-4" />
					{error}
				</div>
			)}

			{folderInfo && (
				<div className="bg-gray-50 rounded-lg p-4">
					<div className="space-y-2">
						<div className="flex justify-between">
							<span className="text-sm font-medium">Path:</span>
							<span className="text-sm text-gray-600 truncate">
								{folderInfo.path}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm font-medium">Status:</span>
							<span
								className={`text-sm ${
									folderInfo.exists ? "text-green-600" : "text-red-600"
								}`}
							>
								{folderInfo.exists ? "Exists" : "Not Found"}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm font-medium">Photos Found:</span>
							<span className="text-sm text-gray-600">{folderInfo.files}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm font-medium">Total Size:</span>
							<span className="text-sm text-gray-600">
								{formatBytes(folderInfo.bytes)}
							</span>
						</div>
					</div>

					{folderInfo.exists && folderInfo.files > 0 && (
						<button
							type="button"
							onClick={handleSelect}
							className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
						>
							Use This Folder ({folderInfo.files} photos)
						</button>
					)}

					{folderInfo.exists && folderInfo.files === 0 && (
						<div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
							No photos found in this folder. Supported formats: JPG, PNG, GIF,
							TIF, WebP, HEIC, MP4, MOV, MKV, AVI, WebM
						</div>
					)}
				</div>
			)}

			<div className="space-y-2">
				<div className="text-sm font-medium text-gray-700">Quick Select:</div>
				<div className="grid grid-cols-2 gap-2">
					{commonFolders.map((folder) => (
						<button
							type="button"
							key={folder.path}
							onClick={() => {
								setInputPath(folder.path);
								scanFolder(folder.path);
							}}
							className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
						>
							{folder.name}
						</button>
					))}
				</div>
			</div>

			<div className="text-xs text-gray-500">
				Tip: You can also drag and drop a folder onto the app, or use the file
				picker in the main interface.
			</div>
		</div>
	);
}
