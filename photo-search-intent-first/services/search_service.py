# services/search_service.py
from typing import List, Optional
from dataclasses import dataclass
from enum import Enum
from api.search_models import SearchRequest as UnifiedSearchRequest


class SearchMode(Enum):
    FAST = "fast"
    CAPTIONS = "captions"
    OCR = "ocr"
    STANDARD = "standard"


@dataclass
class SearchParameters:
    query: str
    top_k: int = 48
    use_fast: bool = False
    fast_kind: Optional[str] = None
    use_captions: bool = False
    use_ocr: bool = False
    similarity_threshold: Optional[float] = None


class SearchModeResolver:
    def resolve_mode(self, params: SearchParameters, store) -> SearchMode:
        if params.use_fast:
            return SearchMode.FAST
        elif params.use_captions and hasattr(store, 'captions_available') and store.captions_available():
            return SearchMode.CAPTIONS
        elif params.use_ocr and hasattr(store, 'ocr_available') and store.ocr_available():
            return SearchMode.OCR
        else:
            return SearchMode.STANDARD


class SearchExecutor:
    def __init__(self):
        self.mode_resolver = SearchModeResolver()
        # We'll define the handlers in the execute method

    def execute(self, store, embedder, unified_req: UnifiedSearchRequest) -> List:
        try:
            params = self._extract_parameters(unified_req)
            if not params.query.strip():
                # Return all indexed photos if query is empty
                return self._get_all_indexed_photos(store)
            
            mode = self.mode_resolver.resolve_mode(params, store)
            
            # Execute the appropriate search based on mode
            if mode == SearchMode.FAST:
                return self._execute_fast_search(store, embedder, params)
            elif mode == SearchMode.CAPTIONS:
                return self._execute_captions_search(store, embedder, params)
            elif mode == SearchMode.OCR:
                return self._execute_ocr_search(store, embedder, params)
            else:  # STANDARD
                return self._execute_standard_search(store, embedder, params)
                
        except Exception as e:
            # Raise HTTPException for proper error handling
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    def _extract_parameters(self, unified_req: UnifiedSearchRequest) -> SearchParameters:
        """Extract search parameters from the unified request object."""
        return SearchParameters(
            query=unified_req.query,
            top_k=unified_req.top_k,
            use_fast=unified_req.use_fast,
            fast_kind=unified_req.fast_kind,
            use_captions=unified_req.use_captions,
            use_ocr=unified_req.use_ocr,
        )

    def _get_all_indexed_photos(self, store) -> List:
        """Return all indexed photos when query is empty."""
        if hasattr(store, 'get_all_photos'):
            return store.get_all_photos()
        # Fallback implementation
        return []

    def _execute_fast_search(self, store, embedder, params: SearchParameters) -> List:
        """Handle fast search with fallback to standard if needed."""
        from infra.fast_index_manager import FastIndexManager
        fim = FastIndexManager(store)
        try:
            results, _ = fim.search(
                embedder, 
                params.query,
                top_k=params.top_k,
                use_fast=True,
                fast_kind_hint=params.fast_kind
            )
            return results
        except Exception:
            # Fallback to standard search if fast search fails
            return self._execute_standard_search(store, embedder, params)

    def _execute_captions_search(self, store, embedder, params: SearchParameters) -> List:
        """Handle search using captions."""
        # This is a placeholder - actual implementation would depend on your caption search logic
        if hasattr(store, 'search_with_captions'):
            return store.search_with_captions(
                embedder, 
                params.query, 
                top_k=params.top_k
            )
        else:
            return self._execute_standard_search(store, embedder, params)

    def _execute_ocr_search(self, store, embedder, params: SearchParameters) -> List:
        """Handle search using OCR text."""
        # This is a placeholder - actual implementation would depend on your OCR search logic
        if hasattr(store, 'search_with_ocr'):
            return store.search_with_ocr(
                embedder, 
                params.query, 
                top_k=params.top_k
            )
        else:
            return self._execute_standard_search(store, embedder, params)

    def _execute_standard_search(self, store, embedder, params: SearchParameters) -> List:
        """Handle standard semantic search."""
        # This is a placeholder - actual implementation would depend on your standard search logic
        if hasattr(store, 'search'):
            return store.search(
                embedder, 
                params.query, 
                top_k=params.top_k
            )
        else:
            # Return empty list if search method doesn't exist
            return []