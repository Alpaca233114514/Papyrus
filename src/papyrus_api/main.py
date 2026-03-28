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

import json
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Literal, cast

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# requests is optional for completion feature
try:
    import requests  # type: ignore[import-untyped]
    requests_available = True
except ImportError:
    requests = None
    requests_available = False

from papyrus.core import cards as card_core
from papyrus.core.cards import CardDict, NextDueResult
from papyrus.paths import DATA_FILE, NOTES_FILE
from papyrus.data.notes_storage import (
    Note,
    load_notes,
    create_note,
    update_note,
    delete_note as delete_note_storage,
)
from papyrus.integrations.obsidian import sync_obsidian_vault
from ai.config import AIConfig
from papyrus.paths import DATA_DIR, DATABASE_FILE
from mcp.vault_tools import create_vault_tools, VaultTools
from mcp.server import MCPServer

# ===== 关联功能导入 =====
from papyrus.data.relations import (
    init_relations_table,
    create_relation,
    delete_relation,
    update_relation,
    get_note_relations,
    get_relation_graph,
    search_notes_for_relation,
    RelationType,
)


def _get_data_file() -> str:
    # Allow overriding in deployment
    return os.environ.get("PAPYRUS_DATA_FILE", DATA_FILE)


def _pick_card_text(*values: str | None) -> str:
    for value in values:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped:
                return stripped
    return ""


# AI Config 实例
_ai_config: AIConfig | None = None

# Vault Tools 实例（懒加载）
_vault_tools: VaultTools | None = None

# MCP Server 实例
_mcp_server: MCPServer | None = None


def get_vault_tools() -> VaultTools:
    """获取VaultTools实例（懒加载）"""
    global _vault_tools
    if _vault_tools is None:
        _vault_tools = create_vault_tools(DATABASE_FILE)
    return _vault_tools


def get_ai_config() -> AIConfig:
    global _ai_config
    if _ai_config is None:
        _ai_config = AIConfig(DATA_DIR)
    return _ai_config


