import type { LucideProps } from "lucide-react";
import {
  Calendar as IconCalendar,
  Grid3x3 as IconGrid,
  Heart as IconHeart,
  MapPin as IconMapPin,
  Plane as IconPlane,
  Search as IconSearch,
  Sparkles as IconSparkles,
  Tag as IconTag,
  Users as IconUsers,
  X,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
  count?: number;
}

interface SidebarProps {
  selectedView: string;
  onViewChange: (view: string) => void;
  library?: unknown[];
  favorites?: string[];
  collections?: unknown[];
  clusters?: unknown[];
  savedSearches?: unknown[];
  smart?: unknown[];
  trips?: unknown[];
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
  onClose,
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
    // Tasks removed from user app
  ];

  const renderNavItem = (item: NavItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => onViewChange(item.id)}
      className={`nav-item ${selectedView === item.id ? "active" : ""}`}
      aria-current={selectedView === item.id ? "page" : undefined}
      aria-label={`${item.label} ${
        item.count !== undefined ? `(${item.count})` : ""
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
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          aria-label="Close sidebar"
          onClick={() => onClose?.()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClose?.();
            }
          }}
          style={{ all: "unset" }}
        />
      )}

      <div
        className={`sidebar-container ${isOpen ? "open" : ""}`}
        data-tour="sidebar"
      >
        <div className="sidebar-header">
          <div>
            <h2 className="sidebar-title">PhotoVault</h2>
            <p className="sidebar-subtitle">AI-Powered Photo Management</p>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="sidebar-close"
            aria-label="Close sidebar"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClose?.();
              }
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <div className="nav-section">
            <h3 className="nav-section-title">Library</h3>
            <div className="nav-items">{navItems.map(renderNavItem)}</div>
          </div>

          <div className="nav-section">
            <h3 className="nav-section-title">Organize</h3>
            <div className="nav-items">{orgItems.map(renderNavItem)}</div>
          </div>

          <div className="nav-section">
            <h3 className="nav-section-title">Smart Features</h3>
            <div className="nav-items">{smartItems.map(renderNavItem)}</div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-settings-button"
            onClick={() => {
              // Use HashRouter-friendly navigation to avoid full reloads/404s
              try {
                window.location.hash = "#/settings";
              } catch {
                // Fallback: keep SPA by toggling view if provided in future
              }
            }}
          >
            Settings
          </button>
        </div>
      </div>
    </>
  );
}
