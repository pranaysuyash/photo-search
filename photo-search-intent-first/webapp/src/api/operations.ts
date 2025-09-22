import { API_BASE, get } from "./base";
import type { OperationStatusParams, OperationStatusResponse } from "./types";

export class OperationsAPI {
	static async getOperationStatus(
		params: OperationStatusParams,
	): Promise<OperationStatusResponse> {
		const { dir, operation } = params;
		const r = await fetch(
			`${API_BASE}/status/${encodeURIComponent(operation)}?dir=${encodeURIComponent(dir)}`,
		);
		if (!r.ok) throw new Error(await r.text());
		return r.json() as Promise<OperationStatusResponse>;
	}

	static async listOperations(
		dir: string,
	): Promise<Array<{ operation: string; state: string; progress?: number }>> {
		return get<Array<{ operation: string; state: string; progress?: number }>>(
			`/operations?dir=${encodeURIComponent(dir)}`,
		);
	}

	static async cancelOperation(
		dir: string,
		operation: string,
	): Promise<{ ok: boolean }> {
		const r = await fetch(
			`/operations/${encodeURIComponent(operation)}/cancel?dir=${encodeURIComponent(dir)}`,
			{
				method: "POST",
			},
		);
		if (!r.ok) throw new Error(await r.text());
		return r.json();
	}

	static async getOperationHistory(
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
}

// Export convenience functions that maintain backward compatibility
export async function apiOperationStatus(dir: string, operation: string) {
	return OperationsAPI.getOperationStatus({ dir, operation });
}
