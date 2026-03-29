"""Markdown 渲染 API 路由。"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from markdown_it import MarkdownIt

router = APIRouter(prefix="/markdown", tags=["markdown"])

# 初始化 Markdown 解析器（启用常见插件）
md = MarkdownIt()


class RenderMarkdownIn(BaseModel):
    """Markdown 渲染请求参数。"""
    content: str


class RenderMarkdownResponse(BaseModel):
    """Markdown 渲染响应。"""
    success: bool
    html: str


@router.post("/render", response_model=RenderMarkdownResponse)
def render_markdown(payload: RenderMarkdownIn) -> RenderMarkdownResponse:
    """将 Markdown 文本渲染为 HTML。
    
    Args:
        payload: 包含 Markdown 内容的请求体
        
    Returns:
        包含渲染后 HTML 的响应
    """
    html = md.render(payload.content)
    return RenderMarkdownResponse(success=True, html=html)
