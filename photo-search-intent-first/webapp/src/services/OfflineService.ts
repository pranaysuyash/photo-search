// Offline Service for managing offline functionality and sync
export interface BaseOfflineAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
  authContext?: AuthContext;
}

// Define authentication context interface
export interface AuthContext {
  token?: string;
  timestamp: number;
}

// Define specific payload interfaces for each action type
export interface SearchActionPayload {
  dir: string;
  query: string;
  provider?: string;
  topK?: number;
}

export interface CollectionActionPayload {
  dir: string;
  name: string;
  paths: string[];
}

export interface DeleteCollectionActionPayload {
  dir: string;
  name: string;
}

export interface TagActionPayload {
  dir: string;
  paths: string[];
  tags: string[];
  operation: "add" | "remove" | "replace";
}

export interface SetTagsActionPayload {
  dir: string;
  path: string;
  tags: string[];
}

export interface DeleteActionPayload {
  dir: string;
  paths: string[];
  useOsTrash?: boolean;
}

export interface FavoriteActionPayload {
  dir: string;
  path: string;
  favorite: boolean;
}

export interface SavedSearchActionPayload {
  dir: string;
  name: string;
  query: string;
  topK: number;
}

export interface DeleteSavedSearchActionPayload {
  dir: string;
  name: string;
}

export interface BatchAddToCollectionActionPayload {
  dir: string;
  paths: string[];
  collectionName: string;
}

export interface IndexActionPayload {
  dir: string;
  provider: string;
  batchSize?: number;
  hfToken?: string;
  openaiKey?: string;
}

export interface BuildMetadataActionPayload {
  dir: string;
  provider: string;
  hfToken?: string;
  openaiKey?: string;
}

export interface BuildOCRAActionPayload {
  dir: string;
  provider: string;
  languages?: string[];
  hfToken?: string;
  openaiKey?: string;
}

export interface BuildFacesActionPayload {
  dir: string;
  provider: string;
}

export interface SmartCollectionActionPayload {
  dir: string;
  name: string;
  rules: unknown;
}

export interface DeleteSmartCollectionActionPayload {
  dir: string;
  name: string;
}

// Define specific action types with proper payloads
export interface SearchOfflineAction extends BaseOfflineAction {
  type: "search";
  payload: SearchActionPayload;
}

export interface CollectionOfflineAction extends BaseOfflineAction {
  type: "collection";
  payload: CollectionActionPayload;
}

export interface DeleteCollectionOfflineAction extends BaseOfflineAction {
  type: "delete_collection";
  payload: DeleteCollectionActionPayload;
}

export interface TagOfflineAction extends BaseOfflineAction {
  type: "tag";
  payload: TagActionPayload;
}

export interface SetTagsOfflineAction extends BaseOfflineAction {
  type: "set_tags";
  payload: SetTagsActionPayload;
}

export interface DeleteOfflineAction extends BaseOfflineAction {
  type: "delete";
  payload: DeleteActionPayload;
}

export interface FavoriteOfflineAction extends BaseOfflineAction {
  type: "favorite";
  payload: FavoriteActionPayload;
}

export interface SavedSearchOfflineAction extends BaseOfflineAction {
  type: "saved_search";
  payload: SavedSearchActionPayload;
}

export interface DeleteSavedSearchOfflineAction extends BaseOfflineAction {
  type: "delete_saved_search";
  payload: DeleteSavedSearchActionPayload;
}

export interface BatchAddToCollectionOfflineAction extends BaseOfflineAction {
  type: "batch_add_to_collection";
  payload: BatchAddToCollectionActionPayload;
}

export interface IndexOfflineAction extends BaseOfflineAction {
  type: "index";
  payload: IndexActionPayload;
}

export interface BuildMetadataOfflineAction extends BaseOfflineAction {
  type: "build_metadata";
  payload: BuildMetadataActionPayload;
}

