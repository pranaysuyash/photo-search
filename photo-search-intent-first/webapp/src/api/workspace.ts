import { get, post } from "./base";
import type { WorkspaceParams } from "./types";

export async function addToWorkspace(
	params: WorkspaceParams,
): Promise<{ ok: boolean }> {
	const { dir, workspace, operation, value } = params;
	return post<{ ok: boolean }>("/workspace/add", {
		dir,
		workspace,
		operation,
		value,
	});
}

export async function getWorkspace(
	dir: string,
	workspace: string,
): Promise<{ workspace: string; data: Record<string, unknown> }> {
	return get<{ workspace: string; data: Record<string, unknown> }>(
		`/workspace/${encodeURIComponent(workspace)}?dir=${encodeURIComponent(dir)}`,
	);
}

export async function listWorkspaces(
	dir: string,
): Promise<{ workspaces: string[] }> {
	return get<{ workspaces: string[] }>(
		`/workspaces?dir=${encodeURIComponent(dir)}`,
	);
}

export async function updateWorkspace(
	params: WorkspaceParams,
): Promise<{ ok: boolean }> {
	const { dir, workspace, operation, value } = params;
	return post<{ ok: boolean }>(`/workspace/${encodeURIComponent(workspace)}`, {
		dir,
		operation,
		value,
	});
}

export async function deleteWorkspace(
	dir: string,
	workspace: string,
): Promise<{ ok: boolean }> {
	const r = await fetch(
		`/workspace/${encodeURIComponent(workspace)}?dir=${encodeURIComponent(
			dir,
		)}`,
		{
			method: "DELETE",
		},
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json();
} // Export convenience functions that maintain backward compatibility
export async function apiWorkspaceAdd(
	dir: string,
	workspace: string,
	operation: string,
	value?: string | number | boolean | string[] | Record<string, unknown>,
) {
	return addToWorkspace({ dir, workspace, operation, value });
}
