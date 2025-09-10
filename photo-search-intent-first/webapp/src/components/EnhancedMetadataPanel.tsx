import React, { useState, useEffect } from 'react';
import { 
  Camera, Calendar, MapPin, Image, Settings, Star, Info, 
  ChevronDown, ChevronRight, Copy, ExternalLink, Tag,
  Monitor, Aperture, Timer, Zap, Palette, Smartphone
} from 'lucide-react';
import { metadataService, type PhotoMetadata, type ExifData } from '../services/MetadataService';
import { LoadingSpinner, MetadataSkeletonPanel } from './ui/EnhancedLoading';
import { usePhotoToasts } from './ui/Toast';

interface EnhancedMetadataPanelProps {
  dir: string;
  path: string;
  onClose?: () => void;
  compact?: boolean;
  className?: string;
}

interface MetadataSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  fields: Array<{
    key: keyof ExifData | 'fileSize' | 'megapixels' | 'aspectRatio' | 'colorSpace' | 'bitDepth';
    label: string;
    formatter?: (value: any) => string;
    copyable?: boolean;
    linkable?: boolean;
  }>;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

const METADATA_SECTIONS: MetadataSection[] = [
  {
    id: 'camera',
    title: 'Camera Information',
    icon: Camera,
    collapsible: true,
    defaultOpen: true,
    fields: [
      { key: 'make', label: 'Camera Make', copyable: true },
      { key: 'model', label: 'Camera Model', copyable: true },
      { key: 'lens_make', label: 'Lens Make', copyable: true },
      { key: 'lens_model', label: 'Lens Model', copyable: true },
      { key: 'software', label: 'Software', copyable: true }
    ]
  },
  {
    id: 'settings',
    title: 'Camera Settings',
    icon: Settings,
    collapsible: true,
    defaultOpen: true,
    fields: [
      { 
        key: 'aperture', 
        label: 'Aperture', 
        formatter: (v) => v ? `f/${v}` : undefined,
        copyable: true
      },
      { key: 'shutter_speed', label: 'Shutter Speed', copyable: true },
      { 
        key: 'iso', 
        label: 'ISO', 
        formatter: (v) => v ? `ISO ${v}` : undefined,
        copyable: true
      },
      { 
        key: 'focal_length', 
        label: 'Focal Length', 
        formatter: (v) => v ? `${v}mm` : undefined,
        copyable: true
      },
      { key: 'flash', label: 'Flash', copyable: true },
      { key: 'white_balance', label: 'White Balance', copyable: true },
      { key: 'metering_mode', label: 'Metering Mode', copyable: true }
    ]
  },
  {
    id: 'image',
    title: 'Image Properties',
    icon: Image,
    collapsible: true,
    defaultOpen: true,
    fields: [
      { key: 'width', label: 'Width', formatter: (v) => v ? `${v}px` : undefined },
      { key: 'height', label: 'Height', formatter: (v) => v ? `${v}px` : undefined },
      { 
        key: 'megapixels', 
        label: 'Megapixels', 
        formatter: (v) => v ? `${v}MP` : undefined 
      },
      { 
        key: 'aspectRatio', 
        label: 'Aspect Ratio'
      },
      { key: 'colorSpace', label: 'Color Space', copyable: true },
      { key: 'bitDepth', label: 'Bit Depth', formatter: (v) => v ? `${v} bit` : undefined }
    ]
  },
  {
    id: 'datetime',
    title: 'Date & Time',
    icon: Calendar,
    collapsible: true,
    defaultOpen: true,
    fields: [
      { 
        key: 'date_taken', 
        label: 'Date Taken', 
        formatter: (v) => v ? new Date(v).toLocaleString() : undefined,
        copyable: true
      },
      { 
        key: 'date_modified', 
        label: 'Date Modified', 
        formatter: (v) => v ? new Date(v).toLocaleString() : undefined,
        copyable: true
      }
    ]
  },
  {
    id: 'location',
    title: 'Location',
    icon: MapPin,
    collapsible: true,
    defaultOpen: false,
    fields: [
      { key: 'location_name', label: 'Location', copyable: true, linkable: true },
      { key: 'latitude', label: 'Latitude', formatter: (v) => v ? `${v.toFixed(6)}°` : undefined, copyable: true },
      { key: 'longitude', label: 'Longitude', formatter: (v) => v ? `${v.toFixed(6)}°` : undefined, copyable: true },
      { key: 'altitude', label: 'Altitude', formatter: (v) => v ? `${v}m` : undefined }
    ]
  }
];

