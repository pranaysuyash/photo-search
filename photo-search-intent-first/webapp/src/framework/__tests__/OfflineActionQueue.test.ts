/**
 * OfflineActionQueue.test.ts - Tests for the offline action queue system
 * This file contains unit tests for the offline action queue implementation.
 */
import { OfflineActionQueue, errorFactory } from "../framework/EnhancedErrorHandling";

// Mock persistence implementation
class MockPersistence implements QueuePersistence {
  private data: OfflineAction[] = [];
  
  async save(actions: OfflineAction[]): Promise<void> {
    this.data = [...actions];
  }
  
  async load(): Promise<OfflineAction[]> {
    return [...this.data];
  }
  
  async clear(): Promise<void> {
    this.data = [];
  }
  
  async remove(id: string): Promise<void> {
    this.data = this.data.filter(action => action.id !== id);
  }
}

// Mock conflict resolver
const mockConflictResolver: ConflictResolver = {
  resolve: async (local: OfflineAction, remote: OfflineAction): Promise<OfflineAction> => {
    // Simple last-write-wins strategy
    if (local.metadata?.updatedAt && remote.metadata?.updatedAt) {
      return local.metadata.updatedAt > remote.metadata.updatedAt ? local : remote;
    }
    return local;
  }
};

describe("OfflineActionQueue", () => {
  let queue: OfflineActionQueue;
  let mockPersistence: MockPersistence;
  
  beforeEach(() => {
    mockPersistence = new MockPersistence();
    queue = new OfflineActionQueue({
      persistence: mockPersistence,
      conflictResolver: mockConflictResolver,
      maxRetries: 3,
      syncInterval: 5000, // 5 seconds for testing
      maxQueueSize: 100
    });
  });
  
  afterEach(() => {
    queue.destroy();
  });
  
  test("should create and queue actions", async () => {
    // Create a test action
    const actionId = await queue.createAction("SEARCH", {
      query: "vacation photos",
      top_k: 12
    }, {
      priority: "HIGH",
      tags: ["search", "vacation"],
      requiresNetwork: true,
      requiresUserInteraction: false
    });
    
    // Verify action was created
    expect(actionId).toBeDefined();
    expect(typeof actionId).toBe("string");
    
    // Get the action from the queue
    const action = queue.getActionById(actionId);
    expect(action).toBeDefined();
    expect(action?.type).toBe("SEARCH");
    expect(action?.payload.query).toBe("vacation photos");
    expect(action?.priority).toBe("HIGH");
    expect(action?.tags).toEqual(["search", "vacation"]);
    expect(action?.metadata?.requiresNetwork).toBe(true);
    expect(action?.metadata?.requiresUserInteraction).toBe(false);
    expect(action?.status).toBe("QUEUED");
  });
  
  test("should handle network errors gracefully", async () => {
    // Simulate network error
    const networkError = errorFactory.networkError("Connection failed", {
      context: { url: "https://api.example.com/search" },
      severity: "high"
    });
    
    // Handle the error
    const handledError = await handleGlobalError(networkError, {
      action: "search",
      component: "SearchComponent"
    });
    
    // Verify error handling
    expect(handledError).toBeInstanceOf(AppError);
    expect(handledError.code).toBe("NETWORK_ERROR");
    expect(handledError.recoverable).toBe(true);
    expect(handledError.severity).toBe("high");
    expect(handledError.category).toBe("NETWORK");
  });
  
  test("should persist actions to storage", async () => {
    // Create a test action
    const actionId = await queue.createAction("INDEX", {
      directory: "/photos/vacation",
      recursive: true
    }, {
      priority: "NORMAL",
      tags: ["index", "vacation"],
      requiresNetwork: false,
      requiresUserInteraction: false
    });
    
    // Verify action was persisted
    const persistedActions = await mockPersistence.load();
    expect(persistedActions).toHaveLength(1);
    expect(persistedActions[0].id).toBe(actionId);
    expect(persistedActions[0].type).toBe("INDEX");
    expect(persistedActions[0].payload.directory).toBe("/photos/vacation");
  });
  
  test("should initialize from persisted storage", async () => {
    // Create a test action and persist it
    const testAction: OfflineAction = {
      id: "test-action-1",
      type: "SEARCH",
      status: "QUEUED",
      priority: "NORMAL",
      payload: { query: "test photos" },
      context: {
        userId: "user-123",
        sessionId: "session-456",
        deviceId: "device-789",
        timestamp: Date.now(),
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        requiresNetwork: true,
        requiresUserInteraction: false,
        conflictResolutionStrategy: "LAST_WRITE_WINS"
      },
      dependencies: [],
      groupId: "test-group",
      tags: ["test"],
      syncAttempts: 0
    };
    
    await mockPersistence.save([testAction]);
    
    // Create a new queue to test initialization
    const newQueue = new OfflineActionQueue({
      persistence: mockPersistence,
      conflictResolver: mockConflictResolver
    });
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify action was loaded
    const loadedAction = newQueue.getActionById("test-action-1");
    expect(loadedAction).toBeDefined();
    expect(loadedAction?.type).toBe("SEARCH");
    expect(loadedAction?.payload.query).toBe("test photos");
    
    newQueue.destroy();
  });
  
  test("should handle action dependencies", async () => {
    // Create dependent actions
    const action1Id = await queue.createAction("INDEX", {
      directory: "/photos/vacation"
    }, {
      priority: "NORMAL"
    });
    
    const action2Id = await queue.createAction("SEARCH", {
      query: "beach photos"
    }, {
      priority: "HIGH",
      dependencies: [action1Id]
    });
    
    // Verify dependencies were set
    const action1 = queue.getActionById(action1Id);
    const action2 = queue.getActionById(action2Id);
    
    expect(action1).toBeDefined();
    expect(action2).toBeDefined();
    expect(action2?.dependencies).toEqual([action1Id]);
  });
  
  test("should handle action groups", async () => {
    const groupId = "batch-index-group";
    
    // Create grouped actions
    const action1Id = await queue.createAction("INDEX", {
      directory: "/photos/vacation"
    }, {
      groupId,
      priority: "NORMAL"
    });
    
    const action2Id = await queue.createAction("INDEX", {
      directory: "/photos/work"
    }, {
      groupId,
      priority: "NORMAL"
    });
    
    const action3Id = await queue.createAction("INDEX", {
      directory: "/photos/family"
    }, {
      groupId,
      priority: "NORMAL"
    });
    
    // Verify actions were grouped
    const groupActions = queue.getActions({ groupId });
    expect(groupActions).toHaveLength(3);
    expect(groupActions.map(a => a.id)).toContain(action1Id);
    expect(groupActions.map(a => a.id)).toContain(action2Id);
    expect(groupActions.map(a => a.id)).toContain(action3Id);
  });
  
  test("should handle action cancellation", async () => {
    // Create a test action
    const actionId = await queue.createAction("SEARCH", {
      query: "test photos"
    }, {
      priority: "NORMAL"
    });
    
    // Cancel the action
    await queue.cancelAction(actionId);
    
    // Verify action was cancelled
    const cancelledAction = queue.getActionById(actionId);
    expect(cancelledAction).toBeDefined();
    expect(cancelledAction?.status).toBe("CANCELLED");
  });
  
  test("should handle action retries", async () => {
    // Create a test action
    const actionId = await queue.createAction("SEARCH", {
      query: "test photos"
    }, {
      priority: "NORMAL"
    });
    
    // Simulate a failed action
    const action = queue.getActionById(actionId);
    if (action) {
      action.status = "FAILED";
      action.metadata!.retryCount = 1;
      action.metadata!.lastError = {
        message: "Network timeout",
        code: "NETWORK_TIMEOUT",
        timestamp: Date.now()
      };
      queue.updateActionStatus(actionId, "FAILED");
    }
    
    // Retry the action
    await queue.retryAction(actionId);
    
    // Verify action was reset for retry
    const retriedAction = queue.getActionById(actionId);
    expect(retriedAction).toBeDefined();
    expect(retriedAction?.status).toBe("QUEUED");
    expect(retriedAction?.metadata?.retryCount).toBe(0);
    expect(retriedAction?.metadata?.lastError).toBeUndefined();
  });
  
  test("should clear completed actions", async () => {
    // Create test actions
    const action1Id = await queue.createAction("SEARCH", { query: "test1" });
    const action2Id = await queue.createAction("SEARCH", { query: "test2" });
    const action3Id = await queue.createAction("SEARCH", { query: "test3" });
    
    // Mark some as completed
    queue.updateActionStatus(action1Id, "SYNCED");
    queue.updateActionStatus(action2Id, "CANCELLED");
    
    // Clear completed actions
    queue.clearCompleted();
    
    // Verify only incomplete actions remain
    const remainingActions = queue.getActions();
    expect(remainingActions).toHaveLength(1);
    expect(remainingActions[0].id).toBe(action3Id);
    expect(remainingActions[0].status).toBe("QUEUED");
  });
  
  test("should provide queue statistics", async () => {
    // Create test actions with different statuses
    const action1Id = await queue.createAction("SEARCH", { query: "test1" });
    const action2Id = await queue.createAction("INDEX", { directory: "/test" });
    const action3Id = await queue.createAction("TAG", { path: "/test.jpg", tags: ["test"] });
    
    // Update statuses
    queue.updateActionStatus(action1Id, "SYNCED");
    queue.updateActionStatus(action2Id, "FAILED");
    
    // Get statistics
    const stats = queue.getStatistics();
    
    expect(stats.total).toBe(3);
    expect(stats.synced).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.queued).toBe(1);
    expect(stats.byType.SEARCH).toBe(1);
    expect(stats.byType.INDEX).toBe(1);
    expect(stats.byType.TAG).toBe(1);
    expect(stats.byPriority.NORMAL).toBe(3);
  });
  
  test("should handle conflict resolution", async () => {
    // Create conflicting actions
    const localAction: OfflineAction = {
      id: "conflict-local",
      type: "SEARCH",
      status: "QUEUED",
      priority: "NORMAL",
      payload: { query: "local version" },
      context: {
        userId: "user-123",
        sessionId: "session-local",
        deviceId: "device-local",
        timestamp: Date.now(),
      },
      metadata: {
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
        retryCount: 0,
        maxRetries: 3,
        requiresNetwork: true,
        requiresUserInteraction: false,
        conflictResolutionStrategy: "LAST_WRITE_WINS"
      },
      dependencies: [],
      syncAttempts: 0
    };
    
    const remoteAction: OfflineAction = {
      id: "conflict-remote",
      type: "SEARCH",
      status: "QUEUED",
      priority: "NORMAL",
      payload: { query: "remote version" },
      context: {
        userId: "user-123",
        sessionId: "session-remote",
        deviceId: "device-remote",
        timestamp: Date.now(),
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        requiresNetwork: true,
        requiresUserInteraction: false,
        conflictResolutionStrategy: "LAST_WRITE_WINS"
      },
      dependencies: [],
      syncAttempts: 0
    };
    
    // Resolve conflict
    const resolvedAction = await mockConflictResolver.resolve(localAction, remoteAction);
    
    // Verify resolution (last-write-wins)
    expect(resolvedAction.id).toBe("conflict-remote");
    expect(resolvedAction.payload.query).toBe("remote version");
  });
});

export {};