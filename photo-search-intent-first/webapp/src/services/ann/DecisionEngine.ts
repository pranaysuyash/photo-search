/**
 * Decision Engine with machine learning for optimal backend selection
 */

import {
  AITask,
  BackendSelection,
  TaskResult,
  PerformanceMetrics,
  ResourceUsage,
  SystemResources,
  BackendHealth,
  TaskType,
  ModelConfig
} from './types';
import { BaseBackend } from './BackendInterface';
import { BackendSelector } from './BackendSelector';
import { PerformanceProfiler } from './PerformanceProfiler';
import { ResourceMonitor } from './ResourceMonitor';

export interface DecisionContext {
  task: AITask;
  systemResources: SystemResources;
  backendHealth: Record<string, BackendHealth>;
  historicalPerformance: Map<string, PerformanceHistory>;
  userPreferences: Map<string, Map<string, number>>;
  currentLoad: Map<string, number>;
  timeOfDay: number;
  dayOfWeek: number;
}

export interface DecisionWeights {
  performance: number;
  reliability: number;
  efficiency: number;
  userPreference: number;
  cost: number;
  latency: number;
  adaptability: number;
  fairness: number;
}

export interface LearningData {
  taskId: string;
  backendId: string;
  context: DecisionContext;
  decision: BackendSelection;
  actualPerformance: PerformanceMetrics;
  userSatisfaction: number;
  timestamp: number;
}

export interface MLModel {
  id: string;
  name: string;
  version: string;
  type: 'regression' | 'classification' | 'reinforcement';
  features: string[];
  target: string;
  accuracy: number;
  lastTrained: number;
  isTrained: boolean;
}

export class DecisionEngine {
  private backendSelector: BackendSelector;
  private performanceProfiler: PerformanceProfiler;
  private resourceMonitor: ResourceMonitor;
  private learningData: LearningData[] = [];
  private mlModels: Map<string, MLModel> = new Map();
  private weights: DecisionWeights;
  private adaptationRate: number;
  private fairnessConstraints: FairnessConstraints;
  private userFeedback: Map<string, UserFeedback> = new Map();

