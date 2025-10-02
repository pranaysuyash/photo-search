/**
 * Type definitions for ANN (Artificial Neural Network) backend system
 */

export interface ModelType {
	id: string;
	name: string;
	description: string;
	framework: string;
	version: string;
	size: number; // in bytes
	format:
		| "tensorflow"
		| "pytorch"
		| "onnx"
		| "transformer"
		| "webgpu"
		| "webnn";
	capabilities: ModelCapability[];
	inputShape?: number[];
	outputShape?: number[];
	metadata: Record<string, any>;
}

export interface ModelCapability {
	type:
		| "classification"
		| "detection"
		| "segmentation"
		| "embedding"
		| "generation"
		| "ocr";
	classes?: string[];
	confidence?: number;
	performance?: PerformanceMetrics;
}

export interface PerformanceMetrics {
	inferenceTime: number; // milliseconds
	memoryUsage: number; // MB
	cpuUsage?: number; // percentage
	gpuUsage?: number; // percentage
	accuracy?: number; // 0-1
	throughput?: number; // samples per second
	reliability?: number; // 0-1
	timestamp?: number;
}

export interface ResourceRange {
	min: number;
	max: number;
	optimal: number;
}

export interface ResourceRequirements {
	memory: ResourceRange; // MB
	cpu: ResourceRange; // percentage
	gpu?: ResourceRange; // percentage
	storage: ResourceRange; // MB
	network?: NetworkRequirements;
}

export interface NetworkRequirements {
	bandwidth: ResourceRange; // Mbps
	latency: ResourceRange; // ms
	reliability: number; // 0-1
}

export interface BackendCapability {
	type: "inference" | "training" | "fine_tuning";
	modelTypes: ModelType[];
	inputFormats: InputFormat[];
	outputFormats: OutputFormat[];
	features: BackendFeature[];
	performance: PerformanceMetrics;
}

export interface InputFormat {
	type: "tensor" | "image" | "text" | "audio" | "video";
	shape?: number[];
	dtype: "float32" | "float64" | "int32" | "int64" | "uint8" | "bool";
	preprocessing?: PreprocessingStep[];
}

export interface OutputFormat {
	type:
		| "tensor"
		| "classification"
		| "detection"
		| "segmentation"
		| "embedding";
	shape?: number[];
	dtype: "float32" | "float64" | "int32" | "int64" | "string";
	postprocessing?: PostprocessingStep[];
}

export interface PreprocessingStep {
	type: "normalize" | "resize" | "crop" | "rotate" | "flip" | "tokenize";
	parameters: Record<string, any>;
}

export interface PostprocessingStep {
	type: "softmax" | "sigmoid" | "nms" | "threshold" | "argmax";
	parameters: Record<string, any>;
}

export interface BackendFeature {
	name: string;
	description: string;
	enabled: boolean;
	performance?: PerformanceMetrics;
}

export interface BackendHealth {
	status: "healthy" | "degraded" | "unhealthy" | "unknown";
	lastCheck: number;
	uptime: number;
	errorRate: number;
	responseTime: number;
	activeConnections: number;
	resourceUsage: ResourceUsage;
	error?: string;
}

export interface ResourceUsage {
	memory: number; // MB
	cpu: number; // percentage
	gpu?: number; // percentage
	storage: number; // MB
	network?: NetworkUsage;
	timestamp?: number;
}

export interface NetworkUsage {
	bandwidth: number; // Mbps
	latency: number; // ms
	packetsSent: number;
	packetsReceived: number;
}

export interface AITask {
	id: string;
	type: TaskType;
	modelId: string;
	input: InferenceInput;
	priority: TaskPriority;
	timeout?: number;
	resourceRequirements: ResourceRequirements;
	constraints?: TaskConstraints;
	metadata?: Record<string, any>;
	onComplete?: (result: TaskResult) => void;
	onError?: (error: Error) => void;
}

export type TaskType =
	| "face_detection"
	| "face_recognition"
	| "object_detection"
	| "scene_classification"
	| "image_embedding"
	| "text_embedding"
	| "query_understanding"
	| "ocr_processing"
	| "feature_extraction"
	| "semantic_search";

export type BackendType =
	| "tensorflowjs"
	| "pytorch"
	| "onnx"
	| "custom"
	| "unknown";

export interface BackendConfig {
	id: string;
	name: string;
	description: string;
	version: string;
	enabled: boolean;
	priority: number;
	resourceLimits: {
		maxMemoryMB: number;
		maxCPUPercent: number;
		maxGPUCount: number;
	};
	optimization: {
		enableQuantization: boolean;
		enablePruning: boolean;
		enableCaching: boolean;
	};
	settings: Record<string, any>;
}

export type TaskPriority = "low" | "normal" | "high" | "critical";

