#!/usr/bin/env bash
set -euo pipefail

# Photo Search: One-command dev orchestrator
# Starts: Python backend (FastAPI) -> waits for :8000 -> Vite on :5174 -> Electron

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
VENVDIR="$ROOT_DIR/.venv"
BACKEND_CMD=("$VENVDIR/bin/python" "run_server.py")
VITE_DIR="$ROOT_DIR/webapp-v3"
ELECTRON_DIR="$ROOT_DIR/electron-v3"

API_URL="http://127.0.0.1:8000"
UI_URL="http://127.0.0.1:5174"

# Colors
cyan() { printf "\033[36m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
red() { printf "\033[31m%s\033[0m\n" "$*"; }

require() {
  command -v "$1" >/dev/null 2>&1 || { red "Missing dependency: $1"; exit 1; }
}

require curl
require node
require npm

if [[ ! -x "$VENVDIR/bin/python" ]]; then
  red "Python venv not found at $VENVDIR. Please create it and install deps."
  exit 1
fi

PIDS=()
cleanup() {
  yellow "\nShutting down..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  # Also try to close electron gracefully
  pkill -f "electron ." 2>/dev/null || true
  wait || true
}
trap cleanup EXIT INT TERM

wait_for() {
  local url="$1" name="$2" timeout="${3:-60}"
  local start=$(date +%s)
  until curl -fsS "$url" >/dev/null 2>&1; do
    sleep 0.5
    local now=$(date +%s)
    if (( now - start > timeout )); then
      red "Timeout waiting for $name at $url"
      exit 1
    fi
  done
}

cyan "[1/4] Starting backend (FastAPI)"
(
  cd "$ROOT_DIR"
  PYTHONPATH=. "${BACKEND_CMD[@]}" &
  echo $! > "$ROOT_DIR/.dev-backend.pid"
) &
PIDS+=($!)

cyan "[2/4] Waiting for backend at $API_URL"
wait_for "$API_URL/docs" "backend (:8000)" 90

cyan "[3/4] Starting Vite dev server on :5174"
(
  cd "$VITE_DIR"
  npx vite --port 5174 --strictPort &
  echo $! > "$ROOT_DIR/.dev-vite.pid"
) &
PIDS+=($!)

cyan "[4/4] Waiting for UI at $UI_URL"
wait_for "$UI_URL" "vite (:5174)" 90

cyan "Launching Electron (loads $UI_URL)"
(
  cd "$ELECTRON_DIR"
  npx electron . &
  echo $! > "$ROOT_DIR/.dev-electron.pid"
) &
PIDS+=($!)

yellow "\nDev environment is up. Press Ctrl+C to stop."
wait
