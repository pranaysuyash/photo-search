# Server.py Refactoring Implementation Guide

## Immediate Action Items Based on Lizard Analysis

Based on the Lizard complexity analysis, here are the **4 critical functions** that need immediate refactoring:

### Priority 1: `_default_photo_dir_candidates` (CCN: 15)

**Current Issues:**

- Complex OS detection logic with nested conditionals
- Multiple exception handling blocks
- Mixed concerns (OS detection + directory validation + deduplication)

**Refactoring Implementation:**

```python
# services/directory_scanner.py
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict
import os

class OSDirectoryProvider(ABC):
    @abstractmethod
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        pass

class CommonDirectoryProvider(OSDirectoryProvider):
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        return [
            self._safe_add(home / "Pictures", "Pictures", "home"),
            self._safe_add(home / "Downloads", "Downloads", "home"),
        ]

    def _safe_add(self, path: Path, label: str, source: str) -> Dict[str, str] | None:
        try:
            if path.exists() and path.is_dir():
                return {"path": str(path), "label": label, "source": source}
        except Exception:
            pass
        return None

class WindowsDirectoryProvider(OSDirectoryProvider):
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        dirs = []
        # OneDrive directories
        if onedrive := os.environ.get("OneDrive"):
            dirs.append(self._safe_add(Path(onedrive) / "Pictures", "OneDrive Pictures", "onedrive"))
        # Public directories
        if public := os.environ.get("PUBLIC"):
            dirs.append(self._safe_add(Path(public) / "Pictures", "Public Pictures", "windows"))
        return [d for d in dirs if d is not None]

class MacOSDirectoryProvider(OSDirectoryProvider):
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        dirs = []
        icloud_docs = home / "Library" / "Mobile Documents" / "com~apple~CloudDocs"
        dirs.extend([
            self._safe_add(icloud_docs / "Photos", "iCloud Drive Photos", "icloud"),
            self._safe_add(icloud_docs / "Pictures", "iCloud Drive Pictures", "icloud"),
            self._safe_add(home / "Library" / "CloudStorage" / "iCloud Drive" / "Photos", "iCloud Photos", "icloud"),
        ])
        return [d for d in dirs if d is not None]

class LinuxDirectoryProvider(OSDirectoryProvider):
    def get_directories(self, home: Path) -> List[Dict[str, str]]:
        dirs = []
        try:
            user_dirs = home / ".config" / "user-dirs.dirs"
            if user_dirs.exists():
                dirs.extend(self._parse_xdg_config(user_dirs, home))
        except Exception:
            pass
        return dirs

class DirectoryScanner:
    def __init__(self):
        self.providers = {
            'common': CommonDirectoryProvider(),
            'windows': WindowsDirectoryProvider(),
            'darwin': MacOSDirectoryProvider(),
            'linux': LinuxDirectoryProvider(),
        }

    def get_default_photo_directories(self) -> List[Dict[str, str]]:
        all_dirs = []
        home = Path.home()
        sysname = self._get_system_name()

        # Always add common directories
        all_dirs.extend(self.providers['common'].get_directories(home))

        # Add OS-specific directories
        if sysname in self.providers:
            all_dirs.extend(self.providers[sysname].get_directories(home))

        return self._deduplicate_directories(all_dirs)

    def _get_system_name(self) -> str:
        return (os.uname().sysname if hasattr(os, 'uname') else os.name).lower()

    def _deduplicate_directories(self, dirs: List[Dict[str, str]]) -> List[Dict[str, str]]:
        seen = set()
        unique = []
        for d in dirs:
            if d is None:
                continue
            key = self._normalize_path(d["path"])
            if key not in seen:
                seen.add(key)
                unique.append(d)
        return unique
```

**CCN Reduction:** 15 → 3-4 per method

### Priority 2: `_perform_semantic_search` (CCN: 13)

**Current Issues:**

- Multiple search mode branches
- Complex parameter extraction logic
- Mixed error handling and business logic

**Refactoring Implementation:**

