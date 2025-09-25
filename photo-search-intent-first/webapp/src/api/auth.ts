import { API_BASE } from "./base";
import type { AuthStatusResponse } from "./types";

export async function ping(): Promise<boolean> {
	try {
		const r = await fetch(`${API_BASE}/api/ping`);
		if (!r.ok) return false;
		const js = await r.json();
		return Boolean(js?.ok);
	} catch {
		return false;
	}
}

export async function authStatus(): Promise<AuthStatusResponse> {
	try {
		const r = await fetch(`${API_BASE}/auth/status`);
		if (!r.ok) return { auth_required: false };
		return (await r.json()) as AuthStatusResponse;
	} catch {
		return { auth_required: false };
	}
}

export async function authCheck(
	token: string,
): Promise<{ ok: boolean; message?: string }> {
	const r = await fetch(`${API_BASE}/auth/check`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ token }),
	});

	if (!r.ok) {
		const errorText = await r.text();
		return { ok: false, message: errorText };
	}

	return r.json() as Promise<{ ok: boolean; message?: string }>;
}

// Export convenience functions that maintain backward compatibility
export async function apiPing(): Promise<boolean> {
	return ping();
}

export async function apiAuthStatus(): Promise<{ auth_required: boolean }> {
	return authStatus();
}

export async function apiAuthCheck(
	token: string,
): Promise<{ ok: boolean; message?: string }> {
	return authCheck(token);
}
