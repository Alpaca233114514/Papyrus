"""API路由模块。

包含所有按功能划分的API路由：
- cards: 卡片管理
- review: 复习功能
- notes: 笔记管理
- vault: Vault MCP工具
- search: 搜索功能
- ai: AI配置和补全
- data: 数据管理（导入导出备份）
- relations: 笔记关联功能
- progress: 学习进度（连续天数、每日目标）
- logs: 日志管理
- mcp: MCP扩展接口
- providers: AI提供商管理
"""

from .cards import router as cards_router
from .review import router as review_router
from .notes import router as notes_router
from .vault import router as vault_router
from .search import router as search_router
from .ai import router as ai_router
from .data import router as data_router
from .relations import router as relations_router
from .progress import router as progress_router
from .logs import router as logs_router
from .update import router as update_router
from .markdown import router as markdown_router
from .mcp import router as mcp_router
from .providers import router as providers_router

__all__ = [
    "cards_router",
    "review_router",
    "notes_router",
    "vault_router",
    "search_router",
    "ai_router",
    "data_router",
    "relations_router",
    "progress_router",
    "logs_router",
    "update_router",
    "markdown_router",
    "mcp_router",
    "providers_router",
]
