import type React from "react";
import { lazy, Suspense, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FOLDER_MODAL_EVENT } from "@/constants/events";
import { useToast } from "@/hooks/use-toast";
import { useModalContext } from "../contexts/ModalContext";
import {
	useModalDataActions,
	useModalDataContext,
} from "../contexts/ModalDataContext";
import { useModalStatus } from "../hooks/useModalStatus";
import { FocusTrap } from "../utils/accessibility";
import { viewToPath } from "../utils/router";
// Modals
import {
	CollectionModal,
	ExportModal,
	FolderModal,
	LikePlusModal,
	RemoveCollectionModal,
	SaveModal,
	TagModal,
} from "./modals";
import { ShareManageOverlay } from "./ShareManageOverlay";
import { SuspenseFallback } from "./SuspenseFallback";

const _DiagnosticsDrawer = lazy(() => import("./DiagnosticsDrawer"));
const JobsDrawer = lazy(() => import("./JobsDrawer"));
const AdvancedSearchModal = lazy(() => import("./modals/AdvancedSearchModal"));
const EnhancedSharingModal = lazy(() =>
	import("./modals/EnhancedSharingModal").then((m) => ({
		default: m.EnhancedSharingModal,
	})),
);
const ThemeSettingsModal = lazy(() =>
	import("./ThemeSettingsModal").then((m) => ({
		default: m.ThemeSettingsModal,
	})),
);
const SearchOverlay = lazy(() => import("./SearchOverlay"));

import { ModalActionsService } from "../services/ModalActionsService";
import { HelpModal } from "./HelpModal";

