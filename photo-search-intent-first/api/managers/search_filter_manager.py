"""
Search Filter Manager - Handles complex filtering logic for photo search operations.
Extracts filtering concerns from the main search endpoint for better separation of concerns.
"""

from typing import List, Dict, Any, Optional, Set
from datetime import datetime
from pathlib import Path
import logging

from api.models.search import (
    SearchRequest,
    CameraSettings,
    LocationFilter,
    QualityFilter,
    ContentFilter,
    DateRange
)

logger = logging.getLogger(__name__)


class SearchFilterManager:
    """Manages all filtering operations for photo search results."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def apply_filters(self,
                    photo_metadata: Dict[str, Any],
                    search_request: SearchRequest) -> bool:
        """
        Apply all filters to a photo's metadata.

        Args:
            photo_metadata: Photo metadata dictionary
            search_request: Complete search request with all filters

        Returns:
            bool: True if photo passes all filters, False otherwise
        """
        try:
            # Apply each filter category
            filters_to_apply = [
                self._filter_favorites,
                self._filter_date_range,
                self._filter_camera_settings,
                self._filter_location,
                self._filter_quality,
                self._filter_content
            ]

            for filter_func in filters_to_apply:
                if not filter_func(photo_metadata, search_request):
                    return False

            return True

        except Exception as e:
            self.logger.error(f"Error applying filters to photo {photo_metadata.get('path', 'unknown')}: {e}")
            return False

    def _filter_favorites(self, metadata: Dict[str, Any], request: SearchRequest) -> bool:
        """Filter by favorite status."""
        if not request.favorites_only:
            return True

        is_favorite = metadata.get('favorite', False)
        return bool(is_favorite)

    def _filter_date_range(self, metadata: Dict[str, Any], request: SearchRequest) -> bool:
        """Filter by date range."""
        date_range = request.date_range
        if not date_range:
            return True

        try:
            # Try different date fields in metadata
            date_str = metadata.get('date_taken') or metadata.get('date_modified') or metadata.get('date_created')
            if not date_str:
                return False

            # Parse date - handle different formats
            if isinstance(date_str, str):
                try:
                    photo_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                except ValueError:
                    try:
                        photo_date = datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
                    except ValueError:
                        return False
            elif isinstance(date_str, (int, float)):
                photo_date = datetime.fromtimestamp(date_str)
            else:
                return False

            # Apply date range filters
            if date_range.start and photo_date < date_range.start:
                return False

            if date_range.end and photo_date > date_range.end:
                return False

            return True

        except Exception as e:
            self.logger.warning(f"Error parsing date for photo {metadata.get('path', 'unknown')}: {e}")
            return False

    def _filter_camera_settings(self, metadata: Dict[str, Any], request: SearchRequest) -> bool:
        """Filter by camera settings."""
        camera = request.camera
        if not camera:
            return True

        exif_data = metadata.get('exif', {})

        # Camera make/model
        if camera.camera:
            camera_make = exif_data.get('Make', '').lower()
            camera_model = exif_data.get('Model', '').lower()
            search_camera = camera.camera.lower()

            if search_camera not in camera_make and search_camera not in camera_model:
                return False

        # ISO range
        iso = exif_data.get('ISO')
        if iso is not None:
            if camera.iso_min and iso < camera.iso_min:
                return False
            if camera.iso_max and iso > camera.iso_max:
                return False

        # Aperture range
        f_number = exif_data.get('FNumber')
        if f_number is not None:
            if camera.aperture_min and f_number < camera.aperture_min:
                return False
            if camera.aperture_max and f_number > camera.aperture_max:
                return False

        # Flash
        if camera.flash is not None:
            flash_fired = exif_data.get('Flash', 0) & 1
            if bool(flash_fired) != camera.flash:
                return False

        # White balance
        if camera.white_balance:
            wb_mode = exif_data.get('WhiteBalance')
            if wb_mode and wb_mode.lower() != camera.white_balance.value:
                return False

        # Metering mode
        if camera.metering:
            metering = exif_data.get('MeteringMode')
            if metering and metering.lower() != camera.metering.value:
                return False

        return True

    def _filter_location(self, metadata: Dict[str, Any], request: SearchRequest) -> bool:
        """Filter by location/GPS data."""
        location = request.location
        if not location:
            return True

        gps_data = metadata.get('gps', {})

        # Altitude range
        altitude = gps_data.get('altitude')
        if altitude is not None:
            if location.altitude_min and altitude < location.altitude_min:
                return False
            if location.altitude_max and altitude > location.altitude_max:
                return False

        # Heading range
        heading = gps_data.get('direction')
        if heading is not None:
            if location.heading_min and heading < location.heading_min:
                return False
            if location.heading_max and heading > location.heading_max:
                return False

        # Place name
        if location.place:
            # Check various location fields
            location_fields = [
                gps_data.get('location_name'),
                gps_data.get('city'),
                gps_data.get('state'),
                gps_data.get('country'),
                metadata.get('location_description')
            ]

            place_lower = location.place.lower()
            if not any(place_lower in str(field).lower() for field in location_fields if field):
                return False

        return True

    def _filter_quality(self, metadata: Dict[str, Any], request: SearchRequest) -> bool:
        """Filter by image quality metrics."""
        quality = request.quality
        if not quality:
            return True

        # Sharpness
        if quality.sharp_only:
            sharpness = metadata.get('sharpness_score')
            if sharpness is None or sharpness < 0.7:  # Threshold for "sharp"
                return False

        # Exposure
        brightness = metadata.get('brightness_score')
        if brightness is not None:
            if quality.exclude_underexposed and brightness < 0.3:
                return False
            if quality.exclude_overexposed and brightness > 0.8:
                return False

        return True

    def _filter_content(self, metadata: Dict[str, Any], request: SearchRequest) -> bool:
        """Filter by content (tags, people, text, collections)."""
        content = request.content
        if not content:
            return True

        # Text content (OCR)
        if content.has_text is not None:
            has_text = bool(metadata.get('ocr_text') or metadata.get('text_content'))
            if has_text != content.has_text:
                return False

        # People/faces
        if content.persons:
            photo_persons = set(metadata.get('persons', []))
            required_persons = set(content.persons)
            if not required_persons.issubset(photo_persons):
                return False

        # Collections
        if content.collections:
            photo_collections = set(metadata.get('collections', []))
            required_collections = set(content.collections)
            if not required_collections.intersection(photo_collections):
                return False

        # Tags
        if content.tags:
            photo_tags = set(metadata.get('tags', []))
            required_tags = set(content.tags)
            if not required_tags.issubset(photo_tags):
                return False

        # Exclude tags
        if content.exclude_tags:
            photo_tags = set(metadata.get('tags', []))
            excluded_tags = set(content.exclude_tags)
            if excluded_tags.intersection(photo_tags):
                return False

        return True

    def get_applied_filters(self, request: SearchRequest) -> List[str]:
        """
        Get a list of filter categories that are active in the request.

        Args:
            request: Search request to analyze

        Returns:
            List of filter category names that are active
        """
        applied_filters = []

        if request.favorites_only:
            applied_filters.append("favorites")

        if request.date_range:
            applied_filters.append("date_range")

        if request.camera:
            applied_filters.append("camera")

        if request.location:
            applied_filters.append("location")

        if request.quality:
            applied_filters.append("quality")

        if request.content:
            applied_filters.append("content")

        return applied_filters

    def validate_filter_combinations(self, request: SearchRequest) -> List[str]:
        """
        Validate filter combinations and return any warnings.

        Args:
            request: Search request to validate

        Returns:
            List of warning messages for potentially problematic filter combinations
        """
        warnings = []

        # Check for very restrictive combinations
        active_filters = self.get_applied_filters(request)

        if len(active_filters) > 5:
            warnings.append("Multiple active filters may significantly reduce result count")

        # Check date range reasonableness
        if request.date_range and request.date_range.start and request.date_range.end:
            date_diff = (request.date_range.end - request.date_range.start).days
            if date_diff > 3650:  # 10 years
                warnings.append("Very large date range may impact performance")

        # Check for conflicting quality filters
        if request.quality:
            quality_conflicts = []
            if request.quality.sharp_only and request.quality.exclude_underexposed:
                quality_conflicts.append("sharp_only + exclude_underexposed")
            if request.quality.exclude_underexposed and request.quality.exclude_overexposed:
                quality_conflicts.append("exclude_underexposed + exclude_overexposed")

            if quality_conflicts:
                warnings.append(f"Conflicting quality filters: {', '.join(quality_conflicts)}")

        return warnings

    def get_filter_statistics(self, request: SearchRequest) -> Dict[str, Any]:
        """
        Get statistics about the applied filters.

        Args:
            request: Search request to analyze

        Returns:
            Dictionary with filter statistics
        """
        stats = {
            "total_active_filters": len(self.get_applied_filters(request)),
            "filter_categories": {},
            "estimated_selectivity": 1.0
        }

        # Estimate selectivity for each filter category
        selectivity_factors = {
            "favorites": 0.2,  # Only 20% of photos are typically favorites
            "date_range": 0.8,  # Date ranges typically include 80% of photos
            "camera": 0.6,     # Camera filters typically include 60% of photos
            "location": 0.4,   # Location filters typically include 40% of photos
            "quality": 0.7,    # Quality filters typically include 70% of photos
            "content": 0.5     # Content filters typically include 50% of photos
        }

        for filter_category in self.get_applied_filters(request):
            stats["filter_categories"][filter_category] = {
                "active": True,
                "estimated_selectivity": selectivity_factors.get(filter_category, 0.8)
            }
            stats["estimated_selectivity"] *= selectivity_factors.get(filter_category, 0.8)

        return stats