import type React from "react";
import { apiAddSaved, apiGetSaved } from "../../api";
import { Button } from "@/components/ui/shadcn/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/shadcn/Dialog";
import { Input } from "@/components/ui/shadcn/Input";
import { Label } from "@/components/ui/label";

interface SaveModalProps {
	isOpen: boolean;
	onClose: () => void;
	dir: string;
	searchText: string;
	query: string;
	topK: number;
	setSelectedView: (view: string) => void;
	photoActions: {
		setSaved: (
			saved: Array<{ name: string; query: string; top_k?: number }>,
		) => void;
	};
	uiActions: {
		setNote: (message: string) => void;
	};
}

export const SaveModal: React.FC<SaveModalProps> = ({
	isOpen,
	onClose,
	dir,
	searchText,
	query,
	topK,
	setSelectedView,
	photoActions,
	uiActions,
}) => {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-lg font-semibold">Save Search</DialogTitle>
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
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="save-name">Name</Label>
							<Input
								id="save-name"
								name="name"
								placeholder="e.g. Dogs on beach"
								required
							/>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit">
							Save
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
};
