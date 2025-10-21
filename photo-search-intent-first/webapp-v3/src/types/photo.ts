/**
 * Core photo and metadata type definitions
 * Based on the design document specifications
 */

// Core Photo Interface
export interface Photo {
  id: string;
  path: string;
  filename: string;
  thumbnailUrl: string;
  fileUrl?: string; // Direct file URL for offline access
  isImage: boolean;
  isVideo: boolean;
  width?: number;
  height?: number;
  size?: number;
  dateModified?: string;
  dateCreated?: string;
  metadata: PhotoMetadata;
  score?: number;
  favorite: boolean;
  tags?: string[];
  collections?: string[];
  rating?: number;
  exifData?: Record<string, any>;
}

// Comprehensive Photo Metadata
export interface PhotoMetadata {
  // File information
  path: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  modifiedAt: Date;
  
  // EXIF data
  exif: ExifData;
  
  // Location data
  location?: LocationData;
  
  // AI-generated data
  ai: AIData;
  
  // User data
  user: UserData;
}

// EXIF Data Interface
export interface ExifData {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: number;
  shutterSpeed?: string;
  focalLength?: number;
  flash?: boolean;
  whiteBalance?: string;
  orientation?: number;
}

// Location Data Interface
export interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  address?: string;
  city?: string;
  country?: string;
}

// AI-Generated Data Interface
export interface AIData {
  embeddings?: number[];
  faces?: FaceDetection[];
  text?: string;
  captions?: string[];
  tags?: string[];
  confidence?: number;
}

// Face Detection Interface
export interface FaceDetection {
  bbox: [number, number, number, number]; // x, y, width, height
  confidence: number;
  embedding?: number[];
  personId?: string;
  personName?: string;
  landmarks?: Record<string, [number, number]>;
}

// User Data Interface
export interface UserData {
  favorite: boolean;
  tags: string[];
  collections: string[];
  rating?: number;
  notes?: string;
}

// Date Range Interface
export interface DateRange {
  start: Date;
  end: Date;
}

// Location Filter Interface
export interface LocationFilter {
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
  address?: string;
  city?: string;
  country?: string;
}

// Camera Filter Interface
export interface CameraFilter {
  camera?: string;
  lens?: string;
  isoRange?: [number, number];
  apertureRange?: [number, number];
  focalLengthRange?: [number, number];
}

// Collection Interface
export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  rules?: SmartCollectionRule[];
  isSmart: boolean;
  photoCount: number;
  coverPhotoId?: string;
}

// Smart Collection Rule Interface
export interface SmartCollectionRule {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | Date | [string | number | Date, string | number | Date];
  logicalOperator?: 'AND' | 'OR';
}

// Tag Interface
export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
  photoCount: number;
}

// Person Interface (for face recognition)
export interface Person {
  id: string;
  name?: string;
  representativePhotoId?: string;
  photoCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Trip Interface (for location-based grouping)
export interface Trip {
  id: string;
  name?: string;
  startDate: Date;
  endDate: Date;
  locations: LocationData[];
  photoCount: number;
  coverPhotoId?: string;
}

// Place Interface (for hierarchical location organization)
export interface Place {
  id: string;
  name: string;
  type: 'country' | 'state' | 'city' | 'landmark';
  parentId?: string;
  coordinates?: LocationData;
  photoCount: number;
}