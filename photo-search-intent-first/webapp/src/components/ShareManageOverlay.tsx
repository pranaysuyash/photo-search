import type React from "react";
import { ShareManager } from "../modules/ShareManager";
import { FocusTrap } from "../utils/accessibility";

interface ShareManageOverlayProps {
	isOpen: boolean;
	onClose: () => void;
	dir?: string | null;
}

export const ShareManageOverlay: React.FC<ShareManageOverlayProps> = ({
	isOpen,
	onClose,
	dir,
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
			<button
				type="button"
				aria-label="Close"
				className="absolute inset-0 w-full h-full"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Escape") onClose();
				}}
			/>
			<FocusTrap onEscape={onClose}>
				<div
					className="bg-white rounded-lg p-4 w-full max-w-2xl"
					role="dialog"
					aria-modal="true"
				>
					<div className="flex items-center justify-between mb-3">
						<div className="font-semibold">Manage Shares</div>
						<button
							type="button"
							className="px-2 py-1 border rounded"
							onClick={onClose}
						>
							Close
						</button>
					</div>
					<ShareManager dir={dir ?? ""} />
				</div>
			</FocusTrap>
		</div>
	);
};

export default ShareManageOverlay;
