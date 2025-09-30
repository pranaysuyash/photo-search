# ANN System Quick Reference

## Core Components

### Backend Selection
```typescript
import { BackendSelector } from './services/ann/BackendSelector';

const selector = new BackendSelector();
const selection = await selector.selectBackend(task, criteria);
```

### Model Registry
```typescript
import { ModelRegistry } from './services/ann/ModelRegistry';

const registry = new ModelRegistry();
await registry.registerModel(metadata);
const instanceId = await registry.loadModel(modelId, version, backendId);
```

### Performance Profiling
```typescript
import { PerformanceProfiler } from './services/ann/PerformanceProfiler';

const profiler = new PerformanceProfiler();
await profiler.initialize();
await profiler.recordExecution(backendId, taskType, modelId, metrics);
```

### Resource Monitoring
```typescript
import { ResourceMonitor } from './services/ann/ResourceMonitor';

const monitor = new ResourceMonitor({ interval: 1000 });
await monitor.initialize();
monitor.start();
```

## Task Definition

```typescript
interface AITask {
  id: string;
  type: TaskType; // 'classification', 'object-detection', 'face-detection', etc.
  modelId: string;
  input: {
    data: any;
    format: InputFormat;
    dimensions?: number[];
  };
  priority: 'low' | 'normal' | 'high' | 'critical';
  resourceRequirements: ResourceRequirements;
  timeout?: number;
  metadata?: Record<string, any>;
}
```

## Backend Selection Criteria

```typescript
interface SelectionCriteria {
  constraints?: {
    maxInferenceTime?: number;
    maxMemoryUsage?: number;
    excludedBackends?: string[];
  };
  context?: {
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    networkCondition?: 'good' | 'poor' | 'offline';
    batteryLevel?: number;
  };
}
```

## Performance Metrics

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

## Common Use Cases

### 1. Image Classification
```typescript
const task: AITask = {
  id: 'classify-image-1',
  type: 'classification',
  modelId: 'mobilenet-v2',
  input: {
    data: imageTensor,
    format: { type: 'tensor', dtype: 'float32' },
    dimensions: [224, 224, 3]
  },
  priority: 'normal',
  resourceRequirements: {
    memory: { min: 100, max: 300, optimal: 200 },
    cpu: { min: 10, max: 30, optimal: 20 }
  }
};
```

### 2. Object Detection
```typescript
const task: AITask = {
  id: 'detect-objects-1',
  type: 'object-detection',
  modelId: 'yolo-v8',
  input: {
    data: imageTensor,
    format: { type: 'image', format: 'rgb' },
    dimensions: [640, 640, 3]
  },
  priority: 'high',
  resourceRequirements: {
    memory: { min: 200, max: 500, optimal: 300 },
    cpu: { min: 20, max: 50, optimal: 30 }
  }
};
```

### 3. Face Detection
```typescript
const task: AITask = {
  id: 'detect-faces-1',
  type: 'face-detection',
  modelId: 'facenet',
  input: {
    data: imageTensor,
    format: { type: 'image', format: 'rgb' },
    dimensions: [224, 224, 3]
  },
  priority: 'normal',
  resourceRequirements: {
    memory: { min: 150, max: 400, optimal: 250 },
    cpu: { min: 15, max: 40, optimal: 25 }
  }
};
```

## Error Handling

### Common Exceptions
- `Error('No available backends for this task')`
- `Error('Model not loaded')`
- `Error('Backend not initialized')`
- `Error('Resource constraints not met')`

### Error Handling Pattern
```typescript
try {
  const selection = await backendSelector.selectBackend(task);
  // Use the selected backend
} catch (error) {
  console.error('Backend selection failed:', error);
  // Implement fallback logic
}
```

## Performance Tips

### 1. Optimize Backend Selection
```typescript
const criteria = {
  constraints: {
    maxInferenceTime: 100,
    maxMemoryUsage: 150
  },
  context: {
    deviceType: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
  }
};
```

### 2. Monitor Performance
```typescript
const profile = await profiler.getProfile(backendId, taskType, modelId);
console.log(`Avg inference time: ${profile.metrics.inferenceTime}ms`);
console.log(`Avg memory usage: ${profile.metrics.memoryUsage}MB`);
```

### 3. Use Resource Constraints
```typescript
const resourceRequirements = {
  memory: {
    min: 50,
    max: 200,
    optimal: 100
  },
  cpu: {
    min: 5,
    max: 25,
    optimal: 15
  }
};
```

## Configuration

### Environment Variables
```bash
ANN_ENABLE_PERFORMANCE_PROFILING=true
ANN_RESOURCE_MONITOR_INTERVAL=1000
ANN_MAX_CONCURRENT_TASKS=10
ANN_BACKEND_SELECTION_TIMEOUT=5000
```

### Configuration File
```typescript
export const ANN_CONFIG = {
  backends: {
    tensorflowjs: { enabled: true },
    onnx: { enabled: true },
    pytorch: { enabled: false }
  },
  monitoring: {
    enabled: true,
    interval: 1000
  },
  performance: {
    profilingEnabled: true,
    sampleSize: 100
  }
};
```

## Debugging

### Enable Debug Logging
```typescript
const selector = new BackendSelector({
  debug: true,
  logLevel: 'verbose'
});
```

### Check Backend Health
```typescript
const backend = backendRegistry.getBackend(backendId);
const health = backend?.getHealth();
console.log('Backend health:', health?.status);
```

### Monitor Resources
```typescript
const resources = resourceMonitor.getCurrentResources();
console.log('Available memory:', resources.availableMemory);
console.log('CPU usage:', resources.cpuUsage);
```

## Testing

### Unit Testing Pattern
```typescript
test('should select appropriate backend', async () => {
  const task = createMockTask();
  const selection = await backendSelector.selectBackend(task);

  expect(selection.backend).toBeDefined();
  expect(selection.confidence).toBeGreaterThan(0);
});
```

### Integration Testing
```typescript
test('should execute complete ML pipeline', async () => {
  // 1. Register model
  await modelRegistry.registerModel(modelMetadata);

  // 2. Select backend
  const selection = await backendSelector.selectBackend(task);

  // 3. Load model
  const instanceId = await modelRegistry.loadModel(task.modelId);

  // 4. Run inference
  const result = await backend.runInference(task.modelId, task.input);

  // 5. Verify results
  expect(result).toBeDefined();
});
```

## Migration Guide

### From v1 to v2
1. Update backend initialization
2. Replace deprecated methods
3. Update performance tracking
4. Review configuration options

### Breaking Changes
- `BackendManager.initialize()` now returns Promise<boolean>
- `TaskScheduler.scheduleTask()` renamed to `submitTask()`
- `ModelRegistry` interface updated for better type safety

## Support

### Getting Help
- Check the documentation in `/docs/`
- Review component comments in source files
- Run tests with `npm test -- src/__tests__/ann/`
- Enable debug logging for troubleshooting

### Reporting Issues
- Include system specifications
- Provide error messages and stack traces
- Share configuration and task definitions
- Include performance metrics if applicable