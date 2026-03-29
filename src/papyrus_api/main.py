"""FastAPI backend for Papyrus.

Goal:
- Provide a clean HTTP API for a TS/React frontend.
- Reuse existing Papyrus core logic (UI-agnostic) without rewriting scheduling.

NOTE: Concurrency
- This service uses an in-process lock (see `papyrus.core.cards`).
- Do NOT run multiple backend processes/workers against the same JSON file
  unless a real file lock is introduced.

Run (dev):

```bash
python -m uvicorn src.papyrus_api.main:app --reload
```

"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from papyrus.data.relations import init_relations_table
from papyrus.data.progress import init_progress_table
from papyrus.paths import DATABASE_FILE
from mcp.server import MCPServer
from mcp.vault_tools import create_vault_tools
from papyrus_api.deps import MCPLogger, get_ai_config, init_logger_from_config

# Import all routers
from papyrus_api.routers import (
    cards_router,
    review_router,
    notes_router,
    vault_router,
    search_router,
    ai_router,
    data_router,
    relations_router,
    progress_router,
    logs_router,
    update_router,
    markdown_router,
    mcp_router,
)

# MCP Server 实例
_mcp_server: MCPServer | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """应用生命周期管理：启动/停止 MCP 服务器。"""
    global _mcp_server

    # 初始化配置和日志记录器
    ai_config = get_ai_config()
    logger = init_logger_from_config(ai_config)
    logger.info("Papyrus API server starting")

    # 初始化 VaultTools
    vault_tools = create_vault_tools(DATABASE_FILE)

    # 初始化关联功能表
    init_relations_table(DATABASE_FILE)
    
    # 初始化进度表
    init_progress_table(DATABASE_FILE)

    # 启动 MCP 服务器
    _mcp_server = MCPServer(
        host="127.0.0.1",
        port=9100,
        logger=MCPLogger(),
        vault_tools=vault_tools,
    )
    _mcp_server.start()
    logger.info("MCP server started on port 9100")

    yield

    # 关闭 MCP 服务器
    if _mcp_server:
        _mcp_server.stop()
        logger.info("MCP server stopped")


app = FastAPI(title="Papyrus API", version="v2.0.0-beta.1", lifespan=lifespan)

# Frontend dev server (vite) defaults to 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/api/health")
def health() -> dict[str, str]:
    """健康检查端点。"""
    return {"status": "ok"}


# Include all routers
app.include_router(cards_router, prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(notes_router, prefix="/api")
app.include_router(vault_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(data_router, prefix="/api")
app.include_router(relations_router, prefix="/api")
app.include_router(progress_router, prefix="/api")
app.include_router(logs_router, prefix="/api")
app.include_router(update_router, prefix="/api")
app.include_router(markdown_router, prefix="/api")
app.include_router(mcp_router, prefix="/api")


# Entry point for PyInstaller executable
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
