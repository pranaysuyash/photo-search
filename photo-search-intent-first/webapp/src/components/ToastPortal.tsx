import type React from "react";
import { createPortal } from "react-dom";

export const ToastPortal: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	if (typeof document === "undefined") return <>{children}</>;
	return createPortal(children, document.body);
};

export default ToastPortal;
