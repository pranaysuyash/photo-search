import type React from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { FocusTrap } from "../../utils/accessibility";

interface ModalContainerProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	className?: string;
	backdropClassName?: string;
	enableBackdropClose?: boolean;
	enableEscapeKey?: boolean;
	enableFocusTrap?: boolean;
	ariaLabel?: string;
	ariaDescribedBy?: string;
	preventBodyScroll?: boolean;
}

export function ModalContainer({
	isOpen,
	onClose,
	children,
	className,
	backdropClassName,
	enableBackdropClose = true,
	enableEscapeKey = true,
	enableFocusTrap = true,
	ariaLabel,
	ariaDescribedBy,
	preventBodyScroll = true,
}: ModalContainerProps) {
	const modalRef = useRef<HTMLDivElement>(null);
	const previousActiveElement = useRef<HTMLElement | null>(null);

	// Store previous active element and prevent body scroll
	useEffect(() => {
		if (!isOpen) return;

		// Store current active element
		previousActiveElement.current = document.activeElement as HTMLElement;

		// Prevent body scroll
		if (preventBodyScroll) {
			const originalStyle = window.getComputedStyle(document.body);
			const originalOverflow = originalStyle.overflow;
			const originalPaddingRight = originalStyle.paddingRight;

			// Calculate scrollbar width
			const scrollbarWidth =
				window.innerWidth - document.documentElement.clientWidth;

			// Apply scroll lock
			document.body.style.overflow = "hidden";
			document.body.style.paddingRight = `${scrollbarWidth}px`;

			return () => {
				// Restore original styles
				document.body.style.overflow = originalOverflow;
				document.body.style.paddingRight = originalPaddingRight;
			};
		}
	}, [isOpen, preventBodyScroll]);

	// Handle escape key
	useEffect(() => {
		if (!isOpen || !enableEscapeKey) return;

		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.stopPropagation();
				onClose();
			}
		};

		document.addEventListener("keydown", handleEscapeKey, { capture: true });
		return () => {
			document.removeEventListener("keydown", handleEscapeKey, {
				capture: true,
			});
		};
	}, [isOpen, enableEscapeKey, onClose]);

	// Restore focus when modal closes
	useEffect(() => {
		if (!isOpen) {
			// Small delay to allow for transitions
			const timer = setTimeout(() => {
				if (
					previousActiveElement.current &&
					document.contains(previousActiveElement.current)
				) {
					try {
						previousActiveElement.current.focus();
					} catch (error) {
						// Ignore focus errors
						console.debug("Failed to restore focus:", error);
					}
				}
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	// Handle backdrop click
	const handleBackdropClick = (event: React.MouseEvent) => {
		if (enableBackdropClose && event.target === event.currentTarget) {
			onClose();
		}
	};

	if (!isOpen) return null;

	const modalContent = (
		<div className="fixed inset-0 z-50">
			{/* Backdrop with enhanced blur */}
			<div
				className={cn(
					"fixed inset-0 bg-black/30 backdrop-blur-md transition-all duration-300 ease-out",
					"supports-[backdrop-filter]:bg-black/25 supports-[backdrop-filter]:backdrop-blur-xl",
					"before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:to-black/10 before:pointer-events-none",
					backdropClassName,
				)}
				onClick={handleBackdropClick}
				aria-hidden="true"
				role="button"
				tabIndex={0}
			/>

			{/* Modal Content */}
			<div
				ref={modalRef}
				className={cn(
					"fixed inset-0 flex items-center justify-center p-4",
					"transform transition-all duration-300 ease-out",
					"scale-95 opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100",
					"backdrop-brightness-110 backdrop-contrast-105",
					className,
				)}
				data-state={isOpen ? "open" : "closed"}
				role="dialog"
				aria-modal="true"
				aria-label={ariaLabel}
				aria-describedby={ariaDescribedBy}
			>
				{enableFocusTrap ? (
					<FocusTrap onEscape={onClose}>{children}</FocusTrap>
				) : (
					children
				)}
			</div>
		</div>
	);

	// Use portal for proper DOM hierarchy
	return createPortal(modalContent, document.body);
}
