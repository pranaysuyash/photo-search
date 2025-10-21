import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Monitor, FileVideo, Calendar } from 'lucide-react';
import type { FileMetadata } from '@/services/fileSystemService';

interface VideoInfoProps {
  metadata: FileMetadata;
  className?: string;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function VideoInfo({ metadata, className }: VideoInfoProps) {
  const { dimensions, size, dateModified, exifData } = metadata;
  
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ''}`}>
      {/* Video type indicator */}
      <Badge variant="secondary" className="gap-1">
        <FileVideo className="h-3 w-3" />
        Video
      </Badge>
      
      {/* Dimensions */}
      {dimensions && (
        <Badge variant="outline" className="gap-1">
          <Monitor className="h-3 w-3" />
          {dimensions.width}×{dimensions.height}
        </Badge>
      )}
      
      {/* Duration from EXIF if available */}
      {exifData?.duration && (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          {formatDuration(exifData.duration)}
        </Badge>
      )}
      
      {/* File size */}
      <Badge variant="outline">
        {formatFileSize(size)}
      </Badge>
      
      {/* Date modified */}
      <Badge variant="outline" className="gap-1">
        <Calendar className="h-3 w-3" />
        {dateModified.toLocaleDateString()}
      </Badge>
    </div>
  );
}

export default VideoInfo;