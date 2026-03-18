# SRC
"""Backward-compatible entrypoint for Papyrus.

The project is being modularized under `src/papyrus/`.
This module keeps the old public import surface stable for:
- tests
- `run.pyw`
- PyInstaller build (`Papyrus.spec`)

Python runtime target: 3.14+
"""

from __future__ import annotations

# Public re-exports (keep names stable)
from papyrus.app import run_app  # noqa: F401
from papyrus.paths import (  # noqa: F401
    BASE_DIR,
    DATA_DIR,
    BACKUP_DIR,
    ASSETS_DIR,
    LOG_DIR,
    DATA_FILE,
    BACKUP_FILE,
)
from papyrus.resources import resource_path  # noqa: F401


if __name__ == "__main__":
    run_app()
