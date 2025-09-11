import type React from "react";

interface FocusTrapProps {
	onEscape: () => void;
	children: React.ReactNode;
}

const FocusTrap: React.FC<FocusTrapProps> = ({ onEscape, children }) => {
	return <div>{children}</div>;
};

interface SaveModalProps {
	dir: string;
	searchText: string;
	query: string;
	topK: number;
	onClose: () => void;
	setSelectedView: (view: string) => void;
	photoActions: {
		setSaved: (saved: any[]) => void;
	};
	uiActions: {
		setNote: (message: string) => void;
	};
}

export const SaveModal: React.FC<SaveModalProps> = ({
	dir,
	searchText,
	query,
	topK,
	onClose,
	setSelectedView,
	photoActions,
	uiActions,
}) => {
	return (
		<div
			className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<FocusTrap onEscape={onClose}>
				<div
					className="bg-white rounded-lg p-4 w-full max-w-md"
					role="dialog"
					aria-modal="true"
				>
					<div className="font-semibold mb-2">Save Search</div>
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							const form = e.target as HTMLFormElement;
							const name = (
								form.elements.namedItem("name") as HTMLInputElement
							).value.trim();
							if (!name) return;
							try {
								const { apiAddSaved, apiGetSaved } = await import("../../api");
								await apiAddSaved(dir, name, searchText || query || "", topK);
								const r = await apiGetSaved(dir);
								photoActions.setSaved(r.saved || []);
								setSelectedView("saved");
							} catch (e) {
								uiActions.setNote(
									e instanceof Error ? e.message : "Save failed",
								);
							}
							onClose();
						}}
					>
						<label className="block text-sm mb-1" htmlFor="save-name">
							Name
						</label>
						<input
							id="save-name"
							name="name"
							className="w-full border rounded px-2 py-1"
							placeholder="e.g. Dogs on beach"
						/>
						<div className="mt-3 flex justify-end gap-2">
							<button
								type="button"
								className="px-3 py-1 rounded border"
								onClick={onClose}
								aria-label="Cancel saving search"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-3 py-1 rounded bg-blue-600 text-white"
								aria-label="Save search"
							>
								Save
							</button>
						</div>
					</form>
				</div>
			</FocusTrap>
		</div>
	);
};
