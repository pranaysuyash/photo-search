"""
OCR Manager - Handles OCR text extraction, indexing, and search operations.
Extracts OCR complexity from IndexStore for better separation of concerns.
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


class OCRStatus(str, Enum):
    """Status of OCR processing for a photo."""
    NOT_PROCESSED = "not_processed"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"
    SKIPPED = "skipped"


@dataclass
class OCRResult:
    """Result of OCR processing for a single photo."""
    photo_id: str
    text: str
    confidence: float
    language: str
    processing_time: float
    status: OCRStatus
    error_message: Optional[str] = None


class OCRManager:
    """Manages OCR text extraction, indexing, and search operations."""

    def __init__(self, ocr_dir: Path):
        self.ocr_dir = Path(ocr_dir)
        self.ocr_dir.mkdir(parents=True, exist_ok=True)

        # Cache directories
        self.text_cache_dir = self.ocr_dir / "text_cache"
        self.embedding_cache_dir = self.ocr_dir / "embedding_cache"
        self.status_cache_dir = self.ocr_dir / "status_cache"

        for cache_dir in [self.text_cache_dir, self.embedding_cache_dir, self.status_cache_dir]:
            cache_dir.mkdir(exist_ok=True)

        self.logger = logging.getLogger(__name__)

        # Initialize OCR library conditionally
        self._initialize_ocr_library()

    def _initialize_ocr_library(self):
        """Initialize OCR library."""
        self.ocr_available = False
        self.ocr_reader = None

        try:
            import easyocr
            self.ocr_reader = easyocr.Reader(['en'])  # Start with English, can be extended
            self.ocr_available = True
            self.logger.info("EasyOCR library available for OCR processing")
        except ImportError:
            self.logger.warning("EasyOCR library not available - OCR functionality disabled")
        except Exception as e:
            self.logger.warning(f"Failed to initialize EasyOCR: {e}")

    def is_available(self) -> bool:
        """Check if OCR functionality is available."""
        return self.ocr_available

    def extract_text(self, image_path: Path, force_reprocess: bool = False) -> OCRResult:
        """
        Extract text from an image using OCR.

        Args:
            image_path: Path to the image file
            force_reprocess: Force reprocessing even if cached

        Returns:
            OCRResult object with extracted text and metadata
        """
        if not self.is_available():
            return OCRResult(
                photo_id=self._get_photo_id(image_path),
                text="",
                confidence=0.0,
                language="unknown",
                processing_time=0.0,
                status=OCRStatus.SKIPPED,
                error_message="OCR library not available"
            )

        photo_id = self._get_photo_id(image_path)

        # Check cache first
        if not force_reprocess:
            cached_result = self._get_cached_result(photo_id)
            if cached_result:
                self.logger.debug(f"Using cached OCR result for {photo_id}")
                return cached_result

        # Check if image is suitable for OCR
        if not self._should_process_image(image_path):
            return OCRResult(
                photo_id=photo_id,
                text="",
                confidence=0.0,
                language="unknown",
                processing_time=0.0,
                status=OCRStatus.SKIPPED,
                error_message="Image not suitable for OCR"
            )

        # Update status to processing
        self._update_status(photo_id, OCRStatus.PROCESSING)

        try:
            start_time = time.time()

            # Extract text using EasyOCR
            results = self.ocr_reader.readtext(str(image_path))

            processing_time = time.time() - start_time

            # Process OCR results
            text_parts = []
            confidences = []

            for (bbox, text, confidence) in results:
                if confidence > 0.5:  # Confidence threshold
                    text_parts.append(text.strip())
                    confidences.append(confidence)

            extracted_text = " ".join(text_parts)
            avg_confidence = np.mean(confidences) if confidences else 0.0

            # Cache the result
            result = OCRResult(
                photo_id=photo_id,
                text=extracted_text,
                confidence=avg_confidence,
                language="en",  # Could be detected in the future
                processing_time=processing_time,
                status=OCRStatus.COMPLETED
            )

            self._cache_result(result)
            self._update_status(photo_id, OCRStatus.COMPLETED)

            self.logger.info(f"OCR completed for {photo_id}: {len(extracted_text)} chars, {avg_confidence:.2f} confidence")

            return result

        except Exception as e:
            error_msg = f"OCR processing failed: {str(e)}"
            self.logger.error(f"OCR failed for {photo_id}: {e}")

            result = OCRResult(
                photo_id=photo_id,
                text="",
                confidence=0.0,
                language="unknown",
                processing_time=0.0,
                status=OCRStatus.ERROR,
                error_message=error_msg
            )

            self._update_status(photo_id, OCRStatus.ERROR)
            return result

    def _get_photo_id(self, image_path: Path) -> str:
        """Generate a unique ID for a photo based on its path."""
        return hashlib.md5(str(image_path).encode()).hexdigest()

    def _should_process_image(self, image_path: Path) -> bool:
        """Determine if an image should be processed for OCR."""
        if not image_path.exists():
            return False

        # Check file extension
        valid_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
        if image_path.suffix.lower() not in valid_extensions:
            return False

        # Check file size (skip very large files)
        try:
            file_size = image_path.stat().st_size
            if file_size > 50 * 1024 * 1024:  # 50MB limit
                self.logger.debug(f"Skipping OCR for large file: {image_path} ({file_size} bytes)")
                return False
        except OSError:
            return False

        return True

    def _get_cached_result(self, photo_id: str) -> Optional[OCRResult]:
        """Get cached OCR result for a photo."""
        cache_file = self.text_cache_dir / f"{photo_id}.json"

        if not cache_file.exists():
            return None

        try:
            with open(cache_file, 'r') as f:
                data = json.load(f)

            return OCRResult(
                photo_id=data['photo_id'],
                text=data['text'],
                confidence=data['confidence'],
                language=data['language'],
                processing_time=data['processing_time'],
                status=OCRStatus(data['status']),
                error_message=data.get('error_message')
            )
        except Exception as e:
            self.logger.warning(f"Failed to load cached OCR result for {photo_id}: {e}")
            return None

    def _cache_result(self, result: OCRResult):
        """Cache OCR result for a photo."""
        cache_file = self.text_cache_dir / f"{result.photo_id}.json"

        try:
            data = {
                'photo_id': result.photo_id,
                'text': result.text,
                'confidence': result.confidence,
                'language': result.language,
                'processing_time': result.processing_time,
                'status': result.status.value,
                'error_message': result.error_message,
                'cached_at': time.time()
            }

            with open(cache_file, 'w') as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            self.logger.warning(f"Failed to cache OCR result for {result.photo_id}: {e}")

    def _update_status(self, photo_id: str, status: OCRStatus):
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

    def get_status(self, photo_id: str) -> Optional[OCRStatus]:
        """Get OCR processing status for a photo."""
        status_file = self.status_cache_dir / f"{photo_id}.status"

        if not status_file.exists():
            return None

        try:
            with open(status_file, 'r') as f:
                data = json.load(f)
            return OCRStatus(data['status'])
        except Exception:
            return None

    def search_text(self, query: str, photo_ids: Optional[List[str]] = None,
                   min_confidence: float = 0.5) -> List[Tuple[str, float]]:
        """
        Search for text in OCR results.

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

        # Search through cached results
        for cache_file in self.text_cache_dir.glob("*.json"):
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

                # Check if query matches extracted text
                extracted_text = data['text'].lower()
                if query_lower in extracted_text:
                    # Calculate relevance score based on text coverage and confidence
                    text_coverage = len(query_lower) / max(len(extracted_text), 1)
                    relevance_score = text_coverage * data['confidence']
                    matches.append((data['photo_id'], relevance_score))

            except Exception as e:
                self.logger.warning(f"Failed to search OCR cache file {cache_file}: {e}")

        # Sort by relevance score
        matches.sort(key=lambda x: x[1], reverse=True)

        return matches

    def get_statistics(self) -> Dict[str, Any]:
        """Get OCR processing statistics."""
        stats = {
            'total_photos': 0,
            'processed_photos': 0,
            'successful_photos': 0,
            'failed_photos': 0,
            'skipped_photos': 0,
            'average_confidence': 0.0,
            'total_processing_time': 0.0,
            'library_available': self.is_available()
        }

        if not self.is_available():
            return stats

        confidences = []
        processing_times = []

        for status_file in self.status_cache_dir.glob("*.status"):
            stats['total_photos'] += 1

            try:
                with open(status_file, 'r') as f:
                    data = json.load(f)

                status = OCRStatus(data['status'])

                if status == OCRStatus.COMPLETED:
                    stats['successful_photos'] += 1

                    # Get corresponding OCR result for confidence and timing
                    cache_file = self.text_cache_dir / f"{data['photo_id']}.json"
                    if cache_file.exists():
                        with open(cache_file, 'r') as f:
                            ocr_data = json.load(f)
                        confidences.append(ocr_data['confidence'])
                        processing_times.append(ocr_data['processing_time'])

                elif status == OCRStatus.ERROR:
                    stats['failed_photos'] += 1
                elif status == OCRStatus.SKIPPED:
                    stats['skipped_photos'] += 1
                elif status == OCRStatus.PROCESSING:
                    stats['processed_photos'] += 1

            except Exception as e:
                self.logger.warning(f"Failed to process status file {status_file}: {e}")

        # Calculate averages
        if confidences:
            stats['average_confidence'] = np.mean(confidences)
        if processing_times:
            stats['total_processing_time'] = sum(processing_times)

        return stats

    def clear_cache(self, photo_id: Optional[str] = None):
        """Clear OCR cache for specific photo or all photos."""
        if photo_id:
            # Clear cache for specific photo
            files_to_remove = [
                self.text_cache_dir / f"{photo_id}.json",
                self.embedding_cache_dir / f"{photo_id}.npy",
                self.status_cache_dir / f"{photo_id}.status"
            ]

            for file_path in files_to_remove:
                if file_path.exists():
                    file_path.unlink()

            self.logger.info(f"Cleared OCR cache for photo {photo_id}")
        else:
            # Clear all cache
            for cache_dir in [self.text_cache_dir, self.embedding_cache_dir, self.status_cache_dir]:
                for cache_file in cache_dir.glob("*"):
                    if cache_file.is_file():
                        cache_file.unlink()

            self.logger.info("Cleared all OCR cache")

    def get_processing_queue(self) -> List[str]:
        """Get list of photos currently being processed."""
        processing = []

        for status_file in self.status_cache_dir.glob("*.status"):
            try:
                with open(status_file, 'r') as f:
                    data = json.load(f)

                if data['status'] == OCRStatus.PROCESSING.value:
                    processing.append(data['photo_id'])

            except Exception:
                continue

        return processing

    def batch_process(self, image_paths: List[Path], force_reprocess: bool = False,
                     progress_callback: Optional[callable] = None) -> List[OCRResult]:
        """
        Process multiple images for OCR text extraction.

        Args:
            image_paths: List of image paths to process
            force_reprocess: Force reprocessing even if cached
            progress_callback: Optional callback for progress updates

        Returns:
            List of OCRResult objects
        """
        if not self.is_available():
            return []

        results = []
        total = len(image_paths)

        for i, image_path in enumerate(image_paths):
            result = self.extract_text(image_path, force_reprocess)
            results.append(result)

            if progress_callback:
                progress = (i + 1) / total
                progress_callback(progress, result)

        return results

    def enhance_search_query(self, original_query: str, photo_ids: Optional[List[str]] = None) -> str:
        """
        Enhance a search query with OCR text matches.

        Args:
            original_query: Original search query
            photo_ids: Optional list of photo IDs to search within

        Returns:
            Enhanced query string with OCR terms
        """
        if not self.is_available():
            return original_query

        # Find OCR matches for the query
        ocr_matches = self.search_text(original_query, photo_ids, min_confidence=0.3)

        if not ocr_matches:
            return original_query

        # Extract additional keywords from OCR results
        additional_terms = set()
        for photo_id, _ in ocr_matches[:5]:  # Top 5 matches
            cache_file = self.text_cache_dir / f"{photo_id}.json"
            if cache_file.exists():
                try:
                    with open(cache_file, 'r') as f:
                        data = json.load(f)

                    # Extract significant words from OCR text
                    text = data['text']
                    words = [word.lower() for word in text.split() if len(word) > 3]
                    additional_terms.update(words[:10])  # Top 10 words per result

                except Exception:
                    continue

        # Combine original query with additional terms
        if additional_terms:
            enhanced_query = f"{original_query} {' '.join(list(additional_terms)[:20])}"
            return enhanced_query

        return original_query