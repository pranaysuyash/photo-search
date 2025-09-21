"""
Caption Manager - Handles VLM-based image caption generation and search operations.
Extracts caption functionality from IndexStore for better separation of concerns.
"""

from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import numpy as np
import logging
import json
import time
from dataclasses import dataclass
from enum import Enum
import hashlib

logger = logging.getLogger(__name__)


class CaptionStatus(str, Enum):
    """Status of caption generation for a photo."""
    NOT_PROCESSED = "not_processed"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"
    SKIPPED = "skipped"


@dataclass
class CaptionResult:
    """Result of caption generation for a single photo."""
    photo_id: str
    caption: str
    confidence: float
    model_used: str
    processing_time: float
    status: CaptionStatus
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class CaptionManager:
    """Manages VLM-based caption generation and search operations."""

    def __init__(self, caption_dir: Path):
        self.caption_dir = Path(caption_dir)
        self.caption_dir.mkdir(parents=True, exist_ok=True)

        # Cache directories
        self.caption_cache_dir = self.caption_dir / "caption_cache"
        self.embedding_cache_dir = self.caption_dir / "embedding_cache"
        self.status_cache_dir = self.caption_dir / "status_cache"

        for cache_dir in [self.caption_cache_dir, self.embedding_cache_dir, self.status_cache_dir]:
            cache_dir.mkdir(exist_ok=True)

        self.logger = logging.getLogger(__name__)

        # Initialize VLM library conditionally
        self._initialize_vlm_library()

    def _initialize_vlm_library(self):
        """Initialize VLM library for caption generation."""
        self.vlm_available = False
        self.vlm_model = None

        try:
            # Try to initialize the VLM caption model
            from adapters.vlm_caption_hf import VlmCaptionHF
            self.vlm_model = VlmCaptionHF()
            self.vlm_available = True
            self.logger.info("VLM caption model available")
        except ImportError:
            self.logger.warning("VLM caption library not available - caption functionality disabled")
        except Exception as e:
            self.logger.warning(f"Failed to initialize VLM caption model: {e}")

    def is_available(self) -> bool:
        """Check if caption functionality is available."""
        return self.vlm_available

    def generate_caption(self, image_path: Path, force_reprocess: bool = False) -> CaptionResult:
        """
        Generate a caption for an image using VLM.

        Args:
            image_path: Path to the image file
            force_reprocess: Force reprocessing even if cached

        Returns:
            CaptionResult object with generated caption and metadata
        """
        if not self.is_available():
            return CaptionResult(
                photo_id=self._get_photo_id(image_path),
                caption="",
                confidence=0.0,
                model_used="none",
                processing_time=0.0,
                status=CaptionStatus.SKIPPED,
                error_message="VLM library not available"
            )

        photo_id = self._get_photo_id(image_path)

        # Check cache first
        if not force_reprocess:
            cached_result = self._get_cached_result(photo_id)
            if cached_result:
                self.logger.debug(f"Using cached caption for {photo_id}")
                return cached_result

        # Check if image is suitable for captioning
        if not self._should_process_image(image_path):
            return CaptionResult(
                photo_id=photo_id,
                caption="",
                confidence=0.0,
                model_used="none",
                processing_time=0.0,
                status=CaptionStatus.SKIPPED,
                error_message="Image not suitable for captioning"
            )

        # Update status to processing
        self._update_status(photo_id, CaptionStatus.PROCESSING)

        try:
            start_time = time.time()

            # Generate caption using VLM
            caption_result = self.vlm_model.generate_caption(str(image_path))

            processing_time = time.time() - start_time

            # Process VLM result
            if caption_result and isinstance(caption_result, dict):
                caption = caption_result.get('caption', '')
                confidence = caption_result.get('confidence', 0.0)
                model_info = caption_result.get('model', 'unknown')
            else:
                caption = str(caption_result) if caption_result else ""
                confidence = 0.5  # Default confidence
                model_info = "default"

            result = CaptionResult(
                photo_id=photo_id,
                caption=caption,
                confidence=confidence,
                model_used=model_info,
                processing_time=processing_time,
                status=CaptionStatus.COMPLETED,
                metadata=caption_result if isinstance(caption_result, dict) else None
            )

            self._cache_result(result)
            self._update_status(photo_id, CaptionStatus.COMPLETED)

            self.logger.info(f"Caption generated for {photo_id}: {len(caption)} chars, {confidence:.2f} confidence")

            return result

        except Exception as e:
            error_msg = f"Caption generation failed: {str(e)}"
            self.logger.error(f"Caption generation failed for {photo_id}: {e}")

            result = CaptionResult(
                photo_id=photo_id,
                caption="",
                confidence=0.0,
                model_used="none",
                processing_time=0.0,
                status=CaptionStatus.ERROR,
                error_message=error_msg
            )

            self._update_status(photo_id, CaptionStatus.ERROR)
            return result

    def _get_photo_id(self, image_path: Path) -> str:
        """Generate a unique ID for a photo based on its path."""
        return hashlib.md5(str(image_path).encode()).hexdigest()

    def _should_process_image(self, image_path: Path) -> bool:
        """Determine if an image should be processed for captioning."""
        if not image_path.exists():
            return False

        # Check file extension
        valid_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
        if image_path.suffix.lower() not in valid_extensions:
            return False

        # Check file size (skip very large files)
        try:
            file_size = image_path.stat().st_size
            if file_size > 20 * 1024 * 1024:  # 20MB limit
                self.logger.debug(f"Skipping captioning for large file: {image_path} ({file_size} bytes)")
                return False
        except OSError:
            return False

        return True

    def _get_cached_result(self, photo_id: str) -> Optional[CaptionResult]:
        """Get cached caption result for a photo."""
        cache_file = self.caption_cache_dir / f"{photo_id}.json"

        if not cache_file.exists():
            return None

        try:
            with open(cache_file, 'r') as f:
                data = json.load(f)

            return CaptionResult(
                photo_id=data['photo_id'],
                caption=data['caption'],
                confidence=data['confidence'],
                model_used=data['model_used'],
                processing_time=data['processing_time'],
                status=CaptionStatus(data['status']),
                error_message=data.get('error_message'),
                metadata=data.get('metadata')
            )
        except Exception as e:
            self.logger.warning(f"Failed to load cached caption for {photo_id}: {e}")
            return None

    def _cache_result(self, result: CaptionResult):
        """Cache caption result for a photo."""
        cache_file = self.caption_cache_dir / f"{result.photo_id}.json"

        try:
            data = {
                'photo_id': result.photo_id,
                'caption': result.caption,
                'confidence': result.confidence,
                'model_used': result.model_used,
                'processing_time': result.processing_time,
                'status': result.status.value,
                'error_message': result.error_message,
                'metadata': result.metadata,
                'cached_at': time.time()
            }

            with open(cache_file, 'w') as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            self.logger.warning(f"Failed to cache caption for {result.photo_id}: {e}")

    def _update_status(self, photo_id: str, status: CaptionStatus):
        """Update processing status for a photo."""
        status_file = self.status_cache_dir / f"{photo_id}.status"

        try:
            with open(status_file, 'w') as f:
                json.dump({
                    'photo_id': photo_id,
                    'status': status.value,
                    'updated_at': time.time()
                }, f)
        except Exception as e:
            self.logger.warning(f"Failed to update status for {photo_id}: {e}")

    def get_status(self, photo_id: str) -> Optional[CaptionStatus]:
        """Get caption generation status for a photo."""
        status_file = self.status_cache_dir / f"{photo_id}.status"

        if not status_file.exists():
            return None

        try:
            with open(status_file, 'r') as f:
                data = json.load(f)
            return CaptionStatus(data['status'])
        except Exception:
            return None

    def search_captions(self, query: str, photo_ids: Optional[List[str]] = None,
                      min_confidence: float = 0.3) -> List[Tuple[str, float]]:
        """
        Search for text in generated captions.

        Args:
            query: Text to search for
            photo_ids: Optional list of photo IDs to search within
            min_confidence: Minimum confidence threshold for matches

        Returns:
            List of (photo_id, relevance_score) tuples
        """
        if not self.is_available():
            return []

        matches = []
        query_lower = query.lower()

        # Search through cached captions
        for cache_file in self.caption_cache_dir.glob("*.json"):
            if cache_file.name == ".gitkeep":
                continue

            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)

                # Filter by photo IDs if specified
                if photo_ids and data['photo_id'] not in photo_ids:
                    continue

                # Check confidence threshold
                if data['confidence'] < min_confidence:
                    continue

                # Check if query matches caption
                caption = data['caption'].lower()
                if query_lower in caption:
                    # Calculate relevance score based on text coverage and confidence
                    text_coverage = len(query_lower) / max(len(caption), 1)
                    relevance_score = text_coverage * data['confidence']
                    matches.append((data['photo_id'], relevance_score))

            except Exception as e:
                self.logger.warning(f"Failed to search caption cache file {cache_file}: {e}")

        # Sort by relevance score
        matches.sort(key=lambda x: x[1], reverse=True)

        return matches

    def get_similar_captions(self, photo_id: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """
        Find photos with similar captions to a given photo.

        Args:
            photo_id: Reference photo ID
            top_k: Number of similar results to return

        Returns:
            List of (photo_id, similarity_score) tuples
        """
        if not self.is_available():
            return []

        # Get the reference caption
        reference_result = self._get_cached_result(photo_id)
        if not reference_result or not reference_result.caption:
            return []

        reference_caption = reference_result.caption.lower()
        reference_words = set(reference_caption.split())

        similar_photos = []

        # Find similar captions
        for cache_file in self.caption_cache_dir.glob("*.json"):
            if cache_file.name == f"{photo_id}.json" or cache_file.name == ".gitkeep":
                continue

            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)

                if data['confidence'] < 0.3:  # Skip low confidence captions
                    continue

                # Calculate similarity using Jaccard similarity
                candidate_caption = data['caption'].lower()
                candidate_words = set(candidate_caption.split())

                if reference_words and candidate_words:
                    intersection = len(reference_words.intersection(candidate_words))
                    union = len(reference_words.union(candidate_words))
                    similarity = intersection / union if union > 0 else 0

                    if similarity > 0.1:  # Minimum similarity threshold
                        similar_photos.append((data['photo_id'], similarity))

            except Exception as e:
                self.logger.warning(f"Failed to process caption cache file {cache_file}: {e}")

        # Sort by similarity and return top-k results
        similar_photos.sort(key=lambda x: x[1], reverse=True)
        return similar_photos[:top_k]

    def get_statistics(self) -> Dict[str, Any]:
        """Get caption generation statistics."""
        stats = {
            'total_photos': 0,
            'processed_photos': 0,
            'successful_photos': 0,
            'failed_photos': 0,
            'skipped_photos': 0,
            'average_confidence': 0.0,
            'total_processing_time': 0.0,
            'model_usage': {},
            'library_available': self.is_available()
        }

        if not self.is_available():
            return stats

        confidences = []
        processing_times = []
        model_counts = {}

        for status_file in self.status_cache_dir.glob("*.status"):
            stats['total_photos'] += 1

            try:
                with open(status_file, 'r') as f:
                    data = json.load(f)

                status = CaptionStatus(data['status'])

                if status == CaptionStatus.COMPLETED:
                    stats['successful_photos'] += 1

                    # Get corresponding caption result for confidence and timing
                    cache_file = self.caption_cache_dir / f"{data['photo_id']}.json"
                    if cache_file.exists():
                        with open(cache_file, 'r') as f:
                            caption_data = json.load(f)
                        confidences.append(caption_data['confidence'])
                        processing_times.append(caption_data['processing_time'])

                        # Track model usage
                        model = caption_data.get('model_used', 'unknown')
                        model_counts[model] = model_counts.get(model, 0) + 1

                elif status == CaptionStatus.ERROR:
                    stats['failed_photos'] += 1
                elif status == CaptionStatus.SKIPPED:
                    stats['skipped_photos'] += 1
                elif status == CaptionStatus.PROCESSING:
                    stats['processed_photos'] += 1

            except Exception as e:
                self.logger.warning(f"Failed to process status file {status_file}: {e}")

        # Calculate averages
        if confidences:
            stats['average_confidence'] = np.mean(confidences)
        if processing_times:
            stats['total_processing_time'] = sum(processing_times)

        stats['model_usage'] = model_counts

        return stats

    def clear_cache(self, photo_id: Optional[str] = None):
        """Clear caption cache for specific photo or all photos."""
        if photo_id:
            # Clear cache for specific photo
            files_to_remove = [
                self.caption_cache_dir / f"{photo_id}.json",
                self.embedding_cache_dir / f"{photo_id}.npy",
                self.status_cache_dir / f"{photo_id}.status"
            ]

            for file_path in files_to_remove:
                if file_path.exists():
                    file_path.unlink()

            self.logger.info(f"Cleared caption cache for photo {photo_id}")
        else:
            # Clear all cache
            for cache_dir in [self.caption_cache_dir, self.embedding_cache_dir, self.status_cache_dir]:
                for cache_file in cache_dir.glob("*"):
                    if cache_file.is_file():
                        cache_file.unlink()

            self.logger.info("Cleared all caption cache")

    def get_processing_queue(self) -> List[str]:
        """Get list of photos currently being processed."""
        processing = []

        for status_file in self.status_cache_dir.glob("*.status"):
            try:
                with open(status_file, 'r') as f:
                    data = json.load(f)

                if data['status'] == CaptionStatus.PROCESSING.value:
                    processing.append(data['photo_id'])

            except Exception:
                continue

        return processing

    def batch_process(self, image_paths: List[Path], force_reprocess: bool = False,
                     progress_callback: Optional[callable] = None) -> List[CaptionResult]:
        """
        Process multiple images for caption generation.

        Args:
            image_paths: List of image paths to process
            force_reprocess: Force reprocessing even if cached
            progress_callback: Optional callback for progress updates

        Returns:
            List of CaptionResult objects
        """
        if not self.is_available():
            return []

        results = []
        total = len(image_paths)

        for i, image_path in enumerate(image_paths):
            result = self.generate_caption(image_path, force_reprocess)
            results.append(result)

            if progress_callback:
                progress = (i + 1) / total
                progress_callback(progress, result)

        return results

    def enhance_search_query(self, original_query: str, photo_ids: Optional[List[str]] = None) -> str:
        """
        Enhance a search query with caption matches.

        Args:
            original_query: Original search query
            photo_ids: Optional list of photo IDs to search within

        Returns:
            Enhanced query string with caption terms
        """
        if not self.is_available():
            return original_query

        # Find caption matches for the query
        caption_matches = self.search_captions(original_query, photo_ids, min_confidence=0.3)

        if not caption_matches:
            return original_query

        # Extract additional keywords from captions
        additional_terms = set()
        for photo_id, _ in caption_matches[:5]:  # Top 5 matches
            cache_file = self.caption_cache_dir / f"{photo_id}.json"
            if cache_file.exists():
                try:
                    with open(cache_file, 'r') as f:
                        data = json.load(f)

                    # Extract significant words from caption
                    caption = data['caption']
                    words = [word.lower() for word in caption.split() if len(word) > 3]
                    additional_terms.update(words[:10])  # Top 10 words per result

                except Exception:
                    continue

        # Combine original query with additional terms
        if additional_terms:
            enhanced_query = f"{original_query} {' '.join(list(additional_terms)[:20])}"
            return enhanced_query

        return original_query

    def get_caption_keywords(self, photo_id: str, min_confidence: float = 0.5) -> List[str]:
        """
        Extract keywords from a photo's caption.

        Args:
            photo_id: Photo ID
            min_confidence: Minimum confidence threshold

        Returns:
            List of keywords extracted from the caption
        """
        if not self.is_available():
            return []

        cached_result = self._get_cached_result(photo_id)
        if not cached_result or cached_result.confidence < min_confidence:
            return []

        # Extract keywords from caption
        caption = cached_result.caption.lower()

        # Simple keyword extraction - remove common stop words and extract meaningful words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
        }

        words = [word.strip('.,!?()[]{}:;"\'') for word in caption.split()]
        keywords = [word for word in words if len(word) > 3 and word not in stop_words]

        return keywords[:20]  # Return top 20 keywords