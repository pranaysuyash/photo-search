import type React from "react";

interface FocusTrapProps {
	onEscape: () => void;
	children: React.ReactNode;
}

const FocusTrap: React.FC<FocusTrapProps> = ({ onEscape, children }) => {
	return <div>{children}</div>;
};

interface CollectionModalProps {
	selected: Set<string>;
	dir: string;
	collections: Record<string, any> | null;
	onClose: () => void;
	setToast: (toast: { message: string } | null) => void;
	photoActions: {
		setCollections: (collections: any) => void;
	};
	uiActions: {
		setNote: (message: string) => void;
	};
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
	selected,
	dir,
	collections,
	onClose,
	setToast,
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
					<div className="font-semibold mb-2">Add to Collection</div>
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							const form = e.target as HTMLFormElement;
							const name = (
								form.elements.namedItem("name") as HTMLInputElement
							).value.trim();
							if (!name) return;
							try {
								const { apiSetCollection, apiGetCollections } = await import(
									"../../api"
								);
								await apiSetCollection(dir, name, Array.from(selected));
								const r = await apiGetCollections(dir);
								photoActions.setCollections(r.collections || {});
								setToast({ message: `Added ${selected.size} to ${name}` });
							} catch (e) {
								uiActions.setNote(
									e instanceof Error ? e.message : "Collection update failed",
								);
							}
							onClose();
						}}
					>
						<label className="block text-sm mb-1" htmlFor="col-name">
							Collection
						</label>
						<input
							id="col-name"
							name="name"
							list="collections-list"
							className="w-full border rounded px-2 py-1"
							placeholder="Type or choose…"
						/>
						<datalist id="collections-list">
							{Object.keys(collections || {}).map((n) => (
								<option key={n} value={n}>
									{n}
								</option>
							))}
						</datalist>
						<div className="mt-3 flex justify-end gap-2">
							<button
								type="button"
								className="px-3 py-1 rounded border"
								onClick={onClose}
								aria-label="Cancel adding to collection"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-3 py-1 rounded bg-blue-600 text-white"
								aria-label="Add to collection"
							>
								Add
							</button>
						</div>
					</form>
				</div>
			</FocusTrap>
		</div>
	);
};
