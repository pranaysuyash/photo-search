import { get } from "./base";
import type { DemoDirResponse } from "./types";

export async function getDemoDir(): Promise<DemoDirResponse> {
	return get<DemoDirResponse>("/demo_dir");
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
		"/demo/stats",
	);
}

// Export convenience functions that maintain backward compatibility
export async function apiDemoDir() {
	return getDemoDir();
}
