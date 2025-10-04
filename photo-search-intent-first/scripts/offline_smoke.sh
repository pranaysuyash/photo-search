#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VENV_PATH="${REPO_ROOT}/.venv"

if [[ ! -d "${VENV_PATH}" ]]; then
  echo "[offline_smoke] Python virtualenv not found at ${VENV_PATH}" >&2
  exit 1
fi

# shellcheck source=/dev/null
source "${VENV_PATH}/bin/activate"

cd "${REPO_ROOT}" || exit 1

export OFFLINE_MODE=1

STATUS=0

python cli.py index --dir demo_photos --provider local || STATUS=$?
python cli.py search --dir demo_photos --query "beach" --provider local || STATUS=$?

deactivate || true

if [[ ${STATUS} -ne 0 ]]; then
  echo "[offline_smoke] offline CLI smoke failed" >&2
else
  echo "[offline_smoke] offline CLI smoke passed"
fi

exit ${STATUS}
