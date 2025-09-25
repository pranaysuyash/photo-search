#!/usr/bin/env python3
"""
Local Code Review Tool (v3)
Focuses on LOCAL code first with fast, configurable checks.

New in v3:
- Precise failing semantics: nonzero exit when any issue is found (opt-in).
- Parallel file analysis with --workers (defaults to CPU count).
- Colorized output (auto, --color/--no-color).
- PR-friendly diff selectors: --range A..B, --since "2 weeks ago", or --base (default HEAD).
- JSON report: --json prints a machine-readable summary.
- Exact issue counts + totals in the final summary.

Scope:
- Python: syntax check, long lines, print(), TODO.
- JS/TS: long lines, console.log(), TODO.
"""

from __future__ import annotations

import argparse
import concurrent.futures as futures
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple, Dict, Optional

# ----------------------------
# CLI & Constants
# ----------------------------

PY_DEFAULT_MAXLEN = 100
JS_DEFAULT_MAXLEN = 120
DEFAULT_MAX_ISSUES_PER_FILE = 5
DEFAULT_LARGE_PY_BYTES = 10_000
DEFAULT_LARGE_JS_BYTES = 15_000

PRINT_EMOJI = True

PY_EXTS = (".py",)
JS_EXTS = (".ts", ".tsx", ".js", ".jsx")

DEBUG_PRINT_RE = re.compile(r"(^|\W)print\s*\(", re.IGNORECASE)
CONSOLE_LOG_RE = re.compile(r"(^|[^\w])console\.log\s*\(", re.IGNORECASE)
TODO_RE = re.compile(r"\bTODO\b", re.IGNORECASE)

# ----------------------------
# Color helpers
# ----------------------------

def supports_color() -> bool:
  if os.environ.get("NO_COLOR"):
    return False
  return sys.stdout.isatty()

class C:
  enabled = supports_color()
  @staticmethod
  def set_enabled(v: bool) -> None:
    C.enabled = v
  @staticmethod
  def wrap(code: str, s: str) -> str:
    if not C.enabled:
      return s
    return f"\033[{code}m{s}\033[0m"
  @staticmethod
  def red(s: str) -> str: return C.wrap("31", s)
  @staticmethod
  def yellow(s: str) -> str: return C.wrap("33", s)
  @staticmethod
  def green(s: str) -> str: return C.wrap("32", s)
  @staticmethod
  def blue(s: str) -> str: return C.wrap("34", s)
  @staticmethod
  def bold(s: str) -> str: return C.wrap("1", s)

# ----------------------------
# Utilities
# ----------------------------

def emoji(s: str) -> str:
  return s if PRINT_EMOJI else ""

def run_command(cmd: Sequence[str]) -> Tuple[str, int]:
  try:
    out = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
    return out.decode("utf-8", "replace").strip(), 0
  except subprocess.CalledProcessError as exc:
    return exc.output.decode("utf-8", "replace").strip(), exc.returncode

def in_git_repo() -> bool:
  _, code = run_command(["git", "rev-parse", "--is-inside-work-tree"])
  return code == 0

def path_matches_any(p: Path, patterns: Iterable[str]) -> bool:
  from fnmatch import fnmatch
  sp = str(p).replace("\\", "/")
  return any(fnmatch(sp, pat) for pat in patterns)

# ----------------------------
# Diff/Changed files
# ----------------------------

def get_changed_files(*, base: str = "HEAD", staged: bool = False, range_spec: Optional[str] = None, since: Optional[str] = None) -> List[Path]:
  """
  Return list of changed files based on one of:
    - range_spec: explicit 'A..B' (takes precedence)
    - since: e.g., '2 weeks ago' (compared to working tree)
    - base: single ref vs working tree (default HEAD)
    - staged: review only staged changes
  Excludes deleted files.
  """
  if range_spec:
    out, code = run_command(["git", "diff", "--name-only", range_spec])
  elif since:
    out, code = run_command(["git", "diff", "--name-only", f'--since={since}'])
  elif staged:
    out, code = run_command(["git", "diff", "--name-only", "--cached"])
  else:
    out, code = run_command(["git", "diff", "--name-only", base])
  if code != 0 or not out:
    return []
  files = []
  for line in out.splitlines():
    s = line.strip()
    if not s:
      continue
    p = Path(s)
    # Exclude deleted/renamed-to-nonexistent
    if p.exists() and p.is_file():
      files.append(p)
  return files

# ----------------------------
# Analysis helpers
# ----------------------------

@dataclass
class Issue:
  line: int
  message: str

@dataclass
class FileReport:
  path: Path
  size_bytes: int
  large: bool
  issues: List[Issue]
  kind: str  # 'py' or 'js'

  def to_json(self) -> Dict:
    return {
      "path": str(self.path),
      "size_bytes": self.size_bytes,
      "large": self.large,
      "kind": self.kind,
      "issues": [asdict(i) for i in self.issues],
    }

