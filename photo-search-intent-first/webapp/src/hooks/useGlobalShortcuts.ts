import { useEffect } from "react";

interface UseGlobalShortcutsParams {
	// Modal state and actions
	anyModalOpen: boolean;
	openModal: (k: string) => void;
	toggleModal: (k: string) => void;

	// Search overlay flag
	searchCommandCenter: boolean;

	// Info overlay
	showInfoOverlay: boolean;
	setShowInfoOverlay?: (v: boolean) => void;

	// View context
	selectedView: string;
	resultView?: string;
}

export function useGlobalShortcuts({
	anyModalOpen,
	openModal,
	toggleModal,
	searchCommandCenter,
	showInfoOverlay,
	setShowInfoOverlay,
	selectedView,
	resultView,
}: UseGlobalShortcutsParams) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			// Skip when typing in inputs or contenteditable
			const ae = document.activeElement as HTMLElement | null;
			if (
				ae &&
				(ae.tagName === "INPUT" ||
					ae.tagName === "TEXTAREA" ||
					ae.isContentEditable)
			) {
				return;
			}

			// Pause when any modal is open
			if (anyModalOpen) return;

			// Open Search Overlay (/)
			if (searchCommandCenter && e.key === "/") {
				e.preventDefault();
				openModal("search");
				return;
			}

			// Toggle info overlay (I)
			if (e.key.toLowerCase() === "i") {
				e.preventDefault();
				if (setShowInfoOverlay) setShowInfoOverlay(!showInfoOverlay);
				return;
			}

			// Open Advanced (A)
			if (e.key.toLowerCase() === "a") {
				e.preventDefault();
				openModal("advanced");
				return;
			}

			// Help (?)
			if (e.key === "?") {
				e.preventDefault();
				toggleModal("help");
				return;
			}

			// Timeline jumps only when viewing results timeline
			if (selectedView === "results" && resultView === "timeline") {
				const dispatch = (kind: string) =>
					window.dispatchEvent(
						new CustomEvent("timeline-jump", { detail: { kind } }),
					);
				if (e.key.toLowerCase() === "t") {
					e.preventDefault();
					dispatch("today");
					return;
				}
				if (e.key.toLowerCase() === "m") {
					e.preventDefault();
					dispatch("this-month");
					return;
				}
				if (e.key.toLowerCase() === "l") {
					e.preventDefault();
					dispatch("last-month");
					return;
				}
				if (e.key.toLowerCase() === "o") {
					e.preventDefault();
					dispatch("oldest");
					return;
				}
			}
		};

		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [
		anyModalOpen,
		openModal,
		toggleModal,
		searchCommandCenter,
		showInfoOverlay,
		setShowInfoOverlay,
		selectedView,
		resultView,
	]);
}

export default useGlobalShortcuts;
