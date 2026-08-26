"""Launchers for the static site preview and the local content editor."""

import runpy
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent


def web():
    """Serve the static site. Usage: uv run web [port]"""
    port = sys.argv[1] if len(sys.argv) > 1 else "8000"
    code = subprocess.run(
        [sys.executable, "-m", "http.server", port, "--directory", str(ROOT)]
    ).returncode
    if code:
        sys.exit(f"Port {port} unavailable. Try: uv run web {int(port) + 1}")


def editor():
    """Serve the local content editor. Usage: uv run editor [--port N]"""
    script = ROOT / "tools" / "content-editor" / "server.py"
    sys.argv = [str(script), *sys.argv[1:]]
    try:
        runpy.run_path(str(script), run_name="__main__")
    except OSError as exc:
        sys.exit(f"{exc}. Try: uv run editor --port 8002")
