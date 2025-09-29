import React, { lazy, Suspense, useEffect, useCallback } from "react";
import { useEnhancedModal } from "../contexts/EnhancedModalContext";
import { ModalContainer } from "./modals/ModalContainer";
import { SuspenseFallback } from "./SuspenseFallback";
import { FOLDER_MODAL_EVENT } from "@/constants/events";

// Lazy-loaded modals for performance
const LazyModals = {
	AdvancedSearchModal: lazy(() => import("./modals/AdvancedSearchModal")),
	EnhancedSharingModal: lazy(() => import("./modals/EnhancedSharingModal")),
	ThemeSettingsModal: lazy(() => import("./ThemeSettingsModal")),
	SearchOverlay: lazy(() => import("./SearchOverlay")),
	DiagnosticsDrawer: lazy(() => import("./DiagnosticsDrawer")),
	JobsDrawer: lazy(() => import("./JobsDrawer")),
	HelpModal: lazy(() => import("./HelpModal")),
	// Add other modals as needed
};

// Regular imports for small, frequently used modals
import {
	CollectionModal,
	ExportModal,
	FolderModal,
	LikePlusModal,
	RemoveCollectionModal,
	SaveModal,
	TagModal,
} from "./modals";

interface ModalComponentMap {
	[key: string]: React.ComponentType<any>;
}

const modalComponents: ModalComponentMap = {
	collection: CollectionModal,
	export: ExportModal,
	folder: FolderModal,
	likeplus: LikePlusModal,
	removeCollection: RemoveCollectionModal,
	save: SaveModal,
	tag: TagModal,
	advanced: LazyModals.AdvancedSearchModal,
	enhancedShare: LazyModals.EnhancedSharingModal,
	theme: LazyModals.ThemeSettingsModal,
	search: LazyModals.SearchOverlay,
	diagnostics: LazyModals.DiagnosticsDrawer,
	jobs: LazyModals.JobsDrawer,
	help: LazyModals.HelpModal,
};

export function EnhancedModalManager() {
	const { state, closeModal } = useEnhancedModal();

	// Handle external folder modal event
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleExternalOpen = () => {
			// This will be handled by the external modal system
			// For now, we'll just log it
			console.log("External folder modal event received");
		};

		window.addEventListener(FOLDER_MODAL_EVENT, handleExternalOpen);
		return () => {
			window.removeEventListener(FOLDER_MODAL_EVENT, handleExternalOpen);
		};
	}, []);

	const handleClose = useCallback((modalId: string) => {
		closeModal(modalId);
	}, [closeModal]);

	// Sort modals by zIndex for proper stacking
	const sortedModals = [...state.openModals].sort((a, b) => a.zIndex - b.zIndex);

	return (
		<>
			{sortedModals.map((modal) => {
				const ModalComponent = modalComponents[modal.type];
				if (!ModalComponent) {
					console.warn(`No modal component found for type: ${modal.type}`);
					return null;
				}

				// Special handling for drawer-style modals
				const isDrawer = ["diagnostics", "jobs"].includes(modal.type);
				const isOverlay = modal.type === "search";

				if (isDrawer) {
					return (
						<Suspense key={modal.id} fallback={<SuspenseFallback label="Loading..." />}>
							<ModalComponent
								open={true}
								onClose={() => handleClose(modal.id)}
								{...modal.props}
							/>
						</Suspense>
					);
				}

				if (isOverlay) {
					return (
						<Suspense key={modal.id} fallback={<SuspenseFallback label="Opening search..." />}>
							<ModalComponent
								open={true}
								onClose={() => handleClose(modal.id)}
								{...modal.props}
							/>
						</Suspense>
					);
				}

				// Regular modals get the stable container
				return (
					<ModalContainer
						key={modal.id}
						isOpen={true}
						onClose={() => handleClose(modal.id)}
						className="z-[1000]"
						backdropClassName="z-[999]"
					>
						<Suspense fallback={<SuspenseFallback label="Loading..." />}>
							<ModalComponent
								open={true}
								onClose={() => handleClose(modal.id)}
								{...modal.props}
							/>
						</Suspense>
					</ModalContainer>
				);
			})}
		</>
	);
}

// Hook for easy modal management
export function useModalManager() {
	const { openModal, closeModal, isModalOpen, getTopModal } = useEnhancedModal();

	const showModal = useCallback((type: string, props?: Record<string, any>) => {
		const id = `${type}-${Date.now()}`;
		openModal(id, type, props);
		return id;
	}, [openModal]);

	const hideModal = useCallback((typeOrId: string) => {
		closeModal(typeOrId);
	}, [closeModal]);

	const isAnyModalOpen = useCallback(() => {
		return getTopModal() !== null;
	}, [getTopModal]);

	return {
		showModal,
		hideModal,
		isModalOpen,
		isAnyModalOpen,
		getTopModal,
	};
}