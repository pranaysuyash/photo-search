/**
 * OfflineActionQueue - Provides offline-first resilience with action queuing and sync capabilities
 * This system ensures actions can be performed offline and synced when connectivity is restored.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { 
  AppError, 
  errorFactory, 
  handleGlobalError 
} from "../framework/EnhancedErrorHandling";

// Action types
export type OfflineActionType = 
  | "SEARCH"
  | "INDEX"
  | "TAG"
  | "RATE"
  | "EXPORT"
  | "DELETE"
  | "MOVE"
  | "COPY"
  | "CREATE_COLLECTION"
  | "DELETE_COLLECTION"
  | "ADD_TO_COLLECTION"
  | "REMOVE_FROM_COLLECTION"
  | "SETTINGS_UPDATE"
  | "METADATA_UPDATE"
  | "OCR_PROCESS"
  | "CAPTION_GENERATE"
  | "FACE_RECOGNIZE"
  | "SMART_COLLECTION_CREATE"
  | "SMART_COLLECTION_UPDATE"
  | "SMART_COLLECTION_DELETE"
  | "PRESET_SAVE"
  | "PRESET_DELETE"
  | "WORKSPACE_ADD"
  | "WORKSPACE_REMOVE"
  | "FAVORITE_TOGGLE"
  | "TRASH_TOGGLE"
  | "RESTORE_FROM_TRASH"
  | "EMPTY_TRASH"
  | "CUSTOM";

// Action status
export type OfflineActionStatus = 
  | "QUEUED"      // Action is waiting to be processed
  | "PROCESSING"  // Action is currently being processed
  | "SYNCED"      // Action has been successfully synced
  | "FAILED"      // Action failed to process
  | "CANCELLED"   // Action was cancelled
  | "PENDING_SYNC" // Action completed offline, waiting for sync
  | "SYNCING"     // Action is currently syncing
  | "CONFLICT"    // Action has conflict that needs resolution;

// Action priority
export type OfflineActionPriority = 
  | "LOW"      // Can wait, low impact
  | "NORMAL"   // Standard processing
  | "HIGH"     // Important, should process soon
  | "CRITICAL" // Urgent, must process immediately
  | "BACKGROUND"; // Low priority background task

// Conflict resolution strategies
export type ConflictResolutionStrategy = 
  | "LAST_WRITE_WINS"  // Most recent change wins
  | "MERGE"            // Attempt to merge changes
  | "USER_SELECT"      // Ask user to choose
  | "FAIL"             // Fail the operation
  | "SERVER_WINS"      // Server version wins
  | "CLIENT_WINS";     // Client version wins

// Offline action interface
export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  status: OfflineActionStatus;
  priority: OfflineActionPriority;
  payload: Record<string, unknown>;
  context?: {
    userId?: string;
    sessionId?: string;
    deviceId?: string;
    timestamp: number;
    correlationId?: string;
    userAgent?: string;
    ipAddress?: string;
  };
  metadata?: {
    createdAt: number;
    updatedAt: number;
    retryCount: number;
    maxRetries: number;
    lastError?: {
      message: string;
      code?: string;
      timestamp: number;
      stack?: string;
    };
    estimatedExecutionTime?: number;
    requiresNetwork: boolean;
    requiresUserInteraction: boolean;
    conflictResolutionStrategy: ConflictResolutionStrategy;
    conflictResolution?: {
      serverVersion?: Record<string, unknown>;
      clientVersion?: Record<string, unknown>;
      resolvedVersion?: Record<string, unknown>;
      resolutionStrategy?: ConflictResolutionStrategy;
      resolvedAt?: number;
      resolvedBy?: string; // "user" | "auto" | "server"
    };
  };
  dependencies?: string[]; // IDs of actions this action depends on
  groupId?: string; // For grouping related actions
  tags?: string[]; // Custom tags for filtering and categorization
  syncAttempts: number;
  lastSyncAttempt?: number;
  nextSyncAttempt?: number;
}

// Queue persistence interface
export interface QueuePersistence {
  save: (actions: OfflineAction[]) => Promise<void>;
  load: () => Promise<OfflineAction[]>;
  clear: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

// Conflict resolver interface
export interface ConflictResolver {
  resolve: (local: OfflineAction, remote: OfflineAction) => Promise<OfflineAction>;
}

// Default conflict resolver
const defaultConflictResolver: ConflictResolver = {
  resolve: async (local: OfflineAction, remote: OfflineAction): Promise<OfflineAction> => {
    // By default, use last-write-wins strategy
    if (local.metadata?.updatedAt && remote.metadata?.updatedAt) {
      return local.metadata.updatedAt > remote.metadata.updatedAt ? local : remote;
    }
    return local;
  }
};

// Offline action queue manager
export class OfflineActionQueue {
  private actions: Map<string, OfflineAction> = new Map();
  private groups: Map<string, Set<string>> = new Map();
  private dependencies: Map<string, Set<string>> = new Map();
  private persistence?: QueuePersistence;
  private conflictResolver: ConflictResolver = defaultConflictResolver;
  private maxRetries: number = 3;
  private isProcessing: boolean = false;
  private isOnline: boolean = true;
  private networkChangeListeners: Array<(isOnline: boolean) => void> = [];
  private actionProcessors: Map<OfflineActionType, (action: OfflineAction) => Promise<void>> = new Map();
  private queueChangeListeners: Array<(actions: OfflineAction[]) => void> = [];
  private syncInProgress = false;
  private syncIntervalId: NodeJS.Timeout | null = null;
  private syncInterval: number = 30000; // 30 seconds
  private maxQueueSize: number = 1000;
  private isInitialized: boolean = false;
  
  constructor(options?: {
    persistence?: QueuePersistence;
    conflictResolver?: ConflictResolver;
    maxRetries?: number;
    syncInterval?: number;
    maxQueueSize?: number;
  }) {
    this.persistence = options?.persistence;
    this.conflictResolver = options?.conflictResolver || defaultConflictResolver;
    this.maxRetries = options?.maxRetries || 3;
    this.syncInterval = options?.syncInterval || 30000;
    this.maxQueueSize = options?.maxQueueSize || 1000;
    
    // Initialize from persistence if available
    this.initializeFromPersistence();
    
    // Setup periodic sync
    this.setupPeriodicSync();
    
    // Monitor network status
    this.monitorNetworkStatus();
  }
  
  // Initialize from persistence
  private async initializeFromPersistence(): Promise<void> {
    if (!this.persistence || this.isInitialized) return;
    
    try {
      const persistedActions = await this.persistence.load();
      persistedActions.forEach(action => {
        this.actions.set(action.id, action);
        
        // Rebuild groups
        if (action.groupId) {
          if (!this.groups.has(action.groupId)) {
            this.groups.set(action.groupId, new Set());
          }
          this.groups.get(action.groupId)!.add(action.id);
        }
        
        // Rebuild dependencies
        if (action.dependencies && action.dependencies.length > 0) {
          action.dependencies.forEach(depId => {
            if (!this.dependencies.has(depId)) {
              this.dependencies.set(depId, new Set());
            }
            this.dependencies.get(depId)!.add(action.id);
          });
        }
      });
      
      this.isInitialized = true;
      this.notifyQueueChangeListeners();
    } catch (error) {
      console.warn("Failed to initialize from persistence:", error);
    }
  }
  
  // Setup periodic sync
  private setupPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    
    this.syncIntervalId = setInterval(() => {
      if (this.isOnline) {
        this.sync();
      }
    }, this.syncInterval);
  }
  
  // Monitor network status
  private monitorNetworkStatus(): void {
    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      
      if (wasOnline !== this.isOnline) {
        this.networkChangeListeners.forEach(listener => listener(this.isOnline));
        
        // If we're back online, trigger sync
        if (this.isOnline) {
          this.sync();
        }
      }
    };
    
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
  }
  
  // Add a processor for a specific action type
  addProcessor(type: OfflineActionType, processor: (action: OfflineAction) => Promise<void>): void {
    this.actionProcessors.set(type, processor);
  }
  
  // Remove a processor
  removeProcessor(type: OfflineActionType): void {
    this.actionProcessors.delete(type);
  }
  
  // Create and queue an action
  async createAction(
    type: OfflineActionType,
    payload: Record<string, unknown>,
    options?: {
      priority?: OfflineActionPriority;
      dependencies?: string[];
      groupId?: string;
      tags?: string[];
      requiresNetwork?: boolean;
      requiresUserInteraction?: boolean;
      conflictResolutionStrategy?: ConflictResolutionStrategy;
      maxRetries?: number;
    }
  ): Promise<string> {
    // Check queue size limit
    if (this.actions.size >= this.maxQueueSize) {
      throw errorFactory.resourceLimitError(
        `Action queue is at capacity (${this.maxQueueSize}). Cannot add more actions.`,
        { queueSize: this.actions.size }
      );
    }
    
    const now = Date.now();
    const action: OfflineAction = {
      id: uuidv4(),
      type,
      status: "QUEUED",
      priority: options?.priority || "NORMAL",
      payload,
      context: {
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
        deviceId: this.getDeviceId(),
        timestamp: now,
        correlationId: this.getCorrelationId(),
        userAgent: navigator.userAgent,
        ipAddress: await this.getIpAddress()
      },
      metadata: {
        createdAt: now,
        updatedAt: now,
        retryCount: 0,
        maxRetries: options?.maxRetries || this.maxRetries,
        requiresNetwork: options?.requiresNetwork ?? true,
        requiresUserInteraction: options?.requiresUserInteraction ?? false,
        conflictResolutionStrategy: options?.conflictResolutionStrategy || "LAST_WRITE_WINS"
      },
      dependencies: options?.dependencies,
      groupId: options?.groupId,
      tags: options?.tags,
      syncAttempts: 0
    };
    
    // Add to queue
    this.actions.set(action.id, action);
    
    // Add to groups
    if (action.groupId) {
      if (!this.groups.has(action.groupId)) {
        this.groups.set(action.groupId, new Set());
      }
      this.groups.get(action.groupId)!.add(action.id);
    }
    
    // Add dependencies
    if (action.dependencies && action.dependencies.length > 0) {
      action.dependencies.forEach(depId => {
        if (!this.dependencies.has(depId)) {
          this.dependencies.set(depId, new Set());
        }
        this.dependencies.get(depId)!.add(action.id);
      });
    }
    
    // Notify listeners
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      try {
        await this.persistence.save(Array.from(this.actions.values()));
      } catch (error) {
        console.warn("Failed to persist action to storage:", error);
      }
    }
    
    // If online, process immediately
    if (this.isOnline) {
      this.processNextAction();
    }
    
    return action.id;
  }
  
  // Process the next action in the queue
  private async processNextAction(): Promise<void> {
    if (this.isProcessing || this.syncInProgress) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Get next action to process
      const nextAction = await this.getNextAction();
      if (!nextAction) {
        this.isProcessing = false;
        return;
      }
      
      // Update action status
      nextAction.status = "PROCESSING";
      nextAction.metadata!.updatedAt = Date.now();
      this.actions.set(nextAction.id, nextAction);
      this.notifyQueueChangeListeners();
      
      // Process the action
      await this.processAction(nextAction);
      
      // Mark as synced if successful and online
      if (this.isOnline) {
        nextAction.status = "SYNCED";
        nextAction.metadata!.updatedAt = Date.now();
        this.actions.set(nextAction.id, nextAction);
        this.notifyQueueChangeListeners();
        
        // Remove from queue after successful sync
        this.actions.delete(nextAction.id);
        
        // Remove from groups
        if (nextAction.groupId) {
          const group = this.groups.get(nextAction.groupId);
          if (group) {
            group.delete(nextAction.id);
            if (group.size === 0) {
              this.groups.delete(nextAction.groupId);
            }
          }
        }
        
        // Remove from dependencies
        if (nextAction.dependencies && nextAction.dependencies.length > 0) {
          nextAction.dependencies.forEach(depId => {
            const dependents = this.dependencies.get(depId);
            if (dependents) {
              dependents.delete(nextAction.id);
              if (dependents.size === 0) {
                this.dependencies.delete(depId);
              }
            }
          });
        }
      } else {
        // Mark as pending sync if offline
        nextAction.status = "PENDING_SYNC";
        nextAction.metadata!.updatedAt = Date.now();
        this.actions.set(nextAction.id, nextAction);
        this.notifyQueueChangeListeners();
      }
      
      // Persist changes
      if (this.persistence) {
        try {
          await this.persistence.save(Array.from(this.actions.values()));
        } catch (error) {
          console.warn("Failed to persist action to storage:", error);
        }
      }
    } catch (error) {
      console.warn("Failed to process action:", error);
    } finally {
      this.isProcessing = false;
      this.processNextAction(); // Process next action
    }
  }
  
  // Get the next action to process
  private async getNextAction(): Promise<OfflineAction | null> {
    // Filter actions that are queued
    const queuedActions = Array.from(this.actions.values())
      .filter(action => action.status === "QUEUED");
    
    if (queuedActions.length === 0) {
      return null;
    }
    
    // If offline, only process actions that don't require network
    if (!this.isOnline) {
      const offlineReadyActions = queuedActions.filter(action => !action.metadata?.requiresNetwork);
      if (offlineReadyActions.length === 0) {
        return null;
      }
      queuedActions.splice(0, queuedActions.length, ...offlineReadyActions);
    }
    
    // Sort by priority and creation date
    queuedActions.sort((a, b) => {
      // Priority order: CRITICAL > HIGH > NORMAL > LOW > BACKGROUND
      const priorityOrder: Record<OfflineActionPriority, number> = {
        "CRITICAL": 0,
        "HIGH": 1,
        "NORMAL": 2,
        "LOW": 3,
        "BACKGROUND": 4
      };
      
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.metadata!.createdAt - b.metadata!.createdAt;
    });
    
    // Check dependencies
    for (const action of queuedActions) {
      if (action.dependencies && action.dependencies.length > 0) {
        // Check if all dependencies are synced
        const allDependenciesSynced = action.dependencies.every(depId => {
          const dep = this.actions.get(depId);
          return dep && (dep.status === "SYNCED" || dep.status === "PENDING_SYNC");
        });
        
        if (!allDependenciesSynced) {
          continue; // Skip actions with unsynced dependencies
        }
      }
      
      return action;
    }
    
    return null;
  }
  
  // Process a specific action
  private async processAction(action: OfflineAction): Promise<void> {
    const processor = this.actionProcessors.get(action.type);
    if (!processor) {
      throw errorFactory.unknownError(
        `No processor registered for action type: ${action.type}`,
        { actionType: action.type }
      );
    }
    
    try {
      await processor(action);
    } catch (error) {
      // Handle retry logic
      if (action.metadata!.retryCount < action.metadata!.maxRetries) {
        action.metadata!.retryCount++;
        action.metadata!.updatedAt = Date.now();
        action.status = "QUEUED"; // Reset status to queued for retry
        this.actions.set(action.id, action);
        
        // Exponential backoff
        const backoffDelay = Math.pow(2, action.metadata!.retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        
        throw error; // Re-throw to retry
      } else {
        // Max retries exceeded, mark as failed
        action.status = "FAILED";
        action.metadata!.updatedAt = Date.now();
        action.metadata!.lastError = {
          message: error instanceof Error ? error.message : String(error),
          code: (error as unknown).code || "UNKNOWN",
          timestamp: Date.now(),
          stack: error instanceof Error ? error.stack : undefined
        };
        this.actions.set(action.id, action);
        throw error;
      }
    }
  }
  
  // Sync with remote server
  async sync(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }
    
    this.syncInProgress = true;
    
    try {
      // Get all actions that need syncing
      const actionsToSync = Array.from(this.actions.values())
        .filter(action => action.status === "PENDING_SYNC" || action.status === "SYNCING");
      
      if (actionsToSync.length === 0) {
        return;
      }
      
      // Mark actions as syncing
      actionsToSync.forEach(action => {
        action.status = "SYNCING";
        action.syncAttempts = action.syncAttempts + 1;
        action.lastSyncAttempt = Date.now();
        action.nextSyncAttempt = undefined;
        this.actions.set(action.id, action);
      });
      
      this.notifyQueueChangeListeners();
      
      // Send to server (implementation would depend on your API)
      // await this.sendToServer(actionsToSync);
      
      // For demonstration, we'll simulate successful sync
      actionsToSync.forEach(action => {
        action.status = "SYNCED";
        action.metadata!.updatedAt = Date.now();
        this.actions.set(action.id, action);
      });
      
      // Remove synced actions from queue
      actionsToSync.forEach(action => {
        this.actions.delete(action.id);
        
        // Remove from groups
        if (action.groupId) {
          const group = this.groups.get(action.groupId);
          if (group) {
            group.delete(action.id);
            if (group.size === 0) {
              this.groups.delete(action.groupId);
            }
          }
        }
        
        // Remove from dependencies
        if (action.dependencies && action.dependencies.length > 0) {
          action.dependencies.forEach(depId => {
            const dependents = this.dependencies.get(depId);
            if (dependents) {
              dependents.delete(action.id);
              if (dependents.size === 0) {
                this.dependencies.delete(depId);
              }
            }
          });
        }
      });
      
      // Notify listeners
      this.notifyQueueChangeListeners();
      
      // Persist changes
      if (this.persistence) {
        try {
          await this.persistence.save(Array.from(this.actions.values()));
        } catch (error) {
          console.warn("Failed to persist queue to storage:", error);
        }
      }
    } catch (error) {
      console.warn("Failed to sync with server:", error);
      
      // Mark failed sync actions for retry
      const actionsToSync = Array.from(this.actions.values())
        .filter(action => action.status === "SYNCING");
      
      actionsToSync.forEach(action => {
        action.status = "PENDING_SYNC";
        action.metadata!.lastError = {
          message: error instanceof Error ? error.message : String(error),
          code: (error as unknown).code || "SYNC_FAILED",
          timestamp: Date.now(),
          stack: error instanceof Error ? error.stack : undefined
        };
        
        // Schedule next sync attempt with exponential backoff
        const backoffDelay = Math.min(
          Math.pow(2, action.syncAttempts) * 60000, // Start with 1 minute, double each time
          3600000 // Max 1 hour
        );
        
        action.nextSyncAttempt = Date.now() + backoffDelay;
        this.actions.set(action.id, action);
      });
      
      this.notifyQueueChangeListeners();
      
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }
  
  // Get actions by various filters
  getActions(filters?: {
    type?: OfflineActionType | OfflineActionType[];
    status?: OfflineActionStatus | OfflineActionStatus[];
    priority?: OfflineActionPriority | OfflineActionPriority[];
    groupId?: string;
    tags?: string | string[];
    before?: Date;
    after?: Date;
    requiresNetwork?: boolean;
    requiresUserInteraction?: boolean;
  }): OfflineAction[] {
    let actions = Array.from(this.actions.values());
    
    if (filters) {
      if (filters.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type];
        actions = actions.filter(action => types.includes(action.type));
      }
      
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        actions = actions.filter(action => statuses.includes(action.status));
      }
      
      if (filters.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
        actions = actions.filter(action => priorities.includes(action.priority));
      }
      
      if (filters.groupId) {
        actions = actions.filter(action => action.groupId === filters.groupId);
      }
      
      if (filters.tags) {
        const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        actions = actions.filter(action => 
          action.tags && action.tags.some(tag => tags.includes(tag))
        );
      }
      
      if (filters.before) {
        actions = actions.filter(action => 
          action.metadata && new Date(action.metadata.createdAt) < filters.before!
        );
      }
      
      if (filters.after) {
        actions = actions.filter(action => 
          action.metadata && new Date(action.metadata.createdAt) > filters.after!
        );
      }
      
      if (filters.requiresNetwork !== undefined) {
        actions = actions.filter(action => 
          action.metadata?.requiresNetwork === filters.requiresNetwork
        );
      }
      
      if (filters.requiresUserInteraction !== undefined) {
        actions = actions.filter(action => 
          action.metadata?.requiresUserInteraction === filters.requiresUserInteraction
        );
      }
    }
    
    return actions;
  }
  
  // Get action by ID
  getActionById(id: string): OfflineAction | undefined {
    return this.actions.get(id);
  }
  
  // Update action status
  updateActionStatus(id: string, status: OfflineActionStatus, error?: AppError): void {
    const action = this.actions.get(id);
    if (!action) return;
    
    action.status = status;
    action.metadata!.updatedAt = Date.now();
    
    if (error) {
      action.metadata!.lastError = {
        message: error.message,
        code: error.code,
        timestamp: Date.now(),
        stack: error.stack
      };
    }
    
    this.actions.set(id, action);
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      this.persistence.save(Array.from(this.actions.values())).catch(error => {
        console.warn("Failed to persist action status update:", error);
      });
    }
  }
  
  // Cancel action
  async cancelAction(id: string): Promise<void> {
    const action = this.actions.get(id);
    if (!action) return;
    
    action.status = "CANCELLED";
    action.metadata!.updatedAt = Date.now();
    this.actions.set(id, action);
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      try {
        await this.persistence.save(Array.from(this.actions.values()));
      } catch (error) {
        console.warn("Failed to persist action cancellation:", error);
      }
    }
  }
  
  // Retry failed action
  async retryAction(id: string): Promise<void> {
    const action = this.actions.get(id);
    if (!action || action.status !== "FAILED") return;
    
    action.status = "QUEUED";
    action.metadata!.retryCount = 0;
    action.metadata!.lastError = undefined;
    action.metadata!.updatedAt = Date.now();
    this.actions.set(id, action);
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      try {
        await this.persistence.save(Array.from(this.actions.values()));
      } catch (error) {
        console.warn("Failed to persist action retry:", error);
      }
    }
    
    // Process if online
    if (this.isOnline) {
      this.processNextAction();
    }
  }
  
  // Clear completed actions
  clearCompleted(before?: Date): void {
    const completedActions = Array.from(this.actions.values())
      .filter(action => action.status === "SYNCED" || action.status === "CANCELLED");
    
    if (before) {
      completedActions
        .filter(action => action.metadata && new Date(action.metadata.updatedAt) < before)
        .forEach(action => {
          this.actions.delete(action.id);
          
          // Remove from groups
          if (action.groupId) {
            const group = this.groups.get(action.groupId);
            if (group) {
              group.delete(action.id);
              if (group.size === 0) {
                this.groups.delete(action.groupId);
              }
            }
          }
          
          // Remove from dependencies
          if (action.dependencies && action.dependencies.length > 0) {
            action.dependencies.forEach(depId => {
              const dependents = this.dependencies.get(depId);
              if (dependents) {
                dependents.delete(action.id);
                if (dependents.size === 0) {
                  this.dependencies.delete(depId);
                }
              }
            });
          }
        });
    } else {
      completedActions.forEach(action => {
        this.actions.delete(action.id);
        
        // Remove from groups
        if (action.groupId) {
          const group = this.groups.get(action.groupId);
          if (group) {
            group.delete(action.id);
            if (group.size === 0) {
              this.groups.delete(action.groupId);
            }
          }
        }
        
        // Remove from dependencies
        if (action.dependencies && action.dependencies.length > 0) {
          action.dependencies.forEach(depId => {
            const dependents = this.dependencies.get(depId);
            if (dependents) {
              dependents.delete(action.id);
              if (dependents.size === 0) {
                this.dependencies.delete(depId);
              }
            }
          });
        }
      });
    }
    
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      this.persistence.save(Array.from(this.actions.values())).catch(error => {
        console.warn("Failed to persist queue after clearing completed actions:", error);
      });
    }
  }
  
  // Clear failed actions
  clearFailed(before?: Date): void {
    const failedActions = Array.from(this.actions.values())
      .filter(action => action.status === "FAILED");
    
    if (before) {
      failedActions
        .filter(action => action.metadata && new Date(action.metadata.updatedAt) < before)
        .forEach(action => {
          this.actions.delete(action.id);
          
          // Remove from groups
          if (action.groupId) {
            const group = this.groups.get(action.groupId);
            if (group) {
              group.delete(action.id);
              if (group.size === 0) {
                this.groups.delete(action.groupId);
              }
            }
          }
          
          // Remove from dependencies
          if (action.dependencies && action.dependencies.length > 0) {
            action.dependencies.forEach(depId => {
              const dependents = this.dependencies.get(depId);
              if (dependents) {
                dependents.delete(action.id);
                if (dependents.size === 0) {
                  this.dependencies.delete(depId);
                }
              }
            });
          }
        });
    } else {
      failedActions.forEach(action => {
        this.actions.delete(action.id);
        
        // Remove from groups
        if (action.groupId) {
          const group = this.groups.get(action.groupId);
          if (group) {
            group.delete(action.id);
            if (group.size === 0) {
              this.groups.delete(action.groupId);
            }
          }
        }
        
        // Remove from dependencies
        if (action.dependencies && action.dependencies.length > 0) {
          action.dependencies.forEach(depId => {
            const dependents = this.dependencies.get(depId);
            if (dependents) {
              dependents.delete(action.id);
              if (dependents.size === 0) {
                this.dependencies.delete(depId);
              }
            }
          });
        }
      });
    }
    
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      this.persistence.save(Array.from(this.actions.values())).catch(error => {
        console.warn("Failed to persist queue after clearing failed actions:", error);
      });
    }
  }
  
  // Clear pending sync actions
  clearPendingSync(before?: Date): void {
    const pendingSyncActions = Array.from(this.actions.values())
      .filter(action => action.status === "PENDING_SYNC");
    
    if (before) {
      pendingSyncActions
        .filter(action => action.metadata && new Date(action.metadata.updatedAt) < before)
        .forEach(action => {
          this.actions.delete(action.id);
          
          // Remove from groups
          if (action.groupId) {
            const group = this.groups.get(action.groupId);
            if (group) {
              group.delete(action.id);
              if (group.size === 0) {
                this.groups.delete(action.groupId);
              }
            }
          }
          
          // Remove from dependencies
          if (action.dependencies && action.dependencies.length > 0) {
            action.dependencies.forEach(depId => {
              const dependents = this.dependencies.get(depId);
              if (dependents) {
                dependents.delete(action.id);
                if (dependents.size === 0) {
                  this.dependencies.delete(depId);
                }
              }
            });
          }
        });
    } else {
      pendingSyncActions.forEach(action => {
        this.actions.delete(action.id);
        
        // Remove from groups
        if (action.groupId) {
          const group = this.groups.get(action.groupId);
          if (group) {
            group.delete(action.id);
            if (group.size === 0) {
              this.groups.delete(action.groupId);
            }
          }
        }
        
        // Remove from dependencies
        if (action.dependencies && action.dependencies.length > 0) {
          action.dependencies.forEach(depId => {
            const dependents = this.dependencies.get(depId);
            if (dependents) {
              dependents.delete(action.id);
              if (dependents.size === 0) {
                this.dependencies.delete(depId);
              }
            }
          });
        }
      });
    }
    
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      this.persistence.save(Array.from(this.actions.values())).catch(error => {
        console.warn("Failed to persist queue after clearing pending sync actions:", error);
      });
    }
  }
  
  // Get queue statistics
  getStatistics(): {
    total: number;
    queued: number;
    processing: number;
    synced: number;
    failed: number;
    cancelled: number;
    pendingSync: number;
    syncing: number;
    conflict: number;
    byType: Record<OfflineActionType, number>;
    byPriority: Record<OfflineActionPriority, number>;
    byStatus: Record<OfflineActionStatus, number>;
    oldestQueued: number | null;
    newestQueued: number | null;
    requiresNetwork: number;
    requiresUserInteraction: number;
  } {
    const actions = Array.from(this.actions.values());
    
    const statistics = {
      total: actions.length,
      queued: actions.filter(a => a.status === "QUEUED").length,
      processing: actions.filter(a => a.status === "PROCESSING").length,
      synced: actions.filter(a => a.status === "SYNCED").length,
      failed: actions.filter(a => a.status === "FAILED").length,
      cancelled: actions.filter(a => a.status === "CANCELLED").length,
      pendingSync: actions.filter(a => a.status === "PENDING_SYNC").length,
      syncing: actions.filter(a => a.status === "SYNCING").length,
      conflict: actions.filter(a => a.status === "CONFLICT").length,
      byType: {} as Record<OfflineActionType, number>,
      byPriority: {} as Record<OfflineActionPriority, number>,
      byStatus: {} as Record<OfflineActionStatus, number>,
      oldestQueued: null as number | null,
      newestQueued: null as number | null,
      requiresNetwork: actions.filter(a => a.metadata?.requiresNetwork).length,
      requiresUserInteraction: actions.filter(a => a.metadata?.requiresUserInteraction).length,
    };
    
    // Count by type
    actions.forEach(action => {
      if (!statistics.byType[action.type]) {
        statistics.byType[action.type] = 0;
      }
      statistics.byType[action.type]++;
      
      // Count by priority
      if (!statistics.byPriority[action.priority]) {
        statistics.byPriority[action.priority] = 0;
      }
      statistics.byPriority[action.priority]++;
      
      // Count by status
      if (!statistics.byStatus[action.status]) {
        statistics.byStatus[action.status] = 0;
      }
      statistics.byStatus[action.status]++;
    });
    
    // Find oldest and newest queued actions
    const queuedActions = actions.filter(a => a.status === "QUEUED");
    if (queuedActions.length > 0) {
      const timestamps = queuedActions.map(a => a.metadata?.createdAt || 0);
      statistics.oldestQueued = Math.min(...timestamps);
      statistics.newestQueued = Math.max(...timestamps);
    }
    
    return statistics;
  }
  
  // Add network change listener
  addNetworkChangeListener(listener: (isOnline: boolean) => void): void {
    this.networkChangeListeners.push(listener);
  }
  
  // Remove network change listener
  removeNetworkChangeListener(listener: (isOnline: boolean) => void): void {
    const index = this.networkChangeListeners.indexOf(listener);
    if (index !== -1) {
      this.networkChangeListeners.splice(index, 1);
    }
  }
  
  // Add queue change listener
  addQueueChangeListener(listener: (actions: OfflineAction[]) => void): void {
    this.queueChangeListeners.push(listener);
  }
  
  // Remove queue change listener
  removeQueueChangeListener(listener: (actions: OfflineAction[]) => void): void {
    const index = this.queueChangeListeners.indexOf(listener);
    if (index !== -1) {
      this.queueChangeListeners.splice(index, 1);
    }
  }
  
  // Notify queue change listeners
  private notifyQueueChangeListeners(): void {
    const actions = Array.from(this.actions.values());
    this.queueChangeListeners.forEach(listener => {
      try {
        listener(actions);
      } catch (error) {
        console.warn("Queue change listener error:", error);
      }
    });
  }
  
  // Helper methods for getting context information
  private getUserId(): string | undefined {
    // Implementation would get user ID from authentication system
    return undefined;
  }
  
  private getSessionId(): string | undefined {
    // Implementation would get session ID from session management system
    return undefined;
  }
  
  private getDeviceId(): string | undefined {
    // Implementation would generate/get device ID
    return undefined;
  }
  
  private getCorrelationId(): string | undefined {
    // Implementation would generate correlation ID for tracing
    return undefined;
  }
  
  private async getIpAddress(): Promise<string | undefined> {
    // Implementation would get IP address (if needed and privacy compliant)
    return undefined;
  }
  
  // Cleanup method
  destroy(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    
    // Remove event listeners
    this.networkChangeListeners = [];
    this.queueChangeListeners = [];
    this.actionProcessors.clear();
  }
  
  // Check if queue is empty
  isEmpty(): boolean {
    return this.actions.size === 0;
  }
  
  // Check if queue has pending actions
  hasPendingActions(): boolean {
    return this.actions.size > 0;
  }
  
  // Check if queue has failed actions
  hasFailedActions(): boolean {
    return Array.from(this.actions.values()).some(action => action.status === "FAILED");
  }
  
  // Check if queue has pending sync actions
  hasPendingSyncActions(): boolean {
    return Array.from(this.actions.values()).some(action => 
      action.status === "PENDING_SYNC" || action.status === "SYNCING"
    );
  }
  
  // Get all pending sync actions
  getPendingSyncActions(): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.status === "PENDING_SYNC" || action.status === "SYNCING"
    );
  }
  
  // Force sync all pending actions
  async forceSync(): Promise<void> {
    const wasOnline = this.isOnline;
    this.isOnline = true;
    try {
      await this.sync();
    } finally {
      this.isOnline = wasOnline;
    }
  }
  
  // Pause queue processing
  pause(): void {
    this.isProcessing = true;
  }
  
  // Resume queue processing
  resume(): void {
    this.isProcessing = false;
    this.processNextAction();
  }
  
  // Check if queue is paused
  isPaused(): boolean {
    return this.isProcessing;
  }
  
  // Set max retries for all actions
  setMaxRetries(maxRetries: number): void {
    this.maxRetries = maxRetries;
  }
  
  // Set sync interval
  setSyncInterval(interval: number): void {
    this.syncInterval = interval;
    this.setupPeriodicSync();
  }
  
  // Set max queue size
  setMaxQueueSize(size: number): void {
    this.maxQueueSize = size;
  }
  
  // Get queue size
  getQueueSize(): number {
    return this.actions.size;
  }
  
  // Get all actions in queue
  getAllActions(): OfflineAction[] {
    return Array.from(this.actions.values());
  }
  
  // Clear entire queue
  async clearQueue(): Promise<void> {
    this.actions.clear();
    this.groups.clear();
    this.dependencies.clear();
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      try {
        await this.persistence.clear();
      } catch (error) {
        console.warn("Failed to clear queue persistence:", error);
      }
    }
  }
  
  // Remove specific action from queue
  async removeAction(id: string): Promise<void> {
    const action = this.actions.get(id);
    if (!action) return;
    
    this.actions.delete(id);
    
    // Remove from groups
    if (action.groupId) {
      const group = this.groups.get(action.groupId);
      if (group) {
        group.delete(id);
        if (group.size === 0) {
          this.groups.delete(action.groupId);
        }
      }
    }
    
    // Remove from dependencies
    if (action.dependencies && action.dependencies.length > 0) {
      action.dependencies.forEach(depId => {
        const dependents = this.dependencies.get(depId);
        if (dependents) {
          dependents.delete(id);
          if (dependents.size === 0) {
            this.dependencies.delete(depId);
          }
        }
      });
    }
    
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      try {
        await this.persistence.remove(id);
      } catch (error) {
        console.warn("Failed to remove action from persistence:", error);
      }
    }
  }
  
  // Batch remove actions
  async removeActions(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.removeAction(id);
    }
  }
  
  // Batch cancel actions
  async cancelActions(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.cancelAction(id);
    }
  }
  
  // Batch retry actions
  async retryActions(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.retryAction(id);
    }
  }
  
  // Get actions by group
  getActionsByGroup(groupId: string): OfflineAction[] {
    const group = this.groups.get(groupId);
    if (!group) return [];
    
    return Array.from(group).map(id => this.actions.get(id)!).filter(Boolean);
  }
  
  // Get actions by tag
  getActionsByTag(tag: string): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.tags && action.tags.includes(tag)
    );
  }
  
  // Get actions by tags
  getActionsByTags(tags: string[]): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.tags && action.tags.some(tag => tags.includes(tag))
    );
  }
  
  // Add tag to action
  addTagToAction(id: string, tag: string): void {
    const action = this.actions.get(id);
    if (!action) return;
    
    if (!action.tags) {
      action.tags = [];
    }
    
    if (!action.tags.includes(tag)) {
      action.tags.push(tag);
      action.metadata!.updatedAt = Date.now();
      this.actions.set(id, action);
      this.notifyQueueChangeListeners();
      
      // Persist if persistence is available
      if (this.persistence) {
        this.persistence.save(Array.from(this.actions.values())).catch(error => {
          console.warn("Failed to persist action tag addition:", error);
        });
      }
    }
  }
  
  // Remove tag from action
  removeTagFromAction(id: string, tag: string): void {
    const action = this.actions.get(id);
    if (!action || !action.tags) return;
    
    const index = action.tags.indexOf(tag);
    if (index !== -1) {
      action.tags.splice(index, 1);
      action.metadata!.updatedAt = Date.now();
      this.actions.set(id, action);
      this.notifyQueueChangeListeners();
      
      // Persist if persistence is available
      if (this.persistence) {
        this.persistence.save(Array.from(this.actions.values())).catch(error => {
          console.warn("Failed to persist action tag removal:", error);
        });
      }
    }
  }
  
  // Get all unique tags
  getAllTags(): string[] {
    const tags = new Set<string>();
    Array.from(this.actions.values()).forEach(action => {
      if (action.tags) {
        action.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags);
  }
  
  // Get actions that require network
  getNetworkRequiredActions(): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.metadata?.requiresNetwork
    );
  }
  
  // Get actions that require user interaction
  getUserInteractionRequiredActions(): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.metadata?.requiresUserInteraction
    );
  }
  
  // Get conflicted actions
  getConflictedActions(): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.status === "CONFLICT"
    );
  }
  
  // Resolve conflict for action
  resolveConflict(id: string, resolution: {
    resolvedVersion: Record<string, unknown>;
    resolutionStrategy: ConflictResolutionStrategy;
    resolvedBy: "user" | "auto" | "server";
  }): void {
    const action = this.actions.get(id);
    if (!action || action.status !== "CONFLICT") return;
    
    if (!action.metadata) {
      action.metadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        retryCount: 0,
        maxRetries: this.maxRetries,
        requiresNetwork: true,
        requiresUserInteraction: false,
        conflictResolutionStrategy: "LAST_WRITE_WINS"
      };
    }
    
    action.metadata.conflictResolution = {
      ...resolution,
      resolvedAt: Date.now()
    };
    
    action.status = "QUEUED";
    action.metadata.updatedAt = Date.now();
    this.actions.set(id, action);
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      this.persistence.save(Array.from(this.actions.values())).catch(error => {
        console.warn("Failed to persist conflict resolution:", error);
      });
    }
  }
  
  // Mark action as conflicted
  markAsConflicted(id: string, conflictInfo: {
    serverVersion?: Record<string, unknown>;
    clientVersion?: Record<string, unknown>;
  }): void {
    const action = this.actions.get(id);
    if (!action) return;
    
    if (!action.metadata) {
      action.metadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        retryCount: 0,
        maxRetries: this.maxRetries,
        requiresNetwork: true,
        requiresUserInteraction: false,
        conflictResolutionStrategy: "LAST_WRITE_WINS"
      };
    }
    
    action.metadata.conflictResolution = {
      ...action.metadata.conflictResolution,
      ...conflictInfo
    };
    
    action.status = "CONFLICT";
    action.metadata.updatedAt = Date.now();
    this.actions.set(id, action);
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      this.persistence.save(Array.from(this.actions.values())).catch(error => {
        console.warn("Failed to persist conflict marking:", error);
      });
    }
  }
  
  // Get actions by priority
  getActionsByPriority(priority: OfflineActionPriority): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.priority === priority
    );
  }
  
  // Get high priority actions
  getHighPriorityActions(): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.priority === "HIGH" || action.priority === "CRITICAL"
    );
  }
  
  // Get low priority actions
  getLowPriorityActions(): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.priority === "LOW" || action.priority === "BACKGROUND"
    );
  }
  
  // Get normal priority actions
  getNormalPriorityActions(): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.priority === "NORMAL"
    );
  }
  
  // Set action priority
  setActionPriority(id: string, priority: OfflineActionPriority): void {
    const action = this.actions.get(id);
    if (!action) return;
    
    action.priority = priority;
    action.metadata!.updatedAt = Date.now();
    this.actions.set(id, action);
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      this.persistence.save(Array.from(this.actions.values())).catch(error => {
        console.warn("Failed to persist action priority update:", error);
      });
    }
  }
  
  // Get actions that are older than a certain time
  getOldActions(olderThan: number): OfflineAction[] {
    const cutoff = Date.now() - olderThan;
    return Array.from(this.actions.values()).filter(action => 
      action.metadata && action.metadata.createdAt < cutoff
    );
  }
  
  // Get actions that haven't been updated in a while
  getStaleActions(olderThan: number): OfflineAction[] {
    const cutoff = Date.now() - olderThan;
    return Array.from(this.actions.values()).filter(action => 
      action.metadata && action.metadata.updatedAt < cutoff
    );
  }
  
  // Refresh stale actions
  refreshStaleActions(olderThan: number): void {
    const staleActions = this.getStaleActions(olderThan);
    staleActions.forEach(action => {
      action.metadata!.updatedAt = Date.now();
      this.actions.set(action.id, action);
    });
    
    if (staleActions.length > 0) {
      this.notifyQueueChangeListeners();
      
      // Persist if persistence is available
      if (this.persistence) {
        this.persistence.save(Array.from(this.actions.values())).catch(error => {
          console.warn("Failed to persist stale action refresh:", error);
        });
      }
    }
  }
  
  // Get actions with retry attempts
  getActionsWithRetries(minRetries: number): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.metadata && action.metadata.retryCount >= minRetries
    );
  }
  
  // Get actions with sync attempts
  getActionsWithSyncAttempts(minSyncAttempts: number): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.syncAttempts >= minSyncAttempts
    );
  }
  
  // Reset sync attempts for action
  resetSyncAttempts(id: string): void {
    const action = this.actions.get(id);
    if (!action) return;
    
    action.syncAttempts = 0;
    action.lastSyncAttempt = undefined;
    action.nextSyncAttempt = undefined;
    action.metadata!.updatedAt = Date.now();
    this.actions.set(id, action);
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      this.persistence.save(Array.from(this.actions.values())).catch(error => {
        console.warn("Failed to persist sync attempts reset:", error);
      });
    }
  }
  
  // Get actions with next sync attempt scheduled
  getScheduledSyncActions(): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.nextSyncAttempt && action.nextSyncAttempt > Date.now()
    );
  }
  
  // Get actions that are overdue for sync
  getOverdueSyncActions(): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.nextSyncAttempt && action.nextSyncAttempt <= Date.now()
    );
  }
  
  // Force immediate sync for specific actions
  async forceSyncActions(ids: string[]): Promise<void> {
    const actionsToSync = ids.map(id => this.actions.get(id)).filter(Boolean) as OfflineAction[];
    
    if (actionsToSync.length === 0) return;
    
    // Mark actions as syncing
    actionsToSync.forEach(action => {
      action.status = "SYNCING";
      action.syncAttempts = action.syncAttempts + 1;
      action.lastSyncAttempt = Date.now();
      action.nextSyncAttempt = undefined;
      this.actions.set(action.id, action);
    });
    
    this.notifyQueueChangeListeners();
    
    try {
      // Send to server (implementation would depend on your API)
      // await this.sendToServer(actionsToSync);
      
      // For demonstration, we'll simulate successful sync
      actionsToSync.forEach(action => {
        action.status = "SYNCED";
        action.metadata!.updatedAt = Date.now();
        this.actions.set(action.id, action);
      });
      
      // Remove synced actions from queue
      actionsToSync.forEach(action => {
        this.actions.delete(action.id);
        
        // Remove from groups
        if (action.groupId) {
          const group = this.groups.get(action.groupId);
          if (group) {
            group.delete(action.id);
            if (group.size === 0) {
              this.groups.delete(action.groupId);
            }
          }
        }
        
        // Remove from dependencies
        if (action.dependencies && action.dependencies.length > 0) {
          action.dependencies.forEach(depId => {
            const dependents = this.dependencies.get(depId);
            if (dependents) {
              dependents.delete(action.id);
              if (dependents.size === 0) {
                this.dependencies.delete(depId);
              }
            }
          });
        }
      });
      
      // Notify listeners
      this.notifyQueueChangeListeners();
      
      // Persist changes
      if (this.persistence) {
        try {
          await this.persistence.save(Array.from(this.actions.values()));
        } catch (error) {
          console.warn("Failed to persist queue after force sync:", error);
        }
      }
    } catch (error) {
      console.warn("Failed to force sync actions:", error);
      
      // Mark failed sync actions for retry
      actionsToSync.forEach(action => {
        action.status = "PENDING_SYNC";
        action.metadata!.lastError = {
          message: error instanceof Error ? error.message : String(error),
          code: (error as unknown).code || "FORCE_SYNC_FAILED",
          timestamp: Date.now(),
          stack: error instanceof Error ? error.stack : undefined
        };
        
        // Schedule next sync attempt with exponential backoff
        const backoffDelay = Math.min(
          Math.pow(2, action.syncAttempts) * 60000, // Start with 1 minute, double each time
          3600000 // Max 1 hour
        );
        
        action.nextSyncAttempt = Date.now() + backoffDelay;
        this.actions.set(action.id, action);
      });
      
      this.notifyQueueChangeListeners();
      
      throw error;
    }
  }
  
  // Get estimated sync time for all pending actions
  getEstimatedSyncTime(): number {
    const pendingActions = this.getPendingSyncActions();
    if (pendingActions.length === 0) return 0;
    
    // Sum estimated execution times
    return pendingActions.reduce((total, action) => {
      return total + (action.metadata?.estimatedExecutionTime || 1000);
    }, 0);
  }
  
  // Get actions that are taking longer than expected
  getSlowActions(threshold: number): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.metadata?.estimatedExecutionTime && 
      (Date.now() - action.metadata.createdAt) > threshold
    );
  }
  
  // Get actions that might be stuck
  getPossiblyStuckActions(threshold: number = 300000): OfflineAction[] { // 5 minutes default
    return Array.from(this.actions.values()).filter(action => {
      // Check if action has been in the same state for too long
      const timeInState = Date.now() - (action.metadata?.updatedAt || action.metadata?.createdAt || 0);
      return timeInState > threshold;
    });
  }
  
  // Restart stuck actions
  restartStuckActions(threshold: number = 300000): void {
    const stuckActions = this.getPossiblyStuckActions(threshold);
    stuckActions.forEach(action => {
      // Reset action to queued state to restart processing
      action.status = "QUEUED";
      action.metadata!.retryCount = 0;
      action.metadata!.lastError = undefined;
      action.metadata!.updatedAt = Date.now();
      this.actions.set(action.id, action);
    });
    
    if (stuckActions.length > 0) {
      this.notifyQueueChangeListeners();
      
      // Persist if persistence is available
      if (this.persistence) {
        this.persistence.save(Array.from(this.actions.values())).catch(error => {
          console.warn("Failed to persist stuck action restart:", error);
        });
      }
      
      // Process restarted actions
      this.processNextAction();
    }
  }
  
  // Get actions by correlation ID
  getActionsByCorrelationId(correlationId: string): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.context?.correlationId === correlationId
    );
  }
  
  // Get actions by user ID
  getActionsByUserId(userId: string): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.context?.userId === userId
    );
  }
  
  // Get actions by session ID
  getActionsBySessionId(sessionId: string): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.context?.sessionId === sessionId
    );
  }
  
  // Get actions by device ID
  getActionsByDeviceId(deviceId: string): OfflineAction[] {
    return Array.from(this.actions.values()).filter(action => 
      action.context?.deviceId === deviceId
    );
  }
  
  // Export queue to JSON
  exportQueue(): string {
    return JSON.stringify(Array.from(this.actions.values()), null, 2);
  }
  
  // Import queue from JSON
  async importQueue(json: string): Promise<void> {
    try {
      const actions = JSON.parse(json) as OfflineAction[];
      actions.forEach(action => {
        this.actions.set(action.id, action);
        
        // Rebuild groups
        if (action.groupId) {
          if (!this.groups.has(action.groupId)) {
            this.groups.set(action.groupId, new Set());
          }
          this.groups.get(action.groupId)!.add(action.id);
        }
        
        // Rebuild dependencies
        if (action.dependencies && action.dependencies.length > 0) {
          action.dependencies.forEach(depId => {
            if (!this.dependencies.has(depId)) {
              this.dependencies.set(depId, new Set());
            }
            this.dependencies.get(depId)!.add(action.id);
          });
        }
      });
      
      this.notifyQueueChangeListeners();
      
      // Persist if persistence is available
      if (this.persistence) {
        try {
          await this.persistence.save(Array.from(this.actions.values()));
        } catch (error) {
          console.warn("Failed to persist imported queue:", error);
        }
      }
    } catch (error) {
      throw errorFactory.validationError("Invalid queue JSON format", {
        context: { json },
        severity: "medium"
      });
    }
  }
  
  // Validate queue integrity
  validateQueueIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for circular dependencies
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const hasCycle = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      
      visiting.add(id);
      const action = this.actions.get(id);
      if (action && action.dependencies) {
        for (const depId of action.dependencies) {
          if (hasCycle(depId)) {
            errors.push(`Circular dependency detected: ${id} -> ${depId}`);
            return true;
          }
        }
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };
    
    Array.from(this.actions.keys()).forEach(id => {
      if (!visited.has(id)) {
        hasCycle(id);
      }
    });
    
    // Check for orphaned dependencies
    Array.from(this.actions.values()).forEach(action => {
      if (action.dependencies) {
        action.dependencies.forEach(depId => {
          if (!this.actions.has(depId)) {
            errors.push(`Orphaned dependency: ${action.id} depends on non-existent action ${depId}`);
          }
        });
      }
    });
    
    // Check for orphaned group members
    Array.from(this.groups.entries()).forEach(([groupId, memberIds]) => {
      memberIds.forEach(memberId => {
        if (!this.actions.has(memberId)) {
          errors.push(`Orphaned group member: ${memberId} in group ${groupId}`);
        }
      });
    });
    
    // Check for orphaned dependents
    Array.from(this.dependencies.entries()).forEach(([depId, dependentIds]) => {
      if (!this.actions.has(depId)) {
        errors.push(`Orphaned dependency entry: ${depId} has dependents but doesn't exist`);
      }
      dependentIds.forEach(dependentId => {
        if (!this.actions.has(dependentId)) {
          errors.push(`Orphaned dependent: ${dependentId} depends on ${depId} but doesn't exist`);
        }
      });
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Repair queue integrity issues
  repairQueueIntegrity(): void {
    const { errors } = this.validateQueueIntegrity();
    if (errors.length === 0) return;
    
    console.warn("Repairing queue integrity issues:", errors);
    
    // Remove orphaned dependencies
    Array.from(this.actions.values()).forEach(action => {
      if (action.dependencies) {
        action.dependencies = action.dependencies.filter(depId => this.actions.has(depId));
        if (action.dependencies.length === 0) {
          delete action.dependencies;
        }
      }
    });
    
    // Remove orphaned group members
    Array.from(this.groups.entries()).forEach(([groupId, memberIds]) => {
      const validMembers = new Set(Array.from(memberIds).filter(memberId => this.actions.has(memberId)));
      if (validMembers.size === 0) {
        this.groups.delete(groupId);
      } else {
        this.groups.set(groupId, validMembers);
      }
    });
    
    // Remove orphaned dependency entries
    Array.from(this.dependencies.entries()).forEach(([depId, dependentIds]) => {
      if (!this.actions.has(depId)) {
        this.dependencies.delete(depId);
      } else {
        const validDependents = new Set(Array.from(dependentIds).filter(dependentId => this.actions.has(dependentId)));
        if (validDependents.size === 0) {
          this.dependencies.delete(depId);
        } else {
          this.dependencies.set(depId, validDependents);
        }
      }
    });
    
    this.notifyQueueChangeListeners();
    
    // Persist if persistence is available
    if (this.persistence) {
      this.persistence.save(Array.from(this.actions.values())).catch(error => {
        console.warn("Failed to persist queue after integrity repair:", error);
      });
    }
  }
}

export default ErrorBoundary;