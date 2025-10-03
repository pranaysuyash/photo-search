"""
Enhanced search service with temporal search, style similarity, and advanced filtering.
"""
import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from PIL import Image
import cv2
from sklearn.cluster import KMeans
from collections import defaultdict

from infra.index_store import IndexStore, SearchResult
from domain.models import Photo


class EnhancedSearchService:
    """Enhanced search service with advanced capabilities."""
    
    def __init__(self, store: IndexStore):
        self.store = store
        self._load_metadata()
    
    def _load_metadata(self) -> None:
        """Load EXIF and other metadata for enhanced search capabilities."""
        self.meta_data = {}
        meta_p = self.store.index_dir / 'exif_index.json'
        if meta_p.exists():
            try:
                self.meta_data = json.loads(meta_p.read_text())
            except Exception:
                self.meta_data = {}
    
    def temporal_search(self, 
                       query_time: Optional[float] = None,
                       time_window_hours: float = 24.0,
                       season: Optional[str] = None,
                       time_of_day: Optional[str] = None,
                       year: Optional[int] = None,
                       month: Optional[int] = None) -> List[SearchResult]:
        """
        Search for photos based on temporal criteria.
        
        Args:
            query_time: Reference timestamp for similarity search
            time_window_hours: Time window in hours for grouping
            season: Season to filter by (spring, summer, fall, winter)
            time_of_day: Time of day to filter by (morning, afternoon, evening, night)
            year: Specific year to filter by
            month: Specific month to filter by (1-12)
            
        Returns:
            List of search results matching temporal criteria
        """
        if not self.store.state.paths or not self.store.state.mtimes:
            return []
        
        # Create time mapping
        time_map = {p: t for p, t in zip(self.store.state.paths, self.store.state.mtimes)}
        
        # Filter by time window around query_time
        filtered_paths = []
        if query_time is not None:
            for path, mtime in time_map.items():
                time_diff = abs(mtime - query_time)
                if time_diff <= (time_window_hours * 3600):  # Convert hours to seconds
                    filtered_paths.append(path)
        else:
            filtered_paths = list(time_map.keys())
        
        # Apply seasonal filtering
        if season:
            filtered_paths = self._filter_by_season(filtered_paths, season)
        
        # Apply time of day filtering
        if time_of_day:
            filtered_paths = self._filter_by_time_of_day(filtered_paths, time_of_day)
        
        # Apply year/month filtering
        if year or month:
            filtered_paths = self._filter_by_year_month(filtered_paths, year, month)
        
        # Create dummy search results for filtered paths
        # In a real implementation, this would be combined with semantic search scores
        results = [SearchResult(path=Path(p), score=1.0) for p in filtered_paths]
        return results
    
    def _filter_by_season(self, paths: List[str], season: str) -> List[str]:
        """Filter paths by season based on EXIF timestamps."""
        season_map = {
            'spring': [3, 4, 5],
            'summer': [6, 7, 8],
            'fall': [9, 10, 11],
            'winter': [12, 1, 2]
        }
        
        target_months = season_map.get(season.lower(), [])
        if not target_months:
            return paths
        
        filtered_paths = []
        for path in paths:
            # Extract month from EXIF data or file timestamp
            month = self._get_photo_month(path)
            if month in target_months:
                filtered_paths.append(path)
        
        return filtered_paths
    
    def _filter_by_time_of_day(self, paths: List[str], time_of_day: str) -> List[str]:
        """Filter paths by time of day based on EXIF timestamps."""
        time_ranges = {
            'morning': (6, 12),
            'afternoon': (12, 17),
            'evening': (17, 20),
            'night': (20, 6)
        }
        
        time_range = time_ranges.get(time_of_day.lower())
        if not time_range:
            return paths
        
        filtered_paths = []
        for path in paths:
            # Extract hour from EXIF data or file timestamp
            hour = self._get_photo_hour(path)
            if time_range[0] <= time_range[1]:  # Normal range
                if time_range[0] <= hour < time_range[1]:
                    filtered_paths.append(path)
            else:  # Overnight range (e.g., 20-6)
                if hour >= time_range[0] or hour < time_range[1]:
                    filtered_paths.append(path)
        
        return filtered_paths
    
    def _filter_by_year_month(self, paths: List[str], year: Optional[int], month: Optional[int]) -> List[str]:
        """Filter paths by specific year and/or month."""
        filtered_paths = []
        for path in paths:
            photo_year = self._get_photo_year(path)
            photo_month = self._get_photo_month(path)
            
            year_match = year is None or photo_year == year
            month_match = month is None or photo_month == month
            
            if year_match and month_match:
                filtered_paths.append(path)
        
        return filtered_paths
    
    def _get_photo_hour(self, path: str) -> int:
        """Extract hour from photo timestamp."""
        try:
            # Try to get from EXIF data first
            if 'paths' in self.meta_data and path in self.meta_data.get('paths', []):
                idx = self.meta_data['paths'].index(path)
                timestamp_fields = ['timestamp', 'datetime_original', 'datetime']
                for field in timestamp_fields:
                    if field in self.meta_data:
                        timestamp = self.meta_data[field][idx]
                        if timestamp:
                            # Parse timestamp string to datetime
                            dt = datetime.strptime(timestamp, '%Y:%m:%d %H:%M:%S')
                            return dt.hour
            
            # Fallback to file modification time
            time_map = {p: t for p, t in zip(self.store.state.paths, self.store.state.mtimes)}
            mtime = time_map.get(path, 0)
            return datetime.fromtimestamp(mtime).hour
        except Exception:
            return 0  # Default to midnight
    
    def _get_photo_year(self, path: str) -> int:
        """Extract year from photo timestamp."""
        try:
            # Try to get from EXIF data first
            if 'paths' in self.meta_data and path in self.meta_data.get('paths', []):
                idx = self.meta_data['paths'].index(path)
                timestamp_fields = ['timestamp', 'datetime_original', 'datetime']
                for field in timestamp_fields:
                    if field in self.meta_data:
                        timestamp = self.meta_data[field][idx]
                        if timestamp:
                            # Parse timestamp string to datetime
                            dt = datetime.strptime(timestamp, '%Y:%m:%d %H:%M:%S')
                            return dt.year
            
            # Fallback to file modification time
            time_map = {p: t for p, t in zip(self.store.state.paths, self.store.state.mtimes)}
            mtime = time_map.get(path, 0)
            return datetime.fromtimestamp(mtime).year
        except Exception:
            return datetime.now().year
    
    def _get_photo_month(self, path: str) -> int:
        """Extract month from photo timestamp."""
        try:
            # Try to get from EXIF data first
            if 'paths' in self.meta_data and path in self.meta_data.get('paths', []):
                idx = self.meta_data['paths'].index(path)
                timestamp_fields = ['timestamp', 'datetime_original', 'datetime']
                for field in timestamp_fields:
                    if field in self.meta_data:
                        timestamp = self.meta_data[field][idx]
                        if timestamp:
                            # Parse timestamp string to datetime
                            dt = datetime.strptime(timestamp, '%Y:%m:%d %H:%M:%S')
                            return dt.month
            
            # Fallback to file modification time
            time_map = {p: t for p, t in zip(self.store.state.paths, self.store.state.mtimes)}
            mtime = time_map.get(path, 0)
            return datetime.fromtimestamp(mtime).month
        except Exception:
            return 1  # Default to January
    
    def style_similarity_search(self, 
                              reference_path: str,
                              top_k: int = 12,
                              style_weight: float = 0.3,
                              color_weight: float = 0.4,
                              texture_weight: float = 0.3) -> List[SearchResult]:
        """
        Search for photos with similar visual style to a reference photo.
        
        Args:
            reference_path: Path to the reference photo
            top_k: Number of results to return
            style_weight: Weight for overall style similarity
            color_weight: Weight for color similarity
            texture_weight: Weight for texture similarity
            
        Returns:
            List of search results ordered by style similarity
        """
        if not self.store.state.paths or not self.store.state.embeddings:
            return []
        
        # Extract features from reference image
        try:
            ref_features = self._extract_visual_features(reference_path)
        except Exception:
            return []  # Failed to process reference image
        
        # Compare with all other images
        similarities = []
        for i, path in enumerate(self.store.state.paths):
            if path == reference_path:
                continue
            
            try:
                # Extract features from current image
                features = self._extract_visual_features(path)
                
                # Calculate similarity scores
                color_sim = self._color_similarity(ref_features['color_histogram'], features['color_histogram'])
                texture_sim = self._texture_similarity(ref_features['texture_features'], features['texture_features'])
                style_sim = color_weight * color_sim + texture_weight * texture_sim
                
                # Combine with semantic similarity if available
                semantic_sim = 0.0
                if self.store.state.embeddings is not None:
                    try:
                        ref_idx = self.store.state.paths.index(reference_path)
                        ref_emb = self.store.state.embeddings[ref_idx]
                        curr_emb = self.store.state.embeddings[i]
                        # Cosine similarity
                        semantic_sim = float(np.dot(ref_emb, curr_emb) / 
                                           (np.linalg.norm(ref_emb) * np.linalg.norm(curr_emb) + 1e-9))
                    except Exception:
                        semantic_sim = 0.0
                
                # Combined score
                combined_score = (style_weight * style_sim + (1 - style_weight) * semantic_sim)
                similarities.append((path, combined_score))
            except Exception:
                continue
        
        # Sort by similarity score
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Return top_k results
        results = [SearchResult(path=Path(p), score=float(s)) for p, s in similarities[:top_k]]
        return results
    
    def _extract_visual_features(self, image_path: str) -> Dict[str, Any]:
        """
        Extract visual features from an image for style similarity.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary containing visual features
        """
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Resize for efficiency
        image = cv2.resize(image, (224, 224))
        
        # Convert to different color spaces
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        
        # Color histogram features
        hist_b = cv2.calcHist([image], [0], None, [32], [0, 256]).flatten()
        hist_g = cv2.calcHist([image], [1], None, [32], [0, 256]).flatten()
        hist_r = cv2.calcHist([image], [2], None, [32], [0, 256]).flatten()
        color_histogram = np.concatenate([hist_b, hist_g, hist_r])
        color_histogram = color_histogram / (color_histogram.sum() + 1e-9)  # Normalize
        
        # Texture features using Local Binary Pattern (simplified)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        texture_features = self._extract_texture_features(gray)
        
        # Dominant colors using K-means clustering
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pixels = image_rgb.reshape((-1, 3))
        kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
        kmeans.fit(pixels)
        dominant_colors = kmeans.cluster_centers_
        
        return {
            'color_histogram': color_histogram,
            'texture_features': texture_features,
            'dominant_colors': dominant_colors,
            'shape': image.shape[:2]  # Height, Width
        }
    
    def _extract_texture_features(self, gray_image: np.ndarray) -> np.ndarray:
        """
        Extract texture features from grayscale image.
        
        Args:
            gray_image: Grayscale image
            
        Returns:
            Texture feature vector
        """
        # Simple texture features using gradient magnitude
        grad_x = cv2.Sobel(gray_image, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray_image, cv2.CV_64F, 0, 1, ksize=3)
        magnitude = np.sqrt(grad_x**2 + grad_y**2)
        
        # Statistical features of gradient magnitude
        mean_grad = np.mean(magnitude)
        std_grad = np.std(magnitude)
        texture_features = np.array([mean_grad, std_grad])
        
        return texture_features
    
    def _color_similarity(self, hist1: np.ndarray, hist2: np.ndarray) -> float:
        """
        Calculate color histogram similarity using correlation.
        
        Args:
            hist1: First color histogram
            hist2: Second color histogram
            
        Returns:
            Similarity score between 0 and 1
        """
        # Normalize histograms
        hist1_norm = hist1 / (np.sum(hist1) + 1e-9)
        hist2_norm = hist2 / (np.sum(hist2) + 1e-9)
        
        # Correlation coefficient
        correlation = np.correlate(hist1_norm, hist2_norm)[0]
        return float(np.clip(correlation, 0, 1))
    
    def _texture_similarity(self, tex1: np.ndarray, tex2: np.ndarray) -> float:
        """
        Calculate texture feature similarity.
        
        Args:
            tex1: First texture features
            tex2: Second texture features
            
        Returns:
            Similarity score between 0 and 1
        """
        # Euclidean distance normalized
        distance = np.linalg.norm(tex1 - tex2)
        # Convert distance to similarity (higher distance = lower similarity)
        similarity = np.exp(-distance / (np.linalg.norm(tex1) + np.linalg.norm(tex2) + 1e-9))
        return float(np.clip(similarity, 0, 1))
    
    def combined_search(self,
                       query: str,
                       embedder,
                       temporal_params: Optional[Dict[str, Any]] = None,
                       style_reference: Optional[str] = None,
                       filters: Optional[Dict[str, Any]] = None,
                       top_k: int = 12) -> List[SearchResult]:
        """
        Perform a combined search using multiple criteria.
        
        Args:
            query: Text query for semantic search
            embedder: Embedding model
            temporal_params: Temporal search parameters
            style_reference: Path to reference image for style similarity
            filters: Additional filters to apply
            top_k: Number of results to return
            
        Returns:
            List of search results combining multiple signals
        """
        # Start with semantic search results
        semantic_results = self.store.search(embedder, query, top_k=top_k * 2)  # Get more candidates
        
        # Apply temporal filtering if requested
        if temporal_params:
            temporal_results = self.temporal_search(**temporal_params)
            # Intersect with semantic results
            temporal_paths = {str(r.path) for r in temporal_results}
            semantic_results = [r for r in semantic_results if str(r.path) in temporal_paths]
        
        # Apply style similarity filtering if requested
        if style_reference and semantic_results:
            style_results = self.style_similarity_search(style_reference, top_k=top_k * 2)
            # Intersect with semantic results
            style_paths = {str(r.path) for r in style_results}
            semantic_results = [r for r in semantic_results if str(r.path) in style_paths]
        
        # Apply additional filters if provided
        if filters:
            semantic_results = self._apply_filters(semantic_results, filters)
        
        # Re-rank based on combined scores
        final_results = self._rerank_combined_results(semantic_results, temporal_params, style_reference)
        
        return final_results[:top_k]
    
    def _apply_filters(self, results: List[SearchResult], filters: Dict[str, Any]) -> List[SearchResult]:
        """
        Apply additional filters to search results.
        
        Args:
            results: List of search results
            filters: Dictionary of filter criteria
            
        Returns:
            Filtered list of search results
        """
        # This would implement various filters like:
        # - Camera model
        # - ISO range
        # - Aperture range
        # - Focal length range
        # - Flash usage
        # - Rating
        # etc.
        
        filtered_results = results.copy()
        
        # Apply camera model filter
        camera_model = filters.get('camera')
        if camera_model and self.meta_data:
            filtered_results = [r for r in filtered_results if self._photo_has_camera(str(r.path), camera_model)]
        
        # Apply ISO range filter
        iso_min = filters.get('iso_min')
        iso_max = filters.get('iso_max')
        if (iso_min is not None or iso_max is not None) and self.meta_data:
            filtered_results = [r for r in filtered_results 
                               if self._photo_iso_in_range(str(r.path), iso_min, iso_max)]
        
        # Apply aperture range filter
        aperture_min = filters.get('aperture_min')
        aperture_max = filters.get('aperture_max')
        if (aperture_min is not None or aperture_max is not None) and self.meta_data:
            filtered_results = [r for r in filtered_results 
                               if self._photo_aperture_in_range(str(r.path), aperture_min, aperture_max)]
        
        return filtered_results
    
    def _photo_has_camera(self, path: str, camera_model: str) -> bool:
        """Check if photo was taken with specified camera model."""
        try:
            if 'paths' in self.meta_data and path in self.meta_data.get('paths', []):
                idx = self.meta_data['paths'].index(path)
                camera = self.meta_data.get('camera', [])[idx]
                if camera and camera_model.lower() in str(camera).lower():
                    return True
        except Exception:
            pass
        return False
    
    def _photo_iso_in_range(self, path: str, iso_min: Optional[int], iso_max: Optional[int]) -> bool:
        """Check if photo ISO is within specified range."""
        try:
            if 'paths' in self.meta_data and path in self.meta_data.get('paths', []):
                idx = self.meta_data['paths'].index(path)
                iso = self.meta_data.get('iso', [])[idx]
                if iso is not None:
                    if iso_min is not None and iso < iso_min:
                        return False
                    if iso_max is not None and iso > iso_max:
                        return False
                    return True
        except Exception:
            pass
        return False
    
    def _photo_aperture_in_range(self, path: str, aperture_min: Optional[float], aperture_max: Optional[float]) -> bool:
        """Check if photo aperture is within specified range."""
        try:
            if 'paths' in self.meta_data and path in self.meta_data.get('paths', []):
                idx = self.meta_data['paths'].index(path)
                f_number = self.meta_data.get('f_number', [])[idx]
                if f_number is not None:
                    if aperture_min is not None and f_number < aperture_min:
                        return False
                    if aperture_max is not None and f_number > aperture_max:
                        return False
                    return True
        except Exception:
            pass
        return False
    
    def _rerank_combined_results(self, 
                                results: List[SearchResult],
                                temporal_params: Optional[Dict[str, Any]] = None,
                                style_reference: Optional[str] = None) -> List[SearchResult]:
        """
        Re-rank results based on combined signals.
        
        Args:
            results: List of search results
            temporal_params: Temporal parameters for scoring
            style_reference: Reference image for style similarity
            
        Returns:
            Re-ranked list of search results
        """
        # For now, we'll just return the results as-is
        # In a more sophisticated implementation, we would calculate combined scores
        return results