export interface BuildOCROfflineAction extends BaseOfflineAction {
  type: "build_ocr";
  payload: BuildOCRAActionPayload;
}

export interface BuildFacesOfflineAction extends BaseOfflineAction {
  type: "build_faces";
  payload: BuildFacesActionPayload;
}

export interface SmartCollectionOfflineAction extends BaseOfflineAction {
  type: "smart_collection";
  payload: SmartCollectionActionPayload;
}

export interface DeleteSmartCollectionOfflineAction extends BaseOfflineAction {
  type: "delete_smart_collection";
  payload: DeleteSmartCollectionActionPayload;
}

export type OfflineAction =
  | SearchOfflineAction
  | CollectionOfflineAction
  | DeleteCollectionOfflineAction
  | TagOfflineAction
  | SetTagsOfflineAction
  | DeleteOfflineAction
  | FavoriteOfflineAction
  | SavedSearchOfflineAction
  | DeleteSavedSearchOfflineAction
  | BatchAddToCollectionOfflineAction
  | IndexOfflineAction
  | BuildMetadataOfflineAction
  | BuildOCROfflineAction
  | BuildFacesOfflineAction
  | SmartCollectionOfflineAction
  | DeleteSmartCollectionOfflineAction;

// Type guard functions
function isSearchActionPayload(
  payload: unknown
): payload is SearchActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "query" in payload &&
    typeof (payload as SearchActionPayload).dir === "string" &&
    typeof (payload as SearchActionPayload).query === "string"
  );
}

function isCollectionActionPayload(
  payload: unknown
): payload is CollectionActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "name" in payload &&
    "paths" in payload &&
    typeof (payload as CollectionActionPayload).dir === "string" &&
    typeof (payload as CollectionActionPayload).name === "string" &&
    Array.isArray((payload as CollectionActionPayload).paths)
  );
}

function isTagActionPayload(payload: unknown): payload is TagActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "paths" in payload &&
    "tags" in payload &&
    "operation" in payload &&
    typeof (payload as TagActionPayload).dir === "string" &&
    Array.isArray((payload as TagActionPayload).paths) &&
    Array.isArray((payload as TagActionPayload).tags) &&
    typeof (payload as TagActionPayload).operation === "string" &&
    ["add", "remove", "replace"].includes(
      (payload as TagActionPayload).operation
    )
  );
}

function isDeleteActionPayload(
  payload: unknown
): payload is DeleteActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "paths" in payload &&
    typeof (payload as DeleteActionPayload).dir === "string" &&
    Array.isArray((payload as DeleteActionPayload).paths)
  );
}

function isSetTagsActionPayload(
  payload: unknown
): payload is SetTagsActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "path" in payload &&
    "tags" in payload &&
    typeof (payload as SetTagsActionPayload).dir === "string" &&
    typeof (payload as SetTagsActionPayload).path === "string" &&
    Array.isArray((payload as SetTagsActionPayload).tags)
  );
}

function isFavoriteActionPayload(
  payload: unknown
): payload is FavoriteActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "path" in payload &&
    "favorite" in payload &&
    typeof (payload as FavoriteActionPayload).dir === "string" &&
    typeof (payload as FavoriteActionPayload).path === "string" &&
    typeof (payload as FavoriteActionPayload).favorite === "boolean"
  );
}

function isSavedSearchActionPayload(
  payload: unknown
): payload is SavedSearchActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "name" in payload &&
    "query" in payload &&
    "topK" in payload &&
    typeof (payload as SavedSearchActionPayload).dir === "string" &&
    typeof (payload as SavedSearchActionPayload).name === "string" &&
    typeof (payload as SavedSearchActionPayload).query === "string" &&
    typeof (payload as SavedSearchActionPayload).topK === "number"
  );
}

function isDeleteSavedSearchActionPayload(
  payload: unknown
): payload is DeleteSavedSearchActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "name" in payload &&
    typeof (payload as DeleteSavedSearchActionPayload).dir === "string" &&
    typeof (payload as DeleteSavedSearchActionPayload).name === "string"
  );
}

