import {
	AlertCircle,
	CheckCircle,
	Clock,
	Info,
	Pause,
	Play,
	RotateCcw,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface IndexingStatus {
	phase: "scanning" | "analyzing" | "indexing" | "complete" | "error";
	progress: number;
	currentFile?: string;
	totalFiles: number;
	processedFiles: number;
	estimatedTimeRemaining?: number;
	message: string;
}

interface GuidedIndexingFlowProps {
	isVisible: boolean;
	onComplete: () => void;
	onCancel: () => void;
	directory?: string;
	engine?: string;
}

export function GuidedIndexingFlow({
	isVisible,
	onComplete,
	onCancel,
	directory,
	engine,
}: GuidedIndexingFlowProps) {
	const [status, setStatus] = useState<IndexingStatus>({
		phase: "scanning",
		progress: 0,
		totalFiles: 0,
		processedFiles: 0,
		message: "Scanning your photo directory...",
	});
	const [isPaused, setIsPaused] = useState(false);
	const [showDetails, setShowDetails] = useState(false);

	// Simulate indexing progress (in real implementation, this would poll the backend)
	useEffect(() => {
		if (!isVisible || isPaused) return;

		const phases = [
			{
				phase: "scanning" as const,
				duration: 2000,
				message: "Scanning your photo directory...",
			},
			{
				phase: "analyzing" as const,
				duration: 3000,
				message: "Analyzing photo metadata...",
			},
			{
				phase: "indexing" as const,
				duration: 8000,
				message: "Building AI search index...",
			},
			{
				phase: "complete" as const,
				duration: 1000,
				message: "Indexing complete! Ready to search.",
			},
		];

		let currentPhaseIndex = 0;
		let progress = 0;
		const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);

		const interval = setInterval(() => {
			if (currentPhaseIndex >= phases.length) {
				clearInterval(interval);
				onComplete();
				return;
			}

			const currentPhase = phases[currentPhaseIndex];
			const phaseProgress = (progress / totalDuration) * 100;

			setStatus({
				phase: currentPhase.phase,
				progress: Math.min(phaseProgress, 100),
				totalFiles: 1250,
				processedFiles: Math.floor((progress / totalDuration) * 1250),
				currentFile:
					currentPhase.phase === "indexing"
						? `/photos/vacation-${Math.floor(Math.random() * 100)}.jpg`
						: undefined,
				estimatedTimeRemaining:
					currentPhase.phase === "indexing"
						? Math.max(0, Math.floor((totalDuration - progress) / 1000))
						: undefined,
				message: currentPhase.message,
			});

			progress += 100;

			// Move to next phase when current phase duration is reached
			if (
				progress >=
				phases
					.slice(0, currentPhaseIndex + 1)
					.reduce((sum, p) => sum + p.duration, 0)
			) {
				currentPhaseIndex++;
			}
		}, 100);

		return () => clearInterval(interval);
	}, [isVisible, isPaused, onComplete]);

	const getPhaseIcon = (phase: IndexingStatus["phase"]) => {
		switch (phase) {
			case "scanning":
				return <Clock className="w-5 h-5 text-blue-500" />;
			case "analyzing":
				return <RotateCcw className="w-5 h-5 text-purple-500 animate-spin" />;
			case "indexing":
				return <Play className="w-5 h-5 text-green-500" />;
			case "complete":
				return <CheckCircle className="w-5 h-5 text-green-500" />;
			case "error":
				return <AlertCircle className="w-5 h-5 text-red-500" />;
			default:
				return <Clock className="w-5 h-5 text-gray-500" />;
		}
	};

	const getPhaseColor = (phase: IndexingStatus["phase"]) => {
		switch (phase) {
			case "scanning":
				return "bg-blue-500";
			case "analyzing":
				return "bg-purple-500";
			case "indexing":
				return "bg-green-500";
			case "complete":
				return "bg-green-500";
			case "error":
				return "bg-red-500";
			default:
				return "bg-gray-500";
		}
	};

	if (!isVisible) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
				{/* Header */}
				<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
							Setting up your photo search
						</h2>
						<button
							type="button"
							onClick={onCancel}
							className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							aria-label="Cancel indexing"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Progress Content */}
				<div className="px-6 py-6">
					{/* Phase Icon and Title */}
					<div className="flex items-center gap-3 mb-4">
						{getPhaseIcon(status.phase)}
						<div>
							<h3 className="font-medium text-gray-900 dark:text-white">
								{status.phase === "scanning" && "Scanning photos"}
								{status.phase === "analyzing" && "Analyzing metadata"}
								{status.phase === "indexing" && "Building search index"}
								{status.phase === "complete" && "Ready to search!"}
								{status.phase === "error" && "Indexing failed"}
							</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								{status.message}
							</p>
						</div>
					</div>

					{/* Progress Bar */}
					<div className="mb-4">
						<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
							<span>Progress</span>
							<span>{Math.round(status.progress)}%</span>
						</div>
						<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
							<div
								className={`h-2 rounded-full transition-all duration-300 ${getPhaseColor(
									status.phase,
								)}`}
								style={{ width: `${status.progress}%` }}
							/>
						</div>
					</div>

					{/* File Count */}
					<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
						<span>
							{status.processedFiles} of {status.totalFiles} photos
						</span>
						{status.estimatedTimeRemaining && (
							<span>{status.estimatedTimeRemaining}s remaining</span>
						)}
					</div>

					{/* Current File (when indexing) */}
					{status.currentFile && (
						<div className="text-xs text-gray-500 dark:text-gray-500 mb-4 truncate">
							Processing: {status.currentFile}
						</div>
					)}

					{/* Control Buttons */}
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => setIsPaused(!isPaused)}
							className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
						>
							{isPaused ? (
								<>
									<Play className="w-4 h-4" />
									Resume
								</>
							) : (
								<>
									<Pause className="w-4 h-4" />
									Pause
								</>
							)}
						</button>

						<button
							type="button"
							onClick={() => setShowDetails(!showDetails)}
							className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
						>
							<Info className="w-4 h-4" />
							{showDetails ? "Hide" : "Show"} Details
						</button>
					</div>

					{/* Details Panel */}
					{showDetails && (
						<div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
							<h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
								What's happening?
							</h4>
							<div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
								<p>• Scanning: Finding all your photos and videos</p>
								<p>• Analyzing: Extracting metadata and features</p>
								<p>• Indexing: Building AI search model for fast queries</p>
								<p>• Complete: Ready for natural language search!</p>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
					<div className="text-xs text-gray-600 dark:text-gray-400 text-center">
						💡 Tip: You can continue using the app while indexing runs in the
						background
					</div>
				</div>
			</div>
		</div>
	);
}
