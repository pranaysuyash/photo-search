import { useCallback, useMemo } from "react";
import {
	type ModalKey,
	type ModalState,
	useModalContext,
} from "../contexts/ModalContext";

export interface ModalStatus {
	state: ModalState;
	anyOpen: boolean;
	isOpen: (key: ModalKey) => boolean;
}

export function useModalStatus(): ModalStatus {
	const { state } = useModalContext();

	const anyOpen = useMemo(() => Object.values(state).some(Boolean), [state]);
	const isOpen = useCallback((key: ModalKey) => Boolean(state[key]), [state]);

	return useMemo(
		() => ({
			state,
			anyOpen,
			isOpen,
		}),
		[state, anyOpen, isOpen],
	);
}

export default useModalStatus;
