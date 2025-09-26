import { createContext } from "react";
import type { ModalControls } from "../hooks/useModalControls";

export const ModalControlsContext = createContext<ModalControls | null>(null);