class _MCPLogger:
    """MCP 服务器用的简单 logger"""
    def info(self, message: str) -> None:
        print(f"[MCP] {message}")

    def warning(self, message: str) -> None:
        print(f"[MCP] WARNING: {message}")

    def error(self, message: str) -> None:
        print(f"[MCP] ERROR: {message}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理：启动/停止 MCP 服务器"""
    global _mcp_server, _vault_tools
    
    # 初始化 VaultTools
    _vault_tools = create_vault_tools(DATABASE_FILE)
    
    # 初始化关联功能表
    init_relations_table(DATABASE_FILE)
    
    # 启动 MCP 服务器
    _mcp_server = MCPServer(
        host="127.0.0.1",
        port=9100,
        logger=_MCPLogger(),
        vault_tools=_vault_tools,
    )
    _mcp_server.start()
    
    yield
    
    # 关闭 MCP 服务器
    _mcp_server.stop()
    _mcp_server = None


app = FastAPI(title="Papyrus API", version="0.2.0", lifespan=lifespan)

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


class CreateCardIn(BaseModel):
    q: str | None = None
    a: str | None = None
    question: str | None = None
    answer: str | None = None


class RateCardIn(BaseModel):
    grade: Literal[1, 2, 3] = Field(..., description="1=忘记, 2=模糊, 3=秒杀")


class ImportTxtIn(BaseModel):
    content: str


class CardsListResponse(BaseModel):
    success: bool
    cards: list[CardDict]
    count: int


class CreateCardResponse(BaseModel):
    success: bool
    card: CardDict


class DeleteCardResponse(BaseModel):
    success: bool


class NextDueEmptyResponse(BaseModel):
    success: bool
    card: None = None
    due_count: int
    total_count: int


class NextDueResponse(BaseModel):
    success: bool
    card: CardDict
    due_count: int
    total_count: int


class RateCardResponse(BaseModel):
    success: bool
    card: CardDict
    interval_days: float
    ef: float
    next: NextDueResult | None


class ImportTxtResponse(BaseModel):
    success: bool
    count: int


# ========== Notes API ==========

class NoteDict(BaseModel):
    id: str
    title: str
    folder: str
    content: str
    preview: str
    tags: list[str]
    created_at: float
    updated_at: float
    word_count: int
    hash: str = ""
    headings: list[dict[str, Any]] = []
    outgoing_links: list[str] = []
    incoming_count: int = 0


class NotesListResponse(BaseModel):
    success: bool
    notes: list[NoteDict]
    count: int


class CreateNoteIn(BaseModel):
    title: str
    folder: str = "默认"
    content: str = ""
    tags: list[str] = []


class CreateNoteResponse(BaseModel):
    success: bool
    note: NoteDict


class UpdateNoteIn(BaseModel):
    title: str | None = None
    folder: str | None = None
    content: str | None = None
    tags: list[str] | None = None


class UpdateNoteResponse(BaseModel):
    success: bool
    note: NoteDict


class DeleteNoteResponse(BaseModel):
    success: bool


class ObsidianImportIn(BaseModel):
    vault_path: str
    exclude_folders: list[str] = [".obsidian", ".git"]


class ObsidianImportResponse(BaseModel):
    success: bool
    imported: int
    skipped: int
    errors: list[str]


def _note_to_dict(note: Note) -> NoteDict:
    return NoteDict(
        id=note.id,
        title=note.title,
        folder=note.folder,
        content=note.content,
        preview=note.preview,
        tags=note.tags,
        created_at=note.created_at,
        updated_at=note.updated_at,
        word_count=note.word_count,
        hash=getattr(note, 'hash', ''),
        headings=getattr(note, 'headings', []),
        outgoing_links=getattr(note, 'outgoing_links', []),
        incoming_count=getattr(note, 'incoming_count', 0),
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/cards", response_model=CardsListResponse)
def list_cards() -> CardsListResponse:
    data_file = _get_data_file()
    cards = card_core.list_cards(data_file)
    return CardsListResponse(success=True, cards=cards, count=len(cards))


@app.post("/api/cards", response_model=CreateCardResponse)
def create_card(payload: CreateCardIn) -> CreateCardResponse:
    q = _pick_card_text(payload.q, payload.question)
    a = _pick_card_text(payload.a, payload.answer)


    data_file = _get_data_file()
    try:
        card = card_core.create_card(data_file, q=q, a=a)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return CreateCardResponse(success=True, card=card)


@app.delete("/api/cards/{card_id}", response_model=DeleteCardResponse)
def delete_card(card_id: str) -> DeleteCardResponse:
    data_file = _get_data_file()
    ok = card_core.delete_card(data_file, card_id)
    if not ok:
        raise HTTPException(status_code=404, detail="card not found")
    return DeleteCardResponse(success=True)


@app.get("/api/review/next", response_model=NextDueResponse | NextDueEmptyResponse)
def get_next_due() -> NextDueResponse | NextDueEmptyResponse:
    """Get next due card.

    If no cards are due, returns success with card=None.
    """

    data_file = _get_data_file()
    res = card_core.get_next_due(data_file)
    if res is None:
        cards = card_core.list_cards(data_file)
        return NextDueEmptyResponse(
            success=True,
            card=None,
            due_count=0,
            total_count=len(cards),
        )

    return NextDueResponse(success=True, **res)


@app.post("/api/review/{card_id}/rate", response_model=RateCardResponse)
def rate_card(card_id: str, payload: RateCardIn) -> RateCardResponse:
    data_file = _get_data_file()
    res = card_core.rate_card(data_file, card_id, int(payload.grade))
    if res is None:
        raise HTTPException(status_code=404, detail="card not found")

    # also return the next due snapshot for convenience
    nxt = card_core.get_next_due(data_file)
    return RateCardResponse(success=True, **res, next=nxt)


@app.post("/api/import/txt", response_model=ImportTxtResponse)
def import_txt(payload: ImportTxtIn) -> ImportTxtResponse:
    data_file = _get_data_file()
    count = card_core.import_from_txt(data_file, payload.content)
    if count == 0:
        raise HTTPException(status_code=400, detail="未找到有效卡片，请确认格式为：题目===答案")
    return ImportTxtResponse(success=True, count=count)


# ========== Notes Endpoints ==========

@app.get("/api/notes", response_model=NotesListResponse)
def list_notes() -> NotesListResponse:
    """List all notes."""
    notes = load_notes(NOTES_FILE)
    return NotesListResponse(
        success=True,
        notes=[_note_to_dict(n) for n in notes],
        count=len(notes),
    )


@app.post("/api/notes", response_model=CreateNoteResponse)
def create_note_endpoint(payload: CreateNoteIn) -> CreateNoteResponse:
    """Create a new note."""
    note = create_note(
        NOTES_FILE,
        title=payload.title,
        folder=payload.folder,
        content=payload.content,
        tags=payload.tags,
    )
    return CreateNoteResponse(success=True, note=_note_to_dict(note))


@app.get("/api/notes/{note_id}", response_model=CreateNoteResponse)
def get_note_endpoint(note_id: str) -> CreateNoteResponse:
    """Get a single note by ID."""
    notes = load_notes(NOTES_FILE)
    for note in notes:
        if note.id == note_id:
            return CreateNoteResponse(success=True, note=_note_to_dict(note))
    raise HTTPException(status_code=404, detail="note not found")


@app.patch("/api/notes/{note_id}", response_model=UpdateNoteResponse)
def update_note_endpoint(note_id: str, payload: UpdateNoteIn) -> UpdateNoteResponse:
    """Update an existing note."""
    note = update_note(
        NOTES_FILE,
        note_id=note_id,
        title=payload.title,
        folder=payload.folder,
        content=payload.content,
        tags=payload.tags,
    )
    if note is None:
        raise HTTPException(status_code=404, detail="note not found")
    return UpdateNoteResponse(success=True, note=_note_to_dict(note))


@app.delete("/api/notes/{note_id}", response_model=DeleteNoteResponse)
def delete_note_endpoint(note_id: str) -> DeleteNoteResponse:
    """Delete a note by ID."""
    ok = delete_note_storage(NOTES_FILE, note_id)
    if not ok:
        raise HTTPException(status_code=404, detail="note not found")
    return DeleteNoteResponse(success=True)


@app.post("/api/notes/import/obsidian", response_model=ObsidianImportResponse)
def import_obsidian_endpoint(payload: ObsidianImportIn) -> ObsidianImportResponse:
    """Import notes from Obsidian vault."""
    if not os.path.exists(payload.vault_path):
        raise HTTPException(status_code=400, detail="Vault path does not exist")
    
    existing_notes = load_notes(NOTES_FILE)
    
    result = sync_obsidian_vault(
        NOTES_FILE,
        payload.vault_path,
        existing_notes,
        exclude_folders=payload.exclude_folders,
    )
    
    return ObsidianImportResponse(
        success=True,
        imported=result.imported,
        skipped=result.skipped,
        errors=result.errors,
    )


# ========== Vault MCP API ==========

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


@app.post("/api/vault/index", response_model=VaultIndexResponse)
def vault_index_endpoint(payload: VaultIndexIn) -> VaultIndexResponse:
    """Vault第一层：获取笔记骨架索引（元数据+大纲+链接关系）"""
    tools = get_vault_tools()
    result = tools.vault_index(
        filter_tags=payload.filter_tags,
        query=payload.query,
        limit=payload.limit,
        cursor=payload.cursor,
    )
    return VaultIndexResponse(**cast(dict[str, Any], result))


@app.post("/api/vault/read", response_model=VaultReadResponse)
def vault_read_endpoint(payload: VaultReadIn) -> VaultReadResponse:
    """Vault第二层：按需加载笔记内容"""
    tools = get_vault_tools()
    result = tools.vault_read(
        ids=payload.ids,
        format=payload.format,
        block_ref=payload.block_ref,
        include_links=payload.include_links,
    )
    return VaultReadResponse(**cast(dict[str, Any], result))


@app.post("/api/vault/watch", response_model=VaultWatchResponse)
def vault_watch_endpoint(payload: VaultWatchIn) -> VaultWatchResponse:
    """Vault增量同步：检查笔记变更"""
    tools = get_vault_tools()
    result = tools.vault_watch(since=payload.since)
    return VaultWatchResponse(**cast(dict[str, Any], result))


@app.post("/api/vault/emergency", response_model=VaultEmergencyResponse)
def vault_emergency_endpoint(payload: VaultEmergencyIn) -> VaultEmergencyResponse:
    """Vault应急层：数据库失效时扫描文件系统"""
    tools = get_vault_tools()
    result = tools.vault_emergency_sample(
        sample_size=payload.sample_size,
        content_limit=payload.content_limit,
    )
    return VaultEmergencyResponse(**cast(dict[str, Any], result))


# ========== Search API ==========

class SearchResultItem(BaseModel):
    id: str
    type: Literal["note", "card"]
    title: str
    preview: str
    folder: str = ""
    tags: list[str] = []
    matched_field: str
    updated_at: float = 0


class SearchResponse(BaseModel):
    success: bool
    query: str
    results: list[SearchResultItem]
    total: int
    notes_count: int
    cards_count: int


# ========== AI Config Types ==========

class ProviderConfigModel(BaseModel):
    api_key: str = ""
    base_url: str = ""
    models: list[str] = []


class ParametersConfigModel(BaseModel):
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 2000
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0


class FeaturesConfigModel(BaseModel):
    auto_hint: bool = False
    auto_explain: bool = False
    context_length: int = 10


class AIConfigModel(BaseModel):
    current_provider: str = "openai"
    current_model: str = "gpt-3.5-turbo"
    providers: dict[str, ProviderConfigModel] = {}
    parameters: ParametersConfigModel
    features: FeaturesConfigModel


class AIConfigResponse(BaseModel):
    success: bool
    config: AIConfigModel


class TestConnectionResponse(BaseModel):
    success: bool
    message: str


# ========== Completion Types ==========

class CompletionRequest(BaseModel):
    prefix: str = Field(..., description="当前输入的文本前缀")
    context: str = Field(default="", description="笔记的完整内容作为上下文")
    max_tokens: int = Field(default=150, description="最大生成token数")


class CompletionConfigModel(BaseModel):
    enabled: bool = True
    require_confirm: bool = False  # 二次确认开关
    trigger_delay: int = 500  # 防抖延迟(ms)
    max_tokens: int = 150


class CompletionConfigResponse(BaseModel):
    success: bool
    config: CompletionConfigModel


# ========== Data Management Types ==========

class BackupResponse(BaseModel):
    success: bool
    path: str


class ExportDataResponse(BaseModel):
    cards: list[Any]
    notes: list[Any]
    config: dict[str, Any]


class ImportDataResponse(BaseModel):
    success: bool
    imported: int


def _search_notes(notes: list[Note], query: str) -> list[SearchResultItem]:
    """Search notes by title, content, or tags."""
    results: list[SearchResultItem] = []
    query_lower = query.lower()
    
    for note in notes:
        matched_field = ""
        
        # Check title
        if query_lower in note.title.lower():
            matched_field = "title"
        # Check content
        elif query_lower in note.content.lower():
            matched_field = "content"
        # Check tags
        elif any(query_lower in tag.lower() for tag in note.tags):
            matched_field = "tags"
        
        if matched_field:
            results.append(SearchResultItem(
                id=note.id,
                type="note",
                title=note.title,
                preview=note.preview,
                folder=note.folder,
                tags=note.tags,
                matched_field=matched_field,
                updated_at=note.updated_at,
            ))
    
    return results


def _search_cards(cards: list[CardDict], query: str) -> list[SearchResultItem]:
    """Search cards by question or answer."""
    results: list[SearchResultItem] = []
    query_lower = query.lower()
    
    for card in cards:
        matched_field = ""
        
        # Check question
        if query_lower in card.get("q", "").lower():
            matched_field = "question"
        # Check answer
        elif query_lower in card.get("a", "").lower():
            matched_field = "answer"
        
        if matched_field:
            title = card.get("q", "")[:50]
            if len(card.get("q", "")) > 50:
                title += "..."
            
            results.append(SearchResultItem(
                id=card.get("id", ""),
                type="card",
                title=title,
                preview=card.get("a", "")[:100],
                folder="复习卡片",
                tags=[],
                matched_field=matched_field,
            ))
    
    return results


@app.get("/api/search", response_model=SearchResponse)
def search_all(query: str = "") -> SearchResponse:
    """Search across notes and cards.
    
    Query parameters:
        query: Search keyword (required)
    """
    if not query or not query.strip():
        return SearchResponse(
            success=True,
            query="",
            results=[],
            total=0,
            notes_count=0,
            cards_count=0,
        )
    
    data_file = _get_data_file()
    
    # Search notes
    notes = load_notes(NOTES_FILE)
    note_results = _search_notes(notes, query.strip())
    
    # Search cards
    cards = card_core.list_cards(data_file)
    card_results = _search_cards(cards, query.strip())
    
    # Combine results, notes first
    all_results = note_results + card_results
    
    return SearchResponse(
        success=True,
        query=query.strip(),
        results=all_results,
        total=len(all_results),
        notes_count=len(note_results),
        cards_count=len(card_results),
    )



# ========== AI Config Endpoints ==========

@app.get("/api/config/ai", response_model=AIConfigResponse)
def get_ai_config_endpoint() -> AIConfigResponse:
    """Get AI configuration."""
    config = get_ai_config()
    return AIConfigResponse(
        success=True,
        config=AIConfigModel(
            current_provider=config.config["current_provider"],
            current_model=config.config["current_model"],
            providers={
                k: ProviderConfigModel(
                    api_key=v.get("api_key", ""),
                    base_url=v.get("base_url", ""),
                    models=v.get("models", []),
                )
                for k, v in config.config["providers"].items()
            },
            parameters=ParametersConfigModel(
                temperature=config.config["parameters"].get("temperature", 0.7),
                top_p=config.config["parameters"].get("top_p", 0.9),
                max_tokens=config.config["parameters"].get("max_tokens", 2000),
                presence_penalty=config.config["parameters"].get("presence_penalty", 0.0),
                frequency_penalty=config.config["parameters"].get("frequency_penalty", 0.0),
            ),
            features=FeaturesConfigModel(
                auto_hint=config.config["features"]["auto_hint"],
                auto_explain=config.config["features"]["auto_explain"],
                context_length=config.config["features"]["context_length"],
            ),
        ),
    )


@app.post("/api/config/ai", response_model=dict[str, Any])
def save_ai_config_endpoint(payload: AIConfigModel) -> dict[str, Any]:
    """Save AI configuration."""
    try:
        config = get_ai_config()
        config.config["current_provider"] = payload.current_provider
        config.config["current_model"] = payload.current_model
        
        # Update providers
        for provider_name, provider_data in payload.providers.items():
            config.config["providers"][provider_name] = {
                "api_key": provider_data.api_key,
                "base_url": provider_data.base_url,
                "models": provider_data.models,
            }
        
        # Update parameters
        config.config["parameters"] = {
            "temperature": payload.parameters.temperature,
            "top_p": payload.parameters.top_p,
            "max_tokens": payload.parameters.max_tokens,
            "presence_penalty": payload.parameters.presence_penalty,
            "frequency_penalty": payload.parameters.frequency_penalty,
        }
        
        # Update features
        config.config["features"] = {
            "auto_hint": payload.features.auto_hint,
            "auto_explain": payload.features.auto_explain,
            "context_length": payload.features.context_length,
        }
        
        config.save_config()
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存配置失败: {e}")


@app.post("/api/config/ai/test", response_model=TestConnectionResponse)
def test_ai_connection_endpoint() -> TestConnectionResponse:
    """Test AI connection."""
    try:
        config = get_ai_config()
        provider_config = config.get_provider_config()
        
        # Simple validation
        if config.config["current_provider"] != "ollama":
            api_key = provider_config.get("api_key", "")
            if not api_key:
                return TestConnectionResponse(
                    success=False,
                    message="API Key 未设置",
                )
        
        # TODO: 实际测试连接
        # 这里可以添加实际的 API 调用测试
        
        return TestConnectionResponse(
            success=True,
            message="配置验证通过",
        )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"连接测试失败: {e}",
        )


# ========== Data Management Endpoints ==========

@app.post("/api/backup", response_model=BackupResponse)
def create_backup_endpoint() -> BackupResponse:
    """Create a backup of all data."""
    import shutil
    from papyrus.paths import BACKUP_FILE
    
    try:
        data_file = _get_data_file()
        
        # Ensure backup directory exists
        backup_dir = os.path.dirname(BACKUP_FILE)
        if backup_dir:
            os.makedirs(backup_dir, exist_ok=True)
        
        # Copy data file to backup
        if os.path.exists(data_file):
            shutil.copy(data_file, BACKUP_FILE)
        
        return BackupResponse(
            success=True,
            path=BACKUP_FILE,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"备份失败: {e}")


@app.get("/api/export", response_model=ExportDataResponse)
def export_data_endpoint() -> ExportDataResponse:
    """Export all data."""
    data_file = _get_data_file()
    
    cards = card_core.list_cards(data_file)
    notes = load_notes(NOTES_FILE)
    config = get_ai_config()
    
    return ExportDataResponse(
        cards=cards,
        notes=[
            {
                "id": n.id,
                "title": n.title,
                "folder": n.folder,
                "content": n.content,
                "tags": n.tags,
                "created_at": n.created_at,
                "updated_at": n.updated_at,
            }
            for n in notes
        ],
        config=dict(config.config),
    )


@app.post("/api/import", response_model=ImportDataResponse)
def import_data_endpoint(payload: dict[str, Any]) -> ImportDataResponse:
    """Import data from JSON."""
    try:
        # Import cards
        cards_data = payload.get("cards", [])
        if cards_data:
            # TODO: 实现卡片导入逻辑
            pass
        
        # Import notes
        notes_data = payload.get("notes", [])
        imported_count = 0
        if notes_data:
            for note_data in notes_data:
                create_note(
                    NOTES_FILE,
                    title=note_data.get("title", "Untitled"),
                    folder=note_data.get("folder", "默认"),
                    content=note_data.get("content", ""),
                    tags=note_data.get("tags", []),
                )
                imported_count += 1
        
        return ImportDataResponse(
            success=True,
            imported=imported_count,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {e}")


# ========== Completion Endpoints ==========

# 内存存储补全配置（实际应用应持久化）
_completion_config = CompletionConfigModel()


@app.get("/api/completion/config", response_model=CompletionConfigResponse)
def get_completion_config() -> CompletionConfigResponse:
    """Get completion configuration."""
    return CompletionConfigResponse(success=True, config=_completion_config)


@app.post("/api/completion/config", response_model=dict[str, Any])
def save_completion_config(payload: CompletionConfigModel) -> dict[str, Any]:
    """Save completion configuration."""
    global _completion_config
    _completion_config = payload
    return {"success": True}


@app.post("/api/completion")
async def create_completion(payload: CompletionRequest) -> StreamingResponse:
    """Create text completion using AI.
    
    Returns a streaming response with the completion text.
    """
    config = get_ai_config()
    provider_config = config.get_provider_config()
    
    # 检查配置
    if config.config["current_provider"] != "ollama":
        api_key = provider_config.get("api_key", "")
        if not api_key:
            raise HTTPException(status_code=400, detail="AI API Key 未设置")
    
    # 构建提示词
    system_prompt = """你是一个智能写作助手。根据用户提供的文本上下文，预测并续写接下来的内容。
要求：
1. 续写内容要自然流畅，与上下文保持一致
2. 只输出续写的文本，不要解释
3. 如果是列表、代码块等特殊格式，保持格式一致"""

    user_prompt = f"""请根据以下内容续写：

{payload.prefix}"""

    # 根据提供商类型选择调用方式
    provider_name = config.config["current_provider"]
    
    async def generate() -> AsyncGenerator[str, None]:
        """生成补全内容的流式响应。"""
        try:
            if requests_available and requests is not None:
                if provider_name == "ollama":
                    # Ollama 流式调用
                    base_url = provider_config.get("base_url", "http://localhost:11434")
                    model = config.config.get("current_model", "llama2")
                    
                    data = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "stream": True,
                        "options": {"temperature": 0.7}
                    }
                    
                    response = requests.post(
                        f"{base_url}/api/chat",
                        json=data,
                        stream=True,
                        timeout=60
                    )
                    
                    for line in response.iter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                if "message" in chunk and "content" in chunk["message"]:
                                    content = chunk["message"]["content"]
                                    yield f"data: {json.dumps({'text': content})}\n\n"
                            except json.JSONDecodeError:
                                continue
                else:
                    # OpenAI 兼容流式调用
                    base_url = provider_config.get("base_url", "https://api.openai.com/v1")
                    api_key = provider_config.get("api_key", "")
                    model = config.config.get("current_model", "gpt-3.5-turbo")
                    
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    
                    data = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": payload.max_tokens,
                        "stream": True
                    }
                    
                    response = requests.post(
                        f"{base_url}/chat/completions",
                        headers=headers,
                        json=data,
                        stream=True,
                        timeout=60
                    )
                    
                    for line in response.iter_lines():
                        if line:
                            line_str = line.decode('utf-8')
                            if line_str.startswith('data: '):
                                try:
                                    chunk = json.loads(line_str[6:])
                                    if "choices" in chunk and chunk["choices"]:
                                        delta = chunk["choices"][0].get("delta", {})
                                        content = delta.get("content", "")
                                        if content:
                                            yield f"data: {json.dumps({'text': content})}\n\n"
                                except json.JSONDecodeError:
                                    continue
            
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        content=generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ========== 笔记关联功能 API ==========

