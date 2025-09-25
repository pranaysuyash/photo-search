import type React from "react";

export const OCRStatus: React.FC<{
	ocrReady?: boolean;
}> = ({ ocrReady }) => {
	if (!ocrReady) return null;

	return (
		<span className="chip" title="OCR ready: search text inside images">
			OCR
		</span>
	);
};
