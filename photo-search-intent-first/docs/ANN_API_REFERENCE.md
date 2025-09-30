# ANN System API Reference

## Table of Contents

- [BackendSelector](#backendselector)
- [BackendRegistry](#backendregistry)
- [BackendManager](#backendmanager)
- [ModelRegistry](#modelregistry)
- [PerformanceProfiler](#performanceprofiler)
- [ResourceMonitor](#resourcemonitor)
- [TaskScheduler](#taskscheduler)
- [MonitoringSystem](#monitoringsystem)
- [BaseBackend](#basebackend)

## BackendSelector

### Constructor
```typescript
constructor(config?: BackendSelectorConfig)
```

### Methods

#### selectBackend
```typescript
async selectBackend(
  task: AITask,
  criteria?: SelectionCriteria
): Promise<BackendSelection>
```
Selects the optimal backend for a given task.

**Parameters:**
- `task: AITask` - The AI task to execute
- `criteria?: SelectionCriteria` - Optional selection constraints and context

**Returns:** `Promise<BackendSelection>` - Selected backend information

**Example:**
```typescript
const selection = await backendSelector.selectBackend(task, {
  constraints: { maxMemoryUsage: 100 },
  context: { deviceType: 'mobile' }
});
```

#### selectMultipleBackends
```typescript
async selectMultipleBackends(
  task: AITask,
  criteria?: SelectionCriteria,
  maxBackends?: number
): Promise<BackendSelection[]>
```
Selects multiple backends for load balancing or fallback scenarios.

#### updateSelectionWeights
```typescript
updateSelectionWeights(weights: SelectionWeights): void
```
Updates the scoring weights used for backend selection.

**Parameters:**
- `weights: SelectionWeights` - New weight configuration

#### getSelectionMetrics
```typescript
getSelectionMetrics(): SelectionMetrics
```
Returns metrics about backend selection performance.

#### recordSelectionResult
```typescript
recordSelectionResult(
  selection: BackendSelection,
  actualPerformance: PerformanceMetrics,
  success: boolean
): void
```
Records the actual performance of a backend selection for learning.

## BackendRegistry

### Methods (Singleton)

#### getInstance
```typescript
static getInstance(): BackendRegistry
```
Returns the singleton instance of BackendRegistry.

#### registerBackend
```typescript
registerBackend(backendId: string, backend: BaseBackend): void
```
Registers a new backend with the registry.

#### unregisterBackend
```typescript
unregisterBackend(backendId: string): void
```
Removes a backend from the registry.

#### getBackend
```typescript
getBackend(backendId: string): BackendInfo | undefined
```
Retrieves backend information by ID.

#### getAvailableBackends
```typescript
getAvailableBackends(): BackendInfo[]
```
Returns all currently available and healthy backends.

#### getBackendsByCapability
```typescript
getBackendsByCapability(
  capabilityType: string,
  modelType?: string
): BackendInfo[]
```
Finds backends that support specific capabilities.

#### findOptimalBackend
```typescript
findOptimalBackend(
  taskType: string,
  modelType: string,
  constraints?: BackendConstraints
): BackendInfo | null
```
Finds the best backend for a specific task type.

## BackendManager

### Constructor
```typescript
constructor(config?: BackendManagerConfig)
```

### Methods

#### initialize
```typescript
async initialize(): Promise<boolean>
```
Initializes the backend manager and all registered backends.

#### shutdown
```typescript
async shutdown(): Promise<void>
```
Shuts down the backend manager and all backends.

#### registerBackend
```typescript
async registerBackend(
  backendId: string,
  backend: BaseBackend
): Promise<void>
```
Registers and initializes a new backend.

#### unregisterBackend
```typescript
async unregisterBackend(backendId: string): Promise<void>
```
Unregisters and shuts down a backend.

#### getBackendStatus
```typescript
async getBackendStatus(): Promise<Record<string, BackendStatus>>
```
Returns the status of all registered backends.

#### getSystemHealth
```typescript
async getSystemHealth(): Promise<SystemHealth>
```
Returns overall system health information.

## ModelRegistry

### Constructor
```typescript
constructor(config?: ModelRegistryConfig)
```

### Methods

#### registerModel
```typescript
async registerModel(metadata: ModelMetadata): Promise<void>
```
Registers a new model in the registry.

**Parameters:**
- `metadata: ModelMetadata` - Model metadata and configuration

#### addModelVersion
```typescript
async addModelVersion(
  modelId: string,
  version: ModelVersion
): Promise<void>
```
Adds a new version to an existing model.

#### loadModel
```typescript
async loadModel(
  modelId: string,
  version?: string,
  backendId?: string
): Promise<string>
```
Loads a model and returns the instance ID.

**Returns:** `Promise<string>` - Model instance ID

#### unloadModel
```typescript
async unloadModel(instanceId: string): Promise<void>
```
Unloads a specific model instance.

#### searchModels
```typescript
searchModels(criteria: ModelSearchCriteria): ModelMetadata[]
```
Searches for models based on various criteria.

#### getRecommendations
```typescript
getRecommendations(
  taskType: string,
  constraints?: ModelConstraints
): ModelRecommendation[]
```
Gets model recommendations for a specific task type.

## PerformanceProfiler

### Constructor
```typescript
constructor(config?: PerformanceProfilerConfig)
```

### Methods

#### initialize
```typescript
async initialize(): Promise<void>
```
Initializes the performance profiler.

#### recordExecution
```typescript
async recordExecution(
  backendId: string,
  taskType: string,
  modelId: string,
  metrics: PerformanceMetrics
): Promise<void>
```
Records performance metrics for a specific execution.

#### getProfile
```typescript
async getProfile(
  backendId: string,
  taskType: string,
  modelId: string
): Promise<PerformanceProfile | null>
```
Retrieves performance profile for a specific backend-task-model combination.

#### compareBackends
```typescript
async compareBackends(
  taskType: string,
  modelId: string
): Promise<BackendComparison[]>
```
Compares performance across different backends.

#### getPerformanceTrends
```typescript
async getPerformanceTrends(
  backendId: string,
  taskType: string,
  modelId: string,
  options?: TrendAnalysisOptions
): Promise<PerformanceTrend>
```
Analyzes performance trends over time.

#### exportProfiles
```typescript
async exportProfiles(): Promise<ProfileExport>
```
Exports all performance profiles.

#### importProfiles
```typescript
async importProfiles(data: ProfileExport): Promise<void>
```
Imports performance profiles from data.

## ResourceMonitor

### Constructor
```typescript
constructor(config: ResourceMonitorConfig)
```

### Methods

#### initialize
```typescript
async initialize(): Promise<void>
```
Initializes the resource monitor and detects system capabilities.

#### start
```typescript
start(): void
```
Starts resource monitoring.

#### stop
```typescript
stop(): void
```
Stops resource monitoring.

#### getCurrentResources
```typescript
getCurrentResources(): SystemResources
```
Returns current system resource information.

#### getResourceHistory
```typescript
getResourceHistory(timeRange?: number): ResourceHistory[]
```
Returns historical resource usage data.

#### setThresholds
```typescript
setThresholds(thresholds: ResourceThresholds): void
```
Sets alert thresholds for resource usage.

## TaskScheduler

### Constructor
```typescript
constructor(config?: TaskSchedulerConfig)
```

### Methods

#### start
```typescript
async start(): Promise<void>
```
Starts the task scheduler.

#### stop
```typescript
async stop(): Promise<void>
```
Stops the task scheduler.

#### submitTask
```typescript
async submitTask(
  task: AITask,
  options?: TaskOptions
): Promise<TaskResult>
```
Submits a task for execution.

**Returns:** `Promise<TaskResult>` - Task execution result

#### submitTasks
```typescript
async submitTasks(
  tasks: AITask[],
  options?: TaskOptions
): Promise<TaskResult[]>
```
Submits multiple tasks for batch execution.

#### cancelTask
```typescript
async cancelTask(taskId: string): Promise<boolean>
```
Cancels a pending or running task.

#### getMetrics
```typescript
getMetrics(): SchedulerMetrics
```
Returns scheduler performance metrics.

## MonitoringSystem

### Constructor
```typescript
constructor(config?: MonitoringConfig)
```

### Methods

#### start
```typescript
async start(): Promise<void>
```
Starts the monitoring system.

#### stop
```typescript
async stop(): Promise<void>
```
Stops the monitoring system.

#### getSystemHealth
```typescript
async getSystemHealth(): Promise<SystemHealth>
```
Returns comprehensive system health information.

#### getAlerts
```typescript
getAlerts(timeRange?: number): Alert[]
```
Returns system alerts within a time range.

#### setAlertRule
```typescript
setAlertRule(rule: AlertRule): void
```
Configures a new alert rule.

#### getAnalytics
```typescript
async getAnalytics(timeRange?: number): Promise<Analytics>
```
Returns system analytics data.

## BaseBackend (Abstract)

### Properties

#### id
```typescript
readonly id: string
```
Unique identifier for the backend.

#### name
```typescript
readonly name: string
```
Human-readable name of the backend.

#### version
```typescript
readonly version: string
```
Backend version.

#### capabilities
```typescript
readonly capabilities: BackendCapability[]
```
Supported capabilities and model types.

#### resourceRequirements
```typescript
readonly resourceRequirements: ResourceRequirements
```
Resource requirements for the backend.

#### performanceProfile
```typescript
readonly performanceProfile: PerformanceMetrics
```
Expected performance characteristics.

### Methods

#### initialize
```typescript
async initialize(): Promise<boolean>
```
Initializes the backend.

#### shutdown
```typescript
async shutdown(): Promise<void>
```
Shuts down the backend.

#### isAvailable
```typescript
isAvailable(): boolean
```
Checks if the backend is available for use.

#### getHealth
```typescript
getHealth(): BackendHealth
```
Returns current health status.

#### loadModel
```typescript
async loadModel(modelId: string): Promise<any>
```
Loads a model into the backend.

#### unloadModel
```typescript
async unloadModel(modelId: string): Promise<void>
```
Unloads a model from the backend.

#### listModels
```typescript
async listModels(): Promise<string[]>
```
Returns list of available models.

#### runInference
```typescript
async runInference(modelId: string, input: any): Promise<any>
```
Runs inference with a loaded model.

#### runBatchInference
```typescript
async runBatchInference(modelId: string, inputs: any[]): Promise<any[]>
```
Runs batch inference.

#### optimizeForTask
```typescript
async optimizeForTask(taskType: string): Promise<void>
```
Optimizes the backend for a specific task type.

#### getPerformanceMetrics
```typescript
getPerformanceMetrics(): PerformanceMetrics
```
Returns current performance metrics.

## Data Types

### AITask
```typescript
interface AITask {
  id: string;
  type: TaskType;
  modelId: string;
  input: TaskInput;
  priority: TaskPriority;
  resourceRequirements: ResourceRequirements;
  timeout?: number;
  metadata?: Record<string, any>;
}
```

### BackendSelection
```typescript
interface BackendSelection {
  backend: string;
  confidence: number;
  reasoning: string[];
  estimatedPerformance: PerformanceMetrics;
  fallbacks: string[];
  timestamp: number;
}
```

### PerformanceMetrics
```typescript
interface PerformanceMetrics {
  inferenceTime: number;
  memoryUsage: number;
  throughput?: number;
  accuracy?: number;
  cpuUsage?: number;
  gpuUsage?: number;
}
```

### ResourceRequirements
```typescript
interface ResourceRequirements {
  memory: ResourceRange;
  cpu: ResourceRange;
  gpu?: ResourceRange;
  storage?: ResourceRange;
}
```

### ModelMetadata
```typescript
interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  format: ModelFormat;
  size: number;
  parameters: number;
  hash: string;
  checksum: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  categories: string[];
  backendRequirements: BackendRequirements;
  systemRequirements: SystemRequirements;
  performance: PerformanceMetrics;
}
```

### TaskResult
```typescript
interface TaskResult {
  taskId: string;
  status: TaskStatus;
  result?: any;
  error?: string;
  processingTime: number;
  memoryUsed: number;
  backendUsed: string;
  modelUsed: string;
  timestamp: number;
}
```

## Enums

### TaskType
```typescript
enum TaskType {
  CLASSIFICATION = 'classification',
  OBJECT_DETECTION = 'object-detection',
  FACE_DETECTION = 'face-detection',
  FACE_RECOGNITION = 'face-recognition',
  SEGMENTATION = 'segmentation',
  FEATURE_EXTRACTION = 'feature-extraction',
  CUSTOM = 'custom'
}
```

### TaskPriority
```typescript
enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

### BackendStatus
```typescript
enum BackendStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  OFFLINE = 'offline'
}
```

### TaskStatus
```typescript
enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

## Configuration Objects

### BackendSelectorConfig
```typescript
interface BackendSelectorConfig {
  weights?: SelectionWeights;
  enableCaching?: boolean;
  cacheTimeout?: number;
  enableLearning?: boolean;
  debug?: boolean;
}
```

### ResourceMonitorConfig
```typescript
interface ResourceMonitorConfig {
  interval: number;
  enableGPUMonitoring?: boolean;
  thresholds?: ResourceThresholds;
}
```

### PerformanceProfilerConfig
```typescript
interface PerformanceProfilerConfig {
  sampleSize?: number;
  aggregationWindow?: number;
  enableTrendAnalysis?: boolean;
  retentionPeriod?: number;
}
```

## Error Types

### ANNError
```typescript
class ANNError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  );
}
```

### Common Error Codes
- `BACKEND_NOT_FOUND` - Backend not found in registry
- `MODEL_NOT_FOUND` - Model not found in registry
- `INSUFFICIENT_RESOURCES` - Not enough resources available
- `BACKEND_UNAVAILABLE` - Backend is not available for use
- `TASK_TIMEOUT` - Task execution timed out
- `INVALID_TASK` - Invalid task definition
- `MODEL_LOAD_FAILED` - Failed to load model
- `INFERENCE_FAILED` - Inference execution failed