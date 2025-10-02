# api/dependencies.py
from functools import lru_cache
from services.directory_scanner import DirectoryScanner
from services.search_service import SearchExecutor
from services.media_scanner import MediaScanner
from services.expression_evaluator import RPNExpressionEvaluator


@lru_cache()
def get_directory_scanner() -> DirectoryScanner:
    return DirectoryScanner()


@lru_cache()
def get_search_executor() -> SearchExecutor:
    return SearchExecutor()


@lru_cache()
def get_media_scanner() -> MediaScanner:
    return MediaScanner()


@lru_cache()
def get_expression_evaluator() -> RPNExpressionEvaluator:
    return RPNExpressionEvaluator()