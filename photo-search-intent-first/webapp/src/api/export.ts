import { get, post } from "./base";
import type { ExportResponse } from "./types";

export class ExportAPI {
	static async exportCollection(
		dir: string,
		collection: string,
		format: "json" | "csv" = "json",
	): Promise<ExportResponse> {
		return post<ExportResponse>("/export", {
			dir,
			collection,
			format,
		});
	}

	static async exportSearch(
		dir: string,
		query: string,
		format: "json" | "csv" = "json",
		options?: { include_metadata?: boolean },
	): Promise<ExportResponse> {
		return post<ExportResponse>("/export/search", {
			dir,
			query,
			format,
			include_metadata: options?.include_metadata,
		});
	}

	static async exportLibrary(
		dir: string,
		format: "json" | "csv" = "json",
		options?: { include_metadata?: boolean; filter?: string },
	): Promise<ExportResponse> {
		return post<ExportResponse>("/export/library", {
			dir,
			format,
			include_metadata: options?.include_metadata,
			filter: options?.filter,
		});
	}

	static async exportFavorites(
		dir: string,
		format: "json" | "csv" = "json",
	): Promise<ExportResponse> {
		return post<ExportResponse>("/export/favorites", {
			dir,
			format,
		});
	}

	static async downloadExport(id: string): Promise<Blob> {
		const r = await fetch(`/export/download/${encodeURIComponent(id)}`);
		if (!r.ok) throw new Error(await r.text());
		return r.blob();
	}

	static async getExportStatus(
		id: string,
	): Promise<{ status: string; progress?: number; url?: string }> {
		const r = await fetch(`/export/status/${encodeURIComponent(id)}`);
		if (!r.ok) throw new Error(await r.text());
		return r.json();
	}

	static async listExports(
		dir: string,
	): Promise<
		Array<{ id: string; type: string; status: string; created_at: string }>
	> {
		return get<
			Array<{ id: string; type: string; status: string; created_at: string }>
		>(`/exports?dir=${encodeURIComponent(dir)}`);
	}

	static async deleteExport(id: string): Promise<{ ok: boolean }> {
		const r = await fetch(`/export/${encodeURIComponent(id)}`, {
			method: "DELETE",
		});
		if (!r.ok) throw new Error(await r.text());
		return r.json();
	}
}

// Export convenience functions that maintain backward compatibility
export async function apiExport(
	dir: string,
	collection: string,
	format?: "json" | "csv",
) {
	return ExportAPI.exportCollection(dir, collection, format);
}
