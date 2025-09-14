/**
 * Mobile Photo Capture Component
 * Provides camera integration for mobile devices with PWA support
 */

import {
	Camera,
	CameraOff,
	Flashlight,
	Image as ImageIcon,
	RotateCw,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface MobilePhotoCaptureProps {
	onPhotoCaptured: (file: File) => void;
	onClose: () => void;
	className?: string;
}

interface CameraSettings {
	facingMode: "user" | "environment";
	flashMode: "off" | "on" | "auto";
	zoom: number;
}

export function MobilePhotoCapture({
	onPhotoCaptured,
	onClose,
	className = "",
}: MobilePhotoCaptureProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [isSupported, setIsSupported] = useState(false);
	const [isActive, setIsActive] = useState(false);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [settings, setSettings] = useState<CameraSettings>({
		facingMode: "environment",
		flashMode: "off",
		zoom: 1,
	});
	const [isCapturing, setIsCapturing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Check for camera support
	useEffect(() => {
		const checkSupport = () => {
			const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
			const hasCamera = "camera" in navigator || hasGetUserMedia;
			setIsSupported(hasCamera);
		};

		checkSupport();
	}, []);

	// Initialize camera
	const initializeCamera = async () => {
		if (!isSupported) {
			setError("Camera not supported on this device");
			return;
		}

		try {
			setError(null);

			// Stop existing stream
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
			}

			const constraints: MediaStreamConstraints = {
				video: {
					facingMode: settings.facingMode,
					width: { ideal: 1920, max: 2560 },
					height: { ideal: 1080, max: 1440 },
				},
				audio: false,
			};

			const newStream = await navigator.mediaDevices.getUserMedia(constraints);
			setStream(newStream);

			if (videoRef.current) {
				videoRef.current.srcObject = newStream;
				await videoRef.current.play();
			}

			setIsActive(true);
		} catch (err) {
			console.error("Camera initialization failed:", err);
			setError(getErrorMessage(err));
		}
	};

	// Stop camera
	const stopCamera = () => {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			setStream(null);
		}
		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
		setIsActive(false);
	};

	// Capture photo
	const capturePhoto = async () => {
		if (!videoRef.current || !canvasRef.current) return;

		try {
			setIsCapturing(true);

			const video = videoRef.current;
			const canvas = canvasRef.current;

			// Set canvas dimensions to match video
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				throw new Error("Could not get canvas context");
			}

			// Draw video frame to canvas
			ctx.drawImage(video, 0, 0);

			// Convert to blob
			const blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob(
					(blob) => {
						if (blob) {
							resolve(blob);
						} else {
							reject(new Error("Failed to create blob"));
						}
					},
					"image/jpeg",
					0.9,
				);
			});

			// Create file with timestamp
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const file = new File([blob], `photo-${timestamp}.jpg`, {
				type: "image/jpeg",
			});

			onPhotoCaptured(file);

			// Add camera capture feedback
			canvas.style.opacity = "0.7";
			setTimeout(() => {
				canvas.style.opacity = "1";
			}, 200);
		} catch (err) {
			console.error("Photo capture failed:", err);
			setError(getErrorMessage(err));
		} finally {
			setIsCapturing(false);
		}
	};

	// Handle file selection from gallery
	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (files && files.length > 0) {
			const file = files[0];
			if (file.type.startsWith("image/")) {
				onPhotoCaptured(file);
			} else {
				setError("Please select an image file");
			}
		}
	};

	// Toggle camera facing
	const toggleCamera = () => {
		setSettings((prev) => ({
			...prev,
			facingMode: prev.facingMode === "user" ? "environment" : "user",
		}));
	};

	// Toggle flash
	const toggleFlash = () => {
		setSettings((prev) => ({
			...prev,
			flashMode: prev.flashMode === "off" ? "on" : "off",
		}));
	};

	// Get error message
    const getErrorMessage = (err: unknown): string => {
        const e = err as any;
        if (e?.name === "NotAllowedError") {
            return "Camera access denied. Please allow camera permissions.";
        } else if (e?.name === "NotFoundError") {
            return "No camera found on this device.";
        } else if (e?.name === "NotReadableError") {
            return "Camera is already in use by another application.";
        } else if (typeof e?.message === 'string') {
            return e.message;
        }
        return "An unknown error occurred";
    };

	// Update camera when settings change
	useEffect(() => {
		if (isActive) {
			initializeCamera();
		}
	}, [initializeCamera, isActive]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopCamera();
		};
	}, [stopCamera]);

	if (!isSupported) {
		return (
			<div className={`p-4 bg-gray-100 rounded-lg text-center ${className}`}>
				<CameraOff className="w-12 h-12 text-gray-400 mx-auto mb-2" />
				<p className="text-gray-600 mb-3">
					Camera not supported on this device
				</p>
				<p className="text-sm text-gray-500 mb-4">
					You can still upload photos from your gallery
				</p>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					Choose from Gallery
				</button>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={handleFileSelect}
					className="hidden"
				/>
			</div>
		);
	}

	return (
		<div
			className={`relative bg-black rounded-lg overflow-hidden ${className}`}
		>
			{/* Hidden file input for gallery */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleFileSelect}
				className="hidden"
			/>

			{/* Video preview */}
			<div className="relative aspect-video">
				<video
					ref={videoRef}
					className="w-full h-full object-cover"
					playsInline
					muted
					style={{
						transform: settings.facingMode === "user" ? "scaleX(-1)" : "none",
					}}
				/>

				{/* Canvas for capture */}
				<canvas ref={canvasRef} className="hidden" />

				{/* Overlay controls */}
				<div className="absolute inset-0 flex flex-col justify-between p-4">
					{/* Top controls */}
					<div className="flex justify-between items-start">
						<button
							type="button"
							onClick={onClose}
							className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
						>
							✕
						</button>

						{error && (
							<div className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm">
								{error}
							</div>
						)}
					</div>

					{/* Capture button area */}
					<div className="flex items-center justify-center">
						<div className="flex items-center gap-4">
							{/* Gallery button */}
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
								title="Choose from gallery"
							>
								<ImageIcon className="w-6 h-6" />
							</button>

							{/* Capture button */}
							<button
								type="button"
								onClick={capturePhoto}
								disabled={isCapturing || !isActive}
								className="p-4 bg-white text-black rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								title="Capture photo"
							>
								<Camera
									className={`w-8 h-8 ${isCapturing ? "animate-pulse" : ""}`}
								/>
							</button>

							{/* Settings button */}
							<div className="flex flex-col gap-2">
								<button
									type="button"
									onClick={toggleCamera}
									className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
									title="Switch camera"
								>
									<RotateCw className="w-4 h-4" />
								</button>

								<button
									type="button"
									onClick={toggleFlash}
									className={`p-2 rounded-full transition-colors ${
										settings.flashMode === "on"
											? "bg-yellow-500 text-black"
											: "bg-black/50 text-white hover:bg-black/70"
									}`}
									title="Toggle flash"
								>
									<Flashlight className="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Camera initialization overlay */}
				{!isActive && (
					<div className="absolute inset-0 bg-black/80 flex items-center justify-center">
						<div className="text-center text-white">
							<Camera className="w-16 h-16 mx-auto mb-4" />
							<p className="mb-4">Camera ready</p>
							<button
								type="button"
								onClick={initializeCamera}
								className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								Start Camera
							</button>
						</div>
					</div>
				)}

				{/* Capturing overlay */}
				{isCapturing && (
					<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
						<div className="text-white text-center">
							<div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
							<p>Capturing...</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// Hook for checking camera availability
export function useCameraSupport() {
	const [isSupported, setIsSupported] = useState(false);
	const [permission, setPermission] = useState<
		"granted" | "denied" | "prompt" | "unknown"
	>("unknown");

	useEffect(() => {
		const checkSupport = async () => {
			const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
			const hasCamera = "camera" in navigator || hasGetUserMedia;
			setIsSupported(hasCamera);

			// Check permission status
            if ((navigator as any).permissions) {
                try {
                    const result = await (navigator as any).permissions.query({
                        name: "camera" as PermissionName,
                    });
                    setPermission(result.state as "granted" | "denied" | "prompt");
                } catch {
                    setPermission("unknown");
                }
            }
		};

		checkSupport();
	}, []);

	return { isSupported, permission };
}

// PWA Install Prompt Component
export function PWAInstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] = useState<unknown>(null);
	const [showInstall, setShowInstall] = useState(false);

	useEffect(() => {
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			setDeferredPrompt(e);
			setShowInstall(true);
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

		return () => {
			window.removeEventListener(
				"beforeinstallprompt",
				handleBeforeInstallPrompt,
			);
		};
	}, []);

	const installPWA = async () => {
		if (!deferredPrompt) return;

		try {
			deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;

			if (outcome === "accepted") {
				console.log("PWA installation accepted");
			}

			setDeferredPrompt(null);
			setShowInstall(false);
		} catch (error) {
			console.error("PWA installation failed:", error);
		}
	};

	if (!showInstall) return null;

	return (
		<div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="font-bold">Install PhotoVault</h3>
					<p className="text-sm opacity-90">
						Get the best experience with our mobile app
					</p>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setShowInstall(false)}
						className="px-3 py-1 bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
					>
						Later
					</button>
					<button
						type="button"
						onClick={installPWA}
						className="px-4 py-1 bg-white text-blue-600 rounded hover:bg-gray-100 transition-colors"
					>
						Install
					</button>
				</div>
			</div>
		</div>
	);
}
