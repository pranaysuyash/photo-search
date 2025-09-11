import { createPortal } from "react-dom";
import type React from "react";

export const ToastPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === "undefined") return <>{children}</>;
  return createPortal(children, document.body);
};

export default ToastPortal;