class RelatedNoteOut(BaseModel):
    """关联笔记输出模型."""
    note_id: str
    title: str
    folder: str
    preview: str
    relation_id: str
    relation_type: str
    description: str
    is_outgoing: bool
    created_at: float


class NoteRelationsResponse(BaseModel):
    """笔记关联列表响应."""
    success: bool
    outgoing: list[RelatedNoteOut]
    incoming: list[RelatedNoteOut]
    total_outgoing: int
    total_incoming: int


class CreateRelationIn(BaseModel):
    """创建关联请求."""
    target_id: str = Field(..., description="目标笔记ID")
    relation_type: Literal[
        "reference", "related", "child", "parent", "sequence", "parallel"
    ] = Field(default="reference", description="关联类型")
    description: str = Field(default="", description="关联描述")


class CreateRelationResponse(BaseModel):
    """创建关联响应."""
    success: bool
    relation: dict[str, Any] | None


class UpdateRelationIn(BaseModel):
    """更新关联请求."""
    relation_type: Literal[
        "reference", "related", "child", "parent", "sequence", "parallel"
    ] | None = None
    description: str | None = None


class UpdateRelationResponse(BaseModel):
    """更新关联响应."""
    success: bool
    relation: dict[str, Any] | None


class DeleteRelationResponse(BaseModel):
    """删除关联响应."""
    success: bool


