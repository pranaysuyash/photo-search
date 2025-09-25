import { API_BASE, get } from "./base";
import type { OperationStatusParams, OperationStatusResponse } from "./types";

export async function getOperationStatus(
	params: OperationStatusParams,
): Promise<OperationStatusResponse> {
	const { dir, operation } = params;
	const r = await fetch(
		`${API_BASE}/status/${encodeURIComponent(
			operation,
		)}?dir=${encodeURIComponent(dir)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<OperationStatusResponse>;
}

export async function listOperations(
	dir: string,
): Promise<Array<{ operation: string; state: string; progress?: number }>> {
	return get<Array<{ operation: string; state: string; progress?: number }>>(
		`/operations?dir=${encodeURIComponent(dir)}`,
	);
}

export async function cancelOperation(
	dir: string,
	operation: string,
): Promise<{ ok: boolean }> {
	const r = await fetch(
		`/operations/${encodeURIComponent(
			operation,
		)}/cancel?dir=${encodeURIComponent(dir)}`,
		{
			method: "POST",
		},
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json();
}

export async function getOperationHistory(
	dir: string,
	limit = 50,
): Promise<
	Array<{
		operation: string;
		state: string;
		start_time: string;
		end_time?: string;
	}>
> {
	return get<
		Array<{
			operation: string;
			state: string;
			start_time: string;
			end_time?: string;
		}>
	>(`/operations/history?dir=${encodeURIComponent(dir)}&limit=${limit}`);
}

// Export convenience functions that maintain backward compatibility
export async function apiOperationStatus(dir: string, operation: string) {
	return getOperationStatus({ dir, operation });
}
