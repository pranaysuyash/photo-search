import { useCallback, useEffect, useState } from "react";
import {
	apiGetVideoMetadata,
	apiIndexVideos,
	apiListVideos,
	videoThumbnailUrl,
} from "../api";
import LazyImage from "./LazyImage";
import { LoadingSpinner } from "./LoadingSpinner";

interface VideoFile {
	path: string;
	mtime: number;
	size: number;
}

interface VideoManagerProps {
	currentDir: string;
	provider: string;
}

export function VideoManager({ currentDir, provider }: VideoManagerProps) {
	const [videos, setVideos] = useState<VideoFile[]>([]);
	const [loading, setLoading] = useState(false);
	const [indexing, setIndexing] = useState(false);
	const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
	const [videoMetadata, setVideoMetadata] = useState<unknown>(null);
	const [error, setError] = useState<string | null>(null);

	const loadVideos = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const result = await apiListVideos(currentDir);
			setVideos(result.videos);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load videos");
		} finally {
			setLoading(false);
		}
	}, [currentDir]);

	useEffect(() => {
		if (currentDir) {
			loadVideos();
		}
	}, [currentDir, loadVideos]);

	const indexVideos = async () => {
		try {
			setIndexing(true);
			setError(null);
			const result = await apiIndexVideos(currentDir, provider);
			alert(`Indexed ${result.indexed} out of ${result.total} videos`);
			await loadVideos(); // Refresh the list
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to index videos");
		} finally {
			setIndexing(false);
		}
	};

	const selectVideo = async (video: VideoFile) => {
		setSelectedVideo(video);
		try {
			const metadata = await apiGetVideoMetadata(currentDir, video.path);
			setVideoMetadata(metadata.metadata);
		} catch (err) {
			console.error("Failed to load video metadata:", err);
			setVideoMetadata(null);
		}
	};

	const formatFileSize = (bytes: number) => {
		const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
		if (bytes === 0) return "0 Bytes";
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
	};

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center p-8">
				<LoadingSpinner />
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Video Manager</h2>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={loadVideos}
						disabled={loading}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
					>
						Refresh
					</button>
					<button
						type="button"
						onClick={indexVideos}
						disabled={indexing || videos.length === 0}
						className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
					>
						{indexing ? "Indexing..." : "Index Videos"}
					</button>
				</div>
			</div>

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Video List */}
				<div className="space-y-4">
					<h3 className="text-lg font-semibold">Videos ({videos.length})</h3>

					{videos.length === 0 ? (
						<div className="text-center text-gray-500 py-8">
							No videos found in this directory
						</div>
					) : (
						<div className="space-y-2 max-h-96 overflow-y-auto">
							{videos.map((video, index) => (
								<div
									key={`video-${video.path}-${index}`}
									onClick={() => selectVideo(video)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											selectVideo(video);
										}
									}}
									role="button"
									tabIndex={0}
									className={`p-3 border rounded cursor-pointer transition-colors ${
										selectedVideo?.path === video.path
											? "border-blue-500 bg-blue-50"
											: "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
									}`}
								>
									<div className="font-medium truncate" title={video.path}>
										{video.path.split("/").pop() || video.path}
									</div>
									<div className="text-sm text-gray-500">
										{formatFileSize(video.size)} •{" "}
										{new Date(video.mtime * 1000).toLocaleDateString()}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Video Details */}
				<div className="space-y-4">
					<h3 className="text-lg font-semibold">Video Details</h3>

					{selectedVideo ? (
						<div className="space-y-4">
							{/* Video Thumbnail */}
							<div className="aspect-video bg-gray-100 rounded overflow-hidden">
								<LazyImage
									src={videoThumbnailUrl(currentDir, selectedVideo.path)}
									alt={selectedVideo.path.split("/").pop() || "Video thumbnail"}
									className="w-full h-full object-cover"
									onError={(e) => {
										(e.target as HTMLImageElement).src =
											"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNjM2MzYzIi8+Cjwvc3ZnPgo=";
									}}
								/>
							</div>

							{/* Video Metadata */}
							<div className="bg-gray-50 p-4 rounded space-y-2">
								<div className="font-medium">File Information</div>
								<div className="text-sm space-y-1">
									<div>
										<span className="font-medium">Path:</span>{" "}
										{selectedVideo.path}
									</div>
									<div>
										<span className="font-medium">Size:</span>{" "}
										{formatFileSize(selectedVideo.size)}
									</div>
									<div>
										<span className="font-medium">Modified:</span>{" "}
										{new Date(selectedVideo.mtime * 1000).toLocaleString()}
									</div>
								</div>

								{videoMetadata && (
									<>
										<div className="font-medium mt-4">Video Metadata</div>
										<div className="text-sm space-y-1">
											<div>
												<span className="font-medium">Dimensions:</span>{" "}
												{videoMetadata.width} × {videoMetadata.height}
											</div>
											<div>
												<span className="font-medium">Frame Rate:</span>{" "}
												{videoMetadata.fps?.toFixed(2)} fps
											</div>
											<div>
												<span className="font-medium">Duration:</span>{" "}
												{formatDuration(videoMetadata.duration)}
											</div>
											<div>
												<span className="font-medium">Frame Count:</span>{" "}
												{videoMetadata.frame_count?.toLocaleString()}
											</div>
										</div>
									</>
								)}
							</div>
						</div>
					) : (
						<div className="text-center text-gray-500 py-8">
							Select a video to view details
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
