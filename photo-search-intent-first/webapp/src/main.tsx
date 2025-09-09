import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AppWrapper from "./AppWrapper";
import TestApp from "./debug/TestApp";
import { ModularApp } from "./ModularApp";
import { RootProviders } from "./RootProviders";
import "./styles.css";
import "./styles-modern.css";

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
let deferredPrompt: any;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Could trigger UI element here to prompt install
  console.log("App can be installed");
});

function selectApp() {
  const params = new URLSearchParams(window.location.search);
  const ui = params.get("ui") ?? (import.meta as any).env?.VITE_UI ?? "modern";
  // Default to App (formerly ModernApp); allow forcing test via ?ui=test
  if (ui === "test") return <TestApp />;
  if (ui === "new") return <AppWrapper />;
  if (ui === "modular") return <ModularApp />;
  // Use the original App by default - it has all the features!
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <RootProviders>{selectApp()}</RootProviders>
);
