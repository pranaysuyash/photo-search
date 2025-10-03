import type React from "react";
import { lazy, Suspense, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FOLDER_MODAL_EVENT } from "@/constants/events";
import { useToast } from "@/hooks/use-toast";
import { useModalContext } from "../contexts/ModalContext";
import {
	useModalDataActions,
	useModalDataContext,
} from "../contexts/ModalDataContext";
import { useModalStatus } from "../hooks/useModalStatus";
import { ShareManager } from "../modules/ShareManager";
// Services
import { ModalActionsService } from "../services/ModalActionsService";
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
import { SuspenseFallback } from "./SuspenseFallback";

const _DiagnosticsDrawer = lazy(() => import("./DiagnosticsDrawer"));
const JobsDrawer = lazy(() => import("./EnhancedJobsDrawer"));
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
const HelpModal = lazy(() =>
	import("./HelpModal").then((m) => ({ default: m.HelpModal })),
);

export const ModalManager: React.FC = () => {
	// Get data and actions from context
	const data = useModalDataContext();
	const actions = useModalDataActions();
	const modalStatus = useModalStatus();
	const { actions: modal } = useModalContext();
	// eslint-disable-next-line react-hooks/exhaustive-deps -- modalKeys static; modalStatus reference sufficient
	// Stack + focus management effect: modalKeys is a literal static array; modalStatus.isOpen changes trigger re-render -> currentOpen recomputed.
	// eslint-disable-next-line react-hooks/exhaustive-deps
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

	// Accessibility: track if any modal is open to apply aria-hidden/inert to background
	const modalKeys = [
		"jobs",
		"diagnostics",
		"shareManage",
		"advanced",
		"help",
		"theme",
		"search",
		"export",
		"enhanced-share",
		"share",
		"tag",
		"folder",
		"likeplus",
		"save",
		"collect",
		"removeCollect",
	] as const;
	const anyOpen = modalKeys.some((k) => modalStatus.isOpen(k));

	// Track open order for Escape stack + focus restoration
	const openStackRef = useRef<string[]>([]);
	const prevFocusRef = useRef<HTMLElement | null>(null);
	type ModalKey = (typeof modalKeys)[number];
	// Maintain stack + focus capture/restore; guard using serialized state to avoid unnecessary work
	const lastSigRef = useRef<string>("");
	useEffect(() => {
		const currentOpen: ModalKey[] = modalKeys.filter((k) =>
			modalStatus.isOpen(k),
		) as ModalKey[];
		const sig = currentOpen.join("|");
		if (sig === lastSigRef.current) return; // no change
		const prevStack = openStackRef.current.slice();
		if (prevStack.length === 0 && currentOpen.length > 0) {
			const active = document.activeElement as HTMLElement | null;
			if (active && active !== document.body) prevFocusRef.current = active;
		}
		currentOpen.forEach((k) => {
			if (!openStackRef.current.includes(k)) openStackRef.current.push(k);
		});
		openStackRef.current = openStackRef.current.filter((k) =>
			currentOpen.includes(k as ModalKey),
		);
		if (prevStack.length > 0 && currentOpen.length === 0) {
			const el = prevFocusRef.current;
			if (el && document.contains(el)) {
				try {
					el.focus();
				} catch {
					/* ignore */
				}
			}
			prevFocusRef.current = null;
		}
		lastSigRef.current = sig;
	}, [modalStatus, modalKeys]);

	// Global Escape handling (top of stack closes)
	useEffect(() => {
		if (!anyOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				const stack = openStackRef.current;
				const top = stack[stack.length - 1];
				if (top) {
					e.stopPropagation();
					// Close only the topmost modal
					// @ts-ignore modal typing generic
					modal.close(top);
				}
			}
		};
		document.addEventListener("keydown", onKey, { capture: true });
		return () =>
			document.removeEventListener("keydown", onKey, { capture: true });
	}, [anyOpen, modal]);

	const rootRef = useRef<HTMLDivElement | null>(null);
	const liveRef = useRef<HTMLDivElement | null>(null);

	// Adapter that normalizes setBusy signature (string expected by some modals vs boolean internal)
	interface UIActionsAdapter {
		setNote: (m: string) => void;
		setBusy: (m: string) => void;
	}
	const uiActionsAdapter: UIActionsAdapter = {
		setNote: actions.uiActions.setNote,
		setBusy: (message: string) => actions.uiActions.setBusy(Boolean(message)),
	};

	useEffect(() => {
		// Apply inert / aria-hidden to siblings of our root when any modal is open
		const rootEl = rootRef.current; // element with data-modal-root
		if (!rootEl) return;
		const siblings = Array.from(rootEl.parentElement?.children || []).filter(
			(n) => n !== rootEl,
		) as HTMLElement[];
		siblings.forEach((el) => {
			if (anyOpen) {
				el.setAttribute("aria-hidden", "true");
				// @ts-ignore: inert not yet in TS lib for all targets
				el.inert = true;
			} else {
				el.removeAttribute("aria-hidden");
				// @ts-ignore
				el.inert = false;
			}
		});
		if (liveRef.current && anyOpen) {
			const openNames = modalKeys.filter((k) => modalStatus.isOpen(k));
			liveRef.current.textContent = `Modal open: ${openNames.join(
				", ",
			)}. Press Escape to close.`;
		} else if (liveRef.current && !anyOpen) {
			liveRef.current.textContent = "All modals closed.";
		}
		// modalStatus reference covers isOpen changes; modalKeys static
	}, [anyOpen, modalStatus, modalKeys.filter]);

	return (
		<div ref={rootRef} data-modal-root>
			{/* Live region for modal stack announcements */}
			<div
				ref={liveRef}
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			/>
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
				<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
					<button
						type="button"
						aria-label="Close"
						className="absolute inset-0 w-full h-full"
						onClick={() => modal.close("shareManage")}
						onKeyDown={(e) => {
							if (e.key === "Escape") modal.close("shareManage");
						}}
					/>
					<FocusTrap onEscape={() => modal.close("shareManage")}>
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
									onClick={() => modal.close("shareManage")}
								>
									Close
								</button>
							</div>
							<ShareManager dir={data.dir ?? ""} />
						</div>
					</FocusTrap>
				</div>
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
			{modalStatus.isOpen("help") && (
				<Suspense fallback={<SuspenseFallback label="Loading help…" />}>
					<HelpModal
						isOpen={true}
						onClose={() => modal.close("help")}
						initialSection="getting-started"
					/>
				</Suspense>
			)}
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
					// @ts-ignore bridging differing uiActions expectations
					uiActions={uiActionsAdapter}
				/>
			)}
			{modalStatus.isOpen("enhanced-share") && (
				<Suspense fallback={<SuspenseFallback label="Loading sharing…" />}>
					<EnhancedSharingModal
						selected={data.selected}
						dir={data.dir}
						onClose={() => modal.close("enhanced-share")}
						// @ts-ignore adapter
						uiActions={uiActionsAdapter}
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
					// @ts-ignore adapter
					uiActions={uiActionsAdapter}
				/>
			)}
			{modalStatus.isOpen("save") && (
				<SaveModal
					isOpen={modalStatus.isOpen("save")}
					dir={data.dir}
					searchText={data.searchText}
					query={data.query}
					topK={data.topK}
					onClose={() => modal.close("save")}
					setSelectedView={navigateToView}
					photoActions={{ setSaved: actions.photoActions.setSaved }}
					// @ts-ignore adapter
					uiActions={uiActionsAdapter}
				/>
			)}
			{modalStatus.isOpen("collect") && (
				<CollectionModal
					isOpen={modalStatus.isOpen("collect")}
					selected={data.selected}
					dir={data.dir}
					collections={data.collections}
					onClose={() => modal.close("collect")}
					photoActions={{ setCollections: actions.photoActions.setCollections }}
					// @ts-ignore adapter
					uiActions={uiActionsAdapter}
				/>
			)}
			{modalStatus.isOpen("removeCollect") && (
				<RemoveCollectionModal
					selected={data.selected}
					dir={data.dir}
					collections={data.collections}
					onClose={() => modal.close("removeCollect")}
					photoActions={{ setCollections: actions.photoActions.setCollections }}
					// @ts-ignore adapter
					uiActions={uiActionsAdapter}
				/>
			)}
		</div>
	);
};

export default ModalManager;
