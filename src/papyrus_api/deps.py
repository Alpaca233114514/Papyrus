"""共享依赖和工具函数。

此模块包含FastAPI路由共享的依赖注入、工具函数和全局状态管理。
"""

from __future__ import annotations

import os


from ai.config import AIConfig
from ai.tool_manager import ToolManager, get_tool_manager
from logger import PapyrusLogger
from mcp.vault_tools import create_vault_tools, VaultTools
from papyrus.paths import DATA_DIR, DATABASE_FILE, DATA_FILE

# AI Config 实例
_ai_config: AIConfig | None = None

# Vault Tools 实例（懒加载）
_vault_tools: VaultTools | None = None

# Logger 实例（懒加载）
_logger: PapyrusLogger | None = None

# Tool Manager 实例（懒加载）
_tool_manager: ToolManager | None = None


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


def get_logger() -> PapyrusLogger | None:
    """获取PapyrusLogger实例（懒加载）。
    
    返回 None 表示日志记录器尚未初始化（在主应用启动前）。
    """
    global _logger
    if _logger is None and _ai_config is not None:
        log_config = _ai_config.get_log_config()
        _logger = PapyrusLogger(
            log_dir=log_config.get("log_dir", os.path.join(DATA_DIR, "logs")),
            log_level=log_config.get("log_level", "DEBUG"),
            max_log_files=log_config.get("max_log_files", 10),
            log_rotation=log_config.get("log_rotation", False),
        )
    return _logger


def init_logger_from_config(config: AIConfig) -> PapyrusLogger:
    """从AIConfig初始化日志记录器。
    
    在主应用启动时调用。
    """
    global _logger, _ai_config
    _ai_config = config
    log_config = config.get_log_config()
    _logger = PapyrusLogger(
        log_dir=log_config.get("log_dir", os.path.join(DATA_DIR, "logs")),
        log_level=log_config.get("log_level", "DEBUG"),
        max_log_files=log_config.get("max_log_files", 10),
        log_rotation=log_config.get("log_rotation", False),
    )
    return _logger


def get_tool_manager_instance() -> ToolManager:
    """获取ToolManager实例（懒加载）。"""
    global _tool_manager
    if _tool_manager is None:
        _tool_manager = get_tool_manager()
    return _tool_manager


