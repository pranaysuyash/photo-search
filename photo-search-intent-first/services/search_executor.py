"""
SearchExecutor Service

Extracted from server.py _perform_semantic_search function to reduce
cyclomatic complexity (CCN: 13 → 3-4 per method).

Handles semantic search execution with multiple search modes:
- Fast indexing
- Caption-based search
- OCR-based search
- Regular embedding search
- All-photos fallback
"""

from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import HTTPException

from api.search_models import SearchRequest as UnifiedSearchRequest
from domain.models import SearchResult


class SearchMode:
    """Enum-like class for search modes."""
    FAST = "fast"
    CAPTIONS = "captions"
    OCR = "ocr"
    REGULAR = "regular"
    ALL_PHOTOS = "all_photos"


class SearchExecutor:
    """Service for executing semantic searches with multiple modes."""
    
    def execute_search(self, store, embedder, unified_req: UnifiedSearchRequest) -> List:
        """Perform the core semantic search operation with all search modes."""
        try:
            # Extract legacy parameters for compatibility
            legacy_params = unified_req.to_legacy_param_dict()
            query_value = (legacy_params.get("query") or "").strip()
            
            # Determine search mode
            search_mode = self._determine_search_mode(
                query_value, legacy_params, store
            )
            
            # Execute search based on mode
            if search_mode == SearchMode.FAST:
                return self._execute_fast_search(store, embedder, query_value, legacy_params)
            elif search_mode == SearchMode.CAPTIONS:
                return self._execute_caption_search(store, embedder, query_value, legacy_params)
            elif search_mode == SearchMode.OCR:
                return self._execute_ocr_search(store, embedder, query_value, legacy_params)
            elif search_mode == SearchMode.REGULAR:
                return self._execute_regular_search(store, embedder, query_value, unified_req, legacy_params)
            elif search_mode == SearchMode.ALL_PHOTOS:
                return self._execute_all_photos_search(store)
            else:
                raise ValueError(f"Unknown search mode: {search_mode}")
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Search failed: {e}")
    
    def _determine_search_mode(self, query_value: str, legacy_params: Dict[str, Any], store) -> str:
        """Determine which search mode to use based on parameters and availability."""
        use_fast_value = bool(legacy_params.get("use_fast"))
        use_captions_value = bool(legacy_params.get("use_captions"))
        use_ocr_value = bool(legacy_params.get("use_ocr"))
        
        if not query_value.strip():  # Fixed: check stripped value
            return SearchMode.ALL_PHOTOS
            
        if use_fast_value:
            return SearchMode.FAST
        elif use_captions_value and store.captions_available():
            return SearchMode.CAPTIONS
        elif use_ocr_value and store.ocr_available():
            return SearchMode.OCR
        else:
            return SearchMode.REGULAR
    
    def _execute_fast_search(self, store, embedder, query_value: str, legacy_params: Dict[str, Any]) -> List:
        """Execute search using fast indexing."""
        try:
            from infra.fast_index_manager import FastIndexManager
            fim = FastIndexManager(store)
            
            top_k_value = legacy_params.get("top_k", 48)
            fast_kind_value = legacy_params.get("fast_kind")
            
            results, fast_meta = fim.search(
                embedder, query_value, 
                top_k=top_k_value, 
                use_fast=True, 
                fast_kind_hint=fast_kind_value
            )
            return results
        except Exception:
            # Fallback to regular search mode
            return self._execute_regular_search_fallback(store, embedder, query_value, legacy_params)
    
    def _execute_caption_search(self, store, embedder, query_value: str, legacy_params: Dict[str, Any]) -> List:
        """Execute search using captions."""
        top_k_value = legacy_params.get("top_k", 48)
        return store.search_with_captions(embedder, query_value, top_k_value)
    
    def _execute_ocr_search(self, store, embedder, query_value: str, legacy_params: Dict[str, Any]) -> List:
        """Execute search using OCR text."""
        top_k_value = legacy_params.get("top_k", 48)
        return store.search_with_ocr(embedder, query_value, top_k_value)
    
    def _execute_regular_search(self, store, embedder, query_value: str, 
                              unified_req: UnifiedSearchRequest, legacy_params: Dict[str, Any]) -> List:
        """Execute regular embedding-based search."""
        top_k_value = legacy_params.get("top_k", 48)
        use_captions_value = bool(legacy_params.get("use_captions"))
        use_fast_value = bool(legacy_params.get("use_fast"))
        fast_kind_value = legacy_params.get("fast_kind")
        use_ocr_value = bool(legacy_params.get("use_ocr"))
        
        return store.search(
            embedder,
            query_value,
            top_k=top_k_value,
            similarity_threshold=unified_req.similarity_threshold,
            use_captions=use_captions_value,
            use_fast=use_fast_value,
            fast_kind=fast_kind_value,
            use_ocr=use_ocr_value,
        )
    
    def _execute_regular_search_fallback(self, store, embedder, query_value: str, legacy_params: Dict[str, Any]) -> List:
        """Fallback regular search when fast search fails."""
        top_k_value = legacy_params.get("top_k", 48)
        use_captions_value = bool(legacy_params.get("use_captions"))
        use_ocr_value = bool(legacy_params.get("use_ocr"))
        
        return store.search(
            embedder,
            query_value,
            top_k=top_k_value,
            use_captions=use_captions_value,
            use_fast=False,  # Explicitly disable fast search for fallback
            use_ocr=use_ocr_value,
        )
    
    def _execute_all_photos_search(self, store) -> List[SearchResult]:
        """Return all indexed photos when no query is provided."""
        paths = store.state.paths or []
        return [SearchResult(path=Path(p), score=1.0) for p in paths]