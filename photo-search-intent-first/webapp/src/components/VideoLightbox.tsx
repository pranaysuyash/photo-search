import {
	Download,
	Info,
	Maximize,
	Pause,
	Play,
	SkipBack,
	SkipForward,
	Volume2,
	VolumeX,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type VideoFile, VideoService } from "../services/VideoService";

interface VideoLightboxProps {
	videoPath: string;
	videoUrl: string;
	onClose: () => void;
	onNext?: () => void;
	onPrevious?: () => void;
}

export function VideoLightbox({
	videoPath,
	videoUrl,
	onClose,
	onNext,
	onPrevious,
}: VideoLightboxProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const progressRef = useRef<HTMLDivElement>(null);
	const [videoInfo, setVideoInfo] = useState<VideoFile | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isMuted, setIsMuted] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [showControls, setShowControls] = useState(true);
	const [loading, setLoading] = useState(true);
	const [buffered, setBuffered] = useState(0);
	const [showInfo, setShowInfo] = useState(false);
	const [keyframes, setKeyframes] = useState<string[]>([]);
	const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
		null,
	);
	const [isSwiping, setIsSwiping] = useState(false);

	const controlsTimeout = useRef<NodeJS.Timeout>();

	const loadVideoInfo = useCallback(async () => {
		setLoading(true);
		try {
			const info = await VideoService.getVideoInfo(videoPath, videoUrl);
			setVideoInfo(info);

			// Load keyframes for timeline preview
			VideoService.extractKeyframes(videoUrl, 10, 120, 68)
				.then((frames) => setKeyframes(frames))
				.catch(console.error);
		} catch (error) {
			console.error("Failed to load video info:", error);
		} finally {
			setLoading(false);
		}
	}, [videoPath, videoUrl]);

	useEffect(() => {
		loadVideoInfo();
		return () => {
			if (controlsTimeout.current) {
				clearTimeout(controlsTimeout.current);
			}
		};
	}, [loadVideoInfo]);

	const togglePlayPause = () => {
		if (videoRef.current) {
			if (isPlaying) {
				videoRef.current.pause();
			} else {
				videoRef.current.play();
			}
			setIsPlaying(!isPlaying);
		}
	};

	const toggleMute = () => {
		if (videoRef.current) {
			videoRef.current.muted = !isMuted;
			setIsMuted(!isMuted);
		}
	};

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVolume = parseFloat(e.target.value);
		setVolume(newVolume);
		if (videoRef.current) {
			videoRef.current.volume = newVolume;
			setIsMuted(newVolume === 0);
		}
	};

	const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
		if (videoRef.current && progressRef.current) {
			const rect = progressRef.current.getBoundingClientRect();
			const percent = (e.clientX - rect.left) / rect.width;
			const newTime = percent * duration;
			videoRef.current.currentTime = newTime;
			setCurrentTime(newTime);
		}
	};

	const handleTimeUpdate = () => {
		if (videoRef.current) {
			setCurrentTime(videoRef.current.currentTime);

			// Update buffered amount
			if (videoRef.current.buffered.length > 0) {
				const bufferedEnd = videoRef.current.buffered.end(
					videoRef.current.buffered.length - 1,
				);
				setBuffered((bufferedEnd / duration) * 100);
			}
		}
	};

	const handleLoadedMetadata = () => {
		if (videoRef.current) {
			setDuration(videoRef.current.duration);
		}
	};

	const skip = (seconds: number) => {
		if (videoRef.current) {
			videoRef.current.currentTime += seconds;
		}
	};

	const toggleFullscreen = () => {
		if (videoRef.current) {
			if (document.fullscreenElement) {
				document.exitFullscreen();
			} else {
				videoRef.current.requestFullscreen();
			}
		}
	};

	const handleMouseMove = () => {
		setShowControls(true);
		if (controlsTimeout.current) {
			clearTimeout(controlsTimeout.current);
		}
		controlsTimeout.current = setTimeout(() => {
			if (isPlaying) {
				setShowControls(false);
			}
		}, 3000);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		switch (e.key) {
			case " ":
				e.preventDefault();
				togglePlayPause();
				break;
			case "ArrowLeft":
				skip(-10);
				break;
			case "ArrowRight":
				skip(10);
				break;
			case "ArrowUp":
				setVolume(Math.min(1, volume + 0.1));
				break;
			case "ArrowDown":
				setVolume(Math.max(0, volume - 0.1));
				break;
			case "m":
				toggleMute();
				break;
			case "f":
				toggleFullscreen();
				break;
			case "Escape":
				onClose();
				break;
		}
	};

	// Touch/swipe gesture handlers for mobile navigation
	const handleTouchStart = (e: React.TouchEvent) => {
		if (e.touches.length === 1) {
			const touch = e.touches[0];
			setTouchStart({ x: touch.clientX, y: touch.clientY });
			setIsSwiping(false);
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (!touchStart || e.touches.length !== 1) return;

		const touch = e.touches[0];
		const deltaX = touch.clientX - touchStart.x;
		const deltaY = touch.clientY - touchStart.y;
		const absDeltaX = Math.abs(deltaX);
		const absDeltaY = Math.abs(deltaY);

		// Determine if horizontal swipe (ignore vertical swipes)
		if (absDeltaX > absDeltaY && absDeltaX > 30) {
			setIsSwiping(true);
		}
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		if (!touchStart || !isSwiping) {
			setTouchStart(null);
			setIsSwiping(false);
			return;
		}

		const touch = e.changedTouches[0];
		const deltaX = touch.clientX - touchStart.x;
		const minSwipeDistance = 50; // Minimum distance for a valid swipe

		if (Math.abs(deltaX) > minSwipeDistance) {
			if (deltaX > 0) {
				// Swipe right - go to previous video
				if (onPrevious) onPrevious();
			} else {
				// Swipe left - go to next video
				if (onNext) onNext();
			}
		}

		setTouchStart(null);
		setIsSwiping(false);
	};

	const formatTime = (seconds: number): string => {
		return VideoService.formatDuration(seconds);
	};

	const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

	return (
		<div
			className="video-lightbox"
			onMouseMove={handleMouseMove}
			onKeyDown={handleKeyDown}
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
		>
			<div className="video-container">
				{loading ? (
					<div className="loading-spinner">
						<div className="spinner" />
						<p>Loading video...</p>
					</div>
				) : (
					<>
						<video
							ref={videoRef}
							src={videoUrl}
							onTimeUpdate={handleTimeUpdate}
							onLoadedMetadata={handleLoadedMetadata}
							onEnded={() => setIsPlaying(false)}
							onClick={togglePlayPause}
							className="video-player"
						/>

						{/* Video Controls */}
						<div
							className={`video-controls ${showControls ? "visible" : "hidden"}`}
						>
							{/* Timeline with keyframe previews */}
							<div className="timeline-container">
								<div
									ref={progressRef}
									className="progress-bar"
									onClick={handleSeek}
								>
									<div
										className="buffered-bar"
										style={{ width: `${buffered}%` }}
									/>
									<div
										className="progress-fill"
										style={{ width: `${progressPercent}%` }}
									/>
									<div
										className="progress-handle"
										style={{ left: `${progressPercent}%` }}
									/>

									{/* Keyframe previews on hover */}
									{keyframes.length > 0 && (
										<div className="keyframes">
											{keyframes.map((frame, i) => (
												<img
													key={`frame-${i}`}
													src={frame}
													className="keyframe"
													style={{
														left: `${(i + 1) * (100 / (keyframes.length + 1))}%`,
													}}
													alt=""
												/>
											))}
										</div>
									)}
								</div>
								<div className="time-display">
									<span>{formatTime(currentTime)}</span>
									<span className="separator">/</span>
									<span>{formatTime(duration)}</span>
								</div>
							</div>

							{/* Control buttons */}
							<div className="control-buttons">
								<div className="controls-left">
									<button
										type="button"
										onClick={togglePlayPause}
										className="control-btn"
									>
										{isPlaying ? <Pause /> : <Play />}
									</button>
									<button
										type="button"
										onClick={() => skip(-10)}
										className="control-btn"
									>
										<SkipBack />
									</button>
									<button
										type="button"
										onClick={() => skip(10)}
										className="control-btn"
									>
										<SkipForward />
									</button>

									<div className="volume-control">
										<button
											type="button"
											onClick={toggleMute}
											className="control-btn"
										>
											{isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
										</button>
										<input
											type="range"
											min="0"
											max="1"
											step="0.05"
											value={volume}
											onChange={handleVolumeChange}
											className="volume-slider"
										/>
									</div>
								</div>

								<div className="controls-right">
									<button
										type="button"
										onClick={() => setShowInfo(!showInfo)}
										className="control-btn"
									>
										<Info />
									</button>
									<button
										type="button"
										onClick={toggleFullscreen}
										className="control-btn"
									>
										<Maximize />
									</button>
									<a
										href={videoUrl}
										download={videoPath.split("/").pop()}
										className="control-btn"
									>
										<Download />
									</a>
								</div>
							</div>
						</div>

						{/* Video info overlay */}
						{showInfo && videoInfo && (
							<div className="video-info-overlay">
								<h3>{videoPath.split("/").pop()}</h3>
								<div className="info-grid">
									<div>Format: {videoInfo.format}</div>
									<div>
										Resolution: {videoInfo.metadata.width}×
										{videoInfo.metadata.height}
									</div>
									<div>Duration: {formatTime(videoInfo.metadata.duration)}</div>
									<div>Codec: {videoInfo.metadata.codec}</div>
									<div>
										Quality:{" "}
										{VideoService.getResolutionLabel(
											videoInfo.metadata.width,
											videoInfo.metadata.height,
										)}
									</div>
									<div>Audio: {videoInfo.metadata.hasAudio ? "Yes" : "No"}</div>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* Navigation buttons */}
			{onPrevious && (
				<button type="button" onClick={onPrevious} className="nav-btn nav-prev">
					<SkipBack />
				</button>
			)}
			{onNext && (
				<button type="button" onClick={onNext} className="nav-btn nav-next">
					<SkipForward />
				</button>
			)}

			{/* Close button */}
			<button type="button" onClick={onClose} className="close-btn">
				×
			</button>

			<style>{`
        .video-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .video-container {
          position: relative;
          width: 90%;
          max-width: 1200px;
          height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-player {
          width: 100%;
          height: 100%;
          object-fit: contain;
          cursor: pointer;
        }

        .video-controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
          padding: 2rem 1rem 1rem;
          transition: opacity 0.3s;
        }

        .video-controls.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .timeline-container {
          margin-bottom: 1rem;
        }

        .progress-bar {
          position: relative;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          cursor: pointer;
          margin-bottom: 0.5rem;
        }

        .progress-bar:hover {
          height: 10px;
        }

        .buffered-bar {
          position: absolute;
          height: 100%;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        .progress-fill {
          position: absolute;
          height: 100%;
          background: var(--accent-primary);
          border-radius: 3px;
        }

        .progress-handle {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .keyframes {
          position: absolute;
          top: -80px;
          left: 0;
          right: 0;
          height: 68px;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }

        .progress-bar:hover .keyframes {
          opacity: 1;
        }

        .keyframe {
          position: absolute;
          height: 68px;
          width: 120px;
          object-fit: cover;
          border: 2px solid white;
          border-radius: 4px;
          transform: translateX(-50%);
        }

        .time-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          font-size: 0.875rem;
        }

        .control-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .controls-left, .controls-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .control-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }

        .control-btn:hover {
          opacity: 0.7;
        }

        .control-btn svg {
          width: 20px;
          height: 20px;
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .volume-slider {
          width: 80px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .volume-control:hover .volume-slider {
          opacity: 1;
        }

        .video-info-overlay {
          position: absolute;
          top: 2rem;
          left: 2rem;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 1.5rem;
          border-radius: 8px;
          max-width: 400px;
        }

        .video-info-overlay h3 {
          margin-bottom: 1rem;
          font-size: 1.125rem;
        }

        .info-grid {
          display: grid;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.5);
          border: none;
          color: white;
          padding: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .nav-btn:hover {
          background: rgba(0, 0, 0, 0.8);
        }

        .nav-prev {
          left: 1rem;
        }

        .nav-next {
          right: 1rem;
        }

        .close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          color: white;
          font-size: 2rem;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: white;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
		</div>
	);
}
