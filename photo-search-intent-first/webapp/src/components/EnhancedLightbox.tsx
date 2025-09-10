import React, { useEffect, useRef, useState, useCallback } from 'react'
import { 
  X, ZoomIn, ZoomOut, RotateCw, Heart, Share, Download, Info, 
  ChevronLeft, ChevronRight, Eye, Edit, ExternalLink, Maximize2,
  Keyboard, Copy
} from 'lucide-react'
import { thumbUrl, apiMetadataDetail } from '../api'
import { ImageEditor } from '../modules/ImageEditor'
import { FaceVerificationPanel } from './FaceVerificationPanel'
import { QualityOverlay } from './QualityOverlay'
import { EnhancedMetadataPanel } from './EnhancedMetadataPanel'
import { TouchGestureService, useTouchGestures } from '../services/TouchGestureService'

interface EnhancedLightboxProps {
  dir: string
  engine: string
  path: string
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onReveal: () => void
  onFavorite: () => void
  onMoreLikeThis?: () => void
  currentIndex?: number
  totalCount?: number
}

export function EnhancedLightbox({
  dir,
  engine,
  path,
  onPrev,
  onNext,
  onClose,
  onReveal,
  onFavorite,
  onMoreLikeThis,
  currentIndex,
  totalCount,
}: EnhancedLightboxProps) {
  if (!path) return null

  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  
  // State management
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [panning, setPanning] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showInfo, setShowInfo] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [showQuality, setShowQuality] = useState(false)
  const [showFacePanel, setShowFacePanel] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [toastMessage, setToastMessage] = useState<string>('')
  
  const panOrigin = useRef<{x:number;y:number;tx:number;ty:number}>({x:0,y:0,tx:0,ty:0})

  // Auto-hide controls after inactivity
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>()
  const resetHideControlsTimer = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }
    setShowControls(true)
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }, [])

  useEffect(() => {
    resetHideControlsTimer()
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
    }
  }, [resetHideControlsTimer])

  // Enhanced touch gesture handling
  const touchGestureService = useTouchGestures(containerRef, {
    minSwipeDistance: 50,
    maxSwipeTime: 300,
    maxScale: 5,
    minScale: 0.5,
    doubleTapZoom: 2,
    enablePullToRefresh: false
  })

  // Toast notification system
  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(''), 2000)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showEditor || showKeyboardShortcuts) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          onPrev()
          break
        case 'ArrowRight':
          onNext()
          break
        case ' ':
          e.preventDefault()
          onNext()
          break
        case 'i':
          setShowInfo(v => !v)
          break
        case 'f':
          onFavorite()
          showToast('Added to favorites')
          break
        case 'e':
          setShowEditor(true)
          break
        case 'r':
          resetZoom()
          showToast('Zoom reset')
          break
        case '+':
        case '=':
          zoomIn()
          break
        case '-':
          zoomOut()
          break
        case '?':
          setShowKeyboardShortcuts(true)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onPrev, onNext, onFavorite, showEditor, showKeyboardShortcuts])

  // Zoom functions with visual feedback
  function zoom(delta: number, cx?: number, cy?: number) {
    const prev = scale
    const next = Math.min(5, Math.max(0.5, +(prev + delta).toFixed(2)))
    if (next === prev) return
    
    const img = imgRef.current
    if (img && cx !== undefined && cy !== undefined) {
      const rect = img.getBoundingClientRect()
      const px = cx - rect.left
      const py = cy - rect.top
      const k = next / prev
      setTx(tx + (px - px * k))
      setTy(ty + (py - py * k))
    }
    setScale(next)
    showToast(`Zoom: ${Math.round(next * 100)}%`)
  }

  function resetZoom() { 
    setScale(1) 
    setTx(0) 
    setTy(0)
  }

  function zoomIn() { zoom(0.2) }
  function zoomOut() { zoom(-0.2) }

  // Mouse interaction handlers
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    resetHideControlsTimer()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    zoom(delta, e.clientX, e.clientY)
  }

  function onMouseDown(e: React.MouseEvent) {
    if (scale === 1) return
    setPanning(true)
    panOrigin.current = { x: e.clientX, y: e.clientY, tx, ty }
    resetHideControlsTimer()
  }

  function onMouseMove(e: React.MouseEvent) {
    resetHideControlsTimer()
    if (!panning) return
    const dx = e.clientX - panOrigin.current.x
    const dy = e.clientY - panOrigin.current.y
    setTx(panOrigin.current.tx + dx)
    setTy(panOrigin.current.ty + dy)
  }

  function onMouseUp() { setPanning(false) }
  function onMouseLeave() { setPanning(false) }

  function onDblClick(e: React.MouseEvent) {
    resetHideControlsTimer()
    if (scale === 1) zoom(1, e.clientX, e.clientY)
    else resetZoom()
  }

  // Reset image state when path changes
  useEffect(() => {
    setImageLoading(true)
    setImageError(false)
    resetZoom()
  }, [path])

  // Copy path to clipboard
  const copyPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(path)
      showToast('Path copied to clipboard')
    } catch {
      showToast('Failed to copy path')
    }
  }, [path, showToast])

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
      onMouseMove={resetHideControlsTimer}
    >
      <div
        className="relative w-full h-full flex flex-col"
        onClick={e => e.stopPropagation()}
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Photo viewer: ${path}`}
        tabIndex={-1}
      >
        {/* Top Controls */}
        <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <button
                onClick={copyPath}
                className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition-colors"
                title="Copy path (filename)"
              >
                <Copy size={16} />
                <span className="truncate max-w-96">{path.split('/').pop()}</span>
              </button>
              {currentIndex !== undefined && totalCount && (
                <span className="text-sm bg-white/10 px-2 py-1 rounded">
                  {currentIndex + 1} / {totalCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Image Area */}
        <div
          className="flex-1 relative overflow-hidden"
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onDoubleClick={onDblClick}
          style={{ 
            cursor: scale > 1 && panning ? 'grabbing' : scale > 1 ? 'grab' : 'default' 
          }}
        >
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <div className="text-xl mb-2">Failed to load image</div>
                <div className="text-sm opacity-75">{path}</div>
              </div>
            </div>
          )}

          <img
            ref={imgRef}
            src={thumbUrl(dir, engine, path, 1024)}
            className="w-full h-full object-contain select-none"
            style={{ 
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
              transformOrigin: '0 0'
            }}
            alt={path}
            draggable={false}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false)
              setImageError(true)
            }}
          />

          <QualityOverlay imagePath={path} show={showQuality} />

          {/* Navigation Arrows */}
          <button
            onClick={onPrev}
            className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
            title="Previous (←)"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={onNext}
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
            title="Next (→ or Space)"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Bottom Controls */}
        <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white/10 rounded p-1">
              <button
                onClick={zoomOut}
                className="p-2 hover:bg-white/20 text-white rounded transition-colors"
                title="Zoom out (-)"
              >
                <ZoomOut size={18} />
              </button>
              <div className="text-white text-sm min-w-12 text-center px-2">
                {Math.round(scale * 100)}%
              </div>
              <button
                onClick={zoomIn}
                className="p-2 hover:bg-white/20 text-white rounded transition-colors"
                title="Zoom in (+)"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={resetZoom}
                className="p-2 hover:bg-white/20 text-white rounded transition-colors"
                title="Reset zoom (R)"
              >
                <Maximize2 size={18} />
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => { setShowInfo(v => !v) }}
              className={`p-2 rounded transition-colors ${showInfo ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              title="Toggle info (I)"
            >
              <Info size={18} />
            </button>
            
            <button
              onClick={() => { setShowQuality(v => !v) }}
              className={`p-2 rounded transition-colors ${showQuality ? 'bg-green-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              title="Toggle quality overlay"
            >
              <Eye size={18} />
            </button>

            <button
              onClick={() => setShowEditor(true)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
              title="Edit image (E)"
            >
              <Edit size={18} />
            </button>

            <button
              onClick={() => { onFavorite(); showToast('Added to favorites') }}
              className="p-2 bg-white/10 hover:bg-pink-600/80 text-white rounded transition-colors"
              title="Add to favorites (F)"
            >
              <Heart size={18} />
            </button>

            <button
              onClick={onReveal}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
              title="Reveal in file explorer"
            >
              <ExternalLink size={18} />
            </button>

            {onMoreLikeThis && (
              <button
                onClick={onMoreLikeThis}
                className="p-2 bg-white/10 hover:bg-blue-600/80 text-white rounded transition-colors"
                title="Find similar images"
              >
                <Share size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded animate-fade-in-out">
            {toastMessage}
          </div>
        )}

        {/* Enhanced Info Panel */}
        {showInfo && (
          <div className="absolute top-16 right-4 w-96">
            <EnhancedMetadataPanel
              dir={dir}
              path={path}
              onClose={() => setShowInfo(false)}
              compact={false}
              className="animate-slide-in-right"
            />
          </div>
        )}

        {/* Keyboard Shortcuts Modal */}
        {showKeyboardShortcuts && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
                <button
                  onClick={() => setShowKeyboardShortcuts(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Next image</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">→ or Space</span>
                </div>
                <div className="flex justify-between">
                  <span>Previous image</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">←</span>
                </div>
                <div className="flex justify-between">
                  <span>Close</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">Esc</span>
                </div>
                <div className="flex justify-between">
                  <span>Toggle info</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">I</span>
                </div>
                <div className="flex justify-between">
                  <span>Add to favorites</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">F</span>
                </div>
                <div className="flex justify-between">
                  <span>Edit image</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">E</span>
                </div>
                <div className="flex justify-between">
                  <span>Zoom in/out</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">+ / -</span>
                </div>
                <div className="flex justify-between">
                  <span>Reset zoom</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">R</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Face Panel */}
        {showFacePanel && (
          <div className="absolute bottom-20 left-4 right-4 bg-white/95 backdrop-blur text-gray-900 rounded-lg p-4 shadow-lg">
            <FaceVerificationPanel
              imagePath={path}
              detectedFaces={[]} 
              knownPeople={new Map()}
              onVerify={(clusterId, verified) => {
                console.log('Face verified:', clusterId, verified)
              }}
              onCreateNew={(name) => {
                console.log('New person created:', name)
              }}
            />
          </div>
        )}

        {/* Image Editor */}
        {showEditor && (
          <ImageEditor
            imagePath={path}
            onSave={(editedPath) => {
              showToast('Image saved successfully')
              setShowEditor(false)
            }}
            onClose={() => setShowEditor(false)}
          />
        )}
      </div>
    </div>
  )
}