def read_text_safe(path: Path) -> str:
  try:
    return path.read_text(encoding="utf-8", errors="replace")
  except Exception:
    return ""

def analyze_python_file(path: Path, *, max_len: int, large_threshold: int, max_issues: int) -> FileReport:
  issues: List[Issue] = []
  content = read_text_safe(path)
  size = path.stat().st_size if path.exists() else 0

  # Syntax check (best-effort)
  try:
    compile(content, str(path), "exec")
  except SyntaxError as err:
    issues.append(Issue(err.lineno or 0, f"Syntax Error: {err.msg}"))

  # Long lines, print(), TODO
  for i, line in enumerate(content.splitlines(), 1):
    if len(line) > max_len:
      issues.append(Issue(i, f"Line too long ({len(line)} chars)"))
    stripped = line.lstrip()
    if DEBUG_PRINT_RE.search(line) and not stripped.startswith("#"):
      issues.append(Issue(i, "Debug print statement"))
    if TODO_RE.search(line):
      issues.append(Issue(i, "TODO comment"))
    if len(issues) >= max_issues:
      break

  return FileReport(
    path=path,
    size_bytes=size,
    large=size > large_threshold,
    issues=issues,
    kind="py",
  )

def analyze_js_file(path: Path, *, max_len: int, large_threshold: int, max_issues: int) -> FileReport:
  issues: List[Issue] = []
  content = read_text_safe(path)
  size = path.stat().st_size if path.exists() else 0

  for i, line in enumerate(content.splitlines(), 1):
    if len(line) > max_len:
      issues.append(Issue(i, f"Line too long ({len(line)} chars)"))
    stripped = line.strip()
    if CONSOLE_LOG_RE.search(line) and not stripped.startswith("//"):
      issues.append(Issue(i, "Debug console.log statement"))
    if TODO_RE.search(line):
      issues.append(Issue(i, "TODO comment"))
    if len(issues) >= max_issues:
      break

  return FileReport(
    path=path,
    size_bytes=size,
    large=size > large_threshold,
    issues=issues,
    kind="js",
  )

def analyze_dispatch(path: Path, *, py_max: int, js_max: int, py_large: int, js_large: int, max_issues: int) -> Optional[FileReport]:
  if path.suffix in PY_EXTS:
    return analyze_python_file(path, max_len=py_max, large_threshold=py_large, max_issues=max_issues)
  if path.suffix in JS_EXTS:
    return analyze_js_file(path, max_len=js_max, large_threshold=js_large, max_issues=max_issues)
  return None

# ----------------------------
# Reporting
# ----------------------------

def print_header(title: str) -> None:
  print(C.bold(title))
  print(C.blue("=" * max(50, len(title))))

def print_file_report(rep: FileReport) -> int:
  icon = "🐍" if rep.kind == "py" else "📜"
  header = f"{icon} {rep.path}"
  if rep.large:
    header += f"  {emoji('⚠️ ')}{C.yellow('Large')} ({rep.size_bytes} bytes)"
  print(header)
  if not rep.issues:
    print(f"  {C.green('✅ No common issues found')}")
    return 0
  print(f"  {emoji('⚠️ ')}{C.yellow('Issues found:')}")
  for issue in rep.issues:
    print(f"    Line {issue.line}: {issue.message}")
  print()
  return len(rep.issues)

# ----------------------------
# Main
# ----------------------------

