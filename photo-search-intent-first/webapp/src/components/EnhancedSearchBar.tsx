import {
	autoUpdate,
	flip,
	offset,
	shift,
	useFloating,
} from "@floating-ui/react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
	Clock,
	Command,
	Heart,
	Loader2,
	MapPin,
	Search,
	SlidersHorizontal,
	Sparkles,
	Tag,
	TrendingUp,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SearchSuggestion {
	type: "recent" | "trending" | "ai" | "location" | "person" | "tag";
	text: string;
	icon?: React.ElementType;
	metadata?: string;
}

interface EnhancedSearchBarProps {
	value: string;
	onChange: (value: string) => void;
	onSearch: (query: string) => void;
	onFilterClick?: () => void;
	showFilters?: boolean;
	isSearching?: boolean;
	suggestions?: SearchSuggestion[];
	placeholder?: string;
	className?: string;
}

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
	value,
	onChange,
	onSearch,
	onFilterClick,
	showFilters = false,
	isSearching = false,
	suggestions = [],
	placeholder = "Search by content, people, places, or ask AI anything...",
	className,
}) => {
	const [isFocused, setIsFocused] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
	const inputRef = useRef<HTMLInputElement>(null);
	const _suggestionsRef = useRef<HTMLDivElement>(null);

	// Default suggestions if none provided
	const defaultSuggestions: SearchSuggestion[] = [
		{
			type: "ai",
			text: "Find photos with mountains and sunset",
			icon: Sparkles,
		},
		{ type: "recent", text: "Summer vacation 2024", icon: Clock },
		{ type: "trending", text: "Best portraits", icon: TrendingUp },
		{ type: "location", text: "Paris, France", icon: MapPin },
		{ type: "person", text: "Family photos", icon: User },
		{ type: "tag", text: "#nature", icon: Tag },
	];

	const displaySuggestions =
		suggestions.length > 0 ? suggestions : defaultSuggestions;

	// Floating UI for suggestions dropdown
	const { refs, floatingStyles } = useFloating({
		placement: "bottom-start",
		open: showSuggestions,
		onOpenChange: setShowSuggestions,
		middleware: [offset(8), flip(), shift({ padding: 8 })],
		whileElementsMounted: autoUpdate,
	});

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (!showSuggestions) return;

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setSelectedSuggestionIndex((prev) =>
						prev < displaySuggestions.length - 1 ? prev + 1 : 0,
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					setSelectedSuggestionIndex((prev) =>
						prev > 0 ? prev - 1 : displaySuggestions.length - 1,
					);
					break;
				case "Enter":
					e.preventDefault();
					if (selectedSuggestionIndex >= 0) {
						const suggestion = displaySuggestions[selectedSuggestionIndex];
						onChange(suggestion.text);
						onSearch(suggestion.text);
						setShowSuggestions(false);
					} else {
						onSearch(value);
					}
					break;
				case "Escape":
					setShowSuggestions(false);
					inputRef.current?.blur();
					break;
			}
		},
		[
			showSuggestions,
			displaySuggestions,
			selectedSuggestionIndex,
			onChange,
			onSearch,
			value,
		],
	);

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	// Show suggestions when focused and has value
	useEffect(() => {
		if (isFocused && value.length > 0) {
			setShowSuggestions(true);
		} else if (!isFocused) {
			// Delay hiding to allow clicking on suggestions
			const timeout = setTimeout(() => setShowSuggestions(false), 200);
			return () => clearTimeout(timeout);
		}
	}, [isFocused, value]);

	const handleSuggestionClick = (suggestion: SearchSuggestion) => {
		onChange(suggestion.text);
		onSearch(suggestion.text);
		setShowSuggestions(false);
		inputRef.current?.blur();
	};

	const getSuggestionIcon = (suggestion: SearchSuggestion) => {
		const Icon = suggestion.icon || Tag;
		const iconColors = {
			ai: "text-purple-500",
			recent: "text-gray-500",
			trending: "text-orange-500",
			location: "text-blue-500",
			person: "text-green-500",
			tag: "text-pink-500",
		};

		return <Icon className={clsx("w-4 h-4", iconColors[suggestion.type])} />;
	};

	return (
		<div className={clsx("relative w-full max-w-3xl", className)}>
			{/* Main Search Container */}
			<motion.div
				animate={{
					scale: isFocused ? 1.02 : 1,
					y: isFocused ? -2 : 0,
				}}
				transition={{ duration: 0.2, ease: "easeOut" }}
				className="relative"
				ref={refs.setReference}
			>
				{/* Search Input */}
				<div className="relative">
					{/* Animated Background Gradient */}
					<motion.div
						className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl"
						animate={{
							opacity: isFocused ? 0.5 : 0,
						}}
						transition={{ duration: 0.3 }}
					/>

					{/* Input Container */}
					<div className="relative flex items-center">
						{/* Search Icon */}
						<div className="absolute left-5 flex items-center pointer-events-none">
							<motion.div
								animate={{
									scale: isSearching ? [1, 1.2, 1] : 1,
									rotate: isSearching ? 360 : 0,
								}}
								transition={{
									scale: { repeat: isSearching ? Infinity : 0, duration: 1 },
									rotate: {
										repeat: isSearching ? Infinity : 0,
										duration: 2,
										ease: "linear",
									},
								}}
							>
								{isSearching ? (
									<Loader2 className="w-5 h-5 text-blue-500" />
								) : (
									<Search
										className={clsx(
											"w-5 h-5 transition-colors duration-200",
											isFocused ? "text-blue-500" : "text-gray-400",
										)}
									/>
								)}
							</motion.div>
						</div>

						{/* Input Field */}
						<input
							ref={inputRef}
							type="text"
							value={value}
							onChange={(e) => onChange(e.target.value)}
							onFocus={() => setIsFocused(true)}
							onBlur={() => setIsFocused(false)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									onSearch(value);
								}
							}}
							placeholder={placeholder}
							className={clsx(
								"w-full pl-14 pr-32 py-4 bg-white/90 dark:bg-gray-800/90",
								"backdrop-blur-xl border-2 rounded-2xl",
								"text-gray-900 dark:text-gray-100 font-medium",
								"placeholder-gray-500 dark:placeholder-gray-400",
								"transition-all duration-200 outline-none",
								{
									"border-blue-500 shadow-lg shadow-blue-500/20": isFocused,
									"border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600":
										!isFocused,
								},
							)}
						/>

						{/* Right Side Actions */}
						<div className="absolute right-2 flex items-center gap-2">
							{/* Clear Button */}
							<AnimatePresence>
								{value && (
									<motion.button
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										whileHover={{ scale: 1.1 }}
										whileTap={{ scale: 0.9 }}
										onClick={() => {
											onChange("");
											inputRef.current?.focus();
										}}
										className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
									>
										<X className="w-4 h-4" />
									</motion.button>
								)}
							</AnimatePresence>

							{/* Filter Button */}
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={onFilterClick}
								className={clsx(
									"flex items-center gap-2 px-4 py-2 rounded-xl",
									"font-medium text-sm transition-all duration-200",
									{
										"bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25":
											showFilters,
										"bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600":
											!showFilters,
									},
								)}
							>
								<SlidersHorizontal className="w-4 h-4" />
								<span className="hidden sm:inline">Filters</span>
							</motion.button>
						</div>
					</div>

					{/* Keyboard Shortcut Hint */}
					<AnimatePresence>
						{isFocused && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								className="absolute right-36 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-gray-400"
							>
								<Command className="w-3 h-3" />
								<span>K</span>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</motion.div>

			{/* Suggestions Dropdown */}
			<AnimatePresence>
				{showSuggestions && displaySuggestions.length > 0 && (
					<motion.div
						ref={refs.setFloating}
						style={floatingStyles}
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
						className="w-full mt-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden z-50"
					>
						<div className="p-2">
							{/* AI Suggestion Header */}
							<div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
								<Sparkles className="w-3 h-3 text-purple-500" />
								<span className="font-medium">AI-Powered Suggestions</span>
							</div>

							{/* Suggestions List */}
							<div className="space-y-1">
								{displaySuggestions.map((suggestion, index) => (
									<motion.button
										key={`${suggestion.id || suggestion.path || suggestion.name || suggestion.key || ""}-${index}`}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: index * 0.05 }}
										whileHover={{ x: 4 }}
										onClick={() => handleSuggestionClick(suggestion)}
										className={clsx(
											"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
											"text-left transition-all duration-200",
											{
												"bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-gray-900 dark:text-gray-100":
													index === selectedSuggestionIndex,
												"text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700":
													index !== selectedSuggestionIndex,
											},
										)}
									>
										{getSuggestionIcon(suggestion)}
										<div className="flex-1">
											<div className="font-medium text-sm">
												{suggestion.text}
											</div>
											{suggestion.metadata && (
												<div className="text-xs text-gray-500 dark:text-gray-400">
													{suggestion.metadata}
												</div>
											)}
										</div>
										{suggestion.type === "ai" && (
											<div className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded-lg font-medium">
												AI
											</div>
										)}
									</motion.button>
								))}
							</div>

							{/* Quick Actions */}
							<div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
								<div className="flex items-center justify-between px-3 py-2">
									<div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
										<span className="flex items-center gap-1">
											<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
												↑↓
											</kbd>
											Navigate
										</span>
										<span className="flex items-center gap-1">
											<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
												Enter
											</kbd>
											Select
										</span>
										<span className="flex items-center gap-1">
											<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
												Esc
											</kbd>
											Close
										</span>
									</div>
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Quick Filter Pills */}
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="flex items-center gap-2 mt-4 overflow-x-auto pb-2"
			>
				{["All", "Today", "This Week", "Favorites", "People", "Places"].map(
					(filter, index) => (
						<motion.button
							key={filter}
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: index * 0.05 }}
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className={clsx(
								"px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap",
								"transition-all duration-200",
								filter === "All"
									? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
									: "bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50",
							)}
						>
							{filter === "Favorites" && (
								<Heart className="w-3 h-3 mr-1 inline" />
							)}
							{filter === "People" && <User className="w-3 h-3 mr-1 inline" />}
							{filter === "Places" && (
								<MapPin className="w-3 h-3 mr-1 inline" />
							)}
							{filter}
						</motion.button>
					),
				)}
			</motion.div>
		</div>
	);
};

export default EnhancedSearchBar;
