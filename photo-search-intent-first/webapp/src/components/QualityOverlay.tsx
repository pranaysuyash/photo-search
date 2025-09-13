import { useEffect, useState } from "react";
import {
	AdvancedRecognitionService,
	type QualityMetrics,
} from "../services/AdvancedRecognitionService";

interface QualityOverlayProps {
	imagePath: string;
	show: boolean;
	imageData?: ImageData;
}

export function QualityOverlay({
	imagePath,
	show,
	imageData,
}: QualityOverlayProps) {
	const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!show) return;

		async function assess() {
			setLoading(true);
			try {
				const quality = await AdvancedRecognitionService.assessQuality(
					imagePath,
					imageData,
				);
				setMetrics(quality);
			} catch (error) {
				console.error("Quality assessment failed:", error);
			} finally {
				setLoading(false);
			}
		}

		assess();
	}, [imagePath, show, imageData]);

	if (!show) return null;

	const getQualityColor = (score: number): string => {
		if (score >= 80) return "text-green-600";
		if (score >= 60) return "text-yellow-600";
		if (score >= 40) return "text-orange-600";
		return "text-red-600";
	};

	const getQualityLabel = (score: number): string => {
		if (score >= 80) return "Excellent";
		if (score >= 60) return "Good";
		if (score >= 40) return "Fair";
		return "Poor";
	};

	const renderMetricBar = (value: number, label: string) => (
		<div className="space-y-1">
			<div className="flex justify-between text-xs">
				<span className="text-gray-600">{label}</span>
				<span className={getQualityColor(value)}>{value.toFixed(0)}</span>
			</div>
			<div className="w-full bg-gray-200 rounded-full h-1.5">
				<div
					className={`h-1.5 rounded-full transition-all ${
						value >= 80
							? "bg-green-500"
							: value >= 60
								? "bg-yellow-500"
								: value >= 40
									? "bg-orange-500"
									: "bg-red-500"
					}`}
					style={{ width: `${value}%` }}
				/>
			</div>
		</div>
	);

	if (loading) {
		return (
			<div className="absolute top-2 left-2 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg">
				<div className="flex items-center gap-2">
					<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
					<span className="text-sm text-gray-600">Analyzing quality...</span>
				</div>
			</div>
		);
	}

	if (!metrics) return null;

	return (
		<div className="absolute top-2 left-2 bg-white/95 backdrop-blur rounded-lg p-3 shadow-lg max-w-xs">
			{/* Overall score */}
			<div className="flex items-center justify-between mb-3 pb-3 border-b">
				<div>
					<h4 className="font-medium text-sm">Quality Score</h4>
					<p
						className={`text-2xl font-bold ${getQualityColor(metrics.overall)}`}
					>
						{metrics.overall.toFixed(0)}
					</p>
				</div>
				<div className={`text-sm ${getQualityColor(metrics.overall)}`}>
					{getQualityLabel(metrics.overall)}
				</div>
			</div>

			{/* Individual metrics */}
			<div className="space-y-2">
				{renderMetricBar(metrics.sharpness, "Sharpness")}
				{renderMetricBar(metrics.exposure, "Exposure")}
				{renderMetricBar(metrics.composition, "Composition")}
				{renderMetricBar(metrics.colorBalance, "Color Balance")}
				{renderMetricBar(metrics.noise, "Noise Level")}
			</div>

			{/* Issues */}
			{metrics.issues.length > 0 && (
				<div className="mt-3 pt-3 border-t">
					<p className="text-xs font-medium text-gray-700 mb-1">
						Issues Detected:
					</p>
					<div className="flex flex-wrap gap-1">
						{metrics.issues.map((issue, idx) => (
							<span
								key={`item-${String(issue)}-${idx}`}
								className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded"
							>
								{issue}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