```python
# services/search_service.py
from typing import List, Optional
from dataclasses import dataclass
from enum import Enum

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
        elif params.use_captions and store.captions_available():
            return SearchMode.CAPTIONS
        elif params.use_ocr and store.ocr_available():
            return SearchMode.OCR
        else:
            return SearchMode.STANDARD

class SearchExecutor:
    def __init__(self):
        self.mode_resolver = SearchModeResolver()
        self.handlers = {
            SearchMode.FAST: self._execute_fast_search,
            SearchMode.CAPTIONS: self._execute_captions_search,
            SearchMode.OCR: self._execute_ocr_search,
            SearchMode.STANDARD: self._execute_standard_search,
        }

    def execute(self, store, embedder, unified_req) -> List:
        try:
            params = self._extract_parameters(unified_req)
            if not params.query.strip():
                return self._get_all_indexed_photos(store)

            mode = self.mode_resolver.resolve_mode(params, store)
            handler = self.handlers[mode]
            return handler(store, embedder, params)

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Search failed: {e}")

    def _execute_fast_search(self, store, embedder, params: SearchParameters) -> List:
        from infra.fast_index_manager import FastIndexManager
        fim = FastIndexManager(store)
        try:
            results, _ = fim.search(
                embedder, params.query,
                top_k=params.top_k,
                use_fast=True,
                fast_kind_hint=params.fast_kind
            )
            return results
        except Exception:
            # Fallback to standard search
            return self._execute_standard_search(store, embedder, params)
```

**CCN Reduction:** 13 → 3-4 per method

### Priority 3: `_scan_media_counts` (CCN: 11)

**Current Issues:**

- Nested loops with complex file processing
- Multiple exception handling blocks
- Mixed concerns (file traversal + counting + size calculation)

**Refactoring Implementation:**

```python
# services/media_scanner.py
from pathlib import Path
from typing import List, Dict, Any, Set
from dataclasses import dataclass

@dataclass
class MediaCounts:
    path: str
    count: int = 0
    bytes: int = 0

@dataclass
class ScanResult:
    items: List[MediaCounts]
    total_files: int
    total_bytes: int

class FileTypeFilter:
    def __init__(self, img_exts: Set[str], vid_exts: Set[str]):
        self.allowed_extensions = img_exts | vid_exts

    def is_media_file(self, file_path: Path) -> bool:
        return file_path.suffix.lower() in self.allowed_extensions

class DirectoryScanner:
    def __init__(self, file_filter: FileTypeFilter):
        self.file_filter = file_filter

    def scan_directory(self, directory: Path) -> MediaCounts:
        if not (directory.exists() and directory.is_dir()):
            return MediaCounts(path=str(directory))

        count = 0
        size = 0

        try:
            for file_path in self._walk_directory(directory):
                if self.file_filter.is_media_file(file_path):
                    count += 1
                    size += self._get_file_size(file_path)
        except Exception:
            # Reset on error
            count = 0
            size = 0

        return MediaCounts(path=str(directory), count=count, bytes=size)

    def _walk_directory(self, directory: Path):
        for root, _, files in os.walk(directory):
            for name in files:
                yield Path(root) / name

    def _get_file_size(self, file_path: Path) -> int:
        try:
            return file_path.stat().st_size
        except Exception:
            return 0

class MediaScanner:
    def scan_media_counts(self, paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
        file_filter = self._create_file_filter(include_videos)
        scanner = DirectoryScanner(file_filter)

        results = []
        total_files = 0
        total_bytes = 0

        for path_str in paths:
            path = Path(path_str).expanduser()
            counts = scanner.scan_directory(path)
            results.append(counts)
            total_files += counts.count
            total_bytes += counts.bytes

        return ScanResult(
            items=[{"path": r.path, "count": r.count, "bytes": r.bytes} for r in results],
            total_files=total_files,
            total_bytes=total_bytes
        ).__dict__
```

**CCN Reduction:** 11 → 2-3 per method

### Priority 4: `_evaluate_rpn_expression` (CCN: 11)

