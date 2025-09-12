import { createRoot } from "react-dom/client";
import App from "./App";
import TestApp from "./debug/TestApp";
import { ModularApp } from "./ModularApp";
import { RootProviders } from "./RootProviders";
import "./styles.css";
import "./styles-modern.css";
import "./styles/responsive-fixes.css";
import "./high-contrast.css";

// Dev helper: surface a tip if no token is configured and API may enforce auth
if (import.meta.env.DEV) {
	try {
		let token =
			localStorage.getItem("api_token") ||
			(import.meta as any).env?.VITE_API_TOKEN;
		// If no runtime token, seed from env to simplify dev
		if (
			!localStorage.getItem("api_token") &&
			(import.meta as any).env?.VITE_API_TOKEN
		) {
			try {
				localStorage.setItem(
					"api_token",
					(import.meta as any).env?.VITE_API_TOKEN,
				);
			} catch {}
			token = (import.meta as any).env?.VITE_API_TOKEN;
		}
		if (!token) {
			// eslint-disable-next-line no-console
			console.info(
				"Tip: If your API sets API_TOKEN, add VITE_API_TOKEN in webapp .env or localStorage.setItem('api_token', '<value>').",
			);
		}
		// Probe backend auth status to provide precise guidance
		const base =
			(import.meta as any).env?.VITE_API_BASE || window.location.origin;
		fetch(`${base}/auth/status`)
			.then(async (r) => {
				try {
					const js = await r.json();
					if (js?.auth_required && !token) {
						// eslint-disable-next-line no-console
						console.warn(
							"Backend requires Authorization but no token is configured. Set localStorage.setItem('api_token','<value>') or VITE_API_TOKEN in .env, matching API_TOKEN used by the server.",
						);
					} else if (js?.auth_required && token) {
						// Verify acceptance with a POST
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
										") — token mismatch? Ensure frontend and backend tokens match exactly.",
									);
								}
							})
							.catch(() => {});
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
			.register("/service-worker.js")
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
								// New service worker available, prompt user to refresh
								if (confirm("New version available! Refresh to update?")) {
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

// Handle app install prompt
let _deferredPrompt: any;
window.addEventListener("beforeinstallprompt", (e) => {
	e.preventDefault();
	_deferredPrompt = e;
	// Could trigger UI element here to prompt install
	console.log("App can be installed");
});

function selectApp() {
	const params = new URLSearchParams(window.location.search);
	const ui = params.get("ui") ?? (import.meta as any).env?.VITE_UI ?? "modern";
	// Default to App (formerly ModernApp); allow forcing test via ?ui=test
	if (ui === "test") return <TestApp />;
	if (ui === "modular") return <ModularApp />;
	// Use the original App by default - it has all the features!
	return <App />;
}

createRoot(document.getElementById("root")!).render(
	<RootProviders>{selectApp()}</RootProviders>,
);
