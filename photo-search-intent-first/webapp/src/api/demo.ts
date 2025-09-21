import { get } from "./base";
import type { DemoDirResponse } from "./types";

export class DemoAPI {
  static async getDemoDir(): Promise<DemoDirResponse> {
    return get<DemoDirResponse>("/demo_dir");
  }

  static async setupDemoLibrary(): Promise<{ ok: boolean; path: string }> {
    return get<{ ok: boolean; path: string }>("/demo/setup");
  }

  static async resetDemoLibrary(): Promise<{ ok: boolean; message?: string }> {
    return get<{ ok: boolean; message?: string }>("/demo/reset");
  }

  static async getDemoStats(): Promise<{ total_photos: number; ready: boolean; last_updated?: string }> {
    return get<{ total_photos: number; ready: boolean; last_updated?: string }>("/demo/stats");
  }
}

// Export convenience functions that maintain backward compatibility
export async function apiDemoDir() {
  return DemoAPI.getDemoDir();
}