from __future__ import annotations

import os
import sys
import subprocess
from pathlib import Path


def main() -> int:
    """Launch the Streamlit UI for the intent-first app."""
    ui_path = Path(__file__).resolve().parent / "ui" / "app.py"
    port = os.environ.get("PS_INTENT_PORT", "8501")
    args = [sys.executable, "-m", "streamlit", "run", str(ui_path), "--server.port", str(port)]
    try:
        return subprocess.call(args)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    raise SystemExit(main())

