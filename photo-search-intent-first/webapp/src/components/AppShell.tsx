import clsx from "clsx";
import type React from "react";
import { useResponsiveSpacing } from "../hooks/useResponsiveSpacing";
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
	onPowerUserClick: () => void;
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

	// Footer
	footer?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
	showModernSidebar,
	isMobile,
	sidebarStats,
	darkMode,
	onDarkModeToggle,
	onSettingsClick,
	onPowerUserClick,
	selectedView,
	onViewChange,
	onSelectLibrary,
	collections,
	onOpenCollection,
	dir,
	topBarProps,
	quickActions,
	children,
	footer,
}) => {
	const { classes, getLayout, getComponentSpacing } = useResponsiveSpacing();

	return (
		<div
			className={clsx(
				"flex w-full min-h-screen bg-background text-foreground",
				"overflow-hidden",
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
						onPowerUserClick={onPowerUserClick}
						onSelectLibrary={onSelectLibrary}
						collections={collections}
						onOpenCollection={onOpenCollection}
						dir={dir}
					/>
				) : null
			) : null}

			{/* Main column */}
			<div
				className={clsx(
					"flex-1 flex flex-col overflow-hidden bg-background min-h-screen",
					getLayout("mainContent"),
				)}
			>
				<header
					className={clsx(
						"bg-card border-b border-border shadow-sm flex flex-col flex-shrink-0",
						classes.header,
						"gap-1 sm:gap-2 md:gap-3",
					)}
				>
					<TopBar {...topBarProps} />
					{quickActions ? <HeaderQuickActions {...quickActions} /> : null}
				</header>

				<main
					id="main-content"
					className={clsx(
						"flex-1 overflow-y-auto overflow-x-hidden",
						classes.container,
					)}
				>
					{children}
				</main>

				{footer && (
					<footer className="flex-shrink-0 border-t border-border bg-card">
						{footer}
					</footer>
				)}
			</div>
		</div>
	);
};

export default AppShell;
