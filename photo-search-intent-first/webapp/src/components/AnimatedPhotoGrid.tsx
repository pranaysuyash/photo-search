import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  Heart, 
  Star, 
  Download, 
  Share2, 
  MoreVertical, 
  Check,
  X,
  Calendar,
  MapPin,
  User,
  Eye,
  Edit3,
  Trash2,
  Copy,
  FolderPlus,
  Info,
  Maximize2,
  Grid3x3,
  Square,
  LayoutGrid,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/react';

interface Photo {
  id: string;
  path: string;
  thumbnail?: string;
  date?: string;
  location?: string;
  people?: string[];
  rating?: number;
  favorite?: boolean;
  selected?: boolean;
  width?: number;
  height?: number;
  aiScore?: number;
  tags?: string[];
}

interface AnimatedPhotoGridProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo, index: number) => void;
  onPhotoSelect?: (photo: Photo, selected: boolean) => void;
  onPhotoAction?: (action: string, photo: Photo) => void;
  selectedPhotos?: Set<string>;
  viewMode?: 'grid' | 'masonry' | 'timeline' | 'map';
  gridSize?: 'small' | 'medium' | 'large' | 'xlarge';
  showMetadata?: boolean;
  enableSelection?: boolean;
  enableHover?: boolean;
  className?: string;
}

