import React, { useEffect } from 'react';
import {
  Grid3x3 as IconGrid,
  Heart as IconHeart,
  Users as IconUsers,
  MapPin as IconMapPin,
  Calendar as IconCalendar,
  Tag as IconTag,
  Sparkles as IconSparkles,
  Plane as IconPlane,
  Search as IconSearch,
  ListTodo as IconTasks,
  X,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  count?: number;
}

interface SidebarProps {
  selectedView: string;
  onViewChange: (view: string) => void;
  library?: any[];
  favorites?: string[];
  collections?: any[];
  clusters?: any[];
  savedSearches?: any[];
  smart?: any[];
  trips?: any[];
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  selectedView,
  onViewChange,
  library = [],
  favorites = [],
  collections = [],
  clusters = [],
  savedSearches = [],
  smart = [],
  trips = [],
  isOpen = false,
  onClose
}: SidebarProps) {
  const navItems: NavItem[] = [
    {
      id: "library",
      label: "All Photos",
      icon: IconGrid,
      count: library?.length || 0,
    },
    {
      id: "results",
      label: "Search Results",
      icon: IconSearch,
    },
    {
      id: "favorites",
      label: "Favorites",
      icon: IconHeart,
      count: favorites?.length || 0,
    },
  ];

  const orgItems: NavItem[] = [
    {
      id: "people",
      label: "People",
      icon: IconUsers,
      count: clusters?.length || 0,
    },
    {
      id: "map",
      label: "Places",
      icon: IconMapPin,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: IconCalendar,
    },
    {
      id: "collections",
      label: "Collections",
      icon: IconTag,
      count: collections?.length || 0,
    },
    {
      id: "trips",
      label: "Trips",
      icon: IconPlane,
      count: trips?.length || 0,
    },
  ];

  const smartItems: NavItem[] = [
    {
      id: "smart",
      label: "Smart Collections",
      icon: IconSparkles,
      count: smart?.length || 0,
    },
    {
      id: "saved",
      label: "Saved Searches",
      icon: IconSearch,
      count: savedSearches?.length || 0,
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: IconTasks,
    },
  ];

  const renderNavItem = (item: NavItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => onViewChange(item.id)}
      className={`nav-item ${
        selectedView === item.id ? "active" : ""
      }`}
    >
      <div className="nav-item-content">
        <item.icon className="nav-item-icon" />
        <span className="nav-item-label">{item.label}</span>
      </div>
      {item.count !== undefined && (
        <span className="nav-item-count">{item.count}</span>
      )}
    </button>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={onClose}
        />
      )}
      
      <div className={`sidebar-container ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div>
            <h1 className="sidebar-title">PhotoVault</h1>
            <p className="sidebar-subtitle">AI-Powered Photo Management</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="sidebar-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <h3 className="nav-section-title">
              Library
            </h3>
            <div className="nav-items">
              {navItems.map(renderNavItem)}
            </div>
          </div>

          <div className="nav-section">
            <h3 className="nav-section-title">
              Organize
            </h3>
            <div className="nav-items">
              {orgItems.map(renderNavItem)}
            </div>
          </div>

          <div className="nav-section">
            <h3 className="nav-section-title">
              Smart Features
            </h3>
            <div className="nav-items">
              {smartItems.map(renderNavItem)}
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-settings-button"
            onClick={() => window.location.href = '/settings'}
          >
            Settings
          </button>
        </div>
      </div>
    </>
  );
}