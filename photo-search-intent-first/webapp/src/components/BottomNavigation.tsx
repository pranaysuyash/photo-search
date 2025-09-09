import React from 'react';
import { 
  Home, 
  Search, 
  Heart, 
  Settings, 
  Grid3x3,
  Filter,
  Upload,
  FolderOpen
} from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'home' | 'search' | 'favorites' | 'settings';
  onTabChange: (tab: 'home' | 'search' | 'favorites' | 'settings') => void;
  onShowFilters?: () => void;
  onShowUpload?: () => void;
  onShowLibrary?: () => void;
  showSecondaryActions?: boolean;
}

export function BottomNavigation({ 
  activeTab, 
  onTabChange, 
  onShowFilters,
  onShowUpload,
  onShowLibrary,
  showSecondaryActions = true
}: BottomNavigationProps) {
  const navItems = [
    { id: 'home' as const, icon: Home, label: 'Home' },
    { id: 'search' as const, icon: Search, label: 'Search' },
    { id: 'favorites' as const, icon: Heart, label: 'Favorites' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
      {/* Secondary actions row */}
      {showSecondaryActions && (
        <div className="flex items-center justify-around py-2 px-4 border-b border-gray-100">
          <button
            type="button"
            onClick={onShowFilters}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-blue-600 transition-colors"
            aria-label="Show filters"
          >
            <Filter className="w-5 h-5" />
            <span className="text-xs">Filters</span>
          </button>
          
          <button
            type="button"
            onClick={onShowUpload}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-green-600 transition-colors"
            aria-label="Upload"
          >
            <Upload className="w-5 h-5" />
            <span className="text-xs">Upload</span>
          </button>
          
          <button
            type="button"
            onClick={onShowLibrary}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-purple-600 transition-colors"
            aria-label="Library"
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-xs">Library</span>
          </button>
        </div>
      )}
      
      {/* Main navigation */}
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors ${
              activeTab === id 
                ? 'text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-label={label}
            aria-current={activeTab === id}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium">{label}</span>
            {activeTab === id && (
              <div className="w-1 h-1 bg-blue-600 rounded-full mt-1" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}