"""Compatibility launcher (windowed, no console).

Historically the project used `src/Papyrus.pyw` as the GUI entrypoint.
We keep this file so existing shortcuts/docs continue to work.
"""

from __future__ import annotations

import os
import sys

# Ensure `src/` is importable even when launched by double-click / from other CWD.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from papyrus.app import run_app

if __name__ == "__main__":
    run_app()
