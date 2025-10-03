import { AnimatePresence, motion } from "framer-motion";
import { Brain, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

interface UserIntent {
	primary: "explore" | "organize" | "find" | "demo" | "unsure";
	confidence: number;
	context?: string;
}

interface ContextualModalOptions {
	id: string;
	type: "settings" | "help" | "search" | "export" | "organize" | "discover";
	title: string;
	content: React.ReactNode;
	size?: "sm" | "md" | "lg" | "xl" | "full";
	preventClose?: boolean;
	showContextualHints?: boolean;
	customActions?: React.ReactNode;
	onOpen?: () => void;
	onClose?: () => void;
	onContextChange?: (context: string) => void;
}

interface ContextualModalState extends ContextualModalOptions {
	isOpen: boolean;
	zIndex: number;
	userIntent?: UserIntent;
	contextualData?: Record<string, any>;
}

interface ContextualModalContextType {
	modals: Map<string, ContextualModalState>;
	openModal: (options: ContextualModalOptions) => void;
	closeModal: (id: string) => void;
	bringToFront: (id: string) => void;
	updateModalContext: (id: string, context: Record<string, any>) => void;
	setUserIntent: (intent: UserIntent) => void;
	getTopModal: () => ContextualModalState | undefined;
}

const ContextualModalContext = createContext<ContextualModalContextType | null>(
	null,
);

// Intent-aware modal configurations
const getIntentModalConfig = (intent: UserIntent, modalType: string) => {
	const baseConfig = {
		preventClose: false,
		showContextualHints: true,
		size: "md" as const,
	};

	switch (intent.primary) {
		case "find":
			return {
				...baseConfig,
				title:
					modalType === "search" ? "Find Photos" : `Search & Find ${modalType}`,
				contextualData: {
					suggestions: ["recent photos", "family", "vacation", "events"],
					quickActions: true,
					searchHistory: true,
				},
			};

		case "organize":
			return {
				...baseConfig,
				title:
					modalType === "organize"
						? "Organize Collection"
						: `Organize ${modalType}`,
				contextualData: {
					suggestions: ["duplicates", "tags", "collections", "cleanup"],
					batchOperations: true,
					statistics: true,
				},
			};

		case "explore":
			return {
				...baseConfig,
				title:
					modalType === "discover" ? "Discover Photos" : `Explore ${modalType}`,
				contextualData: {
					suggestions: ["trending", "themes", "styles", "hidden gems"],
					discoveryMode: true,
					aiSuggestions: true,
				},
			};

		case "demo":
			return {
				...baseConfig,
				title: modalType === "help" ? "Learn & Explore" : `Demo ${modalType}`,
				contextualData: {
					suggestions: ["tutorial", "examples", "features", "tips"],
					showExamples: true,
					guidedTour: true,
				},
			};

		default:
			return baseConfig;
	}
};

export function ContextualModalProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [modals, setModals] = useState<Map<string, ContextualModalState>>(
		new Map(),
	);
	const [userIntent, setUserIntentState] = useState<UserIntent>({
		primary: "unsure",
		confidence: 0,
	});
	const [maxZIndex, setMaxZIndex] = useState(1000);
	const bodyScrollRef = useRef({ overflow: "", paddingRight: "" });

	// Load user intent on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem("userIntent");
			if (stored) {
				const intent = JSON.parse(stored);
				setUserIntentState(intent);
			}
		} catch (error) {
			console.log("Could not load user intent for modal system:", error);
		}
	}, []);

	// Body scroll lock management
	const lockBodyScroll = useCallback(() => {
		if (typeof document === "undefined") return;

		const body = document.body;
		const scrollbarWidth =
			window.innerWidth - document.documentElement.clientWidth;

		bodyScrollRef.current = {
			overflow: body.style.overflow,
			paddingRight: body.style.paddingRight,
		};

		body.style.overflow = "hidden";
		body.style.paddingRight = `${scrollbarWidth}px`;
	}, []);

	const unlockBodyScroll = useCallback(() => {
		if (typeof document === "undefined") return;

		const body = document.body;
		body.style.overflow = bodyScrollRef.current.overflow;
		body.style.paddingRight = bodyScrollRef.current.paddingRight;
	}, []);

	// Modal management functions
	const openModal = useCallback(
		(options: ContextualModalOptions) => {
			const intentConfig = getIntentModalConfig(userIntent, options.type);
			const zIndex = maxZIndex + 1;

			const newModal: ContextualModalState = {
				...options,
				...intentConfig,
				isOpen: true,
				zIndex,
				userIntent,
				contextualData: {
					...intentConfig.contextualData,
					userIntent: userIntent.primary,
					confidence: userIntent.confidence,
				},
			};

			setModals((prev) => new Map(prev).set(options.id, newModal));
			setMaxZIndex(zIndex);

			if (modals.size === 0) {
				lockBodyScroll();
			}

			options.onOpen?.();
		},
		[userIntent, maxZIndex, modals.size, lockBodyScroll],
	);

	const closeModal = useCallback(
		(id: string) => {
			const modal = modals.get(id);
			if (!modal) return;

			modal.onClose?.();

			setModals((prev) => {
				const newMap = new Map(prev);
				newMap.delete(id);
				return newMap;
			});

			if (modals.size === 1) {
				unlockBodyScroll();
			}
		},
		[modals, unlockBodyScroll],
	);

	const bringToFront = useCallback(
		(id: string) => {
			const modal = modals.get(id);
			if (!modal) return;

			const newZIndex = maxZIndex + 1;
			setMaxZIndex(newZIndex);

			setModals((prev) => {
				const newMap = new Map(prev);
				newMap.set(id, { ...modal, zIndex: newZIndex });
				return newMap;
			});
		},
		[modals, maxZIndex],
	);

	const updateModalContext = useCallback(
		(id: string, context: Record<string, any>) => {
			const modal = modals.get(id);
			if (!modal) return;

			setModals((prev) => {
				const newMap = new Map(prev);
				newMap.set(id, {
					...modal,
					contextualData: { ...modal.contextualData, ...context },
				});
				return newMap;
			});
		},
		[modals],
	);

	const getTopModal = useCallback(() => {
		let topModal: ContextualModalState | undefined;
		let highestZ = 0;

		modals.forEach((modal) => {
			if (modal.zIndex > highestZ) {
				highestZ = modal.zIndex;
				topModal = modal;
			}
		});

		return topModal;
	}, [modals]);

	// Global keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				const topModal = getTopModal();
				if (topModal && !topModal.preventClose) {
					closeModal(topModal.id);
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [getTopModal, closeModal]);

	const contextValue: ContextualModalContextType = {
		modals,
		openModal,
		closeModal,
		bringToFront,
		updateModalContext,
		setUserIntent: setUserIntentState,
		getTopModal,
	};

	return (
		<ContextualModalContext.Provider value={contextValue}>
			{children}
			<ContextualModalRenderer />
		</ContextualModalContext.Provider>
	);
}

