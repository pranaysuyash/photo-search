/**
 * GridDemo.tsx
 *
 * INTENT: Quick demo component to test Day 2 grid layouts with sample data.
 * This allows visual testing of Masonry, Film Strip, and Timeline views
 * without needing a full photo library loaded.
 */

import { useState } from "react";
import { GridViewSwitcher } from "@/components/grids";

// Photo interface matching grids/types.ts
interface Photo {
  path: string;
  score?: number;
  thumbnail?: string;
  metadata?: {
    timestamp?: number;
    views?: number;
    lastViewed?: number;
  };
}

// Generate sample photos with realistic metadata
const generateSamplePhotos = (count: number): Photo[] => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  return Array.from({ length: count }, (_, i) => ({
    path: `/demo_photos/sample-${i + 1}.jpg`,
    score: Math.random(),
    thumbnail: `https://picsum.photos/seed/${i + 1}/400/300`,
    metadata: {
      timestamp: now - Math.floor(Math.random() * 365 * oneDay), // Random date within last year
      views: Math.floor(Math.random() * 100),
      lastViewed: now - Math.floor(Math.random() * 30 * oneDay), // Last viewed within 30 days
    },
  }));
};

export function GridDemo() {
  const [photos] = useState<Photo[]>(() => generateSamplePhotos(50));

  const handlePhotoClick = (photo: Photo, index: number) => {
    console.log("Photo clicked:", photo.path, "at index:", index);
    // In real app, this would open photo detail modal
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Grid Layouts Demo
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Testing Day 2 grid components with {photos.length} sample photos
          </p>
        </div>
      </div>

      {/* GridViewSwitcher includes both controls and grid views */}
      <div className="flex-1 overflow-hidden">
        <GridViewSwitcher
          photos={photos}
          onPhotoClick={handlePhotoClick}
          defaultView="masonry"
          persistenceKey="demo-grid-view"
          showLabels
        />
      </div>
    </div>
  );
}
