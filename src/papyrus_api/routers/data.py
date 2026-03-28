"""数据管理API路由（备份、导入、导出）。"""

from __future__ import annotations

import shutil
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from papyrus.core import cards as card_core
from papyrus.data.notes_storage import load_notes, create_note
from papyrus.paths import NOTES_FILE, BACKUP_FILE
from papyrus_api.deps import get_data_file, get_ai_config

router = APIRouter(tags=["data"])


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


@router.post("/backup", response_model=BackupResponse)
def create_backup_endpoint() -> BackupResponse:
    """创建数据备份。"""
    try:
        data_file = get_data_file()

        # Ensure backup directory exists
        backup_dir = BACKUP_FILE
        if BACKUP_FILE.endswith('.bak') or BACKUP_FILE.endswith('.json'):
            import os
            backup_dir = os.path.dirname(BACKUP_FILE)
        if backup_dir:
            import os
            os.makedirs(backup_dir, exist_ok=True)

        # Copy data file to backup
        import os
        if os.path.exists(data_file):
            shutil.copy(data_file, BACKUP_FILE)

        return BackupResponse(
            success=True,
            path=BACKUP_FILE,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"备份失败: {e}")


@router.get("/export", response_model=ExportDataResponse)
def export_data_endpoint() -> ExportDataResponse:
    """导出所有数据。"""
    data_file = get_data_file()

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


@router.post("/import", response_model=ImportDataResponse)
def import_data_endpoint(payload: dict[str, Any]) -> ImportDataResponse:
    """从JSON导入数据。"""
    try:
        data_file = get_data_file()
        imported_count = 0

        # Import cards
        cards_data = payload.get("cards", [])
        if cards_data:
            for card_data in cards_data:
                q = card_data.get("q") or card_data.get("question", "")
                a = card_data.get("a") or card_data.get("answer", "")
                if q.strip() and a.strip():
                    card_core.create_card(data_file, q=q.strip(), a=a.strip())
                    imported_count += 1

        # Import notes
        notes_data = payload.get("notes", [])
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
