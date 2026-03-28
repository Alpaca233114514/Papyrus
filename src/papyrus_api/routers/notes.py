"""笔记管理API路由。"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from papyrus.data.notes_storage import (
    Note,
    load_notes,
    create_note,
    update_note,
    delete_note as delete_note_storage,
)
from papyrus.integrations.obsidian import sync_obsidian_vault
from papyrus.paths import NOTES_FILE

router = APIRouter(prefix="/notes", tags=["notes"])


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
    """将Note对象转换为NoteDict。"""
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
        hash=getattr(note, "hash", ""),
        headings=getattr(note, "headings", []),
        outgoing_links=getattr(note, "outgoing_links", []),
        incoming_count=getattr(note, "incoming_count", 0),
    )


@router.get("", response_model=NotesListResponse)
def list_notes() -> NotesListResponse:
    """获取所有笔记列表。"""
    notes = load_notes(NOTES_FILE)
    return NotesListResponse(
        success=True,
        notes=[_note_to_dict(n) for n in notes],
        count=len(notes),
    )


@router.post("", response_model=CreateNoteResponse)
def create_note_endpoint(payload: CreateNoteIn) -> CreateNoteResponse:
    """创建新笔记。"""
    note = create_note(
        NOTES_FILE,
        title=payload.title,
        folder=payload.folder,
        content=payload.content,
        tags=payload.tags,
    )
    return CreateNoteResponse(success=True, note=_note_to_dict(note))


@router.get("/{note_id}", response_model=CreateNoteResponse)
def get_note_endpoint(note_id: str) -> CreateNoteResponse:
    """获取单个笔记详情。"""
    notes = load_notes(NOTES_FILE)
    for note in notes:
        if note.id == note_id:
            return CreateNoteResponse(success=True, note=_note_to_dict(note))
    raise HTTPException(status_code=404, detail="note not found")


@router.patch("/{note_id}", response_model=UpdateNoteResponse)
def update_note_endpoint(note_id: str, payload: UpdateNoteIn) -> UpdateNoteResponse:
    """更新笔记。"""
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


@router.delete("/{note_id}", response_model=DeleteNoteResponse)
def delete_note_endpoint(note_id: str) -> DeleteNoteResponse:
    """删除笔记。"""
    ok = delete_note_storage(NOTES_FILE, note_id)
    if not ok:
        raise HTTPException(status_code=404, detail="note not found")
    return DeleteNoteResponse(success=True)


@router.post("/import/obsidian", response_model=ObsidianImportResponse)
def import_obsidian_endpoint(payload: ObsidianImportIn) -> ObsidianImportResponse:
    """从Obsidian Vault导入笔记。"""
    import os

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