function isBatchAddToCollectionActionPayload(
  payload: unknown
): payload is BatchAddToCollectionActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "paths" in payload &&
    "collectionName" in payload &&
    typeof (payload as BatchAddToCollectionActionPayload).dir === "string" &&
    Array.isArray((payload as BatchAddToCollectionActionPayload).paths) &&
    typeof (payload as BatchAddToCollectionActionPayload).collectionName ===
      "string"
  );
}

function isIndexActionPayload(payload: unknown): payload is IndexActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "provider" in payload &&
    typeof (payload as IndexActionPayload).dir === "string" &&
    typeof (payload as IndexActionPayload).provider === "string"
  );
}

function isBuildMetadataActionPayload(
  payload: unknown
): payload is BuildMetadataActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "provider" in payload &&
    typeof (payload as BuildMetadataActionPayload).dir === "string" &&
    typeof (payload as BuildMetadataActionPayload).provider === "string"
  );
}

function isBuildOCRAActionPayload(
  payload: unknown
): payload is BuildOCRAActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "provider" in payload &&
    typeof (payload as BuildOCRAActionPayload).dir === "string" &&
    typeof (payload as BuildOCRAActionPayload).provider === "string"
  );
}

function isBuildFacesActionPayload(
  payload: unknown
): payload is BuildFacesActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "provider" in payload &&
    typeof (payload as BuildFacesActionPayload).dir === "string" &&
    typeof (payload as BuildFacesActionPayload).provider === "string"
  );
}

function isSmartCollectionActionPayload(
  payload: unknown
): payload is SmartCollectionActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "name" in payload &&
    "rules" in payload &&
    typeof (payload as SmartCollectionActionPayload).dir === "string" &&
    typeof (payload as SmartCollectionActionPayload).name === "string"
  );
}

function isDeleteSmartCollectionActionPayload(
  payload: unknown
): payload is DeleteSmartCollectionActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "name" in payload &&
    typeof (payload as DeleteSmartCollectionActionPayload).dir === "string" &&
    typeof (payload as DeleteSmartCollectionActionPayload).name === "string"
  );
}

function isDeleteCollectionActionPayload(
  payload: unknown
): payload is DeleteCollectionActionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "dir" in payload &&
    "name" in payload &&
    typeof (payload as DeleteCollectionActionPayload).dir === "string" &&
    typeof (payload as DeleteCollectionActionPayload).name === "string"
  );
}

import {
  API_BASE,
  apiAddSaved,
  apiBatchAddToCollection,
  apiBatchDelete,
  apiBatchTag,
  apiBuildFaces,
  apiBuildMetadata,
  apiBuildOCR,
  apiDeleteCollection,
  apiDeleteSaved,
  apiDeleteSmart,
  apiIndex,
  apiSearch,
  apiSetCollection,
  apiSetFavorite,
  apiSetSmart,
  apiSetTags,
} from "../api";
import { serviceEnabled } from "../config/logging";
import { handleError } from "../utils/errors";
import { indexedDBStorage } from "./IndexedDBStorage";

const OFFLINE_DEBUG =
  import.meta.env.VITE_OFFLINE_DEBUG === "1" ||
  (import.meta.env.DEV && import.meta.env.VITE_OFFLINE_DEBUG !== "0");

const offlineDebug = (...args: Array<unknown>) => {
  if (OFFLINE_DEBUG) {
    console.debug(...args);
  }
};

