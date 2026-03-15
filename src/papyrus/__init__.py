"""Papyrus application package.

This package contains the refactored implementation of the original monolithic
`src/Papyrus.py` module.

Public runtime entrypoints are still re-exported by `src/Papyrus.py` to keep
backward compatibility (tests, run.pyw, PyInstaller spec).
"""

from .app import PapyrusApp  # noqa: F401
from .paths import (  # noqa: F401
    BASE_DIR,
    DATA_DIR,
    BACKUP_DIR,
    ASSETS_DIR,
    LOG_DIR,
    DATA_FILE,
    BACKUP_FILE,
)
from .resources import resource_path  # noqa: F401
