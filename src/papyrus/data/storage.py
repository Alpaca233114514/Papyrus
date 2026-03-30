"""Data persistence helpers for Papyrus cards.

This module now uses SQLite3 database instead of JSON files.
The API remains backward compatible for easy migration.
"""

from __future__ import annotations

import shutil
import time
from typing import Protocol, TypedDict

from papyrus.data.database import (
    delete_card_by_id,
    get_card_by_id,
    init_database,
    insert_card,
    load_all_cards,
    migrate_from_json,
    save_all_cards,
    update_card,
)
from papyrus.paths import DATA_FILE as LEGACY_DATA_FILE
from papyrus.paths import DATABASE_FILE, NOTES_FILE


class CardRecord(TypedDict, total=False):
    id: str
    q: str
    a: str
    next_review: float
    interval: float
    tags: list[str]
    ef: float
    repetitions: int


class LoggerProtocol(Protocol):
    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...
    def warning(self, message: str) -> None: ...


def _normalize_card_record(raw: object) -> CardRecord | None:
    if not isinstance(raw, dict):
        return None

    card: CardRecord = {}

    card_id = raw.get("id")
    if isinstance(card_id, str) and card_id.strip():
        card["id"] = card_id

    question = raw.get("q")
    if isinstance(question, str):
        card["q"] = question

    answer = raw.get("a")
    if isinstance(answer, str):
        card["a"] = answer

    next_review = raw.get("next_review")
    if isinstance(next_review, int | float):
        card["next_review"] = float(next_review)

    interval = raw.get("interval")
    if isinstance(interval, int | float):
        card["interval"] = float(interval)

    tags = raw.get("tags")
    if isinstance(tags, list):
        normalized_tags = [str(tag) for tag in tags]
        card["tags"] = normalized_tags

    ef = raw.get("ef")
    if isinstance(ef, int | float):
        card["ef"] = float(ef)

    repetitions = raw.get("repetitions")
    if isinstance(repetitions, int) and not isinstance(repetitions, bool):
        card["repetitions"] = repetitions

    return card


def _get_db_path(data_file: str | None = None) -> str:
    """Get the database path. If legacy JSON path is provided, use the default DB path."""
    return DATABASE_FILE


def load_cards(data_file: str, *, logger: LoggerProtocol | None = None) -> list[CardRecord]:
    """Load cards from database.
    
    For backward compatibility, accepts a file path parameter but uses database.
    On first run, automatically migrates data from JSON if present.
    """
    db_path = _get_db_path(data_file)
    
    # Try to migrate from JSON on first run
    try:
        import os
        if os.path.exists(LEGACY_DATA_FILE):
            migrate_from_json(db_path, cards_file=LEGACY_DATA_FILE, logger=logger)
            # Rename legacy file to avoid re-migration
            os.rename(LEGACY_DATA_FILE, LEGACY_DATA_FILE + ".migrated")
            if logger:
                logger.info("已从旧版 JSON 文件迁移卡片数据")
    except Exception:
        pass  # Ignore migration errors
    
    return load_all_cards(db_path, logger)


def save_cards(
    data_file: str,
    cards: list[CardRecord],
    *,
    backup_file: str | None = None,
    last_backup_time: float = 0,
    logger: LoggerProtocol | None = None,
    now: float | None = None,
) -> float:
    """Persist cards to database and perform an auto-backup.

    Returns the updated last_backup_time.
    """
    db_path = _get_db_path(data_file)
    save_all_cards(db_path, cards, logger)

    if not backup_file:
        return last_backup_time

    if not cards:
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
            logger.info("自动备份成功")
        return now_ts
    except Exception as e:
        if logger:
            logger.warning(f"自动备份失败: {e}")
        return last_backup_time


def create_backup(data_file: str, backup_file: str) -> None:
    """Create a backup of the database."""
    db_path = _get_db_path(data_file)
    init_database(db_path)
    
    import os
    backup_dir = os.path.dirname(backup_file)
    if backup_dir:
        os.makedirs(backup_dir, exist_ok=True)
    shutil.copy(db_path, backup_file)


def restore_backup(backup_file: str, data_file: str) -> None:
    """Restore database from backup."""
    db_path = _get_db_path(data_file)
    
    import os
    data_dir = os.path.dirname(db_path)
    if data_dir:
        os.makedirs(data_dir, exist_ok=True)
    shutil.copy(backup_file, db_path)


# New database-specific functions for more efficient operations

def db_get_card(card_id: str, db_path: str | None = None) -> CardRecord | None:
    """Get a single card by id from database."""
    path = db_path or DATABASE_FILE
    return get_card_by_id(path, card_id)


def db_insert_card(card: CardRecord, db_path: str | None = None, logger: LoggerProtocol | None = None) -> None:
    """Insert a single card into database."""
    path = db_path or DATABASE_FILE
    insert_card(path, card, logger)


def db_delete_card(card_id: str, db_path: str | None = None, logger: LoggerProtocol | None = None) -> bool:
    """Delete a card by id from database."""
    path = db_path or DATABASE_FILE
    return delete_card_by_id(path, card_id, logger)


def db_update_card(card: CardRecord, db_path: str | None = None, logger: LoggerProtocol | None = None) -> bool:
    """Update a card in database."""
    path = db_path or DATABASE_FILE
    return update_card(path, card, logger)
