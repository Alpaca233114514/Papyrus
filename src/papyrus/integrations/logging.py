"""Logging integration — LogViewer (tkinter) has been removed.

Only the headless PapyrusLogger is re-exported.
"""

from __future__ import annotations

from typing import Optional

LOG_AVAILABLE = False
LOG_IMPORT_ERROR: Optional[str] = None

PapyrusLogger = None

try:
    from logger import PapyrusLogger as _PapyrusLogger

    PapyrusLogger = _PapyrusLogger
    LOG_AVAILABLE = True
except ImportError as e:
    LOG_AVAILABLE = False
    LOG_IMPORT_ERROR = str(e)
except Exception as e:
    LOG_AVAILABLE = False
    LOG_IMPORT_ERROR = str(e)
