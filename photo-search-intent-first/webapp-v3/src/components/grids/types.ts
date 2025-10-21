/**
 * Shared Photo type for grid components
 */

export default interface Photo {
  path: string;
  thumbnail?: string;
  metadata?: {
    timestamp?: number;
    title?: string;
    views?: number;
    lastViewed?: number;
  };
  score?: number;
}
