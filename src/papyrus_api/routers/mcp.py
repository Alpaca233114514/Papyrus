"""MCP 扩展 API 路由 - 为外部扩展提供简易的笔记操作接口。

此模块提供统一的 MCP 风格 REST API，供扩展使用：
- 获取笔记列表
- 读取笔记内容
- 创建/更新笔记
- 搜索笔记
"""

from __future__ import annotations

from typing import Any, cast

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from papyrus.data.notes_storage import (
    Note,
    load_notes,
    create_note,
    update_note,
    delete_note as delete_note_storage,
)
from papyrus.paths import NOTES_FILE
from papyrus_api.deps import get_vault_tools

router = APIRouter(prefix="/mcp", tags=["mcp"])


# ==================== 请求/响应模型 ====================

class NoteInfo(BaseModel):
    """笔记基本信息"""
    id: str
    title: str
    folder: str
    preview: str
    tags: list[str]
    word_count: int
    updated_at: float


class NoteDetail(BaseModel):
    """笔记详情"""
    id: str
    title: str
    folder: str
    content: str
    preview: str
    tags: list[str]
    word_count: int
    created_at: float
    updated_at: float
    headings: list[dict[str, Any]] = []
    outgoing_links: list[str] = []
    incoming_count: int = 0


class ListNotesResponse(BaseModel):
    """获取笔记列表响应"""
    success: bool
    notes: list[NoteInfo]
    total: int


class GetNoteResponse(BaseModel):
    """获取单个笔记响应"""
    success: bool
    note: NoteDetail | None
    error: str | None = None


class CreateNoteRequest(BaseModel):
    """创建笔记请求"""
    title: str
    folder: str = "默认"
    content: str = ""
    tags: list[str] = []


class CreateNoteResponse(BaseModel):
    """创建笔记响应"""
    success: bool
    note: NoteDetail | None
    error: str | None = None


class UpdateNoteRequest(BaseModel):
    """更新笔记请求"""
    title: str | None = None
    folder: str | None = None
    content: str | None = None
    tags: list[str] | None = None


class UpdateNoteResponse(BaseModel):
    """更新笔记响应"""
    success: bool
    note: NoteDetail | None
    error: str | None = None


class DeleteNoteResponse(BaseModel):
    """删除笔记响应"""
    success: bool
    error: str | None = None


class SearchNotesRequest(BaseModel):
    """搜索笔记请求"""
    query: str
    limit: int = 20
    search_content: bool = True


class SearchNotesResponse(BaseModel):
    """搜索笔记响应"""
    success: bool
    notes: list[NoteInfo]
    total: int
    error: str | None = None


class VaultIndexRequest(BaseModel):
    """Vault 索引请求"""
    filter_tags: list[str] | None = None
    query: str | None = None
    limit: int = 50
    cursor: str | None = None


class VaultIndexResponse(BaseModel):
    """Vault 索引响应"""
    success: bool
    notes: list[dict[str, Any]]
    total: int
    cursor: str | None
    error: str | None = None


class VaultReadRequest(BaseModel):
    """Vault 读取请求"""
    ids: list[str]
    format: str = "summary"  # "summary" | "full" | "block"
    include_links: bool = False


class VaultReadResponse(BaseModel):
    """Vault 读取响应"""
    success: bool
    notes: list[dict[str, Any]]
    error: str | None = None


# ==================== 辅助函数 ====================

def _note_to_info(note: Note) -> NoteInfo:
    """将 Note 对象转换为 NoteInfo"""
    return NoteInfo(
        id=note.id,
        title=note.title,
        folder=note.folder,
        preview=note.preview,
        tags=note.tags,
        word_count=note.word_count,
        updated_at=note.updated_at,
    )


def _note_to_detail(note: Note) -> NoteDetail:
    """将 Note 对象转换为 NoteDetail"""
    return NoteDetail(
        id=note.id,
        title=note.title,
        folder=note.folder,
        content=note.content,
        preview=note.preview,
        tags=note.tags,
        word_count=note.word_count,
        created_at=note.created_at,
        updated_at=note.updated_at,
        headings=getattr(note, "headings", []),
        outgoing_links=getattr(note, "outgoing_links", []),
        incoming_count=getattr(note, "incoming_count", 0),
    )


# ==================== API 端点 ====================

@router.get("/notes", response_model=ListNotesResponse)
def list_notes() -> ListNotesResponse:
    """获取所有笔记列表（简化版）。
    
    返回笔记的基本信息，不包含完整内容。
    """
    notes = load_notes(NOTES_FILE)
    return ListNotesResponse(
        success=True,
        notes=[_note_to_info(n) for n in notes],
        total=len(notes),
    )


