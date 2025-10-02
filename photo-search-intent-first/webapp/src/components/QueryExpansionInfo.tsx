import { motion } from "framer-motion";
import { AlertCircle, Sparkles } from "lucide-react";
import type React from "react";

interface QueryExpansionInfoProps {
	originalQuery: string;
	expandedQuery: string;
	isVisible: boolean;
}

export function QueryExpansionInfo({
	originalQuery,
	expandedQuery,
	isVisible,
}: QueryExpansionInfoProps) {
	if (!isVisible || !expandedQuery || expandedQuery === originalQuery) {
		return null;
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: -10, scale: 0.95 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: -10, scale: 0.95 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
			className="flex items-center gap-2 px-3 py-2 mx-4 mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
		>
			<Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
			<div className="flex-1 min-w-0">
				<p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
					Query expanded for better results
				</p>
				<p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
					"{originalQuery}" → "{expandedQuery}"
				</p>
			</div>
		</motion.div>
	);
}

// Alternative minimal version for small spaces
interface QueryExpansionBadgeProps {
	expanded: boolean;
	onClick?: () => void;
}

export function QueryExpansionBadge({
	expanded,
	onClick,
}: QueryExpansionBadgeProps) {
	if (!expanded) return null;

	return (
		<motion.button
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			whileHover={{ scale: 1.05 }}
			whileTap={{ scale: 0.95 }}
			onClick={onClick}
			className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-200 dark:border-blue-700"
			title="Query was expanded with synonyms"
		>
			<Sparkles className="w-3 h-3" />
			<span>Expanded</span>
		</motion.button>
	);
}

// Tooltip component for explaining query expansion
interface QueryExpansionTooltipProps {
	children: React.ReactNode;
	originalQuery: string;
	expandedQuery: string;
}

export function QueryExpansionTooltip({
	children,
	originalQuery,
	expandedQuery,
}: QueryExpansionTooltipProps) {
	if (!expandedQuery || expandedQuery === originalQuery) {
		return <>{children}</>;
	}

	return (
		<div className="group relative inline-block">
			{children}
			<motion.div
				initial={{ opacity: 0, y: 5 }}
				whileHover={{ opacity: 1, y: 0 }}
				className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap z-50 pointer-events-none opacity-0 transition-opacity duration-200"
			>
				<div className="font-medium mb-1">Query Expanded</div>
				<div>
					"{originalQuery}" → "{expandedQuery}"
				</div>
				<div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
					<div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
				</div>
			</motion.div>
		</div>
	);
}

export default QueryExpansionInfo;
