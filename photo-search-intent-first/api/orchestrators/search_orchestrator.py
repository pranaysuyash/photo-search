"""
Search Orchestrator - Coordinates all search-related managers for comprehensive photo search.
Provides a unified interface for search operations while maintaining separation of concerns.
"""

from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import numpy as np
import logging
import time
from dataclasses import dataclass

from api.models.search import SearchRequest, SearchResult, SearchResponse
from api.managers.search_filter_manager import SearchFilterManager
from api.managers.ann_manager import ANNManager, ANNIndexType
from api.managers.ocr_manager import OCRManager
from api.managers.caption_manager import CaptionManager
from api.managers.search_cache_manager import search_cache_manager
from adapters.provider_factory import get_provider
from infra.index_store import IndexStore

logger = logging.getLogger(__name__)


@dataclass
class SearchContext:
    """Context object containing all search-related state and resources."""
    request: SearchRequest
    start_time: float
    index_store: IndexStore
    ann_manager: ANNManager
    filter_manager: SearchFilterManager
    ocr_manager: OCRManager
    caption_manager: CaptionManager
    provider: Any
    search_stats: Dict[str, Any]


class SearchOrchestrator:
    """Orchestrates all search operations across multiple managers and data sources."""

    def __init__(self, base_dir: Path):
        self.base_dir = Path(base_dir)
        self.managers_dir = self.base_dir / "managers"
        self.managers_dir.mkdir(exist_ok=True)

        # Initialize all managers
        self.filter_manager = SearchFilterManager()
        self.ann_manager = ANNManager(self.managers_dir / "ann")
        self.ocr_manager = OCRManager(self.managers_dir / "ocr")
        self.caption_manager = CaptionManager(self.managers_dir / "captions")

        # Initialize IndexStore (legacy but still needed for some operations)
        self.index_store = IndexStore(str(self.base_dir / "index"))

        self.logger = logging.getLogger(__name__)

    def search(self, request: SearchRequest) -> SearchResponse:
        """
        Perform a comprehensive search using all available managers.

        Args:
            request: Structured search request

        Returns:
            Complete search response with results and metadata
        """
        start_time = time.time()

        # Create search parameters dict for caching
        search_params = {
            'dir': request.dir,
            'query': request.query,
            'provider': request.provider.value,
            'top_k': request.limit,
            'use_fast': request.features.use_fast,
            'fast_kind': request.features.fast_kind.value if request.features.fast_kind else None,
            'use_captions': request.features.use_captions,
            'use_ocr': request.features.use_ocr,
            'favorites_only': request.filters.favorites_only,
            'tags': request.filters.tags,
            'date_from': request.filters.date_from,
            'date_to': request.filters.date_to,
            'camera': request.filters.camera,
            'iso_min': request.filters.iso_min,
            'iso_max': request.filters.iso_max,
            'f_min': request.filters.f_min,
            'f_max': request.filters.f_max,
            'place': request.filters.place,
            'person': request.filters.person,
        }

        # Check if this search is already cached
        cached_dto = search_cache_manager.get_search_results(search_params)
        if cached_dto is not None:
            self.logger.debug(f"Cache hit for query: {request.query}")
            
            # Convert DTO to SearchResponse
            results = [SearchResult(**result_data) for result_data in cached_dto["results"]]
            response = SearchResponse(
                results=results,
                total_count=cached_dto["total_count"],
                query=cached_dto["query"],
                filters_applied=cached_dto.get("filters_applied", []),
                search_time_ms=(time.time() - start_time) * 1000,
                provider_used=SearchProvider(cached_dto["provider"]) if cached_dto["provider"] in SearchProvider.__members__ else SearchProvider.LOCAL,
                is_cached=True,
                cache_hit=True
            )
            return response

        try:
            # Initialize search context
            context = self._create_search_context(request, start_time)

            # Get embedding provider
            context.provider = get_provider(
                provider=request.provider.value,
                hf_token=request.hf_token,
                openai_key=request.openai_key
            )

            # Step 1: Generate query embedding
            query_embedding = self._generate_query_embedding(context)

            # Step 2: Perform vector search based on requested features
            vector_results = self._perform_vector_search(context, query_embedding)

            # Step 3: Apply filters to vector search results
            filtered_results = self._apply_filters(context, vector_results)

            # Step 4: Enhance with OCR and caption search if requested
            enhanced_results = self._enhance_with_content_search(context, filtered_results)

            # Step 5: Score, rank, and format results
            final_results = self._score_and_rank_results(context, enhanced_results)

            # Step 6: Build response
            response = self._build_search_response(context, final_results)

            # Step 7: Cache the results
            search_cache_manager.cache_search_results(search_params, response, ttl=600)  # 10 minutes

            # Step 8: Log search analytics
            self._log_search_analytics(context, response)

            return response

        except Exception as e:
            self.logger.error(f"Search failed: {e}")
            # Return empty response with error information
            return SearchResponse(
                results=[],
                total_count=0,
                query=request.query,
                filters_applied=[],
                search_time_ms=(time.time() - start_time) * 1000,
                provider_used=request.provider,
                is_cached=False,
                cache_hit=False
            )

    def _create_search_context(self, request: SearchRequest, start_time: float) -> SearchContext:
        """Create a search context with all necessary components."""
        return SearchContext(
            request=request,
            start_time=start_time,
            index_store=self.index_store,
            ann_manager=self.ann_manager,
            filter_manager=self.filter_manager,
            ocr_manager=self.ocr_manager,
            caption_manager=self.caption_manager,
            provider=None,
            search_stats={
                'vector_search_time': 0.0,
                'filtering_time': 0.0,
                'ocr_search_time': 0.0,
                'caption_search_time': 0.0,
                'scoring_time': 0.0,
                'total_candidates': 0,
                'filtered_candidates': 0,
                'ocr_matches': 0,
                'caption_matches': 0
            }
        )

    def _generate_query_embedding(self, context: SearchContext) -> np.ndarray:
        """Generate embedding for the search query."""
        try:
            query_embedding = context.provider.embed_query(context.request.query)
            self.logger.debug(f"Generated query embedding with shape: {query_embedding.shape}")
            return query_embedding
        except Exception as e:
            self.logger.error(f"Failed to generate query embedding: {e}")
            raise

    def _perform_vector_search(self, context: SearchContext, query_embedding: np.ndarray) -> List[Tuple[str, float]]:
        """Perform vector search using the appropriate ANN implementation."""
        start_time = time.time()

        try:
            # Determine which ANN index to use
            index_type = self._select_ann_index(context.request)

            # Search with the selected index
            if context.request.features.use_fast and index_type != ANNIndexType.BRUTE_FORCE:
                # Use fast search with ANN
                index_id = f"main_{index_type.value}"
                results = context.ann_manager.search(
                    index_id=index_id,
                    query_vector=query_embedding,
                    k=context.request.limit * 3,  # Get more candidates for filtering
                    **self._get_ann_search_params(context.request)
                )
            else:
                # Use legacy IndexStore search
                results = self._legacy_vector_search(context, query_embedding)

            context.search_stats['vector_search_time'] = time.time() - start_time
            context.search_stats['total_candidates'] = len(results)

            self.logger.debug(f"Vector search found {len(results)} candidates in {context.search_stats['vector_search_time']:.3f}s")
            return results

        except Exception as e:
            self.logger.error(f"Vector search failed: {e}")
            # Fallback to brute force search
            return self._legacy_vector_search(context, query_embedding)

    def _select_ann_index(self, request: SearchRequest) -> ANNIndexType:
        """Select the appropriate ANN index type based on request parameters."""
        if request.features.fast_kind:
            return request.features.fast_kind
        return ANNIndexType.HNSW  # Default to HNSW

    def _get_ann_search_params(self, request: SearchRequest) -> Dict[str, Any]:
        """Get ANN search parameters based on request."""
        params = {}

        if request.features.fast_kind == ANNIndexType.HNSW:
            params['ef_search'] = 100
        elif request.features.fast_kind == ANNIndexType.FAISS:
            params['nprobe'] = 10

        return params

    def _legacy_vector_search(self, context: SearchContext, query_embedding: np.ndarray) -> List[Tuple[str, float]]:
        """Fallback vector search using legacy IndexStore."""
        try:
            # Use IndexStore's semantic search
            search_results = context.index_store.search_semantic(
                query=query_embedding,
                top_k=context.request.limit * 3,
                use_fast=False
            )

            # Convert to (photo_id, score) format
            results = []
            for result in search_results:
                if isinstance(result, tuple) and len(result) >= 2:
                    results.append((result[0], result[1]))

            return results

        except Exception as e:
            self.logger.error(f"Legacy vector search failed: {e}")
            return []

    def _apply_filters(self, context: SearchContext, vector_results: List[Tuple[str, float]]) -> List[Tuple[str, float]]:
        """Apply metadata filters to vector search results."""
        start_time = time.time()

        if not vector_results:
            return []

        filtered_results = []

        for photo_id, score in vector_results:
            try:
                # Get photo metadata from IndexStore
                metadata = context.index_store.get_photo_metadata(photo_id)

                if not metadata:
                    continue

                # Apply filters using SearchFilterManager
                if context.filter_manager.apply_filters(metadata, context.request):
                    filtered_results.append((photo_id, score))

            except Exception as e:
                self.logger.warning(f"Failed to apply filters to photo {photo_id}: {e}")
                continue

        context.search_stats['filtering_time'] = time.time() - start_time
        context.search_stats['filtered_candidates'] = len(filtered_results)

        self.logger.debug(f"Filtering reduced results from {len(vector_results)} to {len(filtered_results)}")

        return filtered_results

    def _enhance_with_content_search(self, context: SearchContext, filtered_results: List[Tuple[str, float]]) -> List[Dict[str, Any]]:
        """Enhance search results with OCR and caption content matching."""
        start_time = time.time()

        # Convert filtered results to richer format
        enhanced_results = []
        photo_ids = [photo_id for photo_id, _ in filtered_results]

        for photo_id, base_score in filtered_results:
            result_dict = {
                'photo_id': photo_id,
                'base_score': base_score,
                'ocr_score': 0.0,
                'caption_score': 0.0,
                'metadata': None
            }
            enhanced_results.append(result_dict)

        # Enhance with OCR search if enabled
        if context.request.features.use_ocr and context.ocr_manager.is_available():
            ocr_start = time.time()
            ocr_matches = context.ocr_manager.search_text(
                context.request.query,
                photo_ids=photo_ids,
                min_confidence=0.3
            )

            # Add OCR scores to results
            ocr_scores = {photo_id: score for photo_id, score in ocr_matches}
            for result in enhanced_results:
                result['ocr_score'] = ocr_scores.get(result['photo_id'], 0.0)

            context.search_stats['ocr_search_time'] = time.time() - ocr_start
            context.search_stats['ocr_matches'] = len(ocr_matches)

        # Enhance with caption search if enabled
        if context.request.features.use_captions and context.caption_manager.is_available():
            caption_start = time.time()
            caption_matches = context.caption_manager.search_captions(
                context.request.query,
                photo_ids=photo_ids,
                min_confidence=0.3
            )

            # Add caption scores to results
            caption_scores = {photo_id: score for photo_id, score in caption_matches}
            for result in enhanced_results:
                result['caption_score'] = caption_scores.get(result['photo_id'], 0.0)

            context.search_stats['caption_search_time'] = time.time() - caption_start
            context.search_stats['caption_matches'] = len(caption_matches)

        context.search_stats['enhancement_time'] = time.time() - start_time

        return enhanced_results

    def _score_and_rank_results(self, context: SearchContext, enhanced_results: List[Dict[str, Any]]) -> List[SearchResult]:
        """Score, rank, and format search results."""
        start_time = time.time()

        # Calculate combined scores
        scored_results = []

        for result in enhanced_results:
            try:
                # Get photo metadata
                metadata = context.index_store.get_photo_metadata(result['photo_id'])
                result['metadata'] = metadata

                # Calculate combined score
                weights = self._get_score_weights(context.request)
                combined_score = (
                    result['base_score'] * weights['base'] +
                    result['ocr_score'] * weights['ocr'] +
                    result['caption_score'] * weights['caption']
                )

                # Create SearchResult
                search_result = SearchResult(
                    id=result['photo_id'],
                    filename=metadata.get('filename', 'unknown'),
                    path=metadata.get('path', ''),
                    score=combined_score,
                    metadata=metadata if context.request.include_metadata else None,
                    thumbnail_path=metadata.get('thumbnail_path'),
                    embedding_similarity=result['base_score'],
                    ocr_score=result['ocr_score'] if result['ocr_score'] > 0 else None,
                    caption_score=result['caption_score'] if result['caption_score'] > 0 else None
                )

                scored_results.append(search_result)

            except Exception as e:
                self.logger.warning(f"Failed to process result for photo {result['photo_id']}: {e}")
                continue

        # Sort by final score
        scored_results.sort(key=lambda x: x.score, reverse=True)

        # Apply limit
        final_results = scored_results[:context.request.limit]

        context.search_stats['scoring_time'] = time.time() - start_time

        return final_results

    def _get_score_weights(self, request: SearchRequest) -> Dict[str, float]:
        """Get scoring weights based on search request configuration."""
        weights = {
            'base': 1.0,
            'ocr': 0.0,
            'caption': 0.0
        }

        if request.features.use_ocr:
            weights['ocr'] = 0.3

        if request.features.use_captions:
            weights['caption'] = 0.3

        # Normalize weights
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}

        return weights

    def _build_search_response(self, context: SearchContext, results: List[SearchResult]) -> SearchResponse:
        """Build the final search response."""
        total_time = (time.time() - context.start_time) * 1000

        return SearchResponse(
            results=results,
            total_count=len(results),
            query=context.request.query,
            filters_applied=context.filter_manager.get_applied_filters(context.request),
            search_time_ms=total_time,
            provider_used=context.request.provider
        )

    def _log_search_analytics(self, context: SearchContext, response: SearchResponse):
        """Log search analytics for monitoring and improvement."""
        try:
            analytics_data = {
                'query': context.request.query,
                'provider': context.request.provider.value,
                'result_count': len(response.results),
                'search_time_ms': response.search_time_ms,
                'filters_applied': len(response.filters_applied),
                'features_used': {
                    'use_fast': context.request.features.use_fast,
                    'use_ocr': context.request.features.use_ocr,
                    'use_captions': context.request.features.use_captions
                },
                'performance_stats': context.search_stats,
                'timestamp': time.time()
            }

            # Log to analytics system (would integrate with existing analytics)
            self.logger.info(f"Search completed: {analytics_data['query']} -> {analytics_data['result_count']} results in {analytics_data['search_time_ms']:.1f}ms")

        except Exception as e:
            self.logger.warning(f"Failed to log search analytics: {e}")

    def get_search_suggestions(self, query_prefix: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get search suggestions based on query prefix."""
        suggestions = []

        try:
            # Get OCR-based suggestions
            if self.ocr_manager.is_available():
                ocr_suggestions = self.ocr_manager.search_text(query_prefix, min_confidence=0.2)
                for photo_id, score in ocr_suggestions[:limit//2]:
                    suggestions.append({
                        'text': f"Text in photo: {self._get_photo_preview(photo_id)}",
                        'type': 'ocr',
                        'score': score,
                        'photo_id': photo_id
                    })

            # Get caption-based suggestions
            if self.caption_manager.is_available():
                caption_suggestions = self.caption_manager.search_captions(query_prefix, min_confidence=0.2)
                for photo_id, score in caption_suggestions[:limit//2]:
                    suggestions.append({
                        'text': f"Caption: {self._get_photo_preview(photo_id)}",
                        'type': 'caption',
                        'score': score,
                        'photo_id': photo_id
                    })

            # Sort by score and apply limit
            suggestions.sort(key=lambda x: x['score'], reverse=True)
            return suggestions[:limit]

        except Exception as e:
            self.logger.error(f"Failed to get search suggestions: {e}")
            return []

    def _get_photo_preview(self, photo_id: str) -> str:
        """Get a preview string for a photo."""
        try:
            metadata = self.index_store.get_photo_metadata(photo_id)
            if metadata:
                return metadata.get('filename', 'Unknown photo')
        except Exception:
            pass
        return 'Unknown photo'

    def get_search_statistics(self) -> Dict[str, Any]:
        """Get comprehensive search statistics."""
        return {
            'ann_indexes': {
                'available': self.ann_manager.get_available_index_types(),
                'count': len(self.ann_manager.list_indexes())
            },
            'ocr': self.ocr_manager.get_statistics(),
            'captions': self.caption_manager.get_statistics(),
            'filter_manager': {
                'available': True
            }
        }

    def initialize_indexes(self, force_rebuild: bool = False) -> bool:
        """Initialize all search indexes."""
        try:
            # Initialize ANN indexes
            available_types = self.ann_manager.get_available_index_types()
            for index_type in available_types:
                if index_type != ANNIndexType.BRUTE_FORCE:
                    index_id = f"main_{index_type.value}"
                    if force_rebuild or index_id not in self.ann_manager.list_indexes():
                        self.logger.info(f"Initializing {index_type.value} index...")
                        # This would typically load from existing data
                        # For now, we'll just ensure the manager is ready

            self.logger.info("Search indexes initialized successfully")
            return True

        except Exception as e:
            self.logger.error(f"Failed to initialize search indexes: {e}")
            return False