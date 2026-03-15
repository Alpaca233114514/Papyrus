from __future__ import annotations

import traceback
from typing import Optional

AI_AVAILABLE = False
AI_IMPORT_ERROR: Optional[str] = None

# Re-exported symbols (set when available)
AIConfig = None
AIManager = None
AISidebar = None
CardTools = None

try:
    import requests  # noqa: F401

    from ai.config import AIConfig as _AIConfig
    from ai.provider import AIManager as _AIManager
    from ai.sidebar_v3 import AISidebar as _AISidebar
    from ai.tools import CardTools as _CardTools

    AIConfig = _AIConfig
    AIManager = _AIManager
    AISidebar = _AISidebar
    CardTools = _CardTools

    AI_AVAILABLE = True
except ImportError as e:
    AI_AVAILABLE = False
    AI_IMPORT_ERROR = str(e)
except Exception as e:
    AI_AVAILABLE = False
    AI_IMPORT_ERROR = str(e)
    traceback.print_exc()
