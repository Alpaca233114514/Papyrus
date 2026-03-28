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
"""

from .cards import router as cards_router
from .review import router as review_router
from .notes import router as notes_router
from .vault import router as vault_router
from .search import router as search_router
from .ai import router as ai_router
from .data import router as data_router
from .relations import router as relations_router

__all__ = [
    "cards_router",
    "review_router",
    "notes_router",
    "vault_router",
    "search_router",
    "ai_router",
    "data_router",
    "relations_router",
]
