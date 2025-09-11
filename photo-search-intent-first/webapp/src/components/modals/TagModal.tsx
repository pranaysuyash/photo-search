import type React from "react";

interface FocusTrapProps {
	onEscape: () => void;
	children: React.ReactNode;
}

const FocusTrap: React.FC<FocusTrapProps> = ({ onEscape, children }) => {
	return <div>{children}</div>;
};

interface TagModalProps {
	onClose: () => void;
	onTagSelected: (tags: string) => void;
}

export const TagModal: React.FC<TagModalProps> = ({
	onClose,
	onTagSelected,
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
					<div className="font-semibold mb-2">Tag Selected</div>
					<div className="text-sm text-gray-600 mb-2">
						Enter comma-separated tags
					</div>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							const form = e.target as HTMLFormElement;
							const tags = (
								form.elements.namedItem("tags") as HTMLInputElement
							).value.trim();
							if (tags) {
								onTagSelected(tags);
								onClose();
							}
						}}
					>
						<label htmlFor="tags-input" className="sr-only">
							Tags
						</label>
						<input
							id="tags-input"
							name="tags"
							className="w-full border rounded px-2 py-1"
							placeholder="family, beach, 2024"
						/>
						<div className="mt-3 flex justify-end gap-2">
							<button
								type="button"
								className="px-3 py-1 rounded border"
								onClick={onClose}
								aria-label="Cancel tagging"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-3 py-1 rounded bg-blue-600 text-white"
								aria-label="Save tags"
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
