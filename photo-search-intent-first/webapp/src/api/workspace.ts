import { get, post } from "./base";
import type { WorkspaceParams } from "./types";

export class WorkspaceAPI {
  static async addToWorkspace(params: WorkspaceParams): Promise<{ ok: boolean }> {
    const { dir, workspace, operation, value } = params;
    return post<{ ok: boolean }>("/workspace/add", {
      dir,
      workspace,
      operation,
      value,
    });
  }

  static async getWorkspace(dir: string, workspace: string): Promise<{ workspace: string; data: any }> {
    return get<{ workspace: string; data: any }>(`/workspace/${encodeURIComponent(workspace)}?dir=${encodeURIComponent(dir)}`);
  }

  static async listWorkspaces(dir: string): Promise<{ workspaces: string[] }> {
    return get<{ workspaces: string[] }>(`/workspaces?dir=${encodeURIComponent(dir)}`);
  }

  static async updateWorkspace(params: WorkspaceParams): Promise<{ ok: boolean }> {
    const { dir, workspace, operation, value } = params;
    return post<{ ok: boolean }>(`/workspace/${encodeURIComponent(workspace)}`, {
      dir,
      operation,
      value,
    });
  }

  static async deleteWorkspace(dir: string, workspace: string): Promise<{ ok: boolean }> {
    const r = await fetch(`/workspace/${encodeURIComponent(workspace)}?dir=${encodeURIComponent(dir)}`, {
      method: "DELETE",
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
}

// Export convenience functions that maintain backward compatibility
export async function apiWorkspaceAdd(dir: string, workspace: string, operation: string, value?: any) {
  return WorkspaceAPI.addToWorkspace({ dir, workspace, operation, value });
}