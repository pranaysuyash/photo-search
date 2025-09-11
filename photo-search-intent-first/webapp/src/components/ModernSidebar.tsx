import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
	Activity,
	Bookmark,
	Brain,
	Calendar,
	ChevronLeft,
	ClipboardList,
	Database,
	FolderOpen,
	Globe,
	Grid,
	HardDrive,
	Heart,
	Map,
	Moon,
	Search,
	Settings,
	Sparkles,
	Sun,
	Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface SidebarItem {
	id: string;
	label: string;
	icon: React.ElementType;
	count?: number;
	badge?: string;
	category?: string;
}

interface ModernSidebarProps {
	selectedView: string;
	onViewChange: (view: string) => void;
	stats?: {
		totalPhotos: number;
		collections: number;
		people: number;
		favorites: number;
	};
	aiStatus?: {
		indexReady: boolean;
		fastIndexType: string;
		freeSpace: number;
	};
	darkMode?: boolean;
	onDarkModeToggle?: () => void;
	onSettingsClick?: () => void;
	onSelectLibrary?: () => void;
}

const ModernSidebar: React.FC<ModernSidebarProps> = ({
	selectedView,
	onViewChange,
	stats = { totalPhotos: 0, collections: 0, people: 0, favorites: 0 },
	aiStatus = { indexReady: true, fastIndexType: "FAISS", freeSpace: 45.2 },
	darkMode = false,
	onDarkModeToggle,
	onSettingsClick,
	onSelectLibrary,
}) => {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isCompact, setIsCompact] = useState(false);

	// Check screen size for responsive behavior
	useEffect(() => {
		const checkScreen = () => {
			setIsCompact(window.innerWidth < 1024);
			if (window.innerWidth < 768) {
				setIsCollapsed(true);
			}
		};

		checkScreen();
		window.addEventListener("resize", checkScreen);
		return () => window.removeEventListener("resize", checkScreen);
	}, []);

	const mainItems: SidebarItem[] = [
		{
			id: "library",
			label: "All Photos",
			icon: Grid,
			count: stats.totalPhotos,
		},
		{ id: "search", label: "Search Results", icon: Search },
		{ id: "map", label: "Map View", icon: Map },
		{ id: "people", label: "People", icon: Users, count: stats.people },
	];

	const organizationItems: SidebarItem[] = [
		{
			id: "collections",
			label: "Collections",
			icon: FolderOpen,
			count: stats.collections,
		},
		{ id: "smart", label: "Smart Albums", icon: Sparkles },
		{ id: "trips", label: "Trips", icon: Calendar },
	];

	const smartFeatures: SidebarItem[] = [
    { id: "saved", label: "Saved Searches", icon: Bookmark },
    { id: "memories", label: "Memories", icon: Heart, count: stats.favorites },
    // Tasks removed from user app
  ];

	const formatCount = (count?: number) => {
		if (!count) return null;
		if (count > 999) return `${Math.floor(count / 1000)}k`;
		return count.toString();
	};

	const sidebarVariants = {
		expanded: { width: isCompact ? 256 : 320 },
		collapsed: { width: 64 },
	};

	const itemVariants = {
		hidden: { opacity: 0, x: -20 },
		visible: { opacity: 1, x: 0 },
	};

	const renderNavItem = (item: SidebarItem) => {
		const isActive = selectedView === item.id;
		const Icon = item.icon;
		const count = formatCount(item.count);

		return (
			<motion.button
				key={item.id}
				variants={itemVariants}
				whileHover={{ scale: 1.02, x: 4 }}
				whileTap={{ scale: 0.98 }}
				onClick={() => onViewChange(item.id)}
				className={clsx(
					"w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
					{
						"bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25":
							isActive,
						"text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/50":
							!isActive,
					},
				)}
			>
				{/* Background gradient effect on hover */}
				{!isActive && (
					<div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
				)}

				<Icon
					className={clsx("w-5 h-5 flex-shrink-0", {
						"text-white": isActive,
						"text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300":
							!isActive,
					})}
				/>

				{!isCollapsed && (
					<AnimatePresence mode="wait">
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="flex items-center justify-between flex-1"
						>
							<span className="font-medium">{item.label}</span>
							{count && (
								<span
									className={clsx(
										"text-xs px-2 py-1 rounded-full font-medium",
										{
											"bg-white/20 text-white": isActive,
											"bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400":
												!isActive,
										},
									)}
								>
									{count}
								</span>
							)}
						</motion.div>
					</AnimatePresence>
				)}
			</motion.button>
		);
	};

	return (
		<>
			{/* Sidebar */}
			<motion.div
				initial={false}
				animate={isCollapsed ? "collapsed" : "expanded"}
				variants={sidebarVariants}
				transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
				className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col shadow-xl"
			>
				{/* Header */}
				<div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5 dark:from-blue-600/10 dark:to-purple-600/10">
					<div className="flex items-center gap-4">
						<motion.div
							whileHover={{ rotate: 360 }}
							transition={{ duration: 0.5 }}
							className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg"
						>
							<Brain className="w-7 h-7 text-white" />
						</motion.div>
						{!isCollapsed && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
							>
								<h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
									PhotoVault
								</h1>
								<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
									AI-Powered Management
								</p>
							</motion.div>
						)}
					</div>
				</div>

				{/* Navigation */}
				<nav className="flex-1 p-4 space-y-6 overflow-y-auto">
					{/* Main sections */}
					<div className="space-y-2">
						{!isCollapsed && (
							<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
								Browse
							</h3>
						)}
						<motion.div
							initial="hidden"
							animate="visible"
							variants={{
								visible: {
									transition: {
										staggerChildren: 0.05,
									},
								},
							}}
						>
							{mainItems.map(renderNavItem)}
						</motion.div>
					</div>

					{/* Organization */}
					{(!isCollapsed || isCompact) && (
						<div className="space-y-2">
							{!isCollapsed && (
								<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
									Organization
								</h3>
							)}
							<motion.div
								initial="hidden"
								animate="visible"
								variants={{
									visible: {
										transition: {
											staggerChildren: 0.05,
										},
									},
								}}
							>
								{organizationItems.map(renderNavItem)}
							</motion.div>
						</div>
					)}

					{/* Smart Features */}
					{(!isCollapsed || isCompact) && (
						<div className="space-y-2">
							{!isCollapsed && (
								<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
									Smart Features
								</h3>
							)}
							<motion.div
								initial="hidden"
								animate="visible"
								variants={{
									visible: {
										transition: {
											staggerChildren: 0.05,
										},
									},
								}}
							>
								{smartFeatures.map(renderNavItem)}
							</motion.div>
						</div>
					)}
				</nav>

				{/* AI Status Panel */}
				{!isCollapsed && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="p-6 border-t border-gray-200/50 dark:border-gray-700/50"
					>
						<div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 dark:from-emerald-900/20 dark:via-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-emerald-200/50 dark:border-emerald-700/50">
							<div className="flex items-center gap-3 mb-3">
								<div className="relative">
									<div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
									<div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
								</div>
								<span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
									AI System Ready
								</span>
							</div>
							<div className="grid grid-cols-2 gap-3 text-xs">
								<div className="flex items-center justify-between">
									<span className="text-gray-600 dark:text-gray-400">
										Index
									</span>
									<Activity className="w-3 h-3 text-emerald-500" />
								</div>
								<div className="flex items-center justify-between">
									<span className="text-gray-600 dark:text-gray-400">
										{aiStatus.fastIndexType}
									</span>
									<Database className="w-3 h-3 text-blue-500" />
								</div>
								<div className="flex items-center justify-between">
									<span className="text-gray-600 dark:text-gray-400">OCR</span>
									<Globe className="w-3 h-3 text-purple-500" />
								</div>
								<div className="flex items-center justify-between">
									<span className="text-gray-600 dark:text-gray-400">
										{aiStatus.freeSpace}GB
									</span>
									<HardDrive className="w-3 h-3 text-gray-500" />
								</div>
							</div>
						</div>
					</motion.div>
				)}

				{/* Bottom Actions */}
				<div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-3">
					{!isCollapsed ? (
						<>
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={onSelectLibrary}
								className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 font-semibold"
							>
								<HardDrive className="w-5 h-5" />
								<span>Select Library</span>
							</motion.button>
							<div className="grid grid-cols-2 gap-2">
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={onSettingsClick}
									className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
								>
									<Settings className="w-4 h-4" />
									<span className="text-sm">Settings</span>
								</motion.button>
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={onDarkModeToggle}
									className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
								>
									{darkMode ? (
										<Sun className="w-4 h-4" />
									) : (
										<Moon className="w-4 h-4" />
									)}
								</motion.button>
							</div>
						</>
					) : (
						<div className="space-y-2">
							<motion.button
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.9 }}
								onClick={onSelectLibrary}
								className="w-full flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
							>
								<HardDrive className="w-6 h-6" />
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.9 }}
								onClick={onSettingsClick}
								className="w-full flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
							>
								<Settings className="w-5 h-5" />
							</motion.button>
						</div>
					)}
				</div>

				{/* Collapse Toggle Button */}
				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
					onClick={() => setIsCollapsed(!isCollapsed)}
					className="absolute -right-4 top-24 w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shadow-lg hover:shadow-xl transition-all duration-200 z-10"
				>
					<motion.div
						animate={{ rotate: isCollapsed ? 180 : 0 }}
						transition={{ duration: 0.3 }}
					>
						<ChevronLeft className="w-4 h-4" />
					</motion.div>
				</motion.button>
			</motion.div>

			{/* Mobile Overlay */}
			{isCompact && !isCollapsed && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={() => setIsCollapsed(true)}
					className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
				/>
			)}
		</>
	);
};

export default ModernSidebar;