export interface InferenceInput {
	data: any;
	format: InputFormat;
	preprocessing?: PreprocessingStep[];
}

export interface InferenceOutput {
	data: any;
	format: OutputFormat;
	confidence?: number;
	processingTime: number;
	metadata?: Record<string, any>;
}

export interface TaskResult {
	taskId: string;
	output: InferenceOutput;
	backend: string;
	processingTime: number;
	memoryUsage: number;
	success: boolean;
	error?: string;
	metadata?: Record<string, any>;
}

export interface TaskConstraints {
	maxInferenceTime?: number; // ms
	maxMemoryUsage?: number; // MB
	requireGPU?: boolean;
	maxAccuracyLoss?: number; // 0-1
	backends?: string[]; // preferred backends
	excludeBackends?: string[]; // excluded backends
}

export interface BackendSelection {
	backend: string;
	confidence: number;
	fallbacks: string[];
	reasoning: SelectionReason[];
	timestamp?: number;
	estimatedPerformance?: {
		inferenceTime: number;
		memoryUsage: number;
		accuracy?: number;
	};
}

export interface SelectionReason {
	criterion: string;
	score: number;
	weight: number;
	explanation: string;
}

export interface PerformanceProfile {
	modelId: string;
	backend: string;
	taskType: TaskType;
	averageInferenceTime: number;
	averageMemoryUsage: number;
	accuracy: number;
	throughput: number;
	reliability: number;
	lastUpdated: number;
	sampleCount: number;
}

export interface ResourceProfile {
	backend: string;
	baselineMemory: number;
	baselineCPU: number;
	baselineGPU?: number;
	scalingFactors: {
		memory: number;
		cpu: number;
		gpu?: number;
	};
	overhead: number;
	efficiency: number;
}

export interface ModelConfig {
	modelId: string;
	backend: string;
	parameters: Record<string, any>;
	optimization?: OptimizationConfig;
	quantization?: QuantizationConfig;
}

export interface OptimizationConfig {
	level: "none" | "basic" | "aggressive";
	techniques: string[];
	targetMetrics: Partial<PerformanceMetrics>;
}

export interface QuantizationConfig {
	enabled: boolean;
	precision: "fp32" | "fp16" | "int8" | "int4";
	calibration: boolean;
	accuracyTarget?: number;
}

export interface SystemResources {
	totalMemory: number;
	availableMemory: number;
	totalCPU: number;
	availableCPU: number;
	totalGPU?: number;
	availableGPU?: number;
	totalStorage: number;
	availableStorage: number;
	network?: NetworkStatus;
}

export interface NetworkStatus {
	online: boolean;
	bandwidth: number;
	latency: number;
	reliability: number;
}

export interface ResourceAllocation {
	id: string;
	backendId: string;
	memory: number;
	cpu: number;
	gpu?: number;
	storage: number;
	startTime: number;
	endTime?: number;
	status: "active" | "released" | "expired";
}

export interface RunningTask {
	taskId: string;
	backend: string;
	allocation: ResourceAllocation;
	startTime: number;
	estimatedEndTime?: number;
	progress: number;
	status: "running" | "completed" | "failed" | "cancelled";
}

export interface PerformanceHistory {
	backend: string;
	taskType: TaskType;
	timestamps: number[];
	inferenceTimes: number[];
	memoryUsages: number[];
	accuracies: number[];
	successRates: number[];
}

export interface PerformanceAlert {
	id: string;
	ruleId: string;
	message: string;
	severity: "info" | "warning" | "error" | "critical";
	timestamp: number;
	metric: string;
	value: number;
	threshold: number;
	resolved: boolean;
	resolvedAt?: number;
}

export interface UsageAnalytics {
	totalTasks: number;
	successfulTasks: number;
	failedTasks: number;
	averageProcessingTime: number;
	totalProcessingTime: number;
	backendUsage: Record<string, number>;
	taskTypeUsage: Record<TaskType, number>;
	resourceUtilization: ResourceUsage;
	performanceTrends: PerformanceTrend[];
}

export interface PerformanceTrend {
	timestamp: number;
	metric: string;
	value: number;
	backend?: string;
	taskType?: TaskType;
}

export interface Model {
	id: string;
	name: string;
	description: string;
	version: string;
	framework: string;
	size: number;
	format: string;
	capabilities: ModelCapability[];
	resourceRequirements: ResourceRequirements;
	performanceProfile: PerformanceMetrics;
	metadata: Record<string, any>;
	createdAt: number;
	updatedAt: number;
	tags: string[];
}

// Backend interface definition
export interface ANNBackend {
	id: string;
	name: string;
	version: string;
	capabilities: BackendCapability[];
	resourceRequirements: ResourceRequirements;
	performanceProfile: PerformanceMetrics;