class OfflineService {
  private readonly QUEUE_KEY = "offline_action_queue";
  private readonly MAX_RETRIES = 3;
  private isOnline: boolean;
  private syncInProgress: boolean = false;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    this.isOnline = navigator.onLine;
    this.setupEventListeners();
    this.checkConnection();
  }

  private setupEventListeners() {
    window.addEventListener("online", () => this.handleOnline());
    window.addEventListener("offline", () => this.handleOffline());

    // Periodic connection check
    setInterval(() => this.checkConnection(), 30000);
  }

  private async checkConnection() {
    const ts = Date.now();
    const url = `${API_BASE}/api/monitoring?ts=${ts}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      this.setOnlineStatus(response.ok);
    } catch {
      this.setOnlineStatus(false);
    }
  }

  private setOnlineStatus(online: boolean) {
    if (this.isOnline !== online) {
      this.isOnline = online;
      this.notifyListeners(online);

      if (online) {
        this.syncQueue();
      }
    }
  }

  private handleOnline() {
    offlineDebug("[Offline Service] Connection restored");
    this.setOnlineStatus(true);
  }

  private handleOffline() {
    offlineDebug("[Offline Service] Connection lost");
    this.setOnlineStatus(false);
  }

  private notifyListeners(online: boolean) {
    this.listeners.forEach((listener) => listener(online));
  }

  // Public API
  public onStatusChange(callback: (online: boolean) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getStatus(): boolean {
    return this.isOnline;
  }

  public async queueAction(
    action: Omit<OfflineAction, "id" | "timestamp" | "retries" | "authContext">
  ) {
    // Capture authentication context when queuing actions
    const authContext = this.captureAuthContext();

    const queuedAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
      authContext,
    };

    // Save to storage
    try {
      if (IndexedDBStorage.isSupported()) {
        await indexedDBStorage.addAction(queuedAction);
      } else {
        // Fallback to localStorage approach
        const queue = await this.getQueue();
        queue.push(queuedAction);
        await this.saveQueue(queue);
      }
    } catch (error) {
      console.error("[Offline Service] Failed to queue action:", error);
    }

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncQueue();
    }

    return queuedAction.id;
  }

  /**
   * Queue multiple actions in a batch for better performance
   */
  public async queueActions(
    actions: Omit<
      OfflineAction,
      "id" | "timestamp" | "retries" | "authContext"
    >[]
  ): Promise<string[]> {
    const authContext = this.captureAuthContext();
    const actionIds: string[] = [];

    // Create queued actions with IDs
    const queuedActions: OfflineAction[] = actions.map((action) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      actionIds.push(id);

      return {
        ...action,
        id,
        timestamp: Date.now(),
        retries: 0,
        authContext,
      };
    });

    // Save to storage
    try {
      if (IndexedDBStorage.isSupported()) {
        // For IndexedDB, we can add multiple actions
        for (const action of queuedActions) {
          await indexedDBStorage.addAction(action);
        }
      } else {
        // For localStorage, get current queue and append new actions
        const queue = await this.getQueue();
        queue.push(...queuedActions);
        await this.saveQueue(queue);
      }
    } catch (error) {
      console.error("[Offline Service] Failed to queue actions:", error);
    }

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncQueue();
    }

    return actionIds;
  }

  private captureAuthContext(): AuthContext | undefined {
    try {
      // Runtime token from localStorage should take precedence in dev
      const ls =
        typeof window !== "undefined"
          ? localStorage.getItem("api_token")
          : null;
      const envTok = import.meta.env?.VITE_API_TOKEN;
      const token = ls || envTok;
      if (token) {
        return { token, timestamp: Date.now() };
      }
    } catch {}
    return undefined;
  }

  private async saveQueue(queue: OfflineAction[]): Promise<void> {
    try {
      // Try IndexedDB first if supported
      if (IndexedDBStorage.isSupported()) {
        // For saving, we need to add/update each action individually
        // This is a simplified approach - in a real implementation, you might want to batch these
        for (const action of queue) {
          try {
            await indexedDBStorage.addAction(action);
          } catch {
            // If adding fails, try updating
            try {
              await indexedDBStorage.updateAction(action);
            } catch (updateError) {
              console.error(
                "[Offline Service] Failed to save action to IndexedDB:",
                updateError
              );
            }
          }
        }
        return;
      }

      // Fallback to localStorage
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("[Offline Service] Failed to save queue:", error);
    }
  }

  private async removeActionsFromQueue(ids: string[]): Promise<void> {
    try {
      // Try IndexedDB first if supported
      if (IndexedDBStorage.isSupported()) {
        await indexedDBStorage.removeActions(ids);
        return;
      }

      // Fallback to localStorage
      const queue = await this.getQueue();
      const newQueue = queue.filter((action) => !ids.includes(action.id));
      await this.saveQueue(newQueue);
    } catch (error) {
      console.error(
        "[Offline Service] Failed to remove actions from queue:",
        error
      );
    }
  }

  public async clearQueue(): Promise<void> {
    try {
      // Try IndexedDB first if supported
      if (IndexedDBStorage.isSupported()) {
        await indexedDBStorage.clearActions();
        return;
      }

      // Fallback to localStorage
      localStorage.removeItem(this.QUEUE_KEY);
    } catch (error) {
      console.error("[Offline Service] Failed to clear queue:", error);
    }
  }

  public async getQueue(): Promise<OfflineAction[]> {
    try {
      // Try IndexedDB first if supported
      if (IndexedDBStorage.isSupported()) {
        return await indexedDBStorage.getActions();
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(this.QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public async syncQueue() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    const queue = await this.getQueue();
    const successfullySynced: string[] = [];
    const remaining: OfflineAction[] = [];

    // Process actions in batches for better performance
    const batchSize = 5;
    for (let i = 0; i < queue.length; i += batchSize) {
      const batch = queue.slice(i, i + batchSize);

      // Process batch in parallel
      const batchPromises = batch.map(async (action) => {
        try {
          await this.processAction(action);
          offlineDebug(`[Offline Service] Synced action: ${action.id}`);
          successfullySynced.push(action.id);
          return { id: action.id, success: true };
        } catch (error) {
          console.error(
            `[Offline Service] Failed to sync action: ${action.id}`,
            error
          );
          action.retries++;

          if (action.retries < this.MAX_RETRIES) {
            remaining.push(action);
          } else {
            console.error(
              `[Offline Service] Max retries reached for action: ${action.id}`
            );
            // Log only when we have exhausted retries to avoid noise
            const payload = (action?.payload as unknown) || {};
            const dir =
              (payload as unknown)?.dir || (payload as unknown)?.path || "";
            if (serviceEnabled("offline")) {
              handleError(error, {
                logToServer: true,
                logToConsole: false,
                context: {
                  action: `offline_sync_${String(action?.type)}`,
                  component: "OfflineService.syncQueue",
                  dir,
                  metadata: { id: action.id },
                },
              });
            }
          }
          return { id: action.id, success: false };
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
    }

    // Remove successfully synced actions from storage
    if (successfullySynced.length > 0) {
      await this.removeActionsFromQueue(successfullySynced);
    }

    // Save remaining actions (those that failed and need retry)
    if (remaining.length > 0) {
      // For remaining actions, we need to update them in storage
      try {
        if (IndexedDBStorage.isSupported()) {
          // Update each remaining action
          for (const action of remaining) {
            await indexedDBStorage.updateAction(action);
          }
        } else {
          // For localStorage, save the entire remaining queue
          await this.saveQueue(remaining);
        }
      } catch (error) {
        console.error(
          "[Offline Service] Failed to save remaining actions:",
          error
        );
      }

      // Retry failed actions after delay
      setTimeout(() => this.syncQueue(), 60000);
    }

    this.syncInProgress = false;
  }

  private async processAction(action: OfflineAction): Promise<void> {
    // Store the current token to restore it later
    let originalToken: string | null = null;
    try {
      originalToken =
        typeof window !== "undefined"
          ? localStorage.getItem("api_token")
          : null;
    } catch {}

    // If the action has stored auth context, temporarily use it
    if (action.authContext?.token) {
      try {
        localStorage.setItem("api_token", action.authContext.token);
      } catch {}
    }

    try {
      switch (action.type) {
        case "search":
          if (!isSearchActionPayload(action.payload)) {
            throw new Error("Invalid search action payload");
          }
          await apiSearch(
            action.payload.dir,
            action.payload.query,
            action.payload.provider ?? "local",
            action.payload.topK ?? 24
          );
          break;

        case "collection":
          if (!isCollectionActionPayload(action.payload)) {
            throw new Error("Invalid collection action payload");
          }
          await apiSetCollection(
            action.payload.dir,
            action.payload.name,
            action.payload.paths
          );
          break;

        case "delete_collection":
          if (!isDeleteCollectionActionPayload(action.payload)) {
            throw new Error("Invalid delete collection action payload");
          }
          await apiDeleteCollection(action.payload.dir, action.payload.name);
          break;

        case "tag":
          if (!isTagActionPayload(action.payload)) {
            throw new Error("Invalid tag action payload");
          }
          await apiBatchTag(
            action.payload.dir,
            action.payload.paths,
            action.payload.tags,
            action.payload.operation
          );
          break;

        case "set_tags":
          if (!isSetTagsActionPayload(action.payload)) {
            throw new Error("Invalid set tags action payload");
          }
          await apiSetTags(
            action.payload.dir,
            action.payload.path,
            action.payload.tags
          );
          break;

        case "delete":
          if (!isDeleteActionPayload(action.payload)) {
            throw new Error("Invalid delete action payload");
          }
          await apiBatchDelete(
            action.payload.dir,
            action.payload.paths,
            action.payload.useOsTrash
          );
          break;

        case "favorite":
          if (!isFavoriteActionPayload(action.payload)) {
            throw new Error("Invalid favorite action payload");
          }
          await apiSetFavorite(
            action.payload.dir,
            action.payload.path,
            action.payload.favorite
          );
          break;

        case "saved_search":
          if (!isSavedSearchActionPayload(action.payload)) {
            throw new Error("Invalid saved search action payload");
          }
          await apiAddSaved(
            action.payload.dir,
            action.payload.name,
            action.payload.query,
            action.payload.topK
          );
          break;

        case "delete_saved_search":
          if (!isDeleteSavedSearchActionPayload(action.payload)) {
            throw new Error("Invalid delete saved search action payload");
          }
          await apiDeleteSaved(action.payload.dir, action.payload.name);
          break;

        case "batch_add_to_collection":
          if (!isBatchAddToCollectionActionPayload(action.payload)) {
            throw new Error("Invalid batch add to collection action payload");
          }
          await apiBatchAddToCollection(
            action.payload.dir,
            action.payload.paths,
            action.payload.collectionName
          );
          break;

        case "index":
          if (!isIndexActionPayload(action.payload)) {
            throw new Error("Invalid index action payload");
          }
          await apiIndex(
            action.payload.dir,
            action.payload.provider,
            action.payload.batchSize,
            action.payload.hfToken,
            action.payload.openaiKey
          );
          break;

        case "build_metadata":
          if (!isBuildMetadataActionPayload(action.payload)) {
            throw new Error("Invalid build metadata action payload");
          }
          await apiBuildMetadata(
            action.payload.dir,
            action.payload.provider,
            action.payload.hfToken,
            action.payload.openaiKey
          );
          break;

        case "build_ocr":
          if (!isBuildOCRAActionPayload(action.payload)) {
            throw new Error("Invalid build OCR action payload");
          }
          await apiBuildOCR(
            action.payload.dir,
            action.payload.provider,
            action.payload.languages,
            action.payload.hfToken,
            action.payload.openaiKey
          );
          break;

        case "build_faces":
          if (!isBuildFacesActionPayload(action.payload)) {
            throw new Error("Invalid build faces action payload");
          }
          await apiBuildFaces(action.payload.dir, action.payload.provider);
          break;

        case "smart_collection":
          if (!isSmartCollectionActionPayload(action.payload)) {
            throw new Error("Invalid smart collection action payload");
          }
          await apiSetSmart(
            action.payload.dir,
            action.payload.name,
            action.payload.rules
          );
          break;

        case "delete_smart_collection":
          if (!isDeleteSmartCollectionActionPayload(action.payload)) {
            throw new Error("Invalid delete smart collection action payload");
          }
          await apiDeleteSmart(action.payload.dir, action.payload.name);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } finally {
      // Restore the original token
      try {
        if (originalToken !== null) {
          localStorage.setItem("api_token", originalToken);
        } else {
          localStorage.removeItem("api_token");
        }
      } catch {}
    }
  }

  // Cache management
  public async precacheImages(urls: string[]) {
    if (!("caches" in window)) {
      return;
    }

    try {
      const cache = await caches.open("photovault-images");
      await cache.addAll(urls);
    } catch (error) {
      console.error("[Offline Service] Failed to precache images:", error);
    }
  }

  public async getCachedImage(url: string): Promise<Response | null> {
    if (!("caches" in window)) {
      return null;
    }

    try {
      const cache = await caches.open("photovault-images");
      const response = await cache.match(url);
      return response || null;
    } catch {
      return null;
    }
  }

  // Background sync registration
  public async registerBackgroundSync(tag: string) {
    if (
      !("serviceWorker" in navigator) ||
      !("sync" in ServiceWorkerRegistration.prototype)
    ) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as unknown).sync.register(tag);
      offlineDebug(`[Offline Service] Background sync registered: ${tag}`);
    } catch (error) {
      console.error(
        "[Offline Service] Failed to register background sync:",
        error
      );
    }
  }

  // Queue management and statistics
  public async getQueueStatistics(): Promise<{
    totalActions: number;
    pendingActions: number;
    failedActions: number;
    actionsByType: Record<string, number>;
    oldestAction?: number;
    storageSize: number;
  }> {
    const queue = await this.getQueue();

    const stats = {
      totalActions: queue.length,
      pendingActions: queue.filter((a) => a.retries === 0).length,
      failedActions: queue.filter((a) => a.retries > 0).length,
      actionsByType: {} as Record<string, number>,
      oldestAction:
        queue.length > 0
          ? Math.min(...queue.map((a) => a.timestamp))
          : undefined,
      storageSize: 0,
    };

    // Count actions by type
    queue.forEach((action) => {
      stats.actionsByType[action.type] =
        (stats.actionsByType[action.type] || 0) + 1;
    });

    // Calculate storage size
    try {
      const queueData = JSON.stringify(queue);
      stats.storageSize = new Blob([queueData]).size;
    } catch {
      stats.storageSize = 0;
    }

    return stats;
  }

  // Priority-based queue management
  public async getPriorityActions(
    limit: number = 10
  ): Promise<OfflineAction[]> {
    const queue = await this.getQueue();

    // Prioritize actions: search > metadata changes > deletions > batch operations
    const priorityOrder = [
      "search",
      "favorite",
      "set_tags",
      "tag",
      "collection",
      "delete",
      "saved_search",
    ];

    return queue
      .sort((a, b) => {
        const aPriority = priorityOrder.indexOf(a.type);
        const bPriority = priorityOrder.indexOf(b.type);
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        // For same type, prioritize older actions
        return a.timestamp - b.timestamp;
      })
      .slice(0, limit);
  }

  // Retry management
  public async retryFailedActions(): Promise<void> {
    const queue = await this.getQueue();
    const failedActions = queue.filter(
      (a) => a.retries > 0 && a.retries < this.MAX_RETRIES
    );

    if (failedActions.length > 0) {
      offlineDebug(
        `[Offline Service] Retrying ${failedActions.length} failed actions`
      );
      // Reset retry count for immediate retry
      failedActions.forEach((action) => {
        action.retries = 0;
      });

      try {
        if (IndexedDBStorage.isSupported()) {
          for (const action of failedActions) {
            await indexedDBStorage.updateAction(action);
          }
        } else {
          await this.saveQueue(queue);
        }
      } catch (error) {
        console.error("[Offline Service] Failed to update retry count:", error);
      }

      // Trigger sync
      this.syncQueue();
    }
  }

  // Action cancellation
  public async cancelActions(actionIds: string[]): Promise<void> {
    await this.removeActionsFromQueue(actionIds);
    offlineDebug(`[Offline Service] Cancelled ${actionIds.length} actions`);
  }

  // Action filtering and querying
  public async getActionsByType(type: string): Promise<OfflineAction[]> {
    const queue = await this.getQueue();
    return queue.filter((action) => action.type === type);
  }

  public async getActionsByDateRange(
    start: number,
    end: number
  ): Promise<OfflineAction[]> {
    const queue = await this.getQueue();
    return queue.filter(
      (action) => action.timestamp >= start && action.timestamp <= end
    );
  }

  // Enhanced sync control
  public async syncActions(actionIds: string[]): Promise<{
    successful: string[];
    failed: string[];
  }> {
    const queue = await this.getQueue();
    const actionsToSync = queue.filter((a) => actionIds.includes(a.id));

    const successful: string[] = [];
    const failed: string[] = [];

    for (const action of actionsToSync) {
      try {
        await this.processAction(action);
        successful.push(action.id);
        offlineDebug(`[Offline Service] Synced action: ${action.id}`);
      } catch (error) {
        console.error(
          `[Offline Service] Failed to sync action: ${action.id}`,
          error
        );
        failed.push(action.id);
      }
    }

    // Remove successful actions
    if (successful.length > 0) {
      await this.removeActionsFromQueue(successful);
    }

    return { successful, failed };
  }

  // Network quality monitoring
  private lastNetworkQuality: number = 1;

  private async measureNetworkQuality(): Promise<number> {
    try {
      const start = Date.now();
      const response = await fetch(
        `${API_BASE}/api/monitoring?ts=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }
      );
      const end = Date.now();
      const latency = end - start;

      // Convert latency to quality score (0-1, where 1 is best)
      const quality = Math.max(0, Math.min(1, 1000 / latency));
      this.lastNetworkQuality = quality;
      return quality;
    } catch {
      this.lastNetworkQuality = 0;
      return 0;
    }
  }

  public getNetworkQuality(): number {
    return this.lastNetworkQuality;
  }

  // Adaptive sync based on network quality
  public async adaptiveSync(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    const networkQuality = await this.measureNetworkQuality();

    // Adjust batch size based on network quality
    let batchSize = 5; // default
    if (networkQuality > 0.8) {
      batchSize = 10; // good network
    } else if (networkQuality < 0.3) {
      batchSize = 2; // poor network
    }

    // Get priority actions
    const priorityActions = await this.getPriorityActions(batchSize);

    if (priorityActions.length > 0) {
      offlineDebug(
        `[Offline Service] Adaptive sync: processing ${
          priorityActions.length
        } actions (network quality: ${networkQuality.toFixed(2)})`
      );
      const actionIds = priorityActions.map((a) => a.id);
      const result = await this.syncActions(actionIds);

      offlineDebug(
        `[Offline Service] Adaptive sync results: ${result.successful.length} successful, ${result.failed.length} failed`
      );
    }
  }

  // Clear all offline data
  public async clearOfflineData() {
    // Clear queue
    localStorage.removeItem(this.QUEUE_KEY);

    // Clear IndexedDB if supported
    if (IndexedDBStorage.isSupported()) {
      try {
        await indexedDBStorage.clearActions();
      } catch (error) {
        console.error("[Offline Service] Failed to clear IndexedDB:", error);
      }
    }

    // Clear caches
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith("photovault-"))
          .map((name) => caches.delete(name))
      );
    }

    offlineDebug("[Offline Service] Offline data cleared");
  }
}

export const offlineService = new OfflineService();
