/**
 * Mobile-Optimized Grid Layout Component
 * Provides responsive photo grid with touch-friendly interactions
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Heart, Download, Share2, MoreVertical, Camera } from 'lucide-react'
import { thumbUrl } from '../api'
import { useTouchGestures } from '../services/TouchGestureService'
import { MobilePhotoCapture } from './MobilePhotoCapture'

interface PhotoItem {
  path: string
  score?: number
  isFavorite?: boolean
  rating?: number
  tags?: string[]
}

interface MobileGridLayoutProps {
  photos: PhotoItem[]
  onPhotoClick: (photo: PhotoItem, index: number) => void
  onToggleFavorite: (path: string) => void
  onShare: (paths: string[]) => void
  onDownload: (paths: string[]) => void
  dir: string
  engine: string
  className?: string
  onLoadMore?: () => void
  hasMore?: boolean
  isLoading?: boolean
}

interface GridItemProps {
  photo: PhotoItem
  index: number
  onPhotoClick: (photo: PhotoItem, index: number) => void
  onToggleFavorite: (path: string) => void
  onShare: (path: string) => void
  onDownload: (path: string) => void
  dir: string
  engine: string
  isSelected: boolean
  onSelect: (path: string) => void
}

const GridItem: React.FC<GridItemProps> = ({
  photo,
  index,
  onPhotoClick,
  onToggleFavorite,
  onShare,
  onDownload,
  dir,
  engine,
  isSelected,
  onSelect
}) => {
  const itemRef = useRef<HTMLDivElement>(null)
  const [showActions, setShowActions] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Touch gesture handling
  const touchGestureService = useTouchGestures(itemRef, {
    minSwipeDistance: 30,
    maxSwipeTime: 200,
    enablePullToRefresh: false
  })

  // Set up gesture callbacks
  useEffect(() => {
    if (!touchGestureService) return

    let longPressTimer: NodeJS.Timeout | null = null

    touchGestureService
      .onSwipe((direction) => {
        if (direction.left) {
          // Swipe left to select
          onSelect(photo.path)
        } else if (direction.right) {
          // Swipe right to favorite
          onToggleFavorite(photo.path)
        }
      })

    // Handle long press for actions menu
    const handleTouchStart = () => {
      longPressTimer = setTimeout(() => {
        setShowActions(true)
      }, 500)
    }

    const handleTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }

    const element = itemRef.current
    if (element) {
      element.addEventListener('touchstart', handleTouchStart)
      element.addEventListener('touchend', handleTouchEnd)
      element.addEventListener('touchcancel', handleTouchEnd)
    }

    return () => {
      if (longPressTimer) clearTimeout(longPressTimer)
      if (element) {
        element.removeEventListener('touchstart', handleTouchStart)
        element.removeEventListener('touchend', handleTouchEnd)
        element.removeEventListener('touchcancel', handleTouchEnd)
      }
    }
  }, [touchGestureService, photo.path, onSelect, onToggleFavorite])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isSelected) {
      onSelect(photo.path)
    } else {
      onPhotoClick(photo, index)
    }
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite(photo.path)
  }

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onShare(photo.path)
  }

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDownload(photo.path)
  }

  const imageUrl = thumbUrl(dir, engine, photo.path, 400)

  return (
    <div
      ref={itemRef}
      className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer select-none transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={handleClick}
    >
      {/* Image */}
      <div className="w-full h-full relative">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        
        <img
          src={imageUrl}
          alt={`Photo ${index + 1}`}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          loading="lazy"
        />

        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="text-gray-400 text-center">
              <Camera className="w-8 h-8 mx-auto mb-1" />
              <p className="text-xs">Failed to load</p>
            </div>
          </div>
        )}
      </div>

      {/* Favorite indicator */}
      {photo.isFavorite && (
        <div className="absolute top-2 right-2 p-1 bg-red-500 rounded-full">
          <Heart className="w-3 h-3 text-white fill-current" />
        </div>
      )}

      {/* Rating indicator */}
      {photo.rating && photo.rating > 0 && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded">
          ★ {photo.rating}
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full" />
        </div>
      )}

      {/* Action menu */}
      {showActions && (
        <div className="absolute inset-0 bg-black/50 flex items-end justify-center p-2">
          <div className="bg-white rounded-lg p-2 flex gap-1">
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`p-2 rounded ${
                photo.isFavorite 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={photo.isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              <Heart className="w-4 h-4" fill={photo.isFavorite ? 'currentColor' : 'none'} />
            </button>
            
            <button
              type="button"
              onClick={handleShareClick}
              className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            
            <button
              type="button"
              onClick={handleDownloadClick}
              className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowActions(false)
              }}
              className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              title="Close menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Touch hint overlay */}
      <div className="absolute bottom-1 right-1 text-xs text-white/70 bg-black/30 px-1 py-0.5 rounded">
        {photo.score ? `${Math.round(photo.score * 100)}%` : ''}
      </div>
    </div>
  )
}

export function MobileGridLayout({
  photos,
  onPhotoClick,
  onToggleFavorite,
  onShare,
  onDownload,
  dir,
  engine,
  className = '',
  onLoadMore,
  hasMore = false,
  isLoading = false
}: MobileGridLayoutProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [showCamera, setShowCamera] = useState(false)
  const [columns, setColumns] = useState(2)
  const containerRef = useRef<HTMLDivElement>(null)

  // Responsive columns based on screen size
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      if (width < 640) setColumns(2)
      else if (width < 1024) setColumns(3)
      else setColumns(4)
    }

    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  // Infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    const sentinel = document.createElement('div')
    sentinel.style.height = '1px'
    containerRef.current?.appendChild(sentinel)
    observer.observe(sentinel)

    return () => {
      observer.disconnect()
      sentinel.remove()
    }
  }, [onLoadMore, hasMore, isLoading])

  // Handle photo selection
  const handleSelect = (path: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  // Handle photo capture
  const handlePhotoCaptured = (file: File) => {
    setShowCamera(false)
    // Handle the captured photo file
    console.log('Photo captured:', file.name)
    // You can implement file upload logic here
  }

  // Batch operations
  const handleBatchShare = () => {
    onShare(Array.from(selectedPhotos))
    setSelectedPhotos(new Set())
  }

  const handleBatchDownload = () => {
    onDownload(Array.from(selectedPhotos))
    setSelectedPhotos(new Set())
  }

  const handleSelectAll = () => {
    setSelectedPhotos(new Set(photos.map(p => p.path)))
  }

  const handleClearSelection = () => {
    setSelectedPhotos(new Set())
  }

  // Memoize grid layout
  const gridItems = useMemo(() => {
    return photos.map((photo, index) => (
      <GridItem
        key={photo.path}
        photo={photo}
        index={index}
        onPhotoClick={onPhotoClick}
        onToggleFavorite={onToggleFavorite}
        onShare={onShare}
        onDownload={onDownload}
        dir={dir}
        engine={engine}
        isSelected={selectedPhotos.has(photo.path)}
        onSelect={handleSelect}
      />
    ))
  }, [photos, selectedPhotos, onPhotoClick, onToggleFavorite, onShare, onDownload, dir, engine])

  return (
    <div className={`relative ${className}`}>
      {/* Selection toolbar */}
      {selectedPhotos.size > 0 && (
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-gray-600 hover:text-gray-900"
            >
              ✕
            </button>
            <span className="font-medium">
              {selectedPhotos.size} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBatchShare}
              className="p-2 bg-blue-500 text-white rounded-lg"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleBatchDownload}
              className="p-2 bg-green-500 text-white rounded-lg"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Camera button (floating) */}
      <button
        type="button"
        onClick={() => setShowCamera(true)}
        className="fixed bottom-20 right-4 z-30 p-4 bg-blue-600 text-white rounded-full shadow-lg"
      >
        <Camera className="w-6 h-6" />
      </button>

      {/* Photo grid */}
      <div
        ref={containerRef}
        className="grid gap-2 p-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
        }}
      >
        {gridItems}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="p-4 text-center text-gray-500">
          Loading more photos...
        </div>
      )}

      {/* Camera modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50">
          <MobilePhotoCapture
            onPhotoCaptured={handlePhotoCaptured}
            onClose={() => setShowCamera(false)}
            className="h-full"
          />
        </div>
      )}
    </div>
  )
}

// Hook for mobile grid layout
export function useMobileGridLayout() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024 || 'ontouchstart' in window)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return { isMobile }
}

export default MobileGridLayout