// Separate renderer component for better performance
function ContextualModalRenderer() {
	const { modals, closeModal, bringToFront } = useContext(
		ContextualModalContext,
	)!;

	const sortedModals = Array.from(modals.values()).sort(
		(a, b) => a.zIndex - b.zIndex,
	);

	return createPortal(
		<div className="modal-container">
			<AnimatePresence>
				{sortedModals.map((modal) => (
					<ContextualModal
						key={modal.id}
						modal={modal}
						onClose={() => closeModal(modal.id)}
						onBringToFront={() => bringToFront(modal.id)}
					/>
				))}
			</AnimatePresence>
		</div>,
		document.body,
	);
}

// Individual modal component
function ContextualModal({
	modal,
	onClose,
	onBringToFront,
}: {
	modal: ContextualModalState;
	onClose: () => void;
	onBringToFront: () => void;
}) {
	const modalRef = useRef<HTMLDivElement>(null);

	// Size configurations
	const sizeClasses = {
		sm: "max-w-md",
		md: "max-w-lg",
		lg: "max-w-2xl",
		xl: "max-w-4xl",
		full: "max-w-[95vw]",
	};

	// Auto-focus management
	useEffect(() => {
		if (modalRef.current) {
			const focusableElements = modalRef.current.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			);
			const firstElement = focusableElements[0] as HTMLElement;
			firstElement?.focus();
		}
	}, [modal.id]);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
			className="fixed inset-0 z-50"
			style={{ zIndex: modal.zIndex }}
		>
			{/* Backdrop */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.15 }}
				className="absolute inset-0 bg-black/60 backdrop-blur-sm"
				onClick={modal.preventClose ? undefined : onClose}
			/>

			{/* Modal Container */}
			<div className="flex items-center justify-center min-h-screen p-4">
				<motion.div
					ref={modalRef}
					initial={{ scale: 0.95, opacity: 0, y: 20 }}
					animate={{ scale: 1, opacity: 1, y: 0 }}
					exit={{ scale: 0.95, opacity: 0, y: 20 }}
					transition={{
						type: "spring",
						duration: 0.3,
						bounce: 0.3,
					}}
					className={`relative w-full ${sizeClasses[modal.size || "md"]} bg-white rounded-2xl shadow-2xl overflow-hidden`}
					onClick={(e) => e.stopPropagation()}
					onMouseDown={onBringToFront}
					role="dialog"
					aria-modal="true"
					aria-labelledby={`modal-title-${modal.id}`}
				>
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b border-gray-100">
						<div className="flex items-center gap-3">
							{modal.showContextualHints &&
								modal.userIntent?.confidence &&
								modal.userIntent.confidence > 0.5 && (
									<div
										className={`w-8 h-8 rounded-lg flex items-center justify-center ${
											modal.userIntent.primary === "find"
												? "bg-purple-100 text-purple-600"
												: modal.userIntent.primary === "organize"
													? "bg-blue-100 text-blue-600"
													: modal.userIntent.primary === "explore"
														? "bg-green-100 text-green-600"
														: "bg-gray-100 text-gray-600"
										}`}
									>
										<Brain className="w-4 h-4" />
									</div>
								)}
							<div>
								<h2
									id={`modal-title-${modal.id}`}
									className="text-xl font-semibold text-gray-900"
								>
									{modal.title}
								</h2>
								{modal.showContextualHints &&
									modal.userIntent?.confidence &&
									modal.userIntent.confidence > 0.5 && (
										<p className="text-sm text-gray-500">
											Personalized for your {modal.userIntent.primary} interests
										</p>
									)}
							</div>
						</div>
						<div className="flex items-center gap-2">
							{modal.customActions}
							<button
								type="button"
								onClick={onClose}
								disabled={modal.preventClose}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<X className="w-5 h-5 text-gray-500" />
							</button>
						</div>
					</div>

					{/* Contextual Hints Bar */}
					{modal.showContextualHints && modal.contextualData?.suggestions && (
						<div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
							<div className="flex items-center gap-2 mb-2">
								<Sparkles className="w-4 h-4 text-blue-600" />
								<span className="text-sm font-medium text-blue-900">
									Quick suggestions
								</span>
							</div>
							<div className="flex flex-wrap gap-2">
								{modal.contextualData.suggestions
									.slice(0, 4)
									.map((suggestion: string, idx: number) => (
										<button
											type="button"
											key={idx}
											className="px-3 py-1 bg-white hover:bg-blue-100 rounded-full text-xs text-blue-700 border border-blue-200 transition-colors"
										>
											{suggestion}
										</button>
									))}
							</div>
						</div>
					)}

					{/* Content */}
					<div className="p-6 overflow-y-auto" style={{ maxHeight: "60vh" }}>
						{modal.content}
					</div>
				</motion.div>
			</div>
		</motion.div>
	);
}

// Hook for using the contextual modal system
export function useContextualModal() {
	const context = useContext(ContextualModalContext);
	if (!context) {
		throw new Error(
			"useContextualModal must be used within ContextualModalProvider",
		);
	}
	return context;
}

// Convenience hooks for common modal types
export function useSettingsModal() {
	const { openModal } = useContextualModal();
	return useCallback(
		(content: React.ReactNode) => {
			openModal({
				id: "settings",
				type: "settings",
				title: "Settings",
				content,
				size: "lg",
			});
		},
		[openModal],
	);
}

export function useHelpModal() {
	const { openModal } = useContextualModal();
	return useCallback(
		(content: React.ReactNode) => {
			openModal({
				id: "help",
				type: "help",
				title: "Help & Guide",
				content,
				size: "xl",
			});
		},
		[openModal],
	);
}
