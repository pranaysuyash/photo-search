import { useState } from "react";
import { Card } from "../ui/shadcn/Card";
import { Button } from "../ui/shadcn/Button";
import { Input } from "../ui/shadcn/Input";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Search,
  Grid3X3,
  List,
  Calendar,
  MapPin,
  Users,
  Heart,
  Folder,
  Settings,
  Menu,
  X,
} from "lucide-react";

/**
 * Modern, beautiful photo app UI using shadcn/ui components
 * Clean sidebar navigation, beautiful cards, modern typography
 */

export function ModernApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState("library");

  const navigationItems = [
    { id: "library", label: "Library", icon: Grid3X3, count: 2847 },
    { id: "recents", label: "Recents", icon: Calendar, count: 156 },
    { id: "people", label: "People", icon: Users, count: 12 },
    { id: "places", label: "Places", icon: MapPin, count: 45 },
    { id: "favorites", label: "Favorites", icon: Heart, count: 234 },
    { id: "albums", label: "Albums", icon: Folder, count: 8 },
  ];

  // Sample photos data - replace with real data
  const samplePhotos = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    src: `https://picsum.photos/300/200?random=${i}`,
    title: `Photo ${i + 1}`,
    date: "2024-10-04",
  }));

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } transition-all duration-300 border-r bg-card/50 backdrop-blur-xl`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          {sidebarOpen && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Photo Search
            </h1>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="p-2 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentView === item.id ? "secondary" : "ghost"}
                className={`w-full justify-start ${!sidebarOpen && "px-2"}`}
                onClick={() => setCurrentView(item.id)}
              >
                <Icon className="h-4 w-4" />
                {sidebarOpen && (
                  <>
                    <span className="ml-3">{item.label}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {item.count}
                    </Badge>
                  </>
                )}
              </Button>
            );
          })}
        </nav>

        <Separator className="my-4" />

        {sidebarOpen && (
          <div className="px-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Recent Searches
            </h3>
            <div className="space-y-1">
              {["beach sunset", "family photos", "vacation 2024"].map(
                (search) => (
                  <Button
                    key={search}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                  >
                    <Search className="h-3 w-3 mr-2" />
                    {search}
                  </Button>
                )
              )}
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            className={`w-full justify-start ${!sidebarOpen && "px-2"}`}
          >
            <Settings className="h-4 w-4" />
            {sidebarOpen && <span className="ml-3">Settings</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="border-b bg-card/30 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your photos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold capitalize">{currentView}</h2>
            <p className="text-muted-foreground">
              {navigationItems.find((item) => item.id === currentView)?.count}{" "}
              photos
            </p>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {samplePhotos.map((photo) => (
              <Card
                key={photo.id}
                className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="aspect-square relative">
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Loading State */}
          {samplePhotos.length === 0 && (
            <Card className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <Grid3X3 className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No photos yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by selecting a folder or importing your photos
              </p>
              <Button>Import Photos</Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
