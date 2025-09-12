import { Download, FolderOpen, Settings2, X } from "lucide-react";
import { useState } from "react";
import { apiExport } from "../api";

interface BulkExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	selectedPaths: string[];
	currentDir: string;
}

export function BulkExportModal({
	isOpen,
	onClose,
	selectedPaths,
	currentDir,
}: BulkExportModalProps) {
	const [exportConfig, setExportConfig] = useState({
		destination: "",
		format: "original" as "original" | "jpeg" | "png" | "webp",
		quality: 85,
		maxWidth: 0, // 0 = no resize
		maxHeight: 0,
		preserveMetadata: true,
		createZip: false,
		folderStructure: "flat" as "flat" | "preserve" | "date",
		naming: "original" as "original" | "sequential" | "timestamp",
	});

	const [exporting, setExporting] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const formatSizes = {
		thumbnail: { width: 400, height: 400 },
		web: { width: 1920, height: 1080 },
		print: { width: 3000, height: 2000 },
		original: { width: 0, height: 0 },
	};

	const handlePresetSelect = (preset: keyof typeof formatSizes) => {
		setExportConfig((prev) => ({
			...prev,
			maxWidth: formatSizes[preset].width,
			maxHeight: formatSizes[preset].height,
		}));
	};

	const handleExport = async () => {
		if (!exportConfig.destination.trim()) {
			setError("Please select a destination folder");
			return;
		}

		setExporting(true);
		setError(null);
		setProgress(0);

		try {
			// Export in batches for better progress tracking
			const batchSize = 10;
			const batches = [];

			for (let i = 0; i < selectedPaths.length; i += batchSize) {
				batches.push(selectedPaths.slice(i, i + batchSize));
			}

			let completed = 0;

			for (const batch of batches) {
				const _result = await apiExport(
					currentDir,
					batch,
					exportConfig.destination,
					"copy", // Always copy for safety
					!exportConfig.preserveMetadata,
					exportConfig.createZip,
					{
						quality: exportConfig.quality,
						resizeLong:
							exportConfig.maxWidth > 0 ? exportConfig.maxWidth : undefined,
					},
				);

				completed += batch.length;
				setProgress(Math.round((completed / selectedPaths.length) * 100));
			}

			// Success
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Export failed");
		} finally {
			setExporting(false);
		}
	};

	const estimateSize = () => {
		// Rough estimation based on settings
		const avgFileSize = 2 * 1024 * 1024; // 2MB average
		let multiplier = 1;

		if (exportConfig.format !== "original") {
			multiplier = exportConfig.quality / 100;
		}

		if (exportConfig.maxWidth > 0) {
			multiplier *= 0.5; // Assume 50% size reduction on resize
		}

		const totalSize = selectedPaths.length * avgFileSize * multiplier;
		return formatFileSize(totalSize);
	};

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024)
			return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
					<div className="flex items-center gap-3">
						<Download className="w-6 h-6 text-blue-600" />
						<div>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
								Export Photos
							</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								{selectedPaths.length} items selected • Est. {estimateSize()}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 overflow-y-auto max-h-[60vh]">
					{error && (
						<div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
							{error}
						</div>
					)}

					{/* Destination */}
					<div className="mb-6">
						<label htmlFor="export-destination" className="block text-sm font-medium mb-2">
							Destination Folder
						</label>
						<div className="flex gap-2">
							<input
								id="export-destination"
								type="text"
								value={exportConfig.destination}
								onChange={(e) =>
									setExportConfig((prev) => ({
										...prev,
										destination: e.target.value,
									}))
								}
								placeholder="/path/to/export/folder"
								className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
								disabled={exporting}
							/>
							<button
								type="button"
								className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
								disabled={exporting}
							>
								<FolderOpen className="w-4 h-4" />
								Browse
							</button>
						</div>
					</div>

					{/* Format Presets */}
					<fieldset className="mb-6">
						<legend className="block text-sm font-medium mb-2">
							Size Preset
						</legend>
						<div className="grid grid-cols-4 gap-2">
							{Object.keys(formatSizes).map((preset) => (
								<button
									type="button"
									key={preset}
									onClick={() =>
										handlePresetSelect(preset as keyof typeof formatSizes)
									}
									className={`px-4 py-2 rounded-lg border capitalize ${
										exportConfig.maxWidth ===
										formatSizes[preset as keyof typeof formatSizes].width
											? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
											: "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
									}`}
									disabled={exporting}
								>
									{preset}
								</button>
							))}
						</div>
					</fieldset>

					{/* Advanced Settings */}
					<details className="mb-6">
						<summary className="cursor-pointer flex items-center gap-2 text-sm font-medium mb-4">
							<Settings2 className="w-4 h-4" />
							Advanced Settings
						</summary>

						<div className="space-y-4 pl-6">
							{/* Format */}
							<div>
								<label htmlFor="export-format" className="block text-sm font-medium mb-2">Format</label>
								<select
									id="export-format"
									value={exportConfig.format}
									onChange={(e) =>
										setExportConfig((prev) => ({
											...prev,
											format: e.target.value as typeof exportConfig.format,
										}))
									}
									className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
									disabled={exporting}
								>
									<option value="original">Original Format</option>
									<option value="jpeg">JPEG</option>
									<option value="png">PNG</option>
									<option value="webp">WebP</option>
								</select>
							</div>

							{/* Quality */}
							{exportConfig.format !== "original" && (
								<div>
									<label htmlFor="export-quality" className="block text-sm font-medium mb-2">
										Quality: {exportConfig.quality}%
									</label>
									<input
										id="export-quality"
										type="range"
										min="10"
										max="100"
										step="5"
										value={exportConfig.quality}
										onChange={(e) =>
											setExportConfig((prev) => ({
												...prev,
												quality: Number(e.target.value),
											}))
										}
										className="w-full"
										disabled={exporting}
									/>
								</div>
							)}

							{/* Custom Size */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label htmlFor="export-max-width" className="block text-sm font-medium mb-2">
										Max Width (px)
									</label>
									<input
										id="export-max-width"
										type="number"
										value={exportConfig.maxWidth || ""}
										onChange={(e) =>
											setExportConfig((prev) => ({
												...prev,
												maxWidth: Number(e.target.value),
											}))
										}
										placeholder="Original"
										className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
										disabled={exporting}
									/>
								</div>
								<div>
									<label htmlFor="export-max-height" className="block text-sm font-medium mb-2">
										Max Height (px)
									</label>
									<input
										id="export-max-height"
										type="number"
										value={exportConfig.maxHeight || ""}
										onChange={(e) =>
											setExportConfig((prev) => ({
												...prev,
												maxHeight: Number(e.target.value),
											}))
										}
										placeholder="Original"
										className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
										disabled={exporting}
									/>
								</div>
							</div>

							{/* Folder Structure */}
							<div>
								<label htmlFor="export-structure" className="block text-sm font-medium mb-2">
									Folder Structure
								</label>
								<select
									id="export-structure"
									value={exportConfig.folderStructure}
									onChange={(e) =>
										setExportConfig((prev) => ({
											...prev,
											folderStructure: e.target
												.value as typeof exportConfig.folderStructure,
										}))
									}
									className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
									disabled={exporting}
								>
									<option value="flat">Flat (all in one folder)</option>
									<option value="preserve">Preserve Original</option>
									<option value="date">Organize by Date</option>
								</select>
							</div>

							{/* Naming */}
							<div>
								<label htmlFor="export-naming" className="block text-sm font-medium mb-2">
									File Naming
								</label>
								<select
									id="export-naming"
									value={exportConfig.naming}
									onChange={(e) =>
										setExportConfig((prev) => ({
											...prev,
											naming: e.target.value as typeof exportConfig.naming,
										}))
									}
									className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
									disabled={exporting}
								>
									<option value="original">Keep Original Names</option>
									<option value="sequential">Sequential (001, 002...)</option>
									<option value="timestamp">Timestamp</option>
								</select>
							</div>

							{/* Options */}
							<div className="space-y-2">
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={exportConfig.preserveMetadata}
										onChange={(e) =>
											setExportConfig((prev) => ({
												...prev,
												preserveMetadata: e.target.checked,
											}))
										}
										className="rounded"
										disabled={exporting}
									/>
									<span className="text-sm">Preserve metadata (EXIF)</span>
								</label>

								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={exportConfig.createZip}
										onChange={(e) =>
											setExportConfig((prev) => ({
												...prev,
												createZip: e.target.checked,
											}))
										}
										className="rounded"
										disabled={exporting}
									/>
									<span className="text-sm">Create ZIP archive</span>
								</label>
							</div>
						</div>
					</details>

					{/* Progress */}
					{exporting && (
						<div className="mb-6">
							<div className="flex justify-between text-sm mb-2">
								<span>Exporting...</span>
								<span>{progress}%</span>
							</div>
							<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
								<div
									className="bg-blue-600 h-2 rounded-full transition-all duration-300"
									style={{ width: `${progress}%` }}
								/>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex justify-between">
					<div className="text-sm text-gray-500 dark:text-gray-400">
						{!exporting && `Ready to export ${selectedPaths.length} photos`}
						{exporting &&
							`Exporting ${Math.round((progress * selectedPaths.length) / 100)} of ${selectedPaths.length}`}
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
							disabled={exporting}
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleExport}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
							disabled={exporting || !exportConfig.destination}
						>
							{exporting ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									Exporting...
								</>
							) : (
								<>
									<Download className="w-4 h-4" />
									Export
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
