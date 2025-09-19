import type React from "react";
import { useToast } from "@/hooks/use-toast";
import { apiGetCollections, apiSetCollection } from "../../api";
import { announce, FocusTrap } from "../../utils/accessibility";

interface RemoveCollectionModalProps {
	selected: Set<string>;
	dir: string;
	collections: Record<string, string[]> | null;
	onClose: () => void;
	photoActions: {
		setCollections: (collections: Record<string, string[]>) => void;
	};
	uiActions: {
		setNote: (message: string) => void;
	};
}

export const RemoveCollectionModal: React.FC<RemoveCollectionModalProps> = ({
	selected,
	dir,
	collections,
	onClose,
	photoActions,
	uiActions,
}) => {
	const { toast } = useToast();
	return (
		<div
			className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			role="dialog"
			aria-modal="true"
		>
			<FocusTrap onEscape={onClose}>
				<div className="bg-white rounded-lg p-4 w-full max-w-md">
					<div className="font-semibold mb-2">Remove from Collection</div>
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							const form = e.target as HTMLFormElement;
							const name = (
								form.elements.namedItem("name") as HTMLInputElement
							).value.trim();
							if (!name) return;
							try {
								const r = await apiGetCollections(dir);
								const existing = r.collections?.[name] || [];
								const next = existing.filter((p: string) => !selected.has(p));
								await apiSetCollection(dir, name, next);
								const r2 = await apiGetCollections(dir);
								photoActions.setCollections(r2.collections || {});
								toast({
									description: `Removed ${
										existing.length - next.length
									} from ${name}`,
								});
								announce(
									`Removed ${existing.length - next.length} from ${name}`,
									"polite",
								);
							} catch (e) {
								uiActions.setNote(
									e instanceof Error ? e.message : "Collection update failed",
								);
							}
							onClose();
						}}
					>
						<label className="block text-sm mb-1" htmlFor="col-name-remove">
							Collection
						</label>
						<input
							id="col-name-remove"
							name="name"
							list="collections-list"
							className="w-full border rounded px-2 py-1"
							placeholder="Choose collection"
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
								aria-label="Cancel removing from collection"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-3 py-1 rounded bg-blue-600 text-white"
								aria-label="Remove from collection"
							>
								Remove
							</button>
						</div>
					</form>
				</div>
			</FocusTrap>
		</div>
	);
};
