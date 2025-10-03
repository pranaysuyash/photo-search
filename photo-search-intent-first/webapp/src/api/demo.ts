import { get } from "./base";
import type { DemoDirResponse } from "./types";

export async function getDemoDir(): Promise<DemoDirResponse> {
  return get<DemoDirResponse>("/demo/dir");
}

export async function setupDemoLibrary(): Promise<{
  ok: boolean;
  path: string;
}> {
  return get<{ ok: boolean; path: string }>("/demo/setup");
}

export async function resetDemoLibrary(): Promise<{
  ok: boolean;
  message?: string;
}> {
  return get<{ ok: boolean; message?: string }>("/demo/reset");
}

export async function getDemoStats(): Promise<{
  total_photos: number;
  ready: boolean;
  last_updated?: string;
}> {
  return get<{ total_photos: number; ready: boolean; last_updated?: string }>(
    "/demo/stats"
  );
}

// Export convenience functions that maintain backward compatibility
export async function apiDemoDir(): Promise<DemoDirResponse | null> {
  try {
    const response = await get<{
      ok: boolean;
      data?: DemoDirResponse;
      message?: string;
    }>("/demo/dir");
    if (response.ok && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error("Failed to get demo directory:", error);
    return null;
  }
}
