"""共享依赖和工具函数。

此模块包含FastAPI路由共享的依赖注入、工具函数和全局状态管理。
"""

from __future__ import annotations

import os
from typing import Any

from ai.config import AIConfig
from mcp.vault_tools import create_vault_tools, VaultTools
from papyrus.paths import DATA_DIR, DATABASE_FILE, DATA_FILE

# AI Config 实例
_ai_config: AIConfig | None = None

# Vault Tools 实例（懒加载）
_vault_tools: VaultTools | None = None


def get_data_file() -> str:
    """Allow overriding in deployment."""
    return os.environ.get("PAPYRUS_DATA_FILE", DATA_FILE)


def pick_card_text(*values: str | None) -> str:
    """从多个值中选择第一个非空字符串。"""
    for value in values:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped:
                return stripped
    return ""


def get_vault_tools() -> VaultTools:
    """获取VaultTools实例（懒加载）。"""
    global _vault_tools
    if _vault_tools is None:
        _vault_tools = create_vault_tools(DATABASE_FILE)
    return _vault_tools


def get_ai_config() -> AIConfig:
    """获取AIConfig实例（懒加载）。"""
    global _ai_config
    if _ai_config is None:
        _ai_config = AIConfig(DATA_DIR)
    return _ai_config


class MCPLogger:
    """MCP 服务器用的简单 logger。"""

    def info(self, message: str) -> None:
        print(f"[MCP] {message}")

    def warning(self, message: str) -> None:
        print(f"[MCP] WARNING: {message}")

    def error(self, message: str) -> None:
        print(f"[MCP] ERROR: {message}")


def reset_singletons_for_test() -> None:
    """重置单例状态（仅用于测试）。"""
    global _ai_config, _vault_tools
    _ai_config = None
    _vault_tools = None
