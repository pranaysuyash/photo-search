import React, { useState, useRef, useEffect } from 'react';
import { getAPI } from '../services/PhotoVaultAPI';
import { 
  RotateCw, Flip, Crop, Maximize, Download, 
  Save, X, Check, ArrowUp, ArrowDown, ArrowLeft, ArrowRight 
} from 'lucide-react';

interface ImageEditorProps {
  imagePath: string;
  onClose?: () => void;
  onSave?: (path: string) => void;
}

export function ImageEditor({ imagePath, onClose, onSave }: ImageEditorProps) {
  const [editedPath, setEditedPath] = useState(imagePath);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [upscaleScale, setUpscaleScale] = useState<2 | 4>(2);
  const [upscaleEngine, setUpscaleEngine] = useState<'pil' | 'realesrgan'>('pil');
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<string[]>([imagePath]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const api = getAPI();
  const imageRef = useRef<HTMLImageElement>(null);

  const applyRotation = async (degrees: number) => {
    setProcessing(true);
    try {
      const ops = { rotate: degrees };
      const result = await api.editImage(editedPath, ops);
      addToHistory(result.out_path);
      setEditedPath(result.out_path);
      setRotation(0);
    } catch (error) {
      console.error('Failed to rotate image:', error);
    } finally {
      setProcessing(false);
    }
  };

  const applyFlip = async (direction: 'h' | 'v') => {
    setProcessing(true);
    try {
      const ops = { flip: direction };
      const result = await api.editImage(editedPath, ops);
      addToHistory(result.out_path);
      setEditedPath(result.out_path);
      if (direction === 'h') setFlipH(false);
      else setFlipV(false);
    } catch (error) {
      console.error('Failed to flip image:', error);
    } finally {
      setProcessing(false);
    }
  };

  const applyCrop = async () => {
    if (!imageRef.current) return;
    
    setProcessing(true);
    try {
      const img = imageRef.current;
      const realCrop = {
        x: Math.round((cropArea.x / 100) * img.naturalWidth),
        y: Math.round((cropArea.y / 100) * img.naturalHeight),
        w: Math.round((cropArea.w / 100) * img.naturalWidth),
        h: Math.round((cropArea.h / 100) * img.naturalHeight)
      };
      
      const ops = { crop: realCrop };
      const result = await api.editImage(editedPath, ops);
      addToHistory(result.out_path);
      setEditedPath(result.out_path);
      setCropMode(false);
    } catch (error) {
      console.error('Failed to crop image:', error);
    } finally {
      setProcessing(false);
    }
  };

  const applyUpscale = async () => {
    setProcessing(true);
    try {
      const result = await api.upscaleImage(editedPath, upscaleScale, upscaleEngine);
      addToHistory(result.out_path);
      setEditedPath(result.out_path);
    } catch (error) {
      console.error('Failed to upscale image:', error);
    } finally {
      setProcessing(false);
    }
  };

  const addToHistory = (path: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setEditedPath(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setEditedPath(history[historyIndex + 1]);
    }
  };

  const handleSave = () => {
    if (onSave) onSave(editedPath);
    if (onClose) onClose();
  };

  const exportImage = async () => {
    try {
      const dest = prompt('Enter export destination folder:');
      if (!dest) return;
      
      const result = await api.exportImages([editedPath], dest, 'copy', false, false);
      alert(`Exported to: ${result.dest}`);
    } catch (error) {
      console.error('Failed to export image:', error);
    }
  };

  return (
    <div className="image-editor">
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button 
            onClick={() => applyRotation(90)}
            disabled={processing}
            className="toolbar-btn"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => applyFlip('h')}
            disabled={processing}
            className="toolbar-btn"
            title="Flip Horizontal"
          >
            <ArrowLeft className="w-4 h-4" />
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={() => applyFlip('v')}
            disabled={processing}
            className="toolbar-btn"
            title="Flip Vertical"
          >
            <ArrowUp className="w-4 h-4" />
            <ArrowDown className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setCropMode(!cropMode)}
            disabled={processing}
            className={`toolbar-btn ${cropMode ? 'active' : ''}`}
            title="Crop"
          >
            <Crop className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-group">
          <select 
            value={upscaleScale}
            onChange={(e) => setUpscaleScale(Number(e.target.value) as 2 | 4)}
            className="toolbar-select"
          >
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
          <select 
            value={upscaleEngine}
            onChange={(e) => setUpscaleEngine(e.target.value as 'pil' | 'realesrgan')}
            className="toolbar-select"
          >
            <option value="pil">PIL</option>
            <option value="realesrgan">RealESRGAN</option>
          </select>
          <button 
            onClick={applyUpscale}
            disabled={processing}
            className="toolbar-btn"
            title="Upscale"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-group">
          <button 
            onClick={undo}
            disabled={historyIndex === 0 || processing}
            className="toolbar-btn"
          >
            Undo
          </button>
          <button 
            onClick={redo}
            disabled={historyIndex === history.length - 1 || processing}
            className="toolbar-btn"
          >
            Redo
          </button>
        </div>

        <div className="toolbar-group ml-auto">
          <button onClick={exportImage} className="toolbar-btn">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            <Save className="w-4 h-4" />
            Save
          </button>
          {onClose && (
            <button onClick={onClose} className="toolbar-btn">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="editor-canvas">
        {processing && (
          <div className="processing-overlay">
            <div className="spinner" />
            <p>Processing...</p>
          </div>
        )}
        
        <div className="image-container">
          <img 
            ref={imageRef}
            src={api.getThumbnailUrl(editedPath)}
            alt="Editing"
            style={{
              transform: `rotate(${rotation}deg) ${flipH ? 'scaleX(-1)' : ''} ${flipV ? 'scaleY(-1)' : ''}`
            }}
          />
          
          {cropMode && (
            <div 
              className="crop-overlay"
              style={{
                left: `${cropArea.x}%`,
                top: `${cropArea.y}%`,
                width: `${cropArea.w}%`,
                height: `${cropArea.h}%`
              }}
            >
              <div className="crop-controls">
                <button onClick={applyCrop} className="btn btn-primary btn-sm">
                  <Check className="w-3 h-3" />
                  Apply
                </button>
                <button onClick={() => setCropMode(false)} className="btn btn-secondary btn-sm">
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .image-editor {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--bg-primary);
        }

        .editor-toolbar {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-subtle);
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .toolbar-group.ml-auto {
          margin-left: auto;
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .toolbar-btn:hover:not(:disabled) {
          background: var(--bg-tertiary);
          border-color: var(--accent-primary);
        }

        .toolbar-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toolbar-btn.active {
          background: var(--accent-primary);
          color: white;
        }

        .toolbar-select {
          padding: 0.5rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
        }

        .editor-canvas {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: var(--bg-tertiary);
        }

        .processing-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          z-index: 10;
          color: white;
        }

        .image-container {
          position: relative;
          max-width: 90%;
          max-height: 90%;
        }

        .image-container img {
          max-width: 100%;
          max-height: 100%;
          transition: transform 0.3s;
        }

        .crop-overlay {
          position: absolute;
          border: 2px solid var(--accent-primary);
          background: rgba(0, 122, 255, 0.1);
          cursor: move;
        }

        .crop-controls {
          position: absolute;
          bottom: -40px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.5rem;
          white-space: nowrap;
        }

        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.875rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}