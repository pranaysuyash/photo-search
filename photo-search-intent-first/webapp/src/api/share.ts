import { post } from "./base";
import type { CreateShareParams, CreateShareResponse } from "./types";

export class ShareAPI {
	static async createShare(
		params: CreateShareParams,
	): Promise<CreateShareResponse> {
		const { dir, provider, paths, options = {} } = params;
		return post<CreateShareResponse>("/share", {
			dir,
			provider,
			paths,
			expiry_hours: options.expiryHours ?? 24,
			password: options.password,
			view_only: options.viewOnly,
		});
	}

	static async getShare(
		token: string,
	): Promise<{ paths: string[]; expires?: string; view_only?: boolean }> {
		const r = await fetch(`/share/${encodeURIComponent(token)}`);
		if (!r.ok) throw new Error(await r.text());
		return r.json();
	}

	static async deleteShare(token: string): Promise<{ ok: boolean }> {
		const r = await fetch(`/share/${encodeURIComponent(token)}`, {
			method: "DELETE",
		});
		if (!r.ok) throw new Error(await r.text());
		return r.json();
	}

	static async listShares(
		dir: string,
	): Promise<
		Array<{
			token: string;
			paths: string[];
			expires?: string;
			created_at: string;
		}>
	> {
		const r = await fetch(`/shares?dir=${encodeURIComponent(dir)}`);
		if (!r.ok) throw new Error(await r.text());
		return r.json();
	}
}

// Export convenience functions that maintain backward compatibility
export async function apiCreateShare(
	dir: string,
	provider: string,
	paths: string[],
	options?: { expiryHours?: number; password?: string; viewOnly?: boolean },
) {
	return ShareAPI.createShare({ dir, provider, paths, options });
}
