import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SetupWorker } from "msw/browser";
import { useDataMode } from "../stores/settingsStore";

let workerPromise: Promise<SetupWorker> | null = null;
let activeWorker: SetupWorker | null = null;
let mockActive = false;

async function loadWorker(): Promise<SetupWorker> {
	if (activeWorker) return activeWorker;
	if (!workerPromise) {
		workerPromise = import("../mocks/browser").then(({ worker }) => {
			activeWorker = worker;
			return worker;
		});
	}
	return workerPromise;
}

function stopWorker() {
	if (activeWorker && mockActive) {
		activeWorker.stop();
		mockActive = false;
		return;
	}
	if (workerPromise) {
		void workerPromise.then((worker) => {
			worker.stop();
			mockActive = false;
		});
	}
}

async function startWorker(): Promise<void> {
	const worker = await loadWorker();
	if (mockActive) return;
	try {
		const baseUrl = (import.meta.env.BASE_URL || "/") as string;
		const normalized =
			baseUrl.endsWith("/") || baseUrl === ""
				? `${baseUrl}mockServiceWorker.js`
				: `${baseUrl}/mockServiceWorker.js`;
		await worker.start({
			onUnhandledRequest: "bypass",
			serviceWorker: { url: normalized },
		});
		mockActive = true;
	} catch (error) {
		console.error("Failed to start mock service worker", error);
		throw error;
	}
}

/**
 * ApiModeBridge toggles the MSW worker based on the persisted data mode.
 * When switching modes it also invalidates active queries so hooks refetch.
 */
export function ApiModeBridge() {
	const dataMode = useDataMode();
	const queryClient = useQueryClient();
	const lastMode = useRef<string | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;

		let cancelled = false;
		const invalidate = () => {
			if (!cancelled) {
				queryClient.invalidateQueries();
			}
		};

		if (dataMode === "mock") {
			if (!("serviceWorker" in navigator)) {
				console.warn(
					"Mock data mode requested but Service Worker API is unavailable.",
				);
				return undefined;
			}
			void startWorker()
				.then(() => {
					if (!cancelled) {
						console.info("Mock API responses enabled");
						invalidate();
					}
				})
				.catch(() => {
					// startWorker already logged; fall back to live mode
					if (!cancelled) {
						stopWorker();
						lastMode.current = "live";
					}
				});
		} else {
			if (mockActive) {
				stopWorker();
				console.info("Live API mode enabled");
			}
			invalidate();
		}

		lastMode.current = dataMode;
		return () => {
			cancelled = true;
		};
	}, [dataMode, queryClient]);

	return null;
}
