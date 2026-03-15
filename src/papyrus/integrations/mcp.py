from __future__ import annotations

from typing import Optional

MCP_AVAILABLE = False
MCP_IMPORT_ERROR: Optional[str] = None

MCPServer = None

try:
    from mcp.server import MCPServer as _MCPServer

    MCPServer = _MCPServer
    MCP_AVAILABLE = True
except ImportError as e:
    MCP_AVAILABLE = False
    MCP_IMPORT_ERROR = str(e)
except Exception as e:
    MCP_AVAILABLE = False
    MCP_IMPORT_ERROR = str(e)
