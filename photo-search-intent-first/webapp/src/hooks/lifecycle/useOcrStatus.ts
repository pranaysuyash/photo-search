/**
 * Handles OCR status checks with cancellation and error handling
 */
import { useEffect, useRef, useState } from "react";
import { apiOcrStatus } from "../../api";
import { errorFactory } from "../../framework/EnhancedErrorHandling";

export interface UseOcrStatusReturn {
	ocrReady: boolean;
	ocrTextCount: number | undefined;
}

export interface UseOcrStatusProps {
	dir: string | null;
	showToast: (message: string, variant?: "default" | "destructive") => void;
}

export function useOcrStatus({
	dir,
	showToast,
}: UseOcrStatusProps): UseOcrStatusReturn {
	const [ocrReady, setOcrReady] = useState<boolean>(false);
	const [ocrTextCount, setOcrTextCount] = useState<number | undefined>(
		undefined,
	);
	const lastErrorRef = useRef<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		const run = async () => {
			if (!dir) {
				setOcrReady(false);
				setOcrTextCount(undefined);
				return;
			}

			try {
				const r = await apiOcrStatus(dir);
				if (!cancelled) {
					setOcrReady(!!r.ready);
					setOcrTextCount(
						typeof r.count === "number" ? Math.max(0, r.count) : undefined,
					);
					// Clear last error on success
					lastErrorRef.current = null;
				}
			} catch (error) {
				if (!cancelled) {
					const appError = errorFactory.networkError(
						"Failed to check OCR status for directory",
						{
							context: {
								operation: "ocr_status_check",
								directory: dir,
								error: error,
							},
							severity: "medium",
						},
					);

					const errorMessage = appError.getUserFacingMessage();

					// Only show toast if this is a different error than last time
					if (lastErrorRef.current !== errorMessage) {
						console.warn("OCR status check failed:", errorMessage);
						showToast(
							"OCR status check failed. Some features may be limited.",
							"destructive",
						);
						lastErrorRef.current = errorMessage;
					}

					setOcrReady(false);
					setOcrTextCount(undefined);
				}
			}
		};

		run();
		return () => {
			cancelled = true;
		};
	}, [dir, showToast]);

	return {
		ocrReady,
		ocrTextCount,
	};
}
