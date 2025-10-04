import { API_BASE } from "../api/base";
import { enhancedOfflineStorage, type OfflinePhotoStorage } from "./EnhancedOfflineStorage";

interface ThumbnailTask {
  dir: string;
  id: string;
  path: string;
}

const MAX_BATCH_SIZE = 8;

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

class ThumbnailGenerator {
  private queue: ThumbnailTask[] = [];
  private inFlight = new Set<string>();
  private processing = false;

  enqueueMissing(dir: string, photos: OfflinePhotoStorage[], limit = 50): void {
    const missing = photos
      .filter((photo) => !photo.thumbnail)
      .slice(0, limit)
      .map((photo) => ({ dir, id: photo.id, path: photo.path }));

    if (missing.length === 0) {
      return;
    }

    for (const task of missing) {
      const key = this.taskKey(task);
      if (this.inFlight.has(key)) {
        continue;
      }
      this.queue.push(task);
      this.inFlight.add(key);
    }

    this.startProcessing();
  }

  private taskKey(task: ThumbnailTask): string {
    return `${task.dir}::${task.id}`;
  }

  private startProcessing(): void {
    if (this.processing) {
      return;
    }
    this.processing = true;
    this.scheduleNextBatch();
  }

  private scheduleNextBatch(): void {
    if (typeof window === "undefined") {
      setTimeout(() => void this.processBatch(), 0);
      return;
    }

    const idle = (window as Window & { requestIdleCallback?: typeof requestIdleCallback })
      .requestIdleCallback;

    if (idle) {
      idle(() => void this.processBatch());
    } else {
      setTimeout(() => void this.processBatch(), 50);
    }
  }

  private async processBatch(): Promise<void> {
    const batch = this.queue.splice(0, MAX_BATCH_SIZE);

    if (batch.length === 0) {
      this.processing = false;
      this.inFlight.clear();
      return;
    }

    await Promise.all(batch.map((task) => this.generateThumbnail(task).catch(() => undefined)));

    for (const task of batch) {
      this.inFlight.delete(this.taskKey(task));
    }

    if (this.queue.length > 0) {
      this.scheduleNextBatch();
      return;
    }

    this.processing = false;
  }

  private async generateThumbnail(task: ThumbnailTask): Promise<void> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    let blob: Blob | null = null;

    try {
      const response = await fetch(
        `${API_BASE}/thumb?dir=${encodeURIComponent(task.dir)}&path=${encodeURIComponent(
          task.path,
        )}&size=256`,
      );

      if (!response.ok) {
        return;
      }

      blob = await response.blob();
    } catch (error) {
      console.warn("[ThumbnailGenerator] Failed to retrieve thumbnail", error);
    }

    if (!blob) {
      return;
    }

    const dataUrl = await blobToDataURL(blob);
    const existing = await enhancedOfflineStorage.getPhoto(task.id);

    if (!existing) {
      return;
    }

    await enhancedOfflineStorage.storePhoto({
      ...existing,
      thumbnail: dataUrl,
      cachedAt: existing.cachedAt ?? Date.now(),
      lastAccessed: Date.now(),
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("offline-thumbnail-updated", {
          detail: { path: task.path },
        }),
      );
    }
  }
}

export const thumbnailGenerator = new ThumbnailGenerator();