def main(argv: Sequence[str] | None = None) -> int:
  parser = argparse.ArgumentParser(description="Local Code Review Tool (v3)")
  src = parser.add_argument_group("Source selection")
  src.add_argument("--base", default="HEAD", help="Git base ref for diff (default: HEAD)")
  src.add_argument("--staged", action="store_true", help="Only review staged changes")
  src.add_argument("--range", dest="range_spec", default=None, help="Explicit git diff range, e.g. origin/main..HEAD")
  src.add_argument("--since", default=None, help='Diff since time, e.g. "2 weeks ago"')

  filt = parser.add_argument_group("Filters")
  filt.add_argument("--include", nargs="*", default=[], help="Glob patterns to include")
  filt.add_argument("--exclude", nargs="*", default=[
    "photo-search-intent-first/ui/**",
    "**/node_modules/**",
    "**/.venv/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/.playwright-mcp/**",
  ], help="Glob patterns to exclude")

  limits = parser.add_argument_group("Limits")
  limits.add_argument("--py-maxlen", type=int, default=PY_DEFAULT_MAXLEN)
  limits.add_argument("--js-maxlen", type=int, default=JS_DEFAULT_MAXLEN)
  limits.add_argument("--max-issues", type=int, default=DEFAULT_MAX_ISSUES_PER_FILE)
  limits.add_argument("--py-large", type=int, default=DEFAULT_LARGE_PY_BYTES)
  limits.add_argument("--js-large", type=int, default=DEFAULT_LARGE_JS_BYTES)

  out = parser.add_argument_group("Output")
  out.add_argument("--json", action="store_true", help="Print JSON report instead of text")
  out.add_argument("--color", dest="force_color", action="store_true", help="Force color")
  out.add_argument("--no-color", dest="no_color", action="store_true", help="Disable color")

  perf = parser.add_argument_group("Performance")
  perf.add_argument("--workers", type=int, default=os.cpu_count() or 4, help="Parallel workers (default: CPU count)")

  behavior = parser.add_argument_group("Behavior")
  behavior.add_argument("--fail-on-issues", action="store_true", help="Exit nonzero if any issues found")

  args = parser.parse_args(argv)

  if args.force_color:
    C.set_enabled(True)
  if args.no_color:
    C.set_enabled(False)

  print(C.bold("🔍 Local Code Review"))
  print("=" * 80)

  if not in_git_repo():
    print(C.red("❌ Not in a git repository"))
    return 1

  files = get_changed_files(base=args.base, staged=args.staged, range_spec=args.range_spec, since=args.since)
  if not files:
    print(C.green("✅ No changes to review"))
    return 0

  # Include/exclude filters
  if args.include:
    files = [f for f in files if path_matches_any(f, args.include)]
  if args.exclude:
    files = [f for f in files if not path_matches_any(f, args.exclude)]

  print(f"📋 Found {len(files)} changed files\n")

  # File size analysis (raw bytes)
  print_header("📊 File Size Analysis")
  large_entries = []
  for f in files:
    try:
      sz = f.stat().st_size
    except OSError:
      continue
    is_py = f.suffix in PY_EXTS
    is_js = f.suffix in JS_EXTS
    threshold = args.py_large if is_py else (args.js_large if is_js else None)
    if threshold and sz > threshold:
      large_entries.append((f, sz))
  if large_entries:
    print(f"{emoji('⚠️ ')}Files with significant size (>{args.py_large}B py, >{args.js_large}B js):")
    for f, sz in sorted(large_entries, key=lambda x: x[1], reverse=True)[:20]:
      print(f"  {f}  |  {sz} bytes")
  else:
    print(C.green("✅ No unusually large changes detected"))
  print()

  # Parallel analysis
  reports: List[FileReport] = []
  with futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
    futs = []
    for f in files:
      futs.append(ex.submit(analyze_dispatch, f, py_max=args.py_maxlen, js_max=args.js_maxlen, py_large=args.py_large, js_large=args.js_large, max_issues=args.max_issues))
    for fu in futures.as_completed(futs):
      rep = fu.result()
      if rep is not None:
        reports.append(rep)

  # Text report
  if not args.json:
    # Group by kind just for nicer sectioning
    py_reports = [r for r in reports if r.kind == "py"]
    js_reports = [r for r in reports if r.kind == "js"]

    if py_reports:
      print_header("🐍 Python Files Analysis")
      for r in py_reports:
        print_file_report(r)

    if js_reports:
      print_header("📜 TypeScript/JavaScript Files Analysis")
      for r in js_reports:
        print_file_report(r)

    # Recent commits (context)
    print_header("🔍 Recent Commit Analysis")
    out, _ = run_command(["git", "--no-pager", "log", "--oneline", "-5"])
    if out:
      print("Recent commits:")
      for line in out.splitlines():
        if line.strip():
          print(f"  {line}")
    # Diff stat of last commit (best-effort)
    out, _ = run_command(["git", "--no-pager", "diff", "--stat", f"{args.base}~1..{args.base}"])
    if out:
      print("\nLast commit changes:")
      print(out)
    print()

  # Summary + next steps
  total_issues = sum(len(r.issues) for r in reports)
  files_with_issues = sum(1 for r in reports if r.issues)
  summary = {
    "files_scanned": len(files),
    "files_with_issues": files_with_issues,
    "total_issues": total_issues,
    "py_files": sum(1 for r in reports if r.kind == "py"),
    "js_files": sum(1 for r in reports if r.kind == "js"),
  }

  if args.json:
    print(json.dumps({
      "summary": summary,
      "reports": [r.to_json() for r in reports],
    }, indent=2))
  else:
    print(C.bold("🎉 Review complete!"))
    print()
    print("Summary:")
    print(f"- Files scanned: {summary['files_scanned']}")
    print(f"- Files with issues: {summary['files_with_issues']}")
    print(f"- Total issues: {C.yellow(str(summary['total_issues'])) if total_issues else C.green('0')}")
    print()
    print("Next steps:")
    print("- Run tests: npm test (JS) or python -m pytest (Python)")
    print("- Format code: prettier . --write (JS) or black . (Python)")
    print("- Lint code: eslint . (JS) or ruff/flake8/pylint (Python)")

  if args.fail_on_issues and total_issues > 0:
    return 2  # explicit nonzero exit when issues found

  return 0

if __name__ == "__main__":
  sys.exit(main())