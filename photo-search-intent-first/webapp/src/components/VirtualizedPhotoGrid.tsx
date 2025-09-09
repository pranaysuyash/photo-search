// Virtualized Photo Grid Component
// User Intent: "I want the app to stay fast even with thousands of photos"
// High-performance grid that only renders visible photos

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Check, Heart, Download, Share2, Info, Play } from 'lucide-react'
import { SearchExplainability, matchAnalyzer } from './SearchExplainability'

interface Photo {
  id: string
  path: string
  thumbnail?: string
  width?: number
  height?: number
  caption?: string
  tags?: string[]
  date?: Date | string
  favorite?: boolean
  selected?: boolean
  type?: 'image' | 'video'
  duration?: number
  matchReasons?: any[]
}

interface VirtualizedPhotoGridProps {
  photos: Photo[]
  gridColumns?: number
  itemHeight?: number
  overscan?: number
  onPhotoClick?: (photo: Photo, index: number) => void
  onPhotoSelect?: (photo: Photo, selected: boolean) => void
  onPhotoFavorite?: (photo: Photo) => void
  selectedPhotos?: Set<string>
  searchQuery?: string
  showExplainability?: boolean
  className?: string
}

export function VirtualizedPhotoGrid({
  photos,
  gridColumns = 4,
  itemHeight = 250,
  overscan = 3,
  onPhotoClick,
  onPhotoSelect,
  onPhotoFavorite,
  selectedPhotos = new Set(),
  searchQuery,
  showExplainability = false,
  className = ''
}: VirtualizedPhotoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [hoveredPhoto, setHoveredPhoto] = useState<string | null>(null)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [columns, setColumns] = useState(gridColumns)

  // Calculate responsive columns based on container width
  useEffect(() => {
    const updateColumns = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth
        if (width < 640) setColumns(2)
        else if (width < 768) setColumns(3)
        else if (width < 1024) setColumns(4)
        else if (width < 1280) setColumns(5)
        else setColumns(6)
      }
    }

    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  // Calculate grid dimensions
  const rowCount = Math.ceil(photos.length / columns)
  const totalHeight = rowCount * itemHeight

  // Calculate visible range
  const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const startIndex = startRow * columns
  const endIndex = Math.min(photos.length, endRow * columns)

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Preload images for smooth scrolling
  const preloadImage = useCallback((src: string) => {
    if (!loadedImages.has(src)) {
      const img = new Image()
      img.src = src
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src))
      }
    }
  }, [loadedImages])

  // Preload nearby images
  useEffect(() => {
    const preloadStart = Math.max(0, startIndex - columns * 2)
    const preloadEnd = Math.min(photos.length, endIndex + columns * 2)
    
    for (let i = preloadStart; i < preloadEnd; i++) {
      const photo = photos[i]
      if (photo.thumbnail || photo.path) {
        preloadImage(photo.thumbnail || photo.path)
      }
    }
  }, [startIndex, endIndex, photos, columns, preloadImage])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          // Navigate left
          break
        case 'ArrowRight':
          e.preventDefault()
          // Navigate right
          break
        case 'ArrowUp':
          e.preventDefault()
          // Navigate up
          break
        case 'ArrowDown':
          e.preventDefault()
          // Navigate down
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Render photo item
  const renderPhotoItem = (photo: Photo, index: number) => {
    const isSelected = selectedPhotos.has(photo.id)
    const isHovered = hoveredPhoto === photo.id
    const isLoaded = loadedImages.has(photo.thumbnail || photo.path)
    
    // Calculate match reasons if searching
    const matchReasons = searchQuery && showExplainability
      ? matchAnalyzer.analyzeMatch(photo, searchQuery)
      : []

    return (
      <div
        key={photo.id}
        className="photo-item relative group cursor-pointer"
        style={{
          position: 'absolute',
          left: `${(index % columns) * (100 / columns)}%`,
          top: `${Math.floor(index / columns) * itemHeight}px`,
          width: `${100 / columns}%`,
          height: `${itemHeight}px`,
          padding: '4px'
        }}
        onMouseEnter={() => setHoveredPhoto(photo.id)}
        onMouseLeave={() => setHoveredPhoto(null)}
        onClick={() => onPhotoClick?.(photo, index)}
      >
        <div className={`
          relative w-full h-full rounded-lg overflow-hidden
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${isHovered ? 'transform scale-[1.02] shadow-lg' : ''}
          transition-all duration-200
        `}>
          {/* Loading placeholder */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
          )}

          {/* Photo image */}
          <img
            src={photo.thumbnail || photo.path}
            alt={photo.caption || 'Photo'}
            className={`
              w-full h-full object-cover
              ${isLoaded ? 'opacity-100' : 'opacity-0'}
              transition-opacity duration-300
            `}
            loading="lazy"
            onLoad={() => preloadImage(photo.thumbnail || photo.path)}
          />

          {/* Video indicator */}
          {photo.type === 'video' && (
            <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5">
              <Play className="w-4 h-4 text-white fill-white" />
              {photo.duration && (
                <span className="absolute -bottom-5 right-0 text-xs text-white bg-black/60 px-1 rounded">
                  {formatDuration(photo.duration)}
                </span>
              )}
            </div>
          )}

          {/* Selection checkbox */}
          <div
            className={`
              absolute top-2 left-2 
              ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}
              transition-opacity duration-200
            `}
            onClick={(e) => {
              e.stopPropagation()
              onPhotoSelect?.(photo, !isSelected)
            }}
          >
            <div className={`
              w-6 h-6 rounded border-2 flex items-center justify-center
              ${isSelected 
                ? 'bg-blue-500 border-blue-500' 
                : 'bg-white/80 border-white hover:bg-white'
              }
            `}>
              {isSelected && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>

          {/* Favorite button */}
          <button
            className={`
              absolute top-2 right-2
              ${photo.favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              transition-opacity duration-200
            `}
            onClick={(e) => {
              e.stopPropagation()
              onPhotoFavorite?.(photo)
            }}
          >
            <Heart className={`
              w-5 h-5 
              ${photo.favorite ? 'fill-red-500 text-red-500' : 'text-white'}
              drop-shadow-lg hover:scale-110 transition-transform
            `} />
          </button>

          {/* Quick actions bar */}
          {isHovered && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <div className="flex items-center justify-between">
                <div className="text-white text-xs truncate">
                  {photo.caption || 'Untitled'}
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 hover:bg-white/20 rounded transition-colors">
                    <Download className="w-3 h-3 text-white" />
                  </button>
                  <button className="p-1 hover:bg-white/20 rounded transition-colors">
                    <Share2 className="w-3 h-3 text-white" />
                  </button>
                  <button className="p-1 hover:bg-white/20 rounded transition-colors">
                    <Info className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search match explanation */}
          {showExplainability && matchReasons.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <SearchExplainability
                reasons={matchReasons}
                query={searchQuery || ''}
                compact
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Performance metrics
  const renderMetrics = useMemo(() => ({
    totalPhotos: photos.length,
    visiblePhotos: endIndex - startIndex,
    renderedRows: endRow - startRow,
    memoryUsage: `${Math.round((endIndex - startIndex) * 0.5)}MB` // Rough estimate
  }), [photos.length, startIndex, endIndex, startRow, endRow])

  return (
    <div className={`virtualized-photo-grid ${className}`}>
      {/* Performance indicator (only in dev) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 z-10 bg-black/60 text-white text-xs p-2 rounded">
          <div>Total: {renderMetrics.totalPhotos}</div>
          <div>Visible: {renderMetrics.visiblePhotos}</div>
          <div>Memory: ~{renderMetrics.memoryUsage}</div>
        </div>
      )}

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-auto"
        onScroll={handleScroll}
        style={{ position: 'relative' }}
      >
        {/* Virtual spacer to maintain scroll height */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Render only visible photos */}
          {photos.slice(startIndex, endIndex).map((photo, idx) => 
            renderPhotoItem(photo, startIndex + idx)
          )}
        </div>
      </div>

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p className="text-lg">No photos to display</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to format video duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Hook for infinite scrolling
export function useInfiniteScroll(
  callback: () => void,
  options: { threshold?: number; enabled?: boolean } = {}
) {
  const { threshold = 0.9, enabled = true } = options
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting) {
        callback()
      }
    }

    observerRef.current = new IntersectionObserver(handleIntersect, {
      threshold
    })

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [callback, threshold, enabled])

  return sentinelRef
}