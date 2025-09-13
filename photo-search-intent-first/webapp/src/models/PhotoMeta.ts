export interface PhotoMeta {
  // Core EXIF-ish fields used across UI
  camera?: string;
  lens?: string;
  iso?: number;
  fnumber?: number;
  shutter?: string | number;
  datetime?: number; // unix seconds
  mtime?: number; // unix seconds (file mtime)
  width?: number;
  height?: number;
  place?: string;
  tags?: string[];
  // Optional conveniences sometimes present in responses/UIs
  title?: string;
  description?: string;
  rating?: number;
  id?: string;
  // Optional face detection results
  faces?: Array<{ id: string; bbox: number[]; confidence: number }>;
}