class GraphNode(BaseModel):
    """图谱节点."""
    id: str
    title: str
    folder: str
    is_center: bool = False


class GraphLink(BaseModel):
    """图谱边."""
    source: str
    target: str
    type: str


class RelationGraphResponse(BaseModel):
    """关联图谱响应."""
    success: bool
    nodes: list[GraphNode]
    links: list[GraphLink]


class SearchForRelationItem(BaseModel):
    """可关联笔记搜索结果."""
    id: str
    title: str
    folder: str
    preview: str


class SearchForRelationResponse(BaseModel):
    """搜索可关联笔记响应."""
    success: bool
    results: list[SearchForRelationItem]


@app.get("/api/notes/{note_id}/relations", response_model=NoteRelationsResponse)
def get_note_relations_endpoint(note_id: str) -> NoteRelationsResponse:
    """获取笔记的关联列表(出链和入链)."""
    outgoing, incoming = get_note_relations(DATABASE_FILE, note_id)
    
    return NoteRelationsResponse(
        success=True,
        outgoing=[
            RelatedNoteOut(
                note_id=r.note_id,
                title=r.title,
                folder=r.folder,
                preview=r.preview,
                relation_id=r.relation_id,
                relation_type=r.relation_type,
                description=r.description,
                is_outgoing=r.is_outgoing,
                created_at=r.created_at,
            )
            for r in outgoing
        ],
        incoming=[
            RelatedNoteOut(
                note_id=r.note_id,
                title=r.title,
                folder=r.folder,
                preview=r.preview,
                relation_id=r.relation_id,
                relation_type=r.relation_type,
                description=r.description,
                is_outgoing=r.is_outgoing,
                created_at=r.created_at,
            )
            for r in incoming
        ],
        total_outgoing=len(outgoing),
        total_incoming=len(incoming),
    )


