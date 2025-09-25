import type React from "react";

export const Chip: React.FC<
	React.PropsWithChildren<{
		className?: string;
		title?: string;
		onClick?: () => void;
		"aria-label"?: string;
		active?: boolean;
	}>
> = ({ children, className, title, onClick, active, ...rest }) => (
	<button
		type="button"
		className={`chip ${active ? "active" : ""} ${className ?? ""}`.trim()}
		title={title}
		onClick={onClick}
		{...rest}
	>
		{children}
	</button>
);
