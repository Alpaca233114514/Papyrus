"""MCP integration module for Papyrus.

This module handles MCP server initialization and provides access to
both CardTools and VaultTools for AI integration.
"""

from __future__ import annotations

from typing import Optional

MCP_AVAILABLE = False
MCP_IMPORT_ERROR: Optional[str] = None

MCPServer = None
VaultTools = None

# Try to import MCP components
try:
    from mcp.server import MCPServer as _MCPServer
    from mcp.vault_tools import VaultTools as _VaultTools

    MCPServer = _MCPServer
    VaultTools = _VaultTools
    MCP_AVAILABLE = True
except ImportError as e:
    MCP_AVAILABLE = False
    MCP_IMPORT_ERROR = str(e)
except Exception as e:
    MCP_AVAILABLE = False
    MCP_IMPORT_ERROR = str(e)
