import clsx from "clsx";
import React from "react";
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

  // Top bar
  topBarProps: TopBarProps;

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
  topBarProps,
  children,
}) => {
  return (
    <div className={clsx("flex h-full", { "overflow-hidden": true })}>
      {/* Sidebar (hidden on small mobile unless toggled) */}
      {!isMobile ? (
        showModernSidebar ? (
          <ModernSidebar
            selectedView={selectedView}
            onViewChange={onViewChange}
            stats={sidebarStats}
            aiStatus={{ indexReady: true, fastIndexType: "FAISS", freeSpace: 0 }}
            darkMode={darkMode}
            onDarkModeToggle={onDarkModeToggle}
            onSettingsClick={onSettingsClick}
            onSelectLibrary={onSelectLibrary}
          />
        ) : null
      ) : null}

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 px-4 md:px-8 py-4 md:py-6">
          <TopBar {...topBarProps} />
        </header>

        <main id="main-content" className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;

