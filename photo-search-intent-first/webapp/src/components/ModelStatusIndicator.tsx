import {
	AlertTriangle,
	CheckCircle,
	Cloud,
	Cpu,
	HardDrive,
	Loader2,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiModelStatus } from "../api";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ModelStatus {
	ok: boolean;
	models: Record<
		string,
		{
			name: string;
			size_mb?: number;
			loaded: boolean;
			loading?: boolean;
			error?: string;
		}
	>;
	offline_mode: boolean;
	model_dir?: string;
	capabilities: Record<string, boolean>;
}

export function ModelStatusIndicator() {
	const [status, setStatus] = useState<ModelStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		async function loadStatus() {
			try {
				setLoading(true);
				const modelStatus = await apiModelStatus();
				if (mounted) {
					setStatus(modelStatus);
					setError(null);
				}
			} catch (err) {
				if (mounted) {
					setError(
						err instanceof Error ? err.message : "Failed to load model status",
					);
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		}

		loadStatus();
		const interval = setInterval(loadStatus, 30000); // Refresh every 30 seconds

		return () => {
			mounted = false;
			clearInterval(interval);
		};
	}, []);

	if (loading) {
		return (
			<div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
				<Loader2 className="w-4 h-4 animate-spin" />
				<span className="text-sm">Loading model status...</span>
			</div>
		);
	}

	if (error || !status) {
		return (
			<div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-md">
				<XCircle className="w-4 h-4 text-destructive" />
				<span className="text-sm text-destructive">
					Model status unavailable
				</span>
			</div>
		);
	}

	const getStatusIcon = () => {
		if (!status.ok) {
			return <XCircle className="w-4 h-4 text-destructive" />;
		}
		if (status.capabilities.clip_available) {
			return <CheckCircle className="w-4 h-4 text-green-500" />;
		}
		return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
	};

	const getStatusText = () => {
		if (!status.ok) {
			return "System Error";
		}
		if (status.capabilities.clip_available) {
			return "Ready";
		}
		return "Loading Models";
	};

	const totalModelSize = Object.values(status.models).reduce(
		(sum: number, model: { size_mb?: number }) => sum + (model.size_mb || 0),
		0,
	);

	return (
		<Card className="w-80">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					{getStatusIcon()}
					{getStatusText()}
					{!status.offline_mode && (
						<Badge
							variant="outline"
							className="ml-auto border-blue-200 text-blue-700"
						>
							<Cloud className="w-3 h-3 mr-1" />
							Online Features
						</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Model Information */}
				{Object.keys(status.models).length > 0 && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<HardDrive className="w-3 h-3" />
							<span>{Object.keys(status.models).length} model(s)</span>
							<span className="ml-auto">~{totalModelSize} MB</span>
						</div>
						{Object.entries(status.models).map(
							([modelName, model]: [
								string,
								{
									name: string;
									size_mb?: number;
									loaded: boolean;
									loading?: boolean;
									error?: string;
								},
							]) => (
								<div
									key={modelName}
									className="flex items-center gap-2 text-xs"
								>
									<div
										className={`w-2 h-2 rounded-full ${
											model.config_exists && model.model_exists
												? "bg-green-500"
												: "bg-yellow-500"
										}`}
									/>
									<span className="truncate">{modelName}</span>
									<span className="ml-auto text-muted-foreground">
										{model.size_mb} MB
									</span>
								</div>
							),
						)}
					</div>
				)}

				{/* Capabilities */}
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<Cpu className="w-3 h-3" />
						<span>Capabilities</span>
					</div>
					<div className="grid grid-cols-2 gap-1">
						<Badge
							variant={
								status.capabilities.clip_available ? "default" : "secondary"
							}
							className="text-xs"
						>
							CLIP
						</Badge>
						<Badge
							variant={
								status.capabilities.gpu_available ? "default" : "secondary"
							}
							className="text-xs"
						>
							GPU
						</Badge>
						{status.capabilities.cuda_available && (
							<Badge variant="outline" className="text-xs">
								CUDA
							</Badge>
						)}
						{status.capabilities.mps_available && (
							<Badge variant="outline" className="text-xs">
								MPS
							</Badge>
						)}
					</div>
				</div>

				{/* Model Directory */}
				{status.model_dir && (
					<div className="text-xs text-muted-foreground">
						<div className="font-medium">Model Directory:</div>
						<div className="truncate" title={status.model_dir}>
							{status.model_dir}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
