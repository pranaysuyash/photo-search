# Server.py Complexity Analysis & Refactoring Plan

## Overview

Lizard analysis of `photo-search-intent-first/api/server.py` identified **4 functions with high cyclomatic complexity (CCN > 10)** that need refactoring. This analysis provides detailed recommendations for reducing complexity and improving maintainability.

## High Complexity Functions Identified

### 1. `_default_photo_dir_candidates` (CCN: 15, NLOC: 42)

**Location:** Lines 233-285  
**Issues:** Complex OS detection logic with nested conditionals

**Refactoring Strategy:**

```python
# Extract OS-specific handlers
class PhotoDirScanner:
    @staticmethod
    def get_common_dirs(home: Path) -> List[Dict[str, str]]:
        return [
            {"path": str(home / "Pictures"), "label": "Pictures", "source": "home"},
            {"path": str(home / "Downloads"), "label": "Downloads", "source": "home"}
        ]

    @staticmethod
    def get_windows_dirs(home: Path) -> List[Dict[str, str]]:
        # OneDrive and Windows public directories

    @staticmethod
    def get_macos_dirs(home: Path) -> List[Dict[str, str]]:
        # iCloud Drive directories

    @staticmethod
    def get_linux_dirs(home: Path) -> List[Dict[str, str]]:
        # XDG user directories
```

**Benefits:** CCN reduces from 15 to ~3-4 per method, better testability

### 2. `_perform_semantic_search` (CCN: 13, NLOC: 44)

**Location:** Lines 351-402  
**Issues:** Multiple search modes with complex branching logic

**Refactoring Strategy:**

```python
class SearchHandler:
    def execute(self, store, embedder, unified_req: UnifiedSearchRequest) -> List:
        if self._should_use_fast_search(unified_req):
            return self._fast_search(store, embedder, unified_req)
        return self._standard_search(store, embedder, unified_req)

    def _should_use_fast_search(self, req) -> bool:
        return bool(req.to_legacy_param_dict().get("use_fast"))

    def _fast_search(self, store, embedder, req) -> List:
        # Fast index search logic

    def _standard_search(self, store, embedder, req) -> List:
        # Standard search with mode selection
```

**Benefits:** CCN reduces from 13 to ~3-5 per method, clear separation of concerns

### 3. `_scan_media_counts` (CCN: 11, NLOC: 27)

**Location:** Lines 288-315  
**Issues:** Nested loops with multiple try/catch blocks

**Refactoring Strategy:**

```python
class MediaScanner:
    def scan_directories(self, paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
        results = [self._scan_single_directory(p, include_videos) for p in paths]
        return self._aggregate_results(results)

    def _scan_single_directory(self, path: str, include_videos: bool) -> Dict[str, Any]:
        # Single directory scanning logic

    def _count_media_files(self, directory: Path, extensions: set) -> tuple[int, int]:
        # File counting with error handling
```

**Benefits:** CCN reduces from 11 to ~3-4 per method, easier to test individual components

### 4. `_evaluate_rpn_expression` (CCN: 11, NLOC: 14)

**Location:** Lines 1045-1060  
**Issues:** Complex expression evaluation with stack operations

**Refactoring Strategy:**

```python
class RPNEvaluator:
    def evaluate(self, rpn_output: List[str], path: str, context: dict) -> bool:
        stack = []
        for token in rpn_output:
            result = self._process_token(token, stack, path, context)
            if result is not None:
                stack.append(result)
        return bool(stack[-1]) if stack else True

    def _process_token(self, token: str, stack: list, path: str, context: dict):
        if self._is_logical_operator(token):
            return self._handle_logical_operator(token, stack)
        elif self._is_field_expression(token):
            return _evaluate_field_expression(token, path, context)
        return None
```

**Benefits:** CCN reduces from 11 to ~2-3 per method, clearer token processing logic

## Additional Issues Found

### Functions with Moderate Complexity (CCN 6-10)

- `_build_evaluation_context` (CCN: 10)
- `_apply_multiple_persons_filter` (CCN: 8)
- `_apply_date_range_filter` (CCN: 9)
- `_check_heading_range` (CCN: 9)