export const ModalManager: React.FC = () => {
	// Get data and actions from context
	const data = useModalDataContext();
	const actions = useModalDataActions();
	const { actions: modal } = useModalContext();
	const modalStatus = useModalStatus();
	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleExternalOpen = () => modal.open("folder");
		window.addEventListener(FOLDER_MODAL_EVENT, handleExternalOpen);
		return () => {
			window.removeEventListener(FOLDER_MODAL_EVENT, handleExternalOpen);
		};
	}, [modal]);
	const navigate = useNavigate();
	const navigateToView = useCallback(
		(view: string) => navigate(viewToPath(view)),
		[navigate],
	);
	const { toast } = useToast();

	// Basic v1 share modal submit handler
	async function createBasicShare(e: React.FormEvent) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const expiryStr =
			(form.elements.namedItem("expiry") as HTMLInputElement)?.value || "24";
		const expiry = parseInt(expiryStr, 10);
		const pw = (
			form.elements.namedItem("pw") as HTMLInputElement
		)?.value?.trim();
		const viewOnly =
			(form.elements.namedItem("viewonly") as HTMLInputElement)?.checked ??
			true;

		try {
			await ModalActionsService.createShare(
				data,
				{
					expiryHours: Number.isNaN(expiry) ? 24 : expiry,
					password: pw || undefined,
					viewOnly,
				},
				actions.uiActions.setNote,
			);
			modal.close("share");
		} catch (err) {
			// Error is already handled by the service, no need to show it again
			console.error("Share creation failed:", err);
		}
	}

	return (
		<>
			{/* Jobs & Diagnostics drawers */}
			{modalStatus.isOpen("jobs") && (
				<Suspense fallback={<SuspenseFallback label="Loading jobs…" />}>
					<JobsDrawer open={true} onClose={() => modal.close("jobs")} />
				</Suspense>
			)}
			{modalStatus.isOpen("diagnostics") && (
				<Suspense fallback={<SuspenseFallback label="Loading diagnostics…" />}>
					<_DiagnosticsDrawer
						open={modalStatus.isOpen("diagnostics")}
						onClose={() => modal.close("diagnostics")}
					/>
				</Suspense>
			)}
			{modalStatus.isOpen("shareManage") && (
				<ShareManageOverlay
					isOpen={modalStatus.isOpen("shareManage")}
					onClose={() => modal.close("shareManage")}
					dir={data.dir}
				/>
			)}

			{/* Advanced Search */}
			{modalStatus.isOpen("advanced") && (
				<Suspense
					fallback={<SuspenseFallback label="Loading advanced search…" />}
				>
					<AdvancedSearchModal
						open={true}
						onClose={() => modal.close("advanced")}
						onApply={(q) => {
							window.dispatchEvent(
								new CustomEvent("advanced-search-apply", { detail: { q } }),
							);
							modal.close("advanced");
						}}
						onSave={async (name, q) => {
							try {
								await ModalActionsService.saveSearchPreset(
									data,
									name,
									q,
									actions.uiActions.setNote,
								);
								toast({ description: `Saved preset ${name}` });
							} catch (e) {
								// Error is already handled by the service
								console.error("Preset save failed:", e);
							}
						}}
						allTags={data.allTags || []}
						cameras={data.meta?.cameras || []}
						people={(data.clusters || [])
							.filter((c) => c.name)
							.map((c) => String(c.name))}
					/>
				</Suspense>
			)}

			{/* Help / Theme */}
			<HelpModal
				isOpen={modalStatus.isOpen("help")}
				onClose={() => modal.close("help")}
				initialSection="getting-started"
			/>
			{modalStatus.isOpen("theme") && (
				<Suspense
					fallback={<SuspenseFallback label="Loading theme settings…" />}
				>
					<ThemeSettingsModal
						isOpen={true}
						onClose={() => modal.close("theme")}
					/>
				</Suspense>
			)}

			{/* Search Command Center overlay */}
			{modalStatus.isOpen("search") && (
				<Suspense fallback={<SuspenseFallback label="Opening search…" />}>
					<SearchOverlay
						open={modalStatus.isOpen("search")}
						onClose={() => modal.close("search")}
						clusters={data.clusters}
						allTags={data.allTags}
						meta={data.meta || undefined}
					/>
				</Suspense>
			)}

			{/* Export / Enhanced Share */}
			{modalStatus.isOpen("export") && (
				<ExportModal
					selected={data.selected}
					dir={data.dir}
					onClose={() => modal.close("export")}
					uiActions={actions.uiActions}
				/>
			)}
			{modalStatus.isOpen("enhanced-share") && (
				<Suspense fallback={<SuspenseFallback label="Loading sharing…" />}>
					<EnhancedSharingModal
						selected={data.selected}
						dir={data.dir}
						onClose={() => modal.close("enhanced-share")}
						uiActions={actions.uiActions}
					/>
				</Suspense>
			)}

			{/* Basic Share (v1) */}
			{modalStatus.isOpen("share") && (
				<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
					<button
						type="button"
						aria-label="Close share"
						className="absolute inset-0 w-full h-full"
						onClick={() => modal.close("share")}
						onKeyDown={(e) => {
							if (e.key === "Escape") modal.close("share");
						}}
					/>
					<FocusTrap onEscape={() => modal.close("share")}>
						<div
							className="bg-white rounded-lg p-4 w-full max-w-md"
							role="dialog"
							aria-modal="true"
						>
							<div className="font-semibold mb-2">Share (v1)</div>
							<form onSubmit={createBasicShare}>
								<div className="grid gap-3">
									<div>
										<label
											className="block text-sm text-gray-600 mb-1"
											htmlFor="expiry-input"
										>
											Expiry (hours)
										</label>
										<input
											id="expiry-input"
											name="expiry"
											type="number"
											min={1}
											defaultValue={24}
											className="w-full border rounded px-2 py-1"
										/>
									</div>
									<div>
										<label
											className="block text-sm text-gray-600 mb-1"
											htmlFor="pw-input"
										>
											Password (optional)
										</label>
										<input
											id="pw-input"
											name="pw"
											type="password"
											className="w-full border rounded px-2 py-1"
											placeholder="••••••"
										/>
									</div>
									<label className="flex items-center gap-2 text-sm">
										<input type="checkbox" name="viewonly" defaultChecked />{" "}
										View-only (disable downloads)
									</label>
								</div>
								<div className="mt-4 flex justify-end gap-2">
									<button
										type="button"
										className="px-3 py-1 rounded border"
										onClick={() => modal.close("share")}
										aria-label="Cancel sharing"
									>
										Cancel
									</button>
									<button
										type="submit"
										className="px-3 py-1 rounded bg-blue-600 text-white"
										aria-label="Create shareable link"
									>
										Create Link
									</button>
								</div>
							</form>
						</div>
					</FocusTrap>
				</div>
			)}

			{/* Tag & Folder */}
			{modalStatus.isOpen("tag") && (
				<TagModal
					onClose={() => modal.close("tag")}
					onTagSelected={(tag) =>
						ModalActionsService.handleTagSelection(tag, navigateToView, () =>
							modal.close("tag"),
						)
					}
				/>
			)}
			{modalStatus.isOpen("folder") && (
				<FolderModal
					dir={data.dir}
					useOsTrash={data.useOsTrash}
					useFast={data.useFast}
					fastKind={data.fastKind}
					useCaps={data.useCaps}
					useOcr={data.useOcr}
					hasText={data.hasText}
					highContrast={data.highContrast}
					onClose={() => modal.close("folder")}
					settingsActions={actions.settingsActions}
					uiActions={actions.uiActions}
					doIndex={() => actions.libIndex()}
					prepareFast={(k: string) =>
						actions.prepareFast(k as "annoy" | "faiss" | "hnsw")
					}
					buildOCR={actions.buildOCR}
					buildMetadata={actions.buildMetadata}
				/>
			)}

			{/* Like+, Save, Collections */}
			{modalStatus.isOpen("likeplus") && (
				<LikePlusModal
					selected={data.selected}
					dir={data.dir}
					engine={data.engine}
					topK={data.topK}
					onClose={() => modal.close("likeplus")}
					setSelectedView={navigateToView}
					photoActions={{ setResults: actions.photoActions.setResults }}
					uiActions={actions.uiActions}
				/>
			)}
			{modalStatus.isOpen("save") && (
				<SaveModal
					dir={data.dir}
					searchText={data.searchText}
					query={data.query}
					topK={data.topK}
					onClose={() => modal.close("save")}
					setSelectedView={navigateToView}
					photoActions={{ setSaved: actions.photoActions.setSaved }}
					uiActions={actions.uiActions}
				/>
			)}
			{modalStatus.isOpen("collect") && (
				<CollectionModal
					selected={data.selected}
					dir={data.dir}
					collections={data.collections}
					onClose={() => modal.close("collect")}
					photoActions={{ setCollections: actions.photoActions.setCollections }}
					uiActions={actions.uiActions}
				/>
			)}
			{modalStatus.isOpen("removeCollect") && (
				<RemoveCollectionModal
					selected={data.selected}
					dir={data.dir}
					collections={data.collections}
					onClose={() => modal.close("removeCollect")}
					photoActions={{ setCollections: actions.photoActions.setCollections }}
					uiActions={actions.uiActions}
				/>
			)}
		</>
	);
};

export default ModalManager;
