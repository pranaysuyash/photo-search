import { AnimatePresence, motion } from "framer-motion";
import type React from "react";

export interface HeaderQuickActionsProps {
	prefersReducedMotion: boolean;
	onOpenAccessibility: () => void;
	onOpenOnboarding: () => void;
	showHelpHint: boolean;
	onDismissHelpHint: () => void;
}

export const HeaderQuickActions: React.FC<HeaderQuickActionsProps> = ({
	prefersReducedMotion,
	onOpenAccessibility,
	onOpenOnboarding,
	showHelpHint,
	onDismissHelpHint,
}) => {
	const animationProps = prefersReducedMotion
		? {}
		: {
				whileHover: { scale: 1.05 },
				whileTap: { scale: 0.95 },
			};

	return (
		<div className="flex items-center gap-2">
			<motion.button
				type="button"
				{...animationProps}
				onClick={onOpenAccessibility}
				className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
				aria-label="Accessibility settings"
			>
				<span className="text-sm">♿</span>
			</motion.button>

			<div className="relative">
				<motion.button
					type="button"
					{...animationProps}
					onClick={onOpenOnboarding}
					className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
					aria-label="Help and onboarding"
				>
					<span className="text-sm">?</span>
				</motion.button>
				<AnimatePresence>
					{showHelpHint && (
						<motion.div
							className="absolute right-0 z-20 mt-3 w-64 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-xl dark:border-gray-700 dark:bg-gray-900"
							initial={
								prefersReducedMotion
									? undefined
									: { opacity: 0, y: 8, scale: 0.96 }
							}
							animate={
								prefersReducedMotion
									? undefined
									: { opacity: 1, y: 0, scale: 1 }
							}
							exit={
								prefersReducedMotion
									? undefined
									: { opacity: 0, y: 6, scale: 0.96 }
							}
							transition={
								prefersReducedMotion
									? undefined
									: { duration: 0.18, ease: "easeOut" }
							}
						>
							<div
								className="absolute -top-2 right-9 h-3 w-3 rotate-45 border border-gray-200 border-b-0 border-r-0 bg-white dark:border-gray-700 dark:bg-gray-900"
								aria-hidden="true"
							/>
							<div className="relative flex items-start gap-3">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
									?
								</div>
								<div className="flex-1 text-xs text-gray-600 dark:text-gray-300">
									<p className="leading-5">
										Press <span className="font-mono text-sm">?</span> for help
										and shortcuts
									</p>
									<button
										type="button"
										onClick={onOpenOnboarding}
										className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
									>
										Open help panel
									</button>
								</div>
								<button
									type="button"
									className="ml-2 text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
									onClick={onDismissHelpHint}
								>
									<span className="sr-only">Dismiss help hint</span>
									<span aria-hidden="true">×</span>
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

export default HeaderQuickActions;
