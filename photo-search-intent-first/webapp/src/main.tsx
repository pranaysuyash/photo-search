import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Toaster } from "./components/ui/toaster";
import TestApp from "./debug/TestApp";
import VisualHarness from "./debug/VisualHarness";
import { ModularApp } from "./ModularApp";
import { RootProviders } from "./RootProviders";
// Debug-only components removed after fixing rendering
import "./index.css";
import "./styles-modern.css";
import "./styles/responsive-fixes.css";
import "./high-contrast.css";
import "./styles/accessibility.css";
// import "./fix-visibility.css"; // disabled: was used for debugging visibility

// Dev helper: surface a tip only if backend actually requires Authorization
if (import.meta.env.DEV) {
	try {
		// Prefer persisted token; seed from env once if present
		let token =
			localStorage.getItem("api_token") ||
			(import.meta as unknown).env?.VITE_API_TOKEN;
		if (
			!localStorage.getItem("api_token") &&
			(import.meta as unknown).env?.VITE_API_TOKEN
		) {
			try {
				localStorage.setItem(
					"api_token",
					(import.meta as unknown).env?.VITE_API_TOKEN,
				);
			} catch {}
			token = (import.meta as unknown).env?.VITE_API_TOKEN;
		}
		const base =
			(import.meta as unknown).env?.VITE_API_BASE || window.location.origin;
		fetch(`${base}/auth/status`)
			.then(async (r) => {
				try {
					const js = await r.json();
					if (js?.auth_required) {
						if (!token) {
							// eslint-disable-next-line no-console
							console.info(
								"Tip: Backend requires API_TOKEN. Set VITE_API_TOKEN in webapp .env or localStorage.setItem('api_token','<value>').",
							);
						} else {
							// Verify token works
							fetch(`${base}/auth/check`, {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${token}`,
								},
							})
								.then((res) => {
									if (!res.ok) {
										// eslint-disable-next-line no-console
										console.warn(
											"Auth check failed (",
											res.status,
											") — ensure frontend token matches API_TOKEN.",
										);
									}
								})
								.catch(() => {});
						}
					}
				} catch {}
			})
			.catch(() => {});
	} catch {}
}

// Register service worker for PWA functionality
if ("serviceWorker" in navigator && import.meta.env.PROD) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register(`${import.meta.env.BASE_URL}service-worker.js`)
			.then((registration) => {
				console.log("ServiceWorker registered:", registration.scope);

				// Check for updates periodically
				setInterval(() => {
					registration.update();
				}, 60000); // Check every minute

				// Handle updates
				registration.addEventListener("updatefound", () => {
					const newWorker = registration.installing;
					if (newWorker) {
						newWorker.addEventListener("statechange", () => {
							if (
								newWorker.state === "installed" &&
								navigator.serviceWorker.controller
							) {
								// New service worker available: show non-blocking toast with refresh action
								try {
									// Lazy import to avoid bloating the initial chunk
									import("./utils").then(({ showToast }) => {
										showToast({
											message: "New version available",
											actionLabel: "Refresh",
											onAction: () => window.location.reload(),
											duration: 8000,
										});
									});
								} catch {
									// Fallback to immediate reload if toast not available
									window.location.reload();
								}
							}
						});
					}
				});
			})
			.catch((error) => {
				console.error("ServiceWorker registration failed:", error);
			});
	});
}

// Handle app install prompt (only in production)
if (import.meta.env.PROD) {
	let _deferredPrompt: unknown;
	window.addEventListener("beforeinstallprompt", (e) => {
		e.preventDefault();
		_deferredPrompt = e;
		// Could trigger UI element here to prompt install
		console.log("App can be installed");
	});
}

function selectApp() {
	const params = new URLSearchParams(window.location.search);
	// Visual harness for Playwright snapshots (deterministic states)
	if (params.has("visual")) return <VisualHarness />;
	const ui =
		params.get("ui") ?? (import.meta as unknown).env?.VITE_UI ?? "modern";
	// Default to App (formerly ModernApp); allow forcing test via ?ui=test
	if (ui === "test") return <TestApp />;
	if (ui === "modular") return <ModularApp />;
	// Use the original App by default - it has all the features!
	return <App />;
}

// Add error boundary to catch rendering issues
class ErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ hasError: boolean; error: Error | null }
> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("React Error Boundary caught:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{ padding: "20px", color: "red" }}>
					<h1>Something went wrong.</h1>
					<details style={{ whiteSpace: "pre-wrap" }}>
						{this.state.error?.toString()}
					</details>
				</div>
			);
		}

		return this.props.children;
	}
}

// Debug wrapper + overlays removed; render clean app below

// Clean render with all required context providers
const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(
		<ErrorBoundary>
			<RootProviders>
				<Toaster />
				{selectApp()}
			</RootProviders>
		</ErrorBoundary>,
	);
}
