import { useEffect } from "react";
import { apiAuthStatus, apiPing } from "../api";

interface UseConnectivityAndAuthParams {
	setIsConnected: (connected: boolean) => void;
	setAuthRequired: (required: boolean) => void;
	intervalMs?: number;
}

export function useConnectivityAndAuth({
	setIsConnected,
	setAuthRequired,
	intervalMs = 2500,
}: UseConnectivityAndAuthParams) {
	useEffect(() => {
		let t: number | undefined;
		let stopped = false;

		const tick = async () => {
			try {
				const ok = await apiPing();
				if (!stopped) setIsConnected(ok);
			} catch {
				if (!stopped) setIsConnected(false);
			}
			t = window.setTimeout(tick, intervalMs);
		};
		tick();

		// Probe auth requirement once on mount
		apiAuthStatus()
			.then((s) => {
				try {
					const ls = localStorage.getItem("api_token");
					setAuthRequired(Boolean(s?.auth_required) && !ls);
				} catch {
					setAuthRequired(Boolean(s?.auth_required));
				}
			})
			.catch(() => {});

		return () => {
			stopped = true;
			if (t) window.clearTimeout(t);
		};
	}, [intervalMs, setIsConnected, setAuthRequired]);
}

export default useConnectivityAndAuth;