	// Lifecycle methods
	initialize(): Promise<boolean>;
	shutdown(): Promise<void>;
	isAvailable(): boolean;
	getHealth(): BackendHealth;

	// Model management
	loadModel(modelId: string, modelConfig: ModelConfig): Promise<Model>;
	unloadModel(modelId: string): Promise<void>;
	listModels(): Promise<string[]>;

	// Inference methods
	runInference(
		modelId: string,
		input: InferenceInput,
	): Promise<InferenceOutput>;
	runBatchInference(
		modelId: string,
		inputs: InferenceInput[],
	): Promise<InferenceOutput[]>;

	// Performance optimization
	optimizeForTask(taskType: string): Promise<void>;
	getPerformanceMetrics(): PerformanceMetrics;
}

export interface ModelVersion {
	version: string;
	modelId: string;
	path: string;
	size: number;
	checksum: string;
	compatibility: string[];
	performance: PerformanceMetrics;
	createdAt: number;
	deprecated: boolean;
}

export interface ModelDiscovery {
	id: string;
	name: string;
	source: "local" | "remote" | "registry";
	url?: string;
	lastSync: number;
	status: "active" | "inactive" | "error";
	models: string[];
}

export interface BackendInfo {
	id: string;
	name: string;
	version: string;
	description: string;
	capabilities: BackendCapability[];
	resourceRequirements: ResourceRequirements;
	performanceProfile: PerformanceMetrics;
	health: BackendHealth;
	models: string[];
	lastActivity: number;
	status: "active" | "inactive" | "error";
	metadata: Record<string, any>;
	isAvailable?: boolean;
	executeTask?: (task: AITask) => Promise<TaskResult>;
}

export interface BackendProfile {
	backendId: string;
	profileData: {
		averageInferenceTime: number;
		averageMemoryUsage: number;
		accuracy: number;
		throughput: number;
		reliability: number;
		lastUpdated: number;
		sampleCount: number;
	};
}

export interface MonitoringEvent {
	id: string;
	type: string;
	level: "debug" | "info" | "warning" | "error" | "critical";
	source: string;
	message: string;
	data: Record<string, any>;
	tags: string[];
	timestamp: number;
}

export interface AlertRule {
	id: string;
	name: string;
	description: string;
	severity: "info" | "warning" | "error" | "critical";
	category: string;
	condition: (context: any) => boolean;
	message: string;
	enabled?: boolean;
}

export interface TimeSeriesData {
	timestamp: number;
	value: number;
	tags?: Record<string, string>;
}

export interface TaskMetrics {
	taskId: string;
	processingTime: number;
	memoryUsage: number;
	cpuUsage: number;
	success: boolean;
	error?: string;
}

export interface ModelMetrics {
	modelId: string;
	inferenceTime: number;
	memoryUsage: number;
	accuracy: number;
	throughput: number;
	lastUsed: number;
}

export interface BackendMetrics {
	backendId: string;
	uptime: number;
	errorRate: number;
	averageResponseTime: number;
	activeConnections: number;
	resourceUsage: ResourceUsage;
}

export interface SystemMetrics {
	totalMemory: number;
	availableMemory: number;
	totalCPU: number;
	availableCPU: number;
	activeBackends: number;
	totalTasks: number;
	systemLoad: number;
}

export interface Alert {
	id: string;
	ruleId: string;
	message: string;
	severity: "info" | "warning" | "error" | "critical";
	timestamp: number;
	source: string;
	data: Record<string, any>;
	acknowledged: boolean;
	resolved: boolean;
}

export interface AnalyticsData {
	period: { start: number; end: number };
	tasks: {
		total: number;
		successful: number;
		failed: number;
		averageProcessingTime: number;
	};
	backends: {
		total: number;
		active: number;
		healthy: number;
	};
	performance: {
		averageInferenceTime: number;
		averageMemoryUsage: number;
		systemThroughput: number;
	};
	errors: {
		total: number;
		errorRate: number;
		topErrors: Array<{ error: string; count: number }>;
	};
}

export interface MonitoringConfig {
	collectionInterval: number;
	retentionPeriod: number;
	maxEvents: number;
	maxAlerts: number;
	enableRealTimeMonitoring: boolean;
	enableAnalytics: boolean;
	enableReporting: boolean;
	alertRules: AlertRule[];
}

export interface HistogramData {
	min: number;
	max: number;
	bins: number;
	data: Array<{ value: number; count: number }>;
}

export interface DashboardData {
	summary: {
		totalBackends: number;
		activeBackends: number;
		totalTasks: number;
		systemHealth: "healthy" | "degraded" | "unhealthy";
	};
	metrics: {
		cpu: number;
		memory: number;
		throughput: number;
		errorRate: number;
	};
	alerts: Alert[];
	health: Record<string, BackendHealth>;
	trends: Array<{ timestamp: number; metric: string; value: number }>;
}
