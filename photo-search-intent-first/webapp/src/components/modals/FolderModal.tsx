import type React from "react";
import { useState } from "react";
import { apiWorkspaceAdd } from "../../api";
import FolderPicker from "../FolderPicker";

interface FocusTrapProps {
	onEscape: () => void;
	children: React.ReactNode;
}

const FocusTrap: React.FC<FocusTrapProps> = ({ onEscape, children }) => {
	return <div>{children}</div>;
};

interface FolderModalProps {
	dir: string;
	useOsTrash: boolean;
	useFast: boolean;
	fastKind: string;
	useCaps: boolean;
	useOcr: boolean;
	hasText: boolean;
	highContrast: boolean;
	onClose: () => void;
	settingsActions: {
		setDir: (path: string) => void;
		setUseOsTrash: (value: boolean) => void;
		setUseFast: (value: boolean) => void;
		setFastKind: (value: any) => void;
		setUseCaps: (value: boolean) => void;
		setUseOcr: (value: boolean) => void;
		setHasText: (value: boolean) => void;
		setHighContrast: (value: boolean) => void;
	};
	uiActions: {
		setNote: (message: string) => void;
	};
	doIndex: () => void;
	prepareFast: (kind: string) => void;
	buildOCR: () => void;
	buildMetadata: () => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
	dir,
	useOsTrash,
	useFast,
	fastKind,
	useCaps,
	useOcr,
	hasText,
	highContrast,
	onClose,
	settingsActions,
	uiActions,
	doIndex,
	prepareFast,
	buildOCR,
	buildMetadata,
}) => {
	const [selectedPath, setSelectedPath] = useState(dir);

	const handleFolderSelect = (path: string) => {
		setSelectedPath(path);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (selectedPath) {
			settingsActions.setDir(selectedPath);
			onClose();
			// Add path to workspace and index it
			try {
				await apiWorkspaceAdd(selectedPath);
				await doIndex();
			} catch (error) {
				console.error("Failed to add path or index:", error);
				uiActions.setNote(
					error instanceof Error ? error.message : "Failed to add path",
				);
			}
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<FocusTrap onEscape={onClose}>
				<div
					className="bg-white rounded-lg p-4 w-full max-w-2xl"
					role="dialog"
					aria-modal="true"
				>
					<div className="font-semibold mb-4">Set Photo Folder</div>

					<FolderPicker
						onFolderSelect={handleFolderSelect}
						currentPath={selectedPath}
					/>

					<form onSubmit={handleSubmit}>
						<div className="mt-3 flex items-center justify-between">
							<label htmlFor="use-os-trash" className="text-sm">
								Use OS Trash (no Undo)
							</label>
							<input
								id="use-os-trash"
								type="checkbox"
								checked={useOsTrash}
								onChange={(e) =>
									settingsActions.setUseOsTrash(e.target.checked)
								}
							/>
						</div>

						<div className="mt-4 border-t pt-3">
							<div className="font-medium mb-2">Preferences</div>
							<div className="space-y-2 text-sm">
								<div className="flex items-center justify-between">
									<label htmlFor="pref-fast">Use Fast Index</label>
									<input
										id="pref-fast"
										type="checkbox"
										checked={useFast}
										onChange={(e) =>
											settingsActions.setUseFast(e.target.checked)
										}
									/>
								</div>
								<div className="flex items-center justify-between gap-2">
									<label htmlFor="pref-fastkind">Fast Kind</label>
									<select
										id="pref-fastkind"
										className="border rounded px-2 py-1"
										value={fastKind}
										onChange={(e) =>
											settingsActions.setFastKind(e.target.value as any)
										}
									>
										<option value="">Auto</option>
										<option value="annoy">Annoy</option>
										<option value="faiss">FAISS</option>
										<option value="hnsw">HNSW</option>
									</select>
								</div>
								<div className="flex items-center justify-between">
									<label htmlFor="pref-caps">Use Captions</label>
									<input
										id="pref-caps"
										type="checkbox"
										checked={useCaps}
										onChange={(e) =>
											settingsActions.setUseCaps(e.target.checked)
										}
									/>
								</div>
								<div className="flex items-center justify-between">
									<label htmlFor="pref-ocr">Use OCR</label>
									<input
										id="pref-ocr"
										type="checkbox"
										checked={useOcr}
										onChange={(e) =>
											settingsActions.setUseOcr(e.target.checked)
										}
									/>
								</div>
								<div className="flex items-center justify-between">
									<label htmlFor="pref-hastext">Default: Has Text</label>
									<input
										id="pref-hastext"
										type="checkbox"
										checked={hasText}
										onChange={(e) =>
											settingsActions.setHasText(e.target.checked)
										}
									/>
								</div>
								<div className="flex items-center justify-between">
									<label htmlFor="pref-high-contrast">High Contrast</label>
									<input
										id="pref-high-contrast"
										type="checkbox"
										checked={highContrast}
										onChange={(e) =>
											settingsActions.setHighContrast(e.target.checked)
										}
									/>
								</div>
								<div>
									<label htmlFor="pref-vlm" className="block mb-1">
										VLM Model
									</label>
									<input
										id="pref-vlm"
										className="w-full border rounded px-2 py-1"
										defaultValue=""
										onChange={(_e) => {
											/* TODO: implement VLM model setting */
										}}
									/>
								</div>
							</div>
						</div>
						<div className="mt-3 flex justify-between gap-2">
							<div className="flex gap-2">
								<button
									type="button"
									className="px-3 py-1 rounded border"
									onClick={doIndex}
									aria-label="Index files in the selected folder"
								>
									Index
								</button>
								<button
									type="button"
									className="px-3 py-1 rounded border"
									onClick={() => prepareFast("annoy")}
									aria-label="Prepare fast index"
								>
									Fast
								</button>
								<button
									type="button"
									className="px-3 py-1 rounded border"
									onClick={buildOCR}
									aria-label="Build OCR index"
								>
									OCR
								</button>
								<button
									type="button"
									className="px-3 py-1 rounded border"
									onClick={buildMetadata}
									aria-label="Build metadata index"
								>
									Metadata
								</button>
							</div>
							<div className="flex gap-2">
								<button
									type="button"
									className="px-3 py-1 rounded border"
									onClick={onClose}
									aria-label="Close settings"
								>
									Close
								</button>
								<button
									type="submit"
									className="px-3 py-1 rounded bg-blue-600 text-white"
									aria-label="Save settings"
								>
									Save
								</button>
							</div>
						</div>
					</form>
				</div>
			</FocusTrap>
		</div>
	);
};
