"""AI integration — tkinter sidebar has been removed.

Only the headless AI components (config, provider, tools) are re-exported.
The chat UI is now handled by the React frontend.
"""

from __future__ import annotations

import traceback
from typing import Optional

AI_AVAILABLE = False
AI_IMPORT_ERROR: Optional[str] = None

AIConfig = None
AIManager = None
CardTools = None

try:
    import requests  # noqa: F401

    from ai.config import AIConfig as _AIConfig
    from ai.provider import AIManager as _AIManager
    from ai.tools import CardTools as _CardTools

    AIConfig = _AIConfig
    AIManager = _AIManager
    CardTools = _CardTools

    AI_AVAILABLE = True
except ImportError as e:
    AI_AVAILABLE = False
    AI_IMPORT_ERROR = str(e)
except Exception as e:
    AI_AVAILABLE = False
    AI_IMPORT_ERROR = str(e)
    traceback.print_exc()
