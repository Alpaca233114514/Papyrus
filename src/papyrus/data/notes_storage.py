"""Notes data persistence for Papyrus.

This module now uses SQLite3 database instead of JSON files.
The API remains backward compatible for easy migration.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import time
from dataclasses import dataclass, field
from typing import Protocol, TypedDict

from papyrus.data.database import (
    delete_note_by_id,
    get_note_by_id,
    init_database,
    insert_note,
    load_all_notes,
    migrate_from_json,
    save_all_notes,
    update_note_in_db,
)
from papyrus.paths import DATABASE_FILE, NOTES_FILE as LEGACY_NOTES_FILE


class NoteRecord(TypedDict, total=False):
    id: str
    title: str
    folder: str
    content: str
    preview: str
    tags: list[str]
    created_at: float
    updated_at: float
    word_count: int
    hash: str
    headings: list[dict]
    outgoing_links: list[str]
    incoming_count: int


class LoggerProtocol(Protocol):
    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...
    def warning(self, message: str) -> None: ...


@dataclass
class Note:
    id: str
    title: str
    folder: str = "默认"
    content: str = ""
    preview: str = ""
    tags: list[str] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    word_count: int = 0
    hash: str = ""
    headings: list[dict] = field(default_factory=list)
    outgoing_links: list[str] = field(default_factory=list)
    incoming_count: int = 0

    def to_dict(self) -> NoteRecord:
        return {
            "id": self.id,
            "title": self.title,
            "folder": self.folder,
            "content": self.content,
            "preview": self.preview,
            "tags": self.tags,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "word_count": self.word_count,
            "hash": self.hash,
            "headings": self.headings,
            "outgoing_links": self.outgoing_links,
            "incoming_count": self.incoming_count,
        }

    @classmethod
    def from_dict(cls, data: NoteRecord) -> "Note":
        return cls(
            id=data["id"],
            title=data.get("title", ""),
            folder=data.get("folder", "默认"),
            content=data.get("content", ""),
            preview=data.get("preview", ""),
            tags=data.get("tags", []),
            created_at=data.get("created_at", time.time()),
            updated_at=data.get("updated_at", time.time()),
            word_count=data.get("word_count", 0),
            hash=data.get("hash", ""),
            headings=data.get("headings", []),
            outgoing_links=data.get("outgoing_links", []),
            incoming_count=data.get("incoming_count", 0),
        )


def _generate_preview(content: str, max_length: int = 100) -> str:
    """Generate preview from content."""
    text = content.replace("#", "").replace("*", "").replace("`", "").strip()
    if len(text) <= max_length:
        return text
    return text[:max_length] + "..."


def _count_words(content: str) -> int:
    """Count words in content."""
    # Remove markdown syntax
    text = re.sub(r'[#*`\_\[\]\(\)\{\}]', '', content)
    # Count Chinese characters and English words
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    english_words = len(re.findall(r'[a-zA-Z]+', text))
    return chinese_chars + english_words


def _compute_hash(content: str) -> str:
    """计算内容MD5前8位"""
    return hashlib.md5(content.encode("utf-8")).hexdigest()[:8]


def _extract_headings(content: str) -> list[dict]:
    """提取H1-H3标题"""
    headings = []
    for match in re.finditer(r"^(#{1,3})\s+(.+)$", content, re.MULTILINE):
        level = len(match.group(1))
        text = match.group(2).strip()
        # 生成anchor: 小写，空格替换为-
        anchor = re.sub(r"[^\w\s-]", "", text.lower()).replace(" ", "-")
        headings.append({"level": level, "text": text, "anchor": anchor})
    return headings[:10]  # 最多存10个


def _extract_outgoing_links(content: str) -> list[str]:
    """提取出链 [[NoteName]] 或 [[NoteName|Display]]"""
    links = []
    pattern = r"\[\[([^\]|]+)(?:\|[^\]]*)?\]\]"
    for match in re.finditer(pattern, content):
        link_target = match.group(1).strip()
        # 移除 #heading 后缀
        if "#" in link_target:
            link_target = link_target.split("#")[0]
        if link_target and link_target not in links:
            links.append(link_target)
    return links


def update_note_metadata(note: Note) -> None:
    """更新笔记的元数据（hash, headings, outgoing_links, word_count）"""
    note.hash = _compute_hash(note.content)
    note.headings = _extract_headings(note.content)
    note.outgoing_links = _extract_outgoing_links(note.content)
    note.word_count = _count_words(note.content)


def _get_db_path(data_file: str | None = None) -> str:
    """Get the database path. If legacy JSON path is provided, use the default DB path."""
    return DATABASE_FILE


def load_notes(data_file: str, *, logger: LoggerProtocol | None = None) -> list[Note]:
    """Load notes from database.
    
    For backward compatibility, accepts a file path parameter but uses database.
    On first run, automatically migrates data from JSON if present.
    """
    db_path = _get_db_path(data_file)
    
    # Try to migrate from JSON on first run
    try:
        import os
        if os.path.exists(LEGACY_NOTES_FILE):
            migrate_from_json(db_path, notes_file=LEGACY_NOTES_FILE, logger=logger)
            # Rename legacy file to avoid re-migration
            os.rename(LEGACY_NOTES_FILE, LEGACY_NOTES_FILE + ".migrated")
            if logger:
                logger.info("已从旧版 JSON 文件迁移笔记数据")
    except Exception:
        pass  # Ignore migration errors
    
    return load_all_notes(db_path, logger)


def save_notes(
    data_file: str,
    notes: list[Note],
    *,
    backup_file: str | None = None,
    last_backup_time: float = 0,
    logger: LoggerProtocol | None = None,
    now: float | None = None,
) -> float:
    """Persist notes to database and perform auto-backup."""
    db_path = _get_db_path(data_file)
    save_all_notes(db_path, notes, logger)

    if not backup_file:
        return last_backup_time

    if not notes:
        return last_backup_time

    # Smart auto-backup: only once per hour
    now_ts = time.time() if now is None else now
    if now_ts - last_backup_time <= 3600:
        return last_backup_time

    try:
        import os
        backup_dir = backup_file
        if backup_file.endswith('.bak') or backup_file.endswith('.json'):
            backup_dir = os.path.dirname(backup_file)
        if backup_dir:
            os.makedirs(backup_dir, exist_ok=True)
        
        # Backup the database file
        db_backup = backup_file if backup_file.endswith('.db.bak') else backup_file + ".db.bak"
        shutil.copy(db_path, db_backup)
        
        if logger:
            logger.info("笔记自动备份成功")
        return now_ts
    except Exception as e:
        if logger:
            logger.warning(f"笔记自动备份失败: {e}")
        return last_backup_time


def create_note(
    data_file: str,
    title: str,
    folder: str,
    content: str,
    tags: list[str] | None = None,
) -> Note:
    """Create a new note."""
    note = Note(
        id=str(int(time.time() * 1000)),
        title=title,
        folder=folder,
        content=content,
        preview=_generate_preview(content),
        tags=tags or [],
    )
    
    # 自动计算元数据
    update_note_metadata(note)
    
    db_path = _get_db_path(data_file)
    notes = load_all_notes(db_path)
    notes.insert(0, note)
    save_all_notes(db_path, notes)
    
    # 重新计算入链计数
    _recompute_incoming_counts(db_path, notes)
    
    return note


def _recompute_incoming_counts(db_path: str, notes: list[Note]) -> None:
    """重新计算所有笔记的入链计数"""
    from papyrus.data.database import get_connection, init_database
    
    init_database(db_path)
    
    # 构建ID到笔记的映射和出链映射
    all_ids = {n.id for n in notes}
    outgoing_map = {n.id: n.outgoing_links for n in notes}
    
    # 计算入链数
    incoming_count = {note_id: 0 for note_id in all_ids}
    for note_id, links in outgoing_map.items():
        for link in links:
            if link in incoming_count:
                incoming_count[link] += 1
    
    # 更新数据库
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        for note in notes:
            note.incoming_count = incoming_count.get(note.id, 0)
            cursor.execute(
                "UPDATE notes SET incoming_count = ? WHERE id = ?",
                (note.incoming_count, note.id)
            )
        conn.commit()


def update_note(
    data_file: str,
    note_id: str,
    title: str | None = None,
    folder: str | None = None,
    content: str | None = None,
    tags: list[str] | None = None,
) -> Note | None:
    """Update an existing note."""
    db_path = _get_db_path(data_file)
    note = get_note_by_id(db_path, note_id)
    
    if note is None:
        return None
    
    if title is not None:
        note.title = title
    if folder is not None:
        note.folder = folder
    if content is not None:
        note.content = content
        note.preview = _generate_preview(content)
        # 重新计算元数据
        update_note_metadata(note)
    if tags is not None:
        note.tags = tags
    note.updated_at = time.time()
    
    update_note_in_db(db_path, note)
    
    # 如果内容变更，重新计算入链计数
    if content is not None:
        all_notes = load_all_notes(db_path)
        _recompute_incoming_counts(db_path, all_notes)
    
    return note


def delete_note(data_file: str, note_id: str) -> bool:
    """Delete a note by id."""
    db_path = _get_db_path(data_file)
    return delete_note_by_id(db_path, note_id)


def get_note(data_file: str, note_id: str) -> Note | None:
    """Get a single note by id."""
    db_path = _get_db_path(data_file)
    return get_note_by_id(db_path, note_id)


# New database-specific functions for more efficient operations

def db_get_note(note_id: str, db_path: str | None = None) -> Note | None:
    """Get a single note by id from database."""
    path = db_path or DATABASE_FILE
    return get_note_by_id(path, note_id)


def db_insert_note(note: Note, db_path: str | None = None, logger: LoggerProtocol | None = None) -> None:
    """Insert a single note into database."""
    path = db_path or DATABASE_FILE
    insert_note(path, note, logger)


def db_delete_note(note_id: str, db_path: str | None = None, logger: LoggerProtocol | None = None) -> bool:
    """Delete a note by id from database."""
    path = db_path or DATABASE_FILE
    return delete_note_by_id(path, note_id, logger)


def db_update_note(note: Note, db_path: str | None = None, logger: LoggerProtocol | None = None) -> bool:
    """Update a note in database."""
    path = db_path or DATABASE_FILE
    return update_note_in_db(path, note, logger)