export function EnhancedMetadataPanel({ 
  dir, 
  path, 
  onClose, 
  compact = false,
  className = '' 
}: EnhancedMetadataPanelProps) {
  const [metadata, setMetadata] = useState<PhotoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(METADATA_SECTIONS.filter(s => !s.defaultOpen).map(s => s.id))
  );
  
  const photoToasts = usePhotoToasts();

  useEffect(() => {
    let cancelled = false;
    
    async function loadMetadata() {
      if (!path) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Use the existing metadata service
        const response = await metadataService.getMetadata(dir, path);
        
        if (!cancelled) {
          setMetadata(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load metadata');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMetadata();
    
    return () => {
      cancelled = true;
    };
  }, [dir, path]);

  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  const copyToClipboard = async (value: string, label: string) => {
    await photoToasts.copyToClipboard(value, label);
  };

  const openLocation = (location: string) => {
    const query = encodeURIComponent(location);
    window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg ${compact ? 'p-3' : 'p-4'} ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Image Information</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close metadata panel"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        <MetadataSkeletonPanel />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg ${compact ? 'p-3' : 'p-4'} ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Image Information</h3>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        <div className="text-center py-8">
          <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className={`bg-white rounded-lg shadow-lg ${compact ? 'p-3' : 'p-4'} ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Image Information</h3>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        <div className="text-center py-8">
          <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No metadata available</p>
        </div>
      </div>
    );
  }

  // Calculate computed fields
  const computedData = {
    ...metadata.exif,
    megapixels: metadata.megapixels,
    aspectRatio: metadata.aspectRatio,
    fileSize: metadata.fileSize,
    colorSpace: metadata.exif?.color_space || 'sRGB',
    bitDepth: 8 // Default value since it's not in the existing service
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${compact ? 'p-3' : 'p-4'} ${className} max-h-96 overflow-y-auto`}>
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b">
        <h3 className="font-semibold text-gray-900">Image Information</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close metadata panel"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {METADATA_SECTIONS.map((section) => {
          const isCollapsed = collapsedSections.has(section.id);
          const sectionFields = section.fields.filter(field => {
            const value = computedData[field.key as keyof typeof computedData];
            return value !== undefined && value !== null && value !== '';
          });

          if (sectionFields.length === 0) return null;

          const SectionIcon = section.icon;

          return (
            <div key={section.id} className="border border-gray-200 rounded-lg">
              {section.collapsible ? (
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <SectionIcon size={16} className="text-gray-600" />
                    <span className="font-medium text-sm text-gray-900">
                      {section.title}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({sectionFields.length})
                    </span>
                  </div>
                  <ChevronDown 
                    size={16} 
                    className={`text-gray-400 transition-transform ${
                      isCollapsed ? '-rotate-90' : ''
                    }`} 
                  />
                </button>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-50">
                  <SectionIcon size={16} className="text-gray-600" />
                  <span className="font-medium text-sm text-gray-900">
                    {section.title}
                  </span>
                </div>
              )}

              {!isCollapsed && (
                <div className="px-3 pb-3">
                  <div className="space-y-2">
                    {sectionFields.map((field) => {
                      const value = computedData[field.key as keyof typeof computedData];
                      const displayValue = field.formatter ? field.formatter(value) : value;

                      return (
                        <div key={field.key} className="flex justify-between items-center group">
                          <span className="text-xs text-gray-600 font-medium">
                            {field.label}:
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-900 font-mono">
                              {displayValue}
                            </span>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              {field.copyable && (
                                <button
                                  onClick={() => copyToClipboard(String(displayValue), field.label)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title={`Copy ${field.label}`}
                                >
                                  <Copy size={12} className="text-gray-400" />
                                </button>
                              )}
                              {field.linkable && field.key === 'place' && (
                                <button
                                  onClick={() => openLocation(String(displayValue))}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Open in Google Maps"
                                >
                                  <ExternalLink size={12} className="text-gray-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Tags Section */}
        {metadata.exif?.keywords && metadata.exif.keywords.length > 0 && (
          <div className="border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 p-3 bg-gray-50">
              <Tag size={16} className="text-gray-600" />
              <span className="font-medium text-sm text-gray-900">Keywords</span>
              <span className="text-xs text-gray-500">({metadata.exif.keywords.length})</span>
            </div>
            <div className="p-3">
              <div className="flex flex-wrap gap-1">
                {metadata.exif.keywords.map((tag: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => copyToClipboard(tag, 'Keyword')}
                    className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full text-xs font-medium transition-colors"
                    title="Click to copy"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* File Information */}
        <div className="border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 p-3 bg-gray-50">
            <Monitor size={16} className="text-gray-600" />
            <span className="font-medium text-sm text-gray-900">File Information</span>
          </div>
          <div className="px-3 pb-3 space-y-2">
            <div className="flex justify-between items-center group">
              <span className="text-xs text-gray-600 font-medium">Filename:</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-900 font-mono max-w-48 truncate">
                  {metadata.displayName}
                </span>
                <button
                  onClick={() => copyToClipboard(metadata.displayName || '', 'Filename')}
                  className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy filename"
                >
                  <Copy size={12} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-xs text-gray-600 font-medium">Full Path:</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-900 font-mono max-w-48 truncate">
                  {metadata.path}
                </span>
                <button
                  onClick={() => copyToClipboard(metadata.path, 'File path')}
                  className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy full path"
                >
                  <Copy size={12} className="text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}