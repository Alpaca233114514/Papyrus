from __future__ import annotations

import os
import sys

from .paths import ASSETS_DIR


def resource_path(relative_path: str) -> str:
    """Return absolute path for an asset.

    Compatible with both dev environment and PyInstaller packaged environment.
    """

    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, "assets", relative_path)  # type: ignore[attr-defined]
    return os.path.join(ASSETS_DIR, relative_path)
