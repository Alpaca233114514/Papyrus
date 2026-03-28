"""Vault MCP工具API路由。"""

from __future__ import annotations

from typing import Any, cast

from fastapi import APIRouter
from pydantic import BaseModel

from papyrus_api.deps import get_vault_tools

router = APIRouter(prefix="/vault", tags=["vault"])


class VaultIndexIn(BaseModel):
    filter_tags: list[str] | None = None
    query: str | None = None
    limit: int = 50
    cursor: str | None = None


class VaultIndexResponse(BaseModel):
    success: bool
    notes: list[dict[str, Any]]
    total: int
    cursor: str | None
    error: str | None


class VaultReadIn(BaseModel):
    ids: list[str]
    format: str = "summary"  # "summary" | "full" | "block"
    block_ref: str | None = None
    include_links: bool = False


class VaultReadResponse(BaseModel):
    success: bool
    notes: list[dict[str, Any]]
    error: str | None


class VaultWatchIn(BaseModel):
    since: int


class VaultWatchResponse(BaseModel):
    success: bool
    data: dict[str, Any] | None
    error: str | None


class VaultEmergencyIn(BaseModel):
    sample_size: int = 5
    content_limit: int = 500


class VaultEmergencyResponse(BaseModel):
    success: bool
    emergency_mode: bool
    notes: list[dict[str, Any]]
    warning: str
    error: str | None


@router.post("/index", response_model=VaultIndexResponse)
def vault_index_endpoint(payload: VaultIndexIn) -> VaultIndexResponse:
    """Vault第一层：获取笔记骨架索引（元数据+大纲+链接关系）。"""
    tools = get_vault_tools()
    result = tools.vault_index(
        filter_tags=payload.filter_tags,
        query=payload.query,
        limit=payload.limit,
        cursor=payload.cursor,
    )
    return VaultIndexResponse(**cast(dict[str, Any], result))


@router.post("/read", response_model=VaultReadResponse)
def vault_read_endpoint(payload: VaultReadIn) -> VaultReadResponse:
    """Vault第二层：按需加载笔记内容。"""
    tools = get_vault_tools()
    result = tools.vault_read(
        ids=payload.ids,
        format=payload.format,
        block_ref=payload.block_ref,
        include_links=payload.include_links,
    )
    return VaultReadResponse(**cast(dict[str, Any], result))


@router.post("/watch", response_model=VaultWatchResponse)
def vault_watch_endpoint(payload: VaultWatchIn) -> VaultWatchResponse:
    """Vault增量同步：检查笔记变更。"""
    tools = get_vault_tools()
    result = tools.vault_watch(since=payload.since)
    return VaultWatchResponse(**cast(dict[str, Any], result))


@router.post("/emergency", response_model=VaultEmergencyResponse)
def vault_emergency_endpoint(payload: VaultEmergencyIn) -> VaultEmergencyResponse:
    """Vault应急层：数据库失效时扫描文件系统。"""
    tools = get_vault_tools()
    result = tools.vault_emergency_sample(
        sample_size=payload.sample_size,
        content_limit=payload.content_limit,
    )
    return VaultEmergencyResponse(**cast(dict[str, Any], result))
