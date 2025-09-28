import type React from "react";
import { useToast } from "@/hooks/use-toast";
import { apiGetCollections, apiSetCollection } from "../../api";
import { announce } from "../../utils/accessibility";
import { Button } from "@/components/ui/shadcn/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/shadcn/Dialog";
import { Input } from "@/components/ui/shadcn/Input";
import { Label } from "@/components/ui/label";

interface CollectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	selected: Set<string>;
	dir: string;
	collections: Record<string, string[]> | null;
	photoActions: {
		setCollections: (collections: Record<string, string[]>) => void;
	};
	uiActions: {
		setNote: (message: string) => void;
	};
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
	isOpen,
	onClose,
	selected,
	dir,
	collections,
	photoActions,
	uiActions,
}) => {
	const { toast } = useToast();
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-lg font-semibold">Add to Collection</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						const form = e.target as HTMLFormElement;
						const name = (
							form.elements.namedItem("name") as HTMLInputElement
						).value.trim();
						if (!name) return;
						try {
							await apiSetCollection(dir, name, Array.from(selected));
							const r = await apiGetCollections(dir);
							photoActions.setCollections(r.collections || {});
							toast({ description: `Added ${selected.size} to ${name}` });
							announce(`Added ${selected.size} to ${name}`, "polite");
						} catch (e) {
							uiActions.setNote(
								e instanceof Error ? e.message : "Collection update failed",
							);
						}
						onClose();
					}}
				>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="col-name">Collection</Label>
							<Input
								id="col-name"
								name="name"
								list="collections-list"
								placeholder="Type or choose…"
								required
							/>
							<datalist id="collections-list">
								{Object.keys(collections || {}).map((n) => (
									<option key={n} value={n}>
										{n}
									</option>
								))}
							</datalist>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit">
							Add
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
};