@app.post("/api/notes/{note_id}/relations", response_model=CreateRelationResponse)
def create_relation_endpoint(note_id: str, payload: CreateRelationIn) -> CreateRelationResponse:
    """为笔记创建关联."""
    relation = create_relation(
        db_path=DATABASE_FILE,
        source_id=note_id,
        target_id=payload.target_id,
        relation_type=RelationType(payload.relation_type),  # type: ignore
        description=payload.description,
    )
    
    if relation is None:
        raise HTTPException(status_code=400, detail="关联已存在")
    
    return CreateRelationResponse(
        success=True,
        relation=relation.to_dict(),
    )


@app.patch("/api/relations/{relation_id}", response_model=UpdateRelationResponse)
def update_relation_endpoint(relation_id: str, payload: UpdateRelationIn) -> UpdateRelationResponse:
    """更新关联."""
    rel_type = None
    if payload.relation_type:
        rel_type = RelationType(payload.relation_type)  # type: ignore
    
    relation = update_relation(
        db_path=DATABASE_FILE,
        relation_id=relation_id,
        relation_type=rel_type,
        description=payload.description,
    )
    
    if relation is None:
        raise HTTPException(status_code=404, detail="关联不存在")
    
    return UpdateRelationResponse(
        success=True,
        relation=relation.to_dict(),
    )