These should be addressed in subsequent refactoring phases.

## Recommended Refactoring Approach

### Phase 1: Extract High-Complexity Functions

1. Create new service classes in `services/` directory
2. Extract the 4 high-complexity functions into dedicated classes
3. Maintain API compatibility by keeping wrapper functions

### Phase 2: Implement Service Layer

```python
# services/directory_scanner.py
class DirectoryScanner:
    def get_default_photo_directories(self) -> List[Dict[str, str]]

# services/search_service.py
class SearchService:
    def perform_semantic_search(self, store, embedder, request) -> List

# services/media_scanner.py
class MediaScanner:
    def scan_media_counts(self, paths: List[str], include_videos: bool) -> Dict

# services/expression_evaluator.py
class ExpressionEvaluator:
    def evaluate_rpn_expression(self, rpn_output: List[str], path: str, context: dict) -> bool
```

### Phase 3: Dependency Injection

```python
# api/dependencies.py
def get_directory_scanner() -> DirectoryScanner:
    return DirectoryScanner()

def get_search_service() -> SearchService:
    return SearchService()

# In route handlers
@app.get("/api/directories")
def get_directories(scanner: DirectoryScanner = Depends(get_directory_scanner)):
    return scanner.get_default_photo_directories()
```

## File Size Reduction Plan

Current `server.py` has **1381 lines**. Target breakdown:

- **Main server.py**: ~200 lines (app setup, middleware, basic routes)
- **Router modules**: ~150-200 lines each
- **Service modules**: ~100-150 lines each
- **Utility modules**: ~50-100 lines each

**Total reduction**: From 1381 lines to ~200 lines in main file

## Testing Strategy

### Unit Tests for Extracted Services

```python
# tests/services/test_directory_scanner.py
def test_common_directories_found():
    scanner = DirectoryScanner()
    dirs = scanner.get_common_directories(Path.home())
    assert any(d["label"] == "Pictures" for d in dirs)

# tests/services/test_search_service.py
def test_fast_search_fallback():
    service = SearchService()
    # Test fast search with fallback to standard search

# tests/services/test_expression_evaluator.py
def test_rpn_evaluation():
    evaluator = ExpressionEvaluator()
    # Test various RPN expressions
```

### Integration Tests

- Maintain existing API endpoint tests
- Add performance benchmarks for refactored functions
- Add complexity verification tests (CCN < 10)

## Implementation Timeline

### Week 1: Setup & Directory Scanner

- Set up service layer structure
- Refactor `_default_photo_dir_candidates`
- Add unit tests

### Week 2: Search Service

- Refactor `_perform_semantic_search`
- Implement search handler pattern
- Add integration tests

### Week 3: Media Scanner & Expression Evaluator

- Refactor `_scan_media_counts` and `_evaluate_rpn_expression`
- Complete service extraction
- Update dependencies

### Week 4: Integration & Cleanup

- Wire up dependency injection
- Remove old functions from server.py
- Performance testing and optimization

## Success Metrics

- **Complexity**: All functions CCN < 10
- **File Size**: Main server.py < 250 lines
- **Test Coverage**: >90% for extracted services
- **Performance**: No regression in API response times
- **Maintainability**: Clear separation of concerns

## Risk Mitigation

1. **Backward Compatibility**: Keep wrapper functions during transition
2. **Gradual Migration**: Extract one function at a time
3. **Testing**: Comprehensive test suite before and after refactoring
4. **Monitoring**: Track performance metrics during deployment
5. **Rollback Plan**: Git branches for easy rollback if issues arise

## Next Steps

1. Review this analysis with the team
2. Create feature branch for refactoring work
3. Set up service layer directory structure
4. Begin with `DirectoryScanner` extraction (lowest risk)
5. Implement continuous integration checks for complexity metrics

---

_Analysis performed using Lizard v2.1+ on September 30, 2025_
_Based on photo-search-intent-first/api/server.py (1381 lines)_
