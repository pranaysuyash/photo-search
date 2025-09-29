import type React from "react";
import { apiExport } from "../../api";
import { announce, FocusTrap } from "../../utils/accessibility";

// Use shared FocusTrap from utils/accessibility

interface ExportModalProps {
	selected: Set<string>;
	dir: string;
	onClose: () => void;
	uiActions: {
		setNote: (message: string) => void;
	};
}

export const ExportModal: React.FC<ExportModalProps> = ({
	selected,
	dir,
	onClose,
	uiActions,
}) => {
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
					<div className="font-semibold mb-2">Export Selected</div>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							const form = e.target as HTMLFormElement;
							const dest = (
								form.elements.namedItem("dest") as HTMLInputElement
							).value.trim();
							if (!dest) return;
							// Read preset + toggles (UI-level; backend currently supports strip_exif and overwrite)
							const _preset =
								(form.elements.namedItem("preset") as RadioNodeList)?.value ||
								"web";
							const stripAll =
								(form.elements.namedItem("strip_all") as HTMLInputElement)
									?.checked || false;
							const stripGps =
								(form.elements.namedItem("strip_gps") as HTMLInputElement)
									?.checked || false;
							const keepCopy =
								(form.elements.namedItem("keep_copy") as HTMLInputElement)
									?.checked || false;
							const overwrite =
								(form.elements.namedItem("overwrite") as HTMLInputElement)
									?.checked || false;
							// Execute export (includes optional resize/quality for 'custom')
							(async () => {
								try {
									const paths = Array.from(selected);
									const preset = _preset as unknown;
									let resizeLong: number | undefined;
									let quality: number | undefined;
									if (preset === "custom") {
										const cl = parseInt(
											(
												form.elements.namedItem(
													"custom_long",
												) as HTMLInputElement
											)?.value || "",
										);
										const cq = parseInt(
											(
												form.elements.namedItem(
													"custom_quality",
												) as HTMLInputElement
											)?.value || "",
										);
										resizeLong = Number.isNaN(cl) ? undefined : cl;
										quality = Number.isNaN(cq) ? undefined : cq;
									}
									const r = await apiExport(
										dir || "",
										paths,
										dest,
										"copy",
										stripAll,
										overwrite,
										{
											stripGps,
											keepCopyrightOnly: keepCopy,
											preset,
											resizeLong,
											quality,
										},
									);
									uiActions.setNote(
										`Exported ${r.copied}, skipped ${r.skipped}, errors ${r.errors} → ${r.dest}`,
									);
									announce(
										`Exported ${r.copied} photo${r.copied === 1 ? "" : "s"}`,
										"polite",
									);
								} catch (e) {
									uiActions.setNote(
										e instanceof Error ? e.message : "Export failed",
									);
								}
							})();
							onClose();
						}}
					>
						<div className="grid gap-3">
							<div>
								<label
									className="block text-sm text-gray-600 mb-1"
									htmlFor="dest-input"
								>
									Destination
								</label>
								<input
									id="dest-input"
									name="dest"
									className="w-full border rounded px-2 py-1"
									placeholder="/absolute/path"
								/>
							</div>
							<fieldset>
								<legend className="text-sm font-medium mb-1">Preset</legend>
								<div className="flex gap-3 text-sm">
									<label className="flex items-center gap-1">
										<input
											type="radio"
											name="preset"
											value="web"
											defaultChecked
										/>{" "}
										Web
									</label>
									<label className="flex items-center gap-1">
										<input type="radio" name="preset" value="email" /> Email
									</label>
									<label className="flex items-center gap-1">
										<input type="radio" name="preset" value="print" /> Print
									</label>
									<label className="flex items-center gap-1">
										<input type="radio" name="preset" value="custom" /> Custom
									</label>
								</div>
								<div className="mt-2 grid grid-cols-2 gap-2 text-sm">
									<label className="flex items-center gap-2">
										<span className="w-28">Custom long edge</span>
										<input
											type="number"
											name="custom_long"
											className="border rounded px-2 py-1 w-28"
											placeholder="1600"
										/>
									</label>
									<label className="flex items-center gap-2">
										<span className="w-28">Quality (1–100)</span>
										<input
											type="number"
											name="custom_quality"
											min={1}
											max={100}
											className="border rounded px-2 py-1 w-28"
											placeholder="85"
										/>
									</label>
								</div>
							</fieldset>
							<div>
								<div className="text-sm font-medium mb-1">Privacy</div>
								<label className="flex items-center gap-2 text-sm">
									<input type="checkbox" name="strip_all" /> Strip all EXIF/IPTC
								</label>
								<label className="flex items-center gap-2 text-sm">
									<input type="checkbox" name="strip_gps" /> Strip GPS only
								</label>
								<label className="flex items-center gap-2 text-sm">
									<input type="checkbox" name="keep_copy" /> Keep copyright only
								</label>
							</div>
							<div>
								<div className="text-sm font-medium mb-1">Options</div>
								<label className="flex items-center gap-2 text-sm">
									<input type="checkbox" name="overwrite" /> Overwrite existing
									files
								</label>
							</div>
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								className="px-3 py-1 rounded border"
								onClick={onClose}
								aria-label="Cancel export"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-3 py-1 rounded bg-blue-600 text-white"
								aria-label="Export selected photos"
							>
								Export
							</button>
						</div>
					</form>
				</div>
			</FocusTrap>
		</div>
	);
};