@app.delete("/api/relations/{relation_id}", response_model=DeleteRelationResponse)
def delete_relation_endpoint(relation_id: str) -> DeleteRelationResponse:
    """删除关联."""
    success = delete_relation(DATABASE_FILE, relation_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="关联不存在")
    
    return DeleteRelationResponse(success=True)


@app.get("/api/notes/{note_id}/graph", response_model=RelationGraphResponse)
def get_relation_graph_endpoint(
    note_id: str, 
    depth: int = 1,
) -> RelationGraphResponse:
    """获取笔记的关联图谱.
    
    Args:
        note_id: 中心笔记ID
        depth: 关联深度 (1=直接关联, 2=关联的关联)
    """
    graph_data = get_relation_graph(DATABASE_FILE, note_id, depth=depth)
    
    return RelationGraphResponse(
        success=True,
        nodes=[GraphNode(**n) for n in graph_data["nodes"]],
        links=[GraphLink(**l) for l in graph_data["links"]],
    )


@app.get("/api/notes/search-for-relation", response_model=SearchForRelationResponse)
def search_for_relation_endpoint(
    query: str = "",
    exclude_note_id: str | None = None,
    limit: int = 10,
) -> SearchForRelationResponse:
    """搜索可关联的笔记."""
    results = search_notes_for_relation(
        DATABASE_FILE, query, exclude_note_id, limit
    )
    
    return SearchForRelationResponse(
        success=True,
        results=[SearchForRelationItem(**r) for r in results],
    )
