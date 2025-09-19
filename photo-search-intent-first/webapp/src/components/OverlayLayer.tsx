import type React from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export interface OverlayLayerProps {
	busy: string;
	note?: string;
}

export const OverlayLayer: React.FC<OverlayLayerProps> = ({ busy, note }) => {
	return (
		<>
			{/* Global progress overlay */}
			{!!busy && (
				<div
					className="fixed inset-0 z-[1050] flex items-center justify-center"
					style={{ background: "var(--color-surface-overlay)" }}
					aria-live="polite"
				>
					<div className="bg-card text-foreground rounded-lg shadow-md border border-border p-6 w-full max-w-sm">
						<LoadingSpinner size="lg" message={busy} className="text-center" />
						{note && (
							<p className="mt-3 text-sm text-muted-foreground text-center">
								{note}
							</p>
						)}
					</div>
				</div>
			)}

			{/* Toast handling is now centralized via the shadcn Toaster */}
		</>
	);
};

export default OverlayLayer;
