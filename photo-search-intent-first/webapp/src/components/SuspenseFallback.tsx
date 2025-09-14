import React from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export function SuspenseFallback({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      data-testid="suspense-fallback"
      className="w-full h-full flex items-center justify-center p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-gray-500">
        <LoadingSpinner />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

export default SuspenseFallback;

