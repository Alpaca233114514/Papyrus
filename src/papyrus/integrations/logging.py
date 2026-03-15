from __future__ import annotations

from typing import Optional

# Logging integration is optional at runtime.
# In repo it exists, but we keep the guard for safety / packaging edge cases.

LOG_AVAILABLE = False
LOG_IMPORT_ERROR: Optional[str] = None

PapyrusLogger = None
LogViewer = None

try:
    from logger import PapyrusLogger as _PapyrusLogger
    from log_viewer import LogViewer as _LogViewer

    PapyrusLogger = _PapyrusLogger
    LogViewer = _LogViewer
    LOG_AVAILABLE = True
except ImportError as e:
    LOG_AVAILABLE = False
    LOG_IMPORT_ERROR = str(e)
except Exception as e:
    LOG_AVAILABLE = False
    LOG_IMPORT_ERROR = str(e)