**Current Issues:**

- Complex stack-based expression evaluation
- Mixed token processing logic
- No clear separation between operators and operands

**Refactoring Implementation:**

```python
# services/expression_evaluator.py
from typing import List, Dict, Any
from abc import ABC, abstractmethod

class RPNToken(ABC):
    @abstractmethod
    def evaluate(self, stack: List[bool], path: str, context: Dict[str, Any]) -> None:
        pass

class LogicalOperatorToken(RPNToken):
    def __init__(self, operator: str):
        self.operator = operator.upper()

    def evaluate(self, stack: List[bool], path: str, context: Dict[str, Any]) -> None:
        if self.operator == 'NOT':
            value = stack.pop() if stack else False
            stack.append(not value)
        elif self.operator in ('AND', 'OR'):
            b = stack.pop() if stack else False
            a = stack.pop() if stack else False
            if self.operator == 'AND':
                stack.append(a and b)
            else:  # OR
                stack.append(a or b)

class FieldExpressionToken(RPNToken):
    def __init__(self, expression: str):
        self.expression = expression

    def evaluate(self, stack: List[bool], path: str, context: Dict[str, Any]) -> None:
        result = _evaluate_field_expression(self.expression, path, context)
        stack.append(result)

class RPNTokenFactory:
    @staticmethod
    def create_token(token_str: str) -> RPNToken:
        token_upper = token_str.upper()
        if token_upper in ('NOT', 'AND', 'OR'):
            return LogicalOperatorToken(token_upper)
        else:
            return FieldExpressionToken(token_str)

class RPNExpressionEvaluator:
    def __init__(self):
        self.token_factory = RPNTokenFactory()

    def evaluate(self, rpn_output: List[str], path: str, context: Dict[str, Any]) -> bool:
        stack = []

        for token_str in rpn_output:
            token = self.token_factory.create_token(token_str)
            token.evaluate(stack, path, context)

        return bool(stack[-1]) if stack else True
```

**CCN Reduction:** 11 → 2-3 per method

## Integration Plan

### Step 1: Create Service Directory Structure

```bash
mkdir -p photo-search-intent-first/services
touch photo-search-intent-first/services/__init__.py
touch photo-search-intent-first/services/directory_scanner.py
touch photo-search-intent-first/services/search_service.py
touch photo-search-intent-first/services/media_scanner.py
touch photo-search-intent-first/services/expression_evaluator.py
```

### Step 2: Add Dependencies Container

```python
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
```

### Step 3: Update Server.py Functions

Replace the complex functions with simple delegations:

```python
# In api/server.py - replace existing functions
from api.dependencies import get_directory_scanner, get_search_executor, get_media_scanner, get_expression_evaluator

def _default_photo_dir_candidates() -> List[Dict[str, str]]:
    scanner = get_directory_scanner()
    return scanner.get_default_photo_directories()

def _perform_semantic_search(store, embedder, unified_req: UnifiedSearchRequest) -> List:
    executor = get_search_executor()
    return executor.execute(store, embedder, unified_req)

def _scan_media_counts(paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
    scanner = get_media_scanner()
    return scanner.scan_media_counts(paths, include_videos)

def _evaluate_rpn_expression(rpn_output: List[str], path: str, context: dict) -> bool:
    evaluator = get_expression_evaluator()
    return evaluator.evaluate(rpn_output, path, context)
```

## Verification Steps

1. **Run Lizard Analysis After Changes:**

   ```bash
   lizard api/server.py -C 10
   ```

2. **Expected Results:**

   - All functions should have CCN < 10
   - Total file NLOC should be significantly reduced
   - No complexity warnings

3. **Run Existing Tests:**

   ```bash
   PYTHONPATH=. python tests/smoke_dummy.py
   pytest tests/ -v
   ```

4. **Performance Verification:**
   - API response times should remain unchanged
   - Memory usage should be similar or improved

This refactoring approach maintains backward compatibility while dramatically reducing complexity and improving maintainability.
