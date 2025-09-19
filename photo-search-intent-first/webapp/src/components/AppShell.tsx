import clsx from "clsx";
import type React from "react";
import {
	HeaderQuickActions,
	type HeaderQuickActionsProps,
} from "./HeaderQuickActions";
import ModernSidebar from "./ModernSidebar";
import { TopBar, type TopBarProps } from "./TopBar";

interface AppShellProps {
	// Layout flags
	showModernSidebar: boolean;
	isMobile: boolean;
	// Sidebar
	sidebarStats: {
		totalPhotos: number;
		collections: number;
		people: number;
		favorites: number;
	};
	darkMode: boolean;
	onDarkModeToggle: () => void;
	onSettingsClick: () => void;
	selectedView: string;
	onViewChange: (v: string) => void;
	onSelectLibrary: () => void;

	// Collections support
	collections?: Record<string, string[]>;
	onOpenCollection?: (collectionName: string) => void;
	dir?: string;

	// Top bar
	topBarProps: TopBarProps;

	// Header quick actions
	quickActions?: HeaderQuickActionsProps;

	// Content
	children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
	showModernSidebar,
	isMobile,
	sidebarStats,
	darkMode,
	onDarkModeToggle,
	onSettingsClick,
	selectedView,
	onViewChange,
	onSelectLibrary,
	collections,
	onOpenCollection,
	dir,
	topBarProps,
	quickActions,
	children,
}) => {
	return (
		<div
			className={clsx(
				"flex w-full min-h-screen bg-background text-foreground",
				{
					"overflow-hidden": true,
				},
			)}
		>
			{/* Sidebar (hidden on small mobile unless toggled) */}
			{!isMobile ? (
				showModernSidebar ? (
					<ModernSidebar
						selectedView={selectedView}
						onViewChange={onViewChange}
						stats={sidebarStats}
						aiStatus={{
							indexReady: true,
							fastIndexType: "FAISS",
							freeSpace: 0,
						}}
						darkMode={darkMode}
						onDarkModeToggle={onDarkModeToggle}
						onSettingsClick={onSettingsClick}
						onSelectLibrary={onSelectLibrary}
						collections={collections}
						onOpenCollection={onOpenCollection}
						dir={dir}
					/>
				) : null
			) : null}

			{/* Main column */}
			<div className="flex-1 flex flex-col overflow-hidden bg-background min-h-screen">
				<header className="bg-card border-b border-border shadow-sm px-3 py-3 sm:px-6 lg:px-8 sm:py-4 md:py-5 flex flex-col gap-2 sm:gap-3 flex-shrink-0">
					<TopBar {...topBarProps} />
					{quickActions ? <HeaderQuickActions {...quickActions} /> : null}
				</header>

				<main
					id="main-content"
					className="flex-1 overflow-y-auto overflow-x-hidden"
				>
					<div className="w-full px-3 pb-6 pt-4 sm:px-6 lg:px-8 sm:pb-8 sm:pt-6">
						{children}
					</div>
				</main>
			</div>
		</div>
	);
};

export default AppShell;
