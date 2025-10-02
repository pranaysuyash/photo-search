import type React from "react";
import { createContext, useCallback, useContext, useReducer } from "react";

interface ModalState {
	openModals: Array<{
		id: string;
		type: string;
		props?: Record<string, any>;
		zIndex: number;
	}>;
	modalStack: string[];
}

type ModalAction =
	| {
			type: "OPEN_MODAL";
			payload: { id: string; type: string; props?: Record<string, any> };
	  }
	| { type: "CLOSE_MODAL"; payload: string }
	| { type: "CLOSE_ALL_MODALS" }
	| { type: "BRING_TO_FRONT"; payload: string };

const initialState: ModalState = {
	openModals: [],
	modalStack: [],
};

function modalReducer(state: ModalState, action: ModalAction): ModalState {
	switch (action.type) {
		case "OPEN_MODAL": {
			const { id, type, props } = action.payload;
			const existingIndex = state.openModals.findIndex((m) => m.id === id);

			if (existingIndex >= 0) {
				// Bring existing modal to front
				return {
					...state,
					modalStack: state.modalStack
						.filter((modalId) => modalId !== id)
						.concat(id),
				};
			}

			const zIndex = 1000 + state.openModals.length * 10;
			const newModal = { id, type, props, zIndex };

			return {
				openModals: [...state.openModals, newModal],
				modalStack: [...state.modalStack, id],
			};
		}

		case "CLOSE_MODAL": {
			const modalId = action.payload;
			return {
				openModals: state.openModals.filter((m) => m.id !== modalId),
				modalStack: state.modalStack.filter((id) => id !== modalId),
			};
		}

		case "CLOSE_ALL_MODALS":
			return {
				openModals: [],
				modalStack: [],
			};

		case "BRING_TO_FRONT": {
			const modalId = action.payload;
			return {
				...state,
				modalStack: state.modalStack
					.filter((id) => id !== modalId)
					.concat(modalId),
			};
		}

		default:
			return state;
	}
}

interface ModalContextType {
	state: ModalState;
	openModal: (id: string, type: string, props?: Record<string, any>) => void;
	closeModal: (id: string) => void;
	closeAllModals: () => void;
	isModalOpen: (id: string) => boolean;
	getTopModal: () => string | null;
	bringToFront: (id: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function EnhancedModalProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [state, dispatch] = useReducer(modalReducer, initialState);

	const openModal = useCallback(
		(id: string, type: string, props?: Record<string, any>) => {
			dispatch({ type: "OPEN_MODAL", payload: { id, type, props } });
		},
		[],
	);

	const closeModal = useCallback((id: string) => {
		dispatch({ type: "CLOSE_MODAL", payload: id });
	}, []);

	const closeAllModals = useCallback(() => {
		dispatch({ type: "CLOSE_ALL_MODALS" });
	}, []);

	const isModalOpen = useCallback(
		(id: string) => {
			return state.openModals.some((m) => m.id === id);
		},
		[state.openModals],
	);

	const getTopModal = useCallback(() => {
		return state.modalStack[state.modalStack.length - 1] || null;
	}, [state.modalStack]);

	const bringToFront = useCallback((id: string) => {
		dispatch({ type: "BRING_TO_FRONT", payload: id });
	}, []);

	const value: ModalContextType = {
		state,
		openModal,
		closeModal,
		closeAllModals,
		isModalOpen,
		getTopModal,
		bringToFront,
	};

	return (
		<ModalContext.Provider value={value}>{children}</ModalContext.Provider>
	);
}

export function useEnhancedModal() {
	const context = useContext(ModalContext);
	if (context === undefined) {
		throw new Error(
			"useEnhancedModal must be used within an EnhancedModalProvider",
		);
	}
	return context;
}