const AnimatedPhotoGrid: React.FC<AnimatedPhotoGridProps> = ({
  photos,
  onPhotoClick,
  onPhotoSelect,
  onPhotoAction,
  selectedPhotos = new Set(),
  viewMode = 'grid',
  gridSize = 'medium',
  showMetadata = true,
  enableSelection = true,
  enableHover = true,
  className
}) => {
  const [hoveredPhoto, setHoveredPhoto] = useState<string | null>(null);
  const [contextMenuPhoto, setContextMenuPhoto] = useState<Photo | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [viewTransition, setViewTransition] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Context menu floating UI
  const { refs, floatingStyles, update } = useFloating({
    placement: 'bottom-start',
    open: !!contextMenuPhoto,
    onOpenChange: (open) => !open && setContextMenuPhoto(null),
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 })
    ],
    whileElementsMounted: autoUpdate,
  });

  const gridSizeClasses = {
    small: 'grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2',
    medium: 'grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3',
    large: 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4',
    xlarge: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
  };

  const photoSizeClasses = {
    small: 'h-32',
    medium: 'h-48',
    large: 'h-64',
    xlarge: 'h-80'
  };

  const handleImageLoad = useCallback((photoId: string) => {
    setLoadedImages(prev => new Set([...prev, photoId]));
  }, []);

  const handlePhotoRightClick = (e: React.MouseEvent, photo: Photo) => {
    e.preventDefault();
    setContextMenuPhoto(photo);
    refs.setReference(e.currentTarget as HTMLElement);
    update();
  };

  const handlePhotoSelect = (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPhotoSelect) {
      onPhotoSelect(photo, !selectedPhotos.has(photo.id));
    }
  };

  const handleAction = (action: string) => {
    if (contextMenuPhoto && onPhotoAction) {
      onPhotoAction(action, contextMenuPhoto);
    }
    setContextMenuPhoto(null);
  };

  const renderPhoto = (photo: Photo, index: number) => {
    const isHovered = hoveredPhoto === photo.id;
    const isSelected = selectedPhotos.has(photo.id);
    const isLoaded = loadedImages.has(photo.id);

    return (
      <motion.div
        key={photo.id}
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          transition: {
            delay: index * 0.02,
            duration: 0.3
          }
        }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={enableHover ? { scale: 1.03, zIndex: 10 } : {}}
        className={clsx(
          'relative overflow-hidden rounded-2xl cursor-pointer group',
          photoSizeClasses[gridSize],
          'bg-gray-100 dark:bg-gray-800',
          {
            'ring-4 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900': isSelected,
            'shadow-2xl': isHovered
          }
        )}
        onMouseEnter={() => setHoveredPhoto(photo.id)}
        onMouseLeave={() => setHoveredPhoto(null)}
        onClick={() => onPhotoClick?.(photo, index)}
        onContextMenu={(e) => handlePhotoRightClick(e, photo)}
      >
        {/* Loading Skeleton */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse" />
        )}

        {/* Photo Image */}
        <motion.img
          src={photo.thumbnail || photo.path}
          alt=""
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          onLoad={() => handleImageLoad(photo.id)}
        />

        {/* Gradient Overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered || isSelected ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Selection Checkbox */}
        {enableSelection && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: isHovered || isSelected ? 1 : 0,
              scale: isHovered || isSelected ? 1 : 0.8
            }}
            transition={{ duration: 0.2 }}
            onClick={(e) => handlePhotoSelect(photo, e)}
            className={clsx(
              'absolute top-3 left-3 w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
              {
                'bg-blue-500 text-white': isSelected,
                'bg-white/20 backdrop-blur-sm hover:bg-white/30': !isSelected
              }
            )}
          >
            {isSelected && <Check className="w-4 h-4" />}
          </motion.button>
        )}

        {/* AI Score Badge */}
        {photo.aiScore && photo.aiScore > 0.8 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: isHovered ? 1 : 0.8, y: 0 }}
            className="absolute top-3 right-3 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-lg flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span className="font-semibold">AI Pick</span>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 20
          }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-3 left-3 right-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onPhotoAction?.('favorite', photo);
              }}
              className={clsx(
                'p-2 rounded-lg backdrop-blur-sm transition-colors',
                {
                  'bg-red-500 text-white': photo.favorite,
                  'bg-white/20 text-white hover:bg-white/30': !photo.favorite
                }
              )}
            >
              <Heart className={clsx('w-4 h-4', { 'fill-current': photo.favorite })} />
            </motion.button>

            {/* Rating Stars */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPhotoAction?.('rate', { ...photo, rating: star });
                  }}
                  className="text-yellow-400"
                >
                  <Star className={clsx('w-4 h-4', {
                    'fill-current': photo.rating && photo.rating >= star
                  })} />
                </motion.button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              handlePhotoRightClick(e, photo);
            }}
            className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </motion.button>
        </motion.div>

        {/* Metadata Overlay */}
        {showMetadata && (photo.date || photo.location || photo.people?.length) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent"
          >
            <div className="space-y-1 text-white text-xs">
              {photo.date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{photo.date}</span>
                </div>
              )}
              {photo.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{photo.location}</span>
                </div>
              )}
              {photo.people && photo.people.length > 0 && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{photo.people.join(', ')}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  // Timeline View
  const renderTimelineView = () => {
    const groupedPhotos = photos.reduce((acc, photo) => {
      const date = photo.date || 'Unknown';
      if (!acc[date]) acc[date] = [];
      acc[date].push(photo);
      return acc;
    }, {} as Record<string, Photo[]>);

    return (
      <div className="space-y-8">
        {Object.entries(groupedPhotos).map(([date, datePhotos], groupIndex) => (
          <motion.div
            key={date}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                {date}
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
            </div>
            <div className={clsx('grid', gridSizeClasses[gridSize])}>
              {datePhotos.map((photo, index) => renderPhoto(photo, groupIndex * 10 + index))}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Masonry View
  const renderMasonryView = () => {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
        {photos.map((photo, index) => (
          <div key={photo.id} className="break-inside-avoid mb-4">
            {renderPhoto(photo, index)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={clsx('relative', className)} ref={gridRef}>
      {/* View Mode Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewTransition(true)}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            className={clsx(
              'p-2 rounded-lg transition-colors',
              viewMode === 'masonry' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            className={clsx(
              'p-2 rounded-lg transition-colors',
              viewMode === 'timeline' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>

        {/* Selection Info */}
        {selectedPhotos.size > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-xl border border-blue-500/20"
          >
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {selectedPhotos.size} selected
            </span>
            <button
              onClick={() => onPhotoAction?.('clearSelection', {} as Photo)}
              className="p-1 hover:bg-blue-500/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>

      {/* Photo Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {viewMode === 'timeline' && renderTimelineView()}
          {viewMode === 'masonry' && renderMasonryView()}
          {viewMode === 'grid' && (
            <div className={clsx('grid', gridSizeClasses[gridSize])}>
              {photos.map((photo, index) => renderPhoto(photo, index))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenuPhoto && (
          <motion.div
            ref={refs.setFloating}
            style={floatingStyles}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 min-w-[200px] z-50"
          >
            <div className="space-y-1">
              <button
                onClick={() => handleAction('view')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
              <button
                onClick={() => handleAction('edit')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleAction('share')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => handleAction('download')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => handleAction('addToCollection')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                Add to Collection
              </button>
              <button
                onClick={() => handleAction('duplicate')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              <button
                onClick={() => handleAction('delete')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedPhotoGrid;