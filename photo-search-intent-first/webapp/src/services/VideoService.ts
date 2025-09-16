// biome-ignore lint/complexity/noStaticOnlyClass: Service pattern
/**
 * Video Support Service
 * Handles video file detection, metadata extraction, and playback
 */

export interface VideoMetadata {
	duration: number; // seconds
	width: number;
	height: number;
	codec: string;
	fps: number;
	bitrate: number;
	hasAudio: boolean;
	thumbnail?: string;
	keyframes?: string[];
}

export interface VideoFile {
	path: string;
	type: "video";
	format: string;
	metadata: VideoMetadata;
	thumbnailUrl?: string;
	streamUrl?: string;
}

import { handleError } from "../utils/errors";
import { serviceEnabled } from "../config/logging";

export class VideoService {
	private static supportedFormats = [
		".mp4",
		".mov",
		".avi",
		".webm",
		".mkv",
		".m4v",
		".mpg",
		".mpeg",
		".wmv",
		".flv",
	];

	private static videoCache = new Map<string, VideoFile>();

	/**
	 * Check if file is a video
	 */
	static isVideoFile(path: string): boolean {
		const ext = path.toLowerCase().substring(path.lastIndexOf("."));
		return VideoService.supportedFormats.includes(ext);
	}

	/**
	 * Extract video metadata using HTML5 video element
	 */
	static async extractMetadata(videoUrl: string): Promise<VideoMetadata> {
		return new Promise((resolve, reject) => {
			const video = document.createElement("video");
			video.preload = "metadata";

			video.onloadedmetadata = () => {
				const metadata: VideoMetadata = {
					duration: video.duration,
					width: video.videoWidth,
					height: video.videoHeight,
					codec: VideoService.detectCodec(videoUrl),
					fps: 30, // Default, would need MediaInfo for accurate FPS
					bitrate: 0, // Would need server-side extraction
					hasAudio:
						(video as unknown).mozHasAudio ||
						(video as unknown).webkitAudioDecodedByteCount > 0 ||
						(video as unknown).audioTracks?.length > 0 ||
						true, // Assume true if can't detect
				};

				video.remove();
				resolve(metadata);
			};

			video.onerror = () => {
				video.remove();
				reject(new Error("Failed to load video metadata"));
			};

			video.src = videoUrl;
		});
	}

	/**
	 * Generate thumbnail from video at specific time
	 */
	static async generateThumbnail(
		videoUrl: string,
		time: number = 2, // seconds
		width: number = 320,
		height: number = 240,
	): Promise<string> {
		return new Promise((resolve, reject) => {
			const video = document.createElement("video");
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				reject(new Error("Canvas context not available"));
				return;
			}

			video.crossOrigin = "anonymous";
			video.currentTime = time;

			video.onseeked = () => {
				canvas.width = width;
				canvas.height = height;

				// Calculate aspect ratio preserving dimensions
				const videoRatio = video.videoWidth / video.videoHeight;
				const canvasRatio = width / height;

				let drawWidth = width;
				let drawHeight = height;
				let offsetX = 0;
				let offsetY = 0;

				if (videoRatio > canvasRatio) {
					drawHeight = width / videoRatio;
					offsetY = (height - drawHeight) / 2;
				} else {
					drawWidth = height * videoRatio;
					offsetX = (width - drawWidth) / 2;
				}

				ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
				const thumbnail = canvas.toDataURL("image/jpeg", 0.8);

				video.remove();
				canvas.remove();
				resolve(thumbnail);
			};

			video.onerror = () => {
				video.remove();
				canvas.remove();
				reject(new Error("Failed to generate thumbnail"));
			};

			video.src = videoUrl;
		});
	}

	/**
	 * Extract multiple keyframes for timeline preview
	 */
	static async extractKeyframes(
		videoUrl: string,
		count: number = 10,
		width: number = 160,
		height: number = 90,
	): Promise<string[]> {
		const metadata = await VideoService.extractMetadata(videoUrl);
		const interval = metadata.duration / (count + 1);
		const keyframes: string[] = [];

		for (let i = 1; i <= count; i++) {
			try {
				const time = interval * i;
				const thumbnail = await VideoService.generateThumbnail(
					videoUrl,
					time,
					width,
					height,
				);
				keyframes.push(thumbnail);
			} catch (error) {
				console.warn(`Failed to extract keyframe at ${interval * i}s:`, error);
			}
		}

		return keyframes;
	}

	/**
	 * Detect video codec from file extension
	 */
	private static detectCodec(path: string): string {
		const ext = path.toLowerCase().substring(path.lastIndexOf(".") + 1);
		const codecMap: Record<string, string> = {
			mp4: "H.264",
			mov: "H.264/ProRes",
			webm: "VP8/VP9",
			mkv: "H.264/H.265",
			avi: "Various",
			wmv: "WMV",
			flv: "FLV",
		};
		return codecMap[ext] || "Unknown";
	}

	/**
	 * Get video info with caching
	 */
	static async getVideoInfo(
		path: string,
		videoUrl: string,
	): Promise<VideoFile> {
		// Check cache first
		const cached = VideoService.videoCache.get(path);
		if (cached) {
			return cached;
		}

		try {
			const metadata = await VideoService.extractMetadata(videoUrl);
			const thumbnail = await VideoService.generateThumbnail(videoUrl);

			const videoFile: VideoFile = {
				path,
				type: "video",
				format: path.substring(path.lastIndexOf(".") + 1).toUpperCase(),
				metadata,
				thumbnailUrl: thumbnail,
				streamUrl: videoUrl,
			};

			// Cache the result
			VideoService.videoCache.set(path, videoFile);

			// Limit cache size
			if (VideoService.videoCache.size > 100) {
				const firstKey = VideoService.videoCache.keys().next().value;
				if (firstKey !== undefined) {
					VideoService.videoCache.delete(firstKey);
				}
			}

			return videoFile;
        } catch (error) {
            console.error("Failed to get video info:", error);
            if (serviceEnabled("video")) {
                handleError(error, { logToServer: true, logToConsole: false, context: { action: "video_info", component: "VideoService.getVideoInfo", metadata: { path, videoUrl } } });
            }
            throw error;
        }
    }

	/**
	 * Clear video cache
	 */
	static clearCache(): void {
		VideoService.videoCache.clear();
	}

	/**
	 * Format duration for display
	 */
	static formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
		}
		return `${minutes}:${secs.toString().padStart(2, "0")}`;
	}

	/**
	 * Get video resolution label
	 */
	static getResolutionLabel(_width: number, height: number): string {
		if (height >= 2160) return "4K";
		if (height >= 1440) return "2K";
		if (height >= 1080) return "Full HD";
		if (height >= 720) return "HD";
		if (height >= 480) return "SD";
		return "Low";
	}
}