@router.get("/notes/{note_id}", response_model=GetNoteResponse)
def get_note(note_id: str) -> GetNoteResponse:
    """获取单个笔记的完整内容。
    
    Args:
        note_id: 笔记 ID
        
    Returns:
        包含完整笔记内容的响应
    """
    notes = load_notes(NOTES_FILE)
    for note in notes:
        if note.id == note_id:
            return GetNoteResponse(success=True, note=_note_to_detail(note))
    return GetNoteResponse(success=False, note=None, error="note not found")


@router.post("/notes", response_model=CreateNoteResponse)
def create_note_endpoint(request: CreateNoteRequest) -> CreateNoteResponse:
    """创建新笔记。
    
    Args:
        request: 包含标题、文件夹、内容和标签的请求
        
    Returns:
        创建成功的笔记详情
    """
    try:
        note = create_note(
            NOTES_FILE,
            title=request.title,
            folder=request.folder,
            content=request.content,
            tags=request.tags,
        )
        return CreateNoteResponse(success=True, note=_note_to_detail(note))
    except Exception as e:
        return CreateNoteResponse(success=False, note=None, error=str(e))


@router.patch("/notes/{note_id}", response_model=UpdateNoteResponse)
def update_note_endpoint(
    note_id: str, request: UpdateNoteRequest
) -> UpdateNoteResponse:
    """更新现有笔记。
    
    Args:
        note_id: 笔记 ID
        request: 包含要更新的字段的请求
        
    Returns:
        更新后的笔记详情
    """
    try:
        note = update_note(
            NOTES_FILE,
            note_id=note_id,
            title=request.title,
            folder=request.folder,
            content=request.content,
            tags=request.tags,
        )
        if note is None:
            return UpdateNoteResponse(success=False, note=None, error="note not found")
        return UpdateNoteResponse(success=True, note=_note_to_detail(note))
    except Exception as e:
        return UpdateNoteResponse(success=False, note=None, error=str(e))


@router.delete("/notes/{note_id}", response_model=DeleteNoteResponse)
def delete_note_endpoint(note_id: str) -> DeleteNoteResponse:
    """删除笔记。
    
    Args:
        note_id: 笔记 ID
        
    Returns:
        删除操作结果
    """
    ok = delete_note_storage(NOTES_FILE, note_id)
    if not ok:
        return DeleteNoteResponse(success=False, error="note not found")
    return DeleteNoteResponse(success=True)


@router.post("/notes/search", response_model=SearchNotesResponse)
def search_notes(request: SearchNotesRequest) -> SearchNotesResponse:
    """搜索笔记。
    
    支持按标题和内容搜索。
    
    Args:
        request: 包含搜索词和选项的请求
        
    Returns:
        匹配的笔记列表
    """
    try:
        notes = load_notes(NOTES_FILE)
        query = request.query.lower()
        results = []
        
        for note in notes:
            # 搜索标题
            if query in note.title.lower():
                results.append(note)
                continue
            
            # 搜索标签
            if any(query in tag.lower() for tag in note.tags):
                results.append(note)
                continue
            
            # 搜索内容（可选）
            if request.search_content and query in note.content.lower():
                results.append(note)
                continue
        
        # 限制结果数量
        limited_results = results[: request.limit]
        
        return SearchNotesResponse(
            success=True,
            notes=[_note_to_info(n) for n in limited_results],
            total=len(results),
        )
    except Exception as e:
        return SearchNotesResponse(success=False, notes=[], total=0, error=str(e))


@router.post("/vault/index", response_model=VaultIndexResponse)
def vault_index_endpoint(request: VaultIndexRequest) -> VaultIndexResponse:
    """Vault 索引：获取笔记骨架索引（元数据+大纲+链接关系）。
    
    这是 VaultTools 的第一层接口，返回不含正文的笔记元数据。
    
    Args:
        request: 包含过滤标签、查询词、限制数量和游标的请求
        
    Returns:
        Vault 索引结果
    """
    tools = get_vault_tools()
    result = tools.vault_index(
        filter_tags=request.filter_tags,
        query=request.query,
        limit=request.limit,
        cursor=request.cursor,
    )
    return VaultIndexResponse(**cast(dict[str, Any], result))


@router.post("/vault/read", response_model=VaultReadResponse)
def vault_read_endpoint(request: VaultReadRequest) -> VaultReadResponse:
    """Vault 读取：按需加载笔记内容。
    
    这是 VaultTools 的第二层接口，返回笔记的完整内容或摘要。
    
    Args:
        request: 包含笔记 ID 列表、格式选项的请求
        
    Returns:
        Vault 读取结果
    """
    tools = get_vault_tools()
    result = tools.vault_read(
        ids=request.ids,
        format=request.format,
        include_links=request.include_links,
    )
    return VaultReadResponse(**cast(dict[str, Any], result))


@router.get("/health")
def health_check() -> dict[str, str]:
    """健康检查端点。"""
    return {"status": "ok", "service": "mcp"}