  constructor(config: {
    weights?: Partial<DecisionWeights>;
    adaptationRate?: number;
    fairnessConstraints?: Partial<FairnessConstraints>;
  } = {}) {
    this.backendSelector = new BackendSelector();
    this.performanceProfiler = new PerformanceProfiler();
    this.resourceMonitor = new ResourceMonitor();

    this.weights = {
      performance: 0.25,
      reliability: 0.20,
      efficiency: 0.15,
      userPreference: 0.15,
      cost: 0.10,
      latency: 0.08,
      adaptability: 0.05,
      fairness: 0.02,
      ...config.weights
    };

    this.adaptationRate = config.adaptationRate || 0.1;
    this.fairnessConstraints = {
      maxDisparity: 0.15,
      minRepresentation: 0.1,
      fairnessMetric: 'demographic_parity',
      ...config.fairnessConstraints
    };
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('[DecisionEngine] Initializing decision engine...');

      // Initialize components
      await this.performanceProfiler.initialize();
      await this.resourceMonitor.initialize();

      // Load learning data and ML models
      await this.loadLearningData();
      await this.loadMLModels();

      // Start continuous learning
      this.startContinuousLearning();

      console.log('[DecisionEngine] Decision engine initialized successfully');
      return true;
    } catch (error) {
      console.error('[DecisionEngine] Failed to initialize:', error);
      return false;
    }
  }

  async makeDecision(task: AITask, context?: Partial<DecisionContext>): Promise<BackendSelection> {
    const fullContext = await this.buildDecisionContext(task, context);
    const candidates = await this.generateCandidates(fullContext);
    const scoredCandidates = await this.scoreCandidates(candidates, fullContext);
    const selected = this.selectBestCandidate(scoredCandidates, fullContext);

    // Apply fairness constraints
    const fairSelection = this.applyFairnessConstraints(selected, scoredCandidates, fullContext);

    // Record decision for learning
    this.recordDecision(task, fairSelection, fullContext);

    return fairSelection;
  }

  async makeBatchDecisions(tasks: AITask[], context?: Partial<DecisionContext>): Promise<BackendSelection[]> {
    const fullContext = await this.buildDecisionContext(tasks[0], context);
    const decisions: BackendSelection[] = [];

    // Optimize for batch processing
    const loadBalancedDecisions = await this.optimizeBatchDecisions(tasks, fullContext);

    for (const decision of loadBalancedDecisions) {
      const fairDecision = this.applyFairnessConstraints(decision, [], fullContext);
      decisions.push(fairDecision);
      this.recordDecision(tasks[decisions.indexOf(decision)], fairDecision, fullContext);
    }

    return decisions;
  }

  recordTaskResult(taskId: string, backendId: string, result: TaskResult, userFeedback?: UserFeedback): void {
    // Find the learning data entry
    const learningEntry = this.learningData.find(data =>
      data.taskId === taskId && data.backendId === backendId
    );

    if (learningEntry) {
      learningEntry.actualPerformance = {
        inferenceTime: result.processingTime,
        memoryUsage: result.memoryUsage,
        throughput: 1000 / result.processingTime,
        accuracy: result.success ? 1 : 0
      };

      if (userFeedback) {
        learningEntry.userSatisfaction = userFeedback.satisfaction;
        this.userFeedback.set(taskId, userFeedback);
      }

      // Trigger model retraining
      this.triggerRetraining();
    }
  }

  async optimizeWeights(performanceGoal: 'speed' | 'efficiency' | 'balance' = 'balance'): Promise<void> {
    console.log(`[DecisionEngine] Optimizing weights for ${performanceGoal}...`);

    const currentWeights = { ...this.weights };
    const optimizationIterations = 100;

    for (let i = 0; i < optimizationIterations; i++) {
      // Simulate weight optimization using historical data
      const simulatedPerformance = this.simulatePerformanceWithWeights(currentWeights);
      const currentScore = this.calculateObjectiveScore(simulatedPerformance, performanceGoal);

      // Generate small random perturbations
      const perturbedWeights = this.perturbWeights(currentWeights);
      const perturbedPerformance = this.simulatePerformanceWithWeights(perturbedWeights);
      const perturbedScore = this.calculateObjectiveScore(perturbedPerformance, performanceGoal);

      // Accept better weights
      if (perturbedScore > currentScore) {
        Object.assign(currentWeights, perturbedWeights);
      }
    }

    this.weights = currentWeights;
    console.log('[DecisionEngine] Weights optimized:', this.weights);
  }

  getDecisionAnalytics(): {
    totalDecisions: number;
    averageConfidence: number;
    successRate: number;
    backendDistribution: Record<string, number>;
    weightEvolution: Array<{ timestamp: number; weights: DecisionWeights }>;
    fairnessMetrics: FairnessMetrics;
    learningProgress: LearningProgress;
  } {
    const totalDecisions = this.learningData.length;
    const successfulDecisions = this.learningData.filter(d => d.actualPerformance.accuracy > 0.8).length;
    const averageConfidence = this.learningData.reduce((sum, d) => sum + d.decision.confidence, 0) / totalDecisions;

    const backendDistribution: Record<string, number> = {};
    this.learningData.forEach(data => {
      backendDistribution[data.backendId] = (backendDistribution[data.backendId] || 0) + 1;
    });

    return {
      totalDecisions,
      averageConfidence: totalDecisions > 0 ? averageConfidence : 0,
      successRate: totalDecisions > 0 ? successfulDecisions / totalDecisions : 0,
      backendDistribution,
      weightEvolution: this.getWeightEvolution(),
      fairnessMetrics: this.calculateFairnessMetrics(),
      learningProgress: this.calculateLearningProgress()
    };
  }

  async exportModel(): Promise<string> {
    const modelData = {
      weights: this.weights,
      learningData: this.learningData.slice(-1000), // Last 1000 entries
      mlModels: Object.fromEntries(this.mlModels),
      adaptationRate: this.adaptationRate,
      fairnessConstraints: this.fairnessConstraints,
      exportedAt: Date.now()
    };

    return JSON.stringify(modelData, null, 2);
  }

  async importModel(jsonData: string): Promise<boolean> {
    try {
      const modelData = JSON.parse(jsonData);

      if (modelData.weights) {
        this.weights = modelData.weights;
      }

      if (modelData.learningData) {
        this.learningData = modelData.learningData;
      }

      if (modelData.mlModels) {
        this.mlModels = new Map(Object.entries(modelData.mlModels));
      }

      if (modelData.adaptationRate) {
        this.adaptationRate = modelData.adaptationRate;
      }

      if (modelData.fairnessConstraints) {
        this.fairnessConstraints = modelData.fairnessConstraints;
      }

      console.log('[DecisionEngine] Model imported successfully');
      return true;
    } catch (error) {
      console.error('[DecisionEngine] Failed to import model:', error);
      return false;
    }
  }

  // Private methods
  private async buildDecisionContext(task: AITask, partialContext?: Partial<DecisionContext>): Promise<DecisionContext> {
    const systemResources = this.resourceMonitor.getCurrentResources();
    const currentLoad = this.calculateCurrentLoad();

    return {
      task,
      systemResources,
      backendHealth: await this.getBackendHealthStatus(),
      historicalPerformance: this.getHistoricalPerformance(),
      userPreferences: this.getUserPreferences(),
      currentLoad,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      ...partialContext
    };
  }

  private async generateCandidates(context: DecisionContext): Promise<Array<{ backendId: string; confidence: number }>> {
    const candidates: Array<{ backendId: string; confidence: number }> = [];

    // Use backend selector to get initial candidates
    const selection = await this.backendSelector.selectMultipleBackends(context.task, undefined, 5);

    for (const sel of selection) {
      candidates.push({
        backendId: sel.backend,
        confidence: sel.confidence
      });
    }

    return candidates;
  }

  private async scoreCandidates(
    candidates: Array<{ backendId: string; confidence: number }>,
    context: DecisionContext
  ): Promise<Array<{ backendId: string; score: number; details: any }>> {
    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        const score = await this.calculateCandidateScore(candidate.backendId, context);
        return {
          backendId: candidate.backendId,
          score: score.total,
          details: score
        };
      })
    );

    return scoredCandidates;
  }

  private async calculateCandidateScore(
    backendId: string,
    context: DecisionContext
  ): Promise<{ total: number; details: any }> {
    const backendHealth = context.backendHealth[backendId];
    const historicalPerf = context.historicalPerformance.get(backendId);
    const currentLoad = context.currentLoad.get(backendId) || 0;

    const scores = {
      performance: this.calculatePerformanceScore(backendId, context),
      reliability: this.calculateReliabilityScore(backendHealth, historicalPerf),
      efficiency: this.calculateEfficiencyScore(backendId, context),
      userPreference: this.calculateUserPreferenceScore(backendId, context),
      cost: this.calculateCostScore(backendId, context),
      latency: this.calculateLatencyScore(backendId, context),
      adaptability: this.calculateAdaptabilityScore(backendId, context),
      fairness: this.calculateFairnessScore(backendId, context)
    };

    const total = Object.entries(scores).reduce((sum, [key, score]) => {
      return sum + score * (this.weights as any)[key];
    }, 0);

    return { total, details: scores };
  }

  private calculatePerformanceScore(backendId: string, context: DecisionContext): number {
    const historicalPerf = context.historicalPerformance.get(backendId);
    if (!historicalPerf) return 0.5; // Default for new backends

    const avgInferenceTime = historicalPerf.averageInferenceTime;
    const avgAccuracy = historicalPerf.averageAccuracy;

    // Normalize scores (0-1)
    const timeScore = Math.max(0, 1 - avgInferenceTime / 1000); // Normalize to 1 second
    const accuracyScore = avgAccuracy;

    return (timeScore + accuracyScore) / 2;
  }

  private calculateReliabilityScore(backendHealth: BackendHealth, historicalPerf?: PerformanceHistory): number {
    let healthScore = 0;

    switch (backendHealth.status) {
      case 'healthy': healthScore = 1.0; break;
      case 'degraded': healthScore = 0.7; break;
      case 'unhealthy': healthScore = 0.3; break;
      default: healthScore = 0.5;
    }

    const errorRateScore = 1 - backendHealth.errorRate;
    const uptimeScore = Math.min(1, backendHealth.uptime / (24 * 60 * 60 * 1000)); // 24 hours

    return (healthScore + errorRateScore + uptimeScore) / 3;
  }

  private calculateEfficiencyScore(backendId: string, context: DecisionContext): number {
    const currentLoad = context.currentLoad.get(backendId) || 0;
    const loadFactor = Math.max(0, 1 - currentLoad / 100); // Normalize to 100% load

    const systemResources = context.systemResources;
    const availableMemoryRatio = systemResources.availableMemory / systemResources.totalMemory;
    const availableCPURatio = systemResources.availableCPU / systemResources.totalCPU;

    return (loadFactor + availableMemoryRatio + availableCPURatio) / 3;
  }

  private calculateUserPreferenceScore(backendId: string, context: DecisionContext): number {
    const userPrefs = context.userPreferences.get(context.task.id) || new Map();
    const preference = userPrefs.get(backendId) || 0.5; // Default neutral preference

    return preference;
  }

  private calculateCostScore(backendId: string, context: DecisionContext): number {
    // Simple cost estimation based on resource usage
    // Lower resource usage = lower cost = higher score
    const backendHealth = context.backendHealth[backendId];
    const resourceUsage = backendHealth.resourceUsage;

    const totalResourceUsage = resourceUsage.memory + resourceUsage.cpu;
    const maxResourceUsage = 1000; // Arbitrary maximum

    return Math.max(0, 1 - totalResourceUsage / maxResourceUsage);
  }

  private calculateLatencyScore(backendId: string, context: DecisionContext): number {
    const backendHealth = context.backendHealth[backendId];
    const responseTime = backendHealth.responseTime;

    // Lower latency = higher score
    return Math.max(0, 1 - responseTime / 1000); // Normalize to 1 second
  }

  private calculateAdaptabilityScore(backendId: string, context: DecisionContext): number {
    // Measure how well the backend adapts to changing conditions
    const historicalPerf = context.historicalPerformance.get(backendId);

    if (!historicalPerf || historicalPerf.selections.length < 10) {
      return 0.5; // Default for new backends
    }

    // Calculate consistency of performance
    const recentSelections = historicalPerf.selections.slice(-20);
    const inferenceTimes = recentSelections.map(s => s.actualPerformance.inferenceTime);
    const meanInferenceTime = inferenceTimes.reduce((sum, time) => sum + time, 0) / inferenceTimes.length;
    const variance = inferenceTimes.reduce((sum, time) => sum + Math.pow(time - meanInferenceTime, 2), 0) / inferenceTimes.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower variance = higher adaptability
    return Math.max(0, 1 - standardDeviation / meanInferenceTime);
  }

  private calculateFairnessScore(backendId: string, context: DecisionContext): number {
    // Ensure fair distribution of backend usage
    const totalDecisions = this.learningData.length;
    const backendUsage = this.learningData.filter(d => d.backendId === backendId).length;
    const expectedUsage = totalDecisions / Object.keys(context.backendHealth).length;

    if (totalDecisions === 0) return 1.0;

    const usageRatio = backendUsage / expectedUsage;

    // Score based on how close to expected usage
    return Math.max(0, 1 - Math.abs(usageRatio - 1));
  }

  private selectBestCandidate(
    scoredCandidates: Array<{ backendId: string; score: number; details: any }>,
    context: DecisionContext
  ): BackendSelection {
    const best = scoredCandidates.reduce((prev, current) =>
      current.score > prev.score ? current : prev
    );

    return {
      backend: best.backendId,
      confidence: best.score,
      fallbacks: scoredCandidates
        .filter(c => c.backendId !== best.backendId)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(c => c.backendId),
      reasoning: this.generateReasoning(best, context),
      estimatedPerformance: this.estimatePerformance(best.backendId, context),
      timestamp: Date.now()
    };
  }

  private applyFairnessConstraints(
    selected: BackendSelection,
    candidates: Array<{ backendId: string; score: number; details: any }>,
    context: DecisionContext
  ): BackendSelection {
    // Check fairness constraints and adjust selection if needed
    const fairnessMetrics = this.calculateFairnessMetrics();

    if (fairnessMetrics.maxDisparity > this.fairnessConstraints.maxDisparity) {
      // Find underutilized backends and boost their scores
      const underutilized = candidates.filter(c =>
        fairnessMetrics.backendUsage[c.backendId] < this.fairnessConstraints.minRepresentation
      );

      if (underutilized.length > 0) {
        // Select the best underutilized backend
        const bestUnderutilized = underutilized.reduce((prev, current) =>
          current.score > prev.score ? current : prev
        );

        return {
          ...selected,
          backend: bestUnderutilized.backendId,
          reasoning: [
            ...selected.reasoning,
            {
              criterion: 'fairness_adjustment',
              score: 0.1,
              weight: 0.1,
              explanation: 'Adjusted selection for fairness constraints'
            }
          ]
        };
      }
    }

    return selected;
  }

  private recordDecision(task: AITask, decision: BackendSelection, context: DecisionContext): void {
    const learningData: LearningData = {
      taskId: task.id,
      backendId: decision.backend,
      context,
      decision,
      actualPerformance: {
        inferenceTime: 0, // Will be updated when task completes
        memoryUsage: 0,
        throughput: 0,
        accuracy: 0
      },
      userSatisfaction: 0.5, // Default neutral satisfaction
      timestamp: Date.now()
    };

    this.learningData.push(learningData);

    // Limit learning data size
    if (this.learningData.length > 10000) {
      this.learningData = this.learningData.slice(-5000);
    }
  }

  private async getBackendHealthStatus(): Promise<Record<string, BackendHealth>> {
    // This would typically query the actual backend health
    // For now, return placeholder data
    return {};
  }

  private getHistoricalPerformance(): Map<string, PerformanceHistory> {
    // This would typically load from the performance profiler
    return new Map();
  }

  private getUserPreferences(): Map<string, Map<string, number>> {
    // This would typically load from user settings
    return new Map();
  }

  private calculateCurrentLoad(): Map<string, number> {
    // Calculate current load on each backend
    const recentTasks = this.learningData.filter(d =>
      Date.now() - d.timestamp < 60000 // Last minute
    );

    const load = new Map<string, number>();
    recentTasks.forEach(task => {
      const currentLoad = load.get(task.backendId) || 0;
      load.set(task.backendId, currentLoad + 1);
    });

    return load;
  }

  private async optimizeBatchDecisions(tasks: AITask[], context: DecisionContext): Promise<BackendSelection[]> {
    // Implement load balancing for batch decisions
    const decisions: BackendSelection[] = [];
    const backendLoads = new Map<string, number>();

    for (const task of tasks) {
      const candidates = await this.generateCandidates(context);
      const scoredCandidates = await this.scoreCandidates(candidates, context);

      // Select backend with lowest load
      const bestCandidate = scoredCandidates.reduce((best, current) => {
        const bestLoad = backendLoads.get(best.backendId) || 0;
        const currentLoad = backendLoads.get(current.backendId) || 0;
        return currentLoad < bestLoad ? current : best;
      });

      const decision = this.selectBestCandidate([bestCandidate], context);
      decisions.push(decision);

      // Update load
      backendLoads.set(decision.backend, (backendLoads.get(decision.backend) || 0) + 1);
    }

    return decisions;
  }

  private generateReasoning(best: { backendId: string; score: number; details: any }, context: DecisionContext): any[] {
    return [
      {
        criterion: 'overall_performance',
        score: best.score,
        weight: 1.0,
        explanation: `Selected backend ${best.backendId} based on comprehensive scoring`
      },
      {
        criterion: 'performance_score',
        score: best.details.performance,
        weight: this.weights.performance,
        explanation: `Performance score: ${best.details.performance.toFixed(3)}`
      },
      {
        criterion: 'reliability_score',
        score: best.details.reliability,
        weight: this.weights.reliability,
        explanation: `Reliability score: ${best.details.reliability.toFixed(3)}`
      }
    ];
  }

  private estimatePerformance(backendId: string, context: DecisionContext): any {
    // Estimate performance based on historical data
    const historicalPerf = context.historicalPerformance.get(backendId);

    if (!historicalPerf) {
      return {
        inferenceTime: 100, // Default estimate
        memoryUsage: 50,
        accuracy: 0.8
      };
    }

    return {
      inferenceTime: historicalPerf.averageInferenceTime,
      memoryUsage: historicalPerf.averageMemoryUsage,
      accuracy: historicalPerf.averageAccuracy
    };
  }

  private triggerRetraining(): void {
    // Trigger model retraining when enough new data is available
    if (this.learningData.length > 100) {
      this.retrainModels();
    }
  }

  private async retrainModels(): Promise<void> {
    console.log('[DecisionEngine] Retraining ML models...');

    // Simple retraining logic - in practice, this would use more sophisticated ML
    const recentData = this.learningData.slice(-100);

    // Update weights based on recent performance
    const successfulDecisions = recentData.filter(d => d.actualPerformance.accuracy > 0.8);
    const failedDecisions = recentData.filter(d => d.actualPerformance.accuracy <= 0.8);

    if (successfulDecisions.length > 0 && failedDecisions.length > 0) {
      // Adjust weights to favor successful patterns
      this.adjustWeightsBasedOnResults(successfulDecisions, failedDecisions);
    }

    console.log('[DecisionEngine] Model retraining completed');
  }

  private adjustWeightsBasedOnResults(successful: LearningData[], failed: LearningData[]): void {
    // Analyze patterns in successful vs failed decisions
    const avgSuccessfulPerformance = successful.reduce((sum, d) =>
      sum + this.calculateDecisionScore(d.decision), 0) / successful.length;
    const avgFailedPerformance = failed.reduce((sum, d) =>
      sum + this.calculateDecisionScore(d.decision), 0) / failed.length;

    // Adjust weights to improve performance
    const adjustmentFactor = this.adaptationRate * (avgSuccessfulPerformance - avgFailedPerformance);

    // Apply adjustments (simplified)
    this.weights.performance = Math.max(0, Math.min(1, this.weights.performance + adjustmentFactor));
    this.weights.reliability = Math.max(0, Math.min(1, this.weights.reliability + adjustmentFactor * 0.8));
  }

  private calculateDecisionScore(decision: BackendSelection): number {
    return decision.confidence;
  }

  private startContinuousLearning(): void {
    // Start periodic model retraining
    setInterval(() => {
      this.retrainModels();
    }, 300000); // Retrain every 5 minutes
  }

  private simulatePerformanceWithWeights(weights: DecisionWeights): any {
    // Simulate performance with given weights
    return {
      accuracy: 0.85,
      efficiency: 0.75,
      fairness: 0.90
    };
  }

  private calculateObjectiveScore(performance: any, goal: string): number {
    switch (goal) {
      case 'speed':
        return performance.accuracy * 0.7 + performance.efficiency * 0.3;
      case 'efficiency':
        return performance.accuracy * 0.3 + performance.efficiency * 0.7;
      case 'balance':
        return (performance.accuracy + performance.efficiency + performance.fairness) / 3;
      default:
        return performance.accuracy;
    }
  }

  private perturbWeights(weights: DecisionWeights): DecisionWeights {
    const perturbed = { ...weights };
    const perturbationAmount = 0.05;

    Object.keys(perturbed).forEach(key => {
      const value = (perturbed as any)[key];
      const perturbation = (Math.random() - 0.5) * perturbationAmount * 2;
      (perturbed as any)[key] = Math.max(0, Math.min(1, value + perturbation));
    });

    return perturbed;
  }

  private getWeightEvolution(): Array<{ timestamp: number; weights: DecisionWeights }> {
    // Return weight evolution over time
    return [
      {
        timestamp: Date.now(),
        weights: { ...this.weights }
      }
    ];
  }

  private calculateFairnessMetrics(): FairnessMetrics {
    const totalDecisions = this.learningData.length;
    const backendUsage: Record<string, number> = {};

    this.learningData.forEach(data => {
      backendUsage[data.backendId] = (backendUsage[data.backendId] || 0) + 1;
    });

    const usageValues = Object.values(backendUsage);
    const maxUsage = Math.max(...usageValues);
    const minUsage = Math.min(...usageValues);
    const maxDisparity = maxUsage - minUsage;

    return {
      maxDisparity: totalDecisions > 0 ? maxDisparity / totalDecisions : 0,
      backendUsage,
      fairnessScore: totalDecisions > 0 ? 1 - (maxDisparity / totalDecisions) : 1
    };
  }

  private calculateLearningProgress(): LearningProgress {
    const recentData = this.learningData.slice(-100);
    const accuracyTrend = this.calculateAccuracyTrend(recentData);
    const convergenceRate = this.calculateConvergenceRate(recentData);

    return {
      totalLearningIterations: this.learningData.length,
      accuracyTrend,
      convergenceRate,
      modelStability: this.calculateModelStability()
    };
  }

  private calculateAccuracyTrend(data: LearningData[]): number {
    if (data.length < 10) return 0;

    const recentAccuracy = data.slice(-10).reduce((sum, d) => sum + d.actualPerformance.accuracy, 0) / 10;
    const earlierAccuracy = data.slice(-20, -10).reduce((sum, d) => sum + d.actualPerformance.accuracy, 0) / 10;

    return recentAccuracy - earlierAccuracy;
  }

  private calculateConvergenceRate(data: LearningData[]): number {
    // Simple convergence measure
    const accuracies = data.map(d => d.actualPerformance.accuracy);
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - 0.85, 2), 0) / accuracies.length;

    return Math.max(0, 1 - variance);
  }

  private calculateModelStability(): number {
    // Measure how stable the model weights are
    const weightValues = Object.values(this.weights);
    const mean = weightValues.reduce((sum, val) => sum + val, 0) / weightValues.length;
    const variance = weightValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / weightValues.length;

    return Math.max(0, 1 - variance);
  }

  private async loadLearningData(): Promise<void> {
    // Load learning data from persistent storage
    console.log('[DecisionEngine] Loading learning data...');
  }

  private async loadMLModels(): Promise<void> {
    // Load ML models from persistent storage
    console.log('[DecisionEngine] Loading ML models...');
  }
}

interface PerformanceHistory {
  backendId: string;
  selections: Array<{
    timestamp: number;
    actualPerformance: PerformanceMetrics;
  }>;
  averageInferenceTime: number;
  averageMemoryUsage: number;
  averageAccuracy: number;
}

interface FairnessConstraints {
  maxDisparity: number;
  minRepresentation: number;
  fairnessMetric: string;
}

interface FairnessMetrics {
  maxDisparity: number;
  backendUsage: Record<string, number>;
  fairnessScore: number;
}

interface LearningProgress {
  totalLearningIterations: number;
  accuracyTrend: number;
  convergenceRate: number;
  modelStability: number;
}

interface UserFeedback {
  satisfaction: number;
  comments?: string;
  timestamp: number;
}