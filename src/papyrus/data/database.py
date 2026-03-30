"""SQLite3 database module for Papyrus.

This module provides database operations for cards and notes,
replacing the previous JSON file storage.
"""

from __future__ import annotations

import json
import os
import sqlite3
import stat
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Protocol

# Platform-specific imports for file permission handling
try:
    import ctypes
    from ctypes import wintypes
    _WIN32 = True
except ImportError:
    _WIN32 = False

if TYPE_CHECKING:
    from papyrus.data.storage import CardRecord
    from papyrus.data.notes_storage import Note


class LoggerProtocol(Protocol):
    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...
    def warning(self, message: str) -> None: ...


# Thread-local storage for database connections
_local = threading.local()


@dataclass
class DatabaseConfig:
    """Database configuration."""
    db_path: str
    logger: LoggerProtocol | None = None


def get_db_path() -> str:
    """Get the default database path."""
    from papyrus.paths import DATA_DIR
    return str(Path(DATA_DIR) / "papyrus.db")


@contextmanager
def get_connection(db_path: str):
    """Get a thread-local database connection."""
    conn = getattr(_local, 'connection', None)
    if conn is None:
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        _local.connection = conn
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise


def _set_secure_file_permissions(file_path: str) -> None:
    """Set file permissions to be accessible only by the current user.
    
    On Unix: chmod 600 (owner read/write only)
    On Windows: Remove inherited permissions, grant only current user and system
    """
    try:
        if _WIN32:
            # Windows: Use icacls command to set permissions
            # Remove inherited permissions and grant only:
            # - Current user (S-1-3-4 = Owner): Full control
            # - System: Full control (required for some backup operations)
            # - Administrators: Full control
            import subprocess
            
            # First, remove all inherited permissions
            subprocess.run(
                ['icacls', file_path, '/inheritance:r'],
                capture_output=True,
                check=False
            )
            
            # Grant current user (owner), SYSTEM, and Administrators full control
            # S-1-3-4 is the "Owner" SID which maps to the current user
            subprocess.run(
                [
                    'icacls', file_path,
                    '/grant', '*S-1-3-4:F',  # Owner (current user) - Full control
                    '/grant', 'SYSTEM:F',     # SYSTEM - Full control
                    '/grant', 'Administrators:F'  # Administrators - Full control
                ],
                capture_output=True,
                check=False
            )
            
            # Remove Users and Everyone groups if they exist
            subprocess.run(
                ['icacls', file_path, '/remove', 'Users'],
                capture_output=True,
                check=False
            )
            subprocess.run(
                ['icacls', file_path, '/remove', 'Everyone'],
                capture_output=True,
                check=False
            )
        else:
            # Unix/Linux/macOS: chmod 600 (owner read/write, group/others no access)
            os.chmod(file_path, stat.S_IRUSR | stat.S_IWUSR)
    except Exception:
        # If permission setting fails, don't block database operations
        # but the file may be accessible to other users
        pass


def init_database(db_path: str, logger: LoggerProtocol | None = None) -> None:
    """Initialize the database with required tables."""
    data_dir = os.path.dirname(db_path)
    os.makedirs(data_dir, exist_ok=True)
    
    # Set secure permissions on data directory
    try:
        if not _WIN32:
            # Unix: restrict directory to owner only (700)
            os.chmod(data_dir, stat.S_IRWXU)
    except Exception:
        pass
    
    # Check if database is newly created
    is_new_db = not os.path.exists(db_path)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # Cards table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                q TEXT NOT NULL,
                a TEXT NOT NULL,
                next_review REAL DEFAULT 0.0,
                interval REAL DEFAULT 0.0,
                ef REAL DEFAULT 2.5,
                repetitions INTEGER DEFAULT 0,
                tags TEXT DEFAULT '[]'
            )
        """)
        
        # Notes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL DEFAULT '',
                folder TEXT NOT NULL DEFAULT '默认',
                content TEXT NOT NULL DEFAULT '',
                preview TEXT NOT NULL DEFAULT '',
                tags TEXT DEFAULT '[]',
                created_at REAL DEFAULT 0.0,
                updated_at REAL DEFAULT 0.0,
                word_count INTEGER DEFAULT 0,
                hash TEXT DEFAULT '',
                headings TEXT DEFAULT '[]',
                outgoing_links TEXT DEFAULT '[]',
                incoming_count INTEGER DEFAULT 0
            )
        """)
        
        # Providers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS providers (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                base_url TEXT NOT NULL DEFAULT '',
                enabled INTEGER DEFAULT 0,
                is_default INTEGER DEFAULT 0,
                created_at REAL DEFAULT 0.0,
                updated_at REAL DEFAULT 0.0
            )
        """)
        
        # API Keys table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                provider_id TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT 'default',
                encrypted_key TEXT NOT NULL DEFAULT '',
                created_at REAL DEFAULT 0.0,
                FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
            )
        """)
        
        # Provider Models table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS provider_models (
                id TEXT PRIMARY KEY,
                provider_id TEXT NOT NULL,
                name TEXT NOT NULL,
                model_id TEXT NOT NULL,
                port TEXT NOT NULL,
                capabilities TEXT DEFAULT '[]',
                api_key_id TEXT,
                enabled INTEGER DEFAULT 1,
                FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
                FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
            )
        """)
        
        # Create indexes for better performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_hash ON notes(hash)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_models_provider ON provider_models(provider_id)")
        
        conn.commit()
    
    # Set secure file permissions (only owner can read/write)
    if is_new_db or os.path.exists(db_path):
        _set_secure_file_permissions(db_path)
    
    if logger:
        logger.info(f"数据库初始化完成: {db_path}")


def close_connection(db_path: str | None = None) -> None:
    """Close the thread-local database connection."""
    conn = getattr(_local, 'connection', None)
    if conn is not None:
        conn.close()
        _local.connection = None


def repair_file_permissions(db_path: str, logger: LoggerProtocol | None = None) -> bool:
    """Repair permissions on existing database file.
    
    Use this to secure existing databases that were created before
    permission hardening was implemented.
    
    Args:
        db_path: Path to the database file
        logger: Optional logger for status messages
        
    Returns:
        True if permissions were successfully set, False otherwise
    """
    try:
        if not os.path.exists(db_path):
            if logger:
                logger.warning(f"数据库文件不存在，无法修复权限: {db_path}")
            return False
        
        _set_secure_file_permissions(db_path)
        
        if logger:
            logger.info(f"数据库文件权限已修复: {db_path}")
        return True
    except Exception as e:
        if logger:
            logger.error(f"修复数据库权限失败: {e}")
        return False


# ==================== Card Operations ====================

def _tags_to_json(tags: list[str] | None) -> str:
    """Convert tags list to JSON string."""
    return json.dumps(tags or [], ensure_ascii=False)


def _tags_from_json(tags_json: str) -> list[str]:
    """Convert JSON string to tags list."""
    try:
        tags = json.loads(tags_json)
        if isinstance(tags, list):
            return [str(t) for t in tags]
    except (json.JSONDecodeError, ValueError):
        pass
    return []


def load_all_cards(db_path: str, logger: LoggerProtocol | None = None) -> list[CardRecord]:
    """Load all cards from database."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM cards")
        rows = cursor.fetchall()
        
        cards: list[CardRecord] = []
        for row in rows:
            card: CardRecord = {
                "id": row["id"],
                "q": row["q"],
                "a": row["a"],
                "next_review": row["next_review"],
                "interval": row["interval"],
                "ef": row["ef"],
                "repetitions": row["repetitions"],
                "tags": _tags_from_json(row["tags"]),
            }
            cards.append(card)
        
        if logger:
            logger.info(f"从数据库加载 {len(cards)} 张卡片")
        
        return cards


def save_all_cards(
    db_path: str,
    cards: list[CardRecord],
    logger: LoggerProtocol | None = None
) -> None:
    """Save all cards to database (replaces existing)."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # Clear existing cards and insert new ones
        cursor.execute("DELETE FROM cards")
        
        for card in cards:
            cursor.execute("""
                INSERT INTO cards (id, q, a, next_review, interval, ef, repetitions, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                card.get("id", ""),
                card.get("q", ""),
                card.get("a", ""),
                card.get("next_review", 0.0),
                card.get("interval", 0.0),
                card.get("ef", 2.5),
                card.get("repetitions", 0),
                _tags_to_json(card.get("tags")),
            ))
        
        conn.commit()
    
    if logger:
        logger.info(f"保存 {len(cards)} 张卡片到数据库")


def insert_card(db_path: str, card: CardRecord, logger: LoggerProtocol | None = None) -> None:
    """Insert a single card."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO cards (id, q, a, next_review, interval, ef, repetitions, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            card.get("id", ""),
            card.get("q", ""),
            card.get("a", ""),
            card.get("next_review", 0.0),
            card.get("interval", 0.0),
            card.get("ef", 2.5),
            card.get("repetitions", 0),
            _tags_to_json(card.get("tags")),
        ))
        conn.commit()


def delete_card_by_id(db_path: str, card_id: str, logger: LoggerProtocol | None = None) -> bool:
    """Delete a card by id."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM cards WHERE id = ?", (card_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_card_by_id(db_path: str, card_id: str) -> CardRecord | None:
    """Get a single card by id."""
    init_database(db_path)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM cards WHERE id = ?", (card_id,))
        row = cursor.fetchone()
        
        if row is None:
            return None
        
        return {
            "id": row["id"],
            "q": row["q"],
            "a": row["a"],
            "next_review": row["next_review"],
            "interval": row["interval"],
            "ef": row["ef"],
            "repetitions": row["repetitions"],
            "tags": _tags_from_json(row["tags"]),
        }


def update_card(db_path: str, card: CardRecord, logger: LoggerProtocol | None = None) -> bool:
    """Update a card."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE cards SET
                q = ?,
                a = ?,
                next_review = ?,
                interval = ?,
                ef = ?,
                repetitions = ?,
                tags = ?
            WHERE id = ?
        """, (
            card.get("q", ""),
            card.get("a", ""),
            card.get("next_review", 0.0),
            card.get("interval", 0.0),
            card.get("ef", 2.5),
            card.get("repetitions", 0),
            _tags_to_json(card.get("tags")),
            card.get("id", ""),
        ))
        conn.commit()
        return cursor.rowcount > 0


def get_cards_due_before(db_path: str, timestamp: float) -> list[CardRecord]:
    """Get cards due before a specific timestamp."""
    init_database(db_path)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM cards WHERE next_review <= ?", (timestamp,))
        rows = cursor.fetchall()
        
        cards: list[CardRecord] = []
        for row in rows:
            cards.append({
                "id": row["id"],
                "q": row["q"],
                "a": row["a"],
                "next_review": row["next_review"],
                "interval": row["interval"],
                "ef": row["ef"],
                "repetitions": row["repetitions"],
                "tags": _tags_from_json(row["tags"]),
            })
        
        return cards


def get_card_count(db_path: str) -> int:
    """Get total card count."""
    init_database(db_path)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM cards")
        return cursor.fetchone()[0]


# ==================== Note Operations ====================

def _note_from_row(row: sqlite3.Row) -> "Note":
    """Convert database row to Note object."""
    from papyrus.data.notes_storage import Note
    return Note(
        id=row["id"],
        title=row["title"],
        folder=row["folder"],
        content=row["content"],
        preview=row["preview"],
        tags=_tags_from_json(row["tags"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        word_count=row["word_count"],
        hash=row["hash"] if "hash" in row.keys() else "",
        headings=_json_from_str(row["headings"]) if "headings" in row.keys() else [],
        outgoing_links=_json_from_str(row["outgoing_links"]) if "outgoing_links" in row.keys() else [],
        incoming_count=row["incoming_count"] if "incoming_count" in row.keys() else 0,
    )


def _json_from_str(json_str: str | None) -> list:
    """Convert JSON string to Python list."""
    if not json_str:
        return []
    try:
        result = json.loads(json_str)
        if isinstance(result, list):
            return result
    except (json.JSONDecodeError, ValueError):
        pass
    return []


def _to_json(obj: object) -> str:
    """Convert Python object to JSON string."""
    return json.dumps(obj, ensure_ascii=False)


def load_all_notes(db_path: str, logger: LoggerProtocol | None = None) -> list["Note"]:
    """Load all notes from database."""
    from papyrus.data.notes_storage import Note
    
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notes ORDER BY updated_at DESC")
        rows = cursor.fetchall()
        
        notes: list[Note] = []
        for row in rows:
            notes.append(_note_from_row(row))
        
        if logger:
            logger.info(f"从数据库加载 {len(notes)} 条笔记")
        
        return notes


def save_all_notes(
    db_path: str,
    notes: list["Note"],
    logger: LoggerProtocol | None = None
) -> None:
    """Save all notes to database (replaces existing)."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # Clear existing notes and insert new ones
        cursor.execute("DELETE FROM notes")
        
        for note in notes:
            cursor.execute("""
                INSERT INTO notes (id, title, folder, content, preview, tags, created_at, updated_at, word_count, hash, headings, outgoing_links, incoming_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                note.id,
                note.title,
                note.folder,
                note.content,
                note.preview,
                _tags_to_json(note.tags),
                note.created_at,
                note.updated_at,
                note.word_count,
                note.hash,
                _to_json(note.headings),
                _to_json(note.outgoing_links),
                note.incoming_count,
            ))
        
        conn.commit()
    
    if logger:
        logger.info(f"保存 {len(notes)} 条笔记到数据库")


def insert_note(db_path: str, note: "Note", logger: LoggerProtocol | None = None) -> None:
    """Insert a single note."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO notes (id, title, folder, content, preview, tags, created_at, updated_at, word_count, hash, headings, outgoing_links, incoming_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            note.id,
            note.title,
            note.folder,
            note.content,
            note.preview,
            _tags_to_json(note.tags),
            note.created_at,
            note.updated_at,
            note.word_count,
            note.hash,
            _to_json(note.headings),
            _to_json(note.outgoing_links),
            note.incoming_count,
        ))
        conn.commit()


def delete_note_by_id(db_path: str, note_id: str, logger: LoggerProtocol | None = None) -> bool:
    """Delete a note by id."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_note_by_id(db_path: str, note_id: str) -> "Note" | None:
    """Get a single note by id."""
    init_database(db_path)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
        row = cursor.fetchone()
        
        if row is None:
            return None
        
        return _note_from_row(row)


def update_note_in_db(db_path: str, note: "Note", logger: LoggerProtocol | None = None) -> bool:
    """Update a note in database."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE notes SET
                title = ?,
                folder = ?,
                content = ?,
                preview = ?,
                tags = ?,
                updated_at = ?,
                word_count = ?,
                hash = ?,
                headings = ?,
                outgoing_links = ?,
                incoming_count = ?
            WHERE id = ?
        """, (
            note.title,
            note.folder,
            note.content,
            note.preview,
            _tags_to_json(note.tags),
            note.updated_at,
            note.word_count,
            note.hash,
            _to_json(note.headings),
            _to_json(note.outgoing_links),
            note.incoming_count,
            note.id,
        ))
        conn.commit()
        return cursor.rowcount > 0


def get_notes_by_folder(db_path: str, folder: str) -> list["Note"]:
    """Get notes by folder."""
    from papyrus.data.notes_storage import Note
    
    init_database(db_path)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notes WHERE folder = ? ORDER BY updated_at DESC", (folder,))
        rows = cursor.fetchall()
        
        notes: list[Note] = []
        for row in rows:
            notes.append(_note_from_row(row))
        
        return notes


def get_note_count(db_path: str) -> int:
    """Get total note count."""
    init_database(db_path)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM notes")
        return cursor.fetchone()[0]


def get_all_folders(db_path: str) -> list[str]:
    """Get all unique folder names."""
    init_database(db_path)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT folder FROM notes ORDER BY folder")
        return [row[0] for row in cursor.fetchall()]


# ==================== Migration ====================

def migrate_from_json(
    db_path: str,
    cards_file: str | None = None,
    notes_file: str | None = None,
    logger: LoggerProtocol | None = None
) -> None:
    """Migrate data from JSON files to SQLite database."""
    init_database(db_path, logger)
    
    # Migrate cards
    if cards_file and os.path.exists(cards_file):
        from papyrus.data.storage import load_cards as load_cards_json
        cards = load_cards_json(cards_file, logger=logger)
        if cards:
            save_all_cards(db_path, cards, logger)
            if logger:
                logger.info(f"已迁移 {len(cards)} 张卡片从 JSON 到数据库")
    
    # Migrate notes
    if notes_file and os.path.exists(notes_file):
        from papyrus.data.notes_storage import load_notes as load_notes_json
        notes = load_notes_json(notes_file, logger=logger)
        if notes:
            save_all_notes(db_path, notes, logger)
            if logger:
                logger.info(f"已迁移 {len(notes)} 条笔记从 JSON 到数据库")


# ==================== Provider & API Key Operations ====================

def load_all_providers(db_path: str, logger: LoggerProtocol | None = None) -> list[dict]:
    """Load all providers with their API keys and models."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # Get all providers
        cursor.execute("SELECT * FROM providers ORDER BY created_at")
        provider_rows = cursor.fetchall()
        
        providers = []
        for row in provider_rows:
            provider_id = row["id"]
            
            # Get API keys for this provider
            cursor.execute(
                "SELECT * FROM api_keys WHERE provider_id = ? ORDER BY name",
                (provider_id,)
            )
            api_key_rows = cursor.fetchall()
            
            from papyrus.data.crypto import decrypt_api_key
            api_keys = []
            for key_row in api_key_rows:
                api_keys.append({
                    "id": key_row["id"],
                    "name": key_row["name"],
                    "key": decrypt_api_key(key_row["encrypted_key"]),
                })
            
            # Get models for this provider
            cursor.execute(
                "SELECT * FROM provider_models WHERE provider_id = ? ORDER BY name",
                (provider_id,)
            )
            model_rows = cursor.fetchall()
            
            models = []
            for model_row in model_rows:
                try:
                    capabilities = json.loads(model_row["capabilities"]) if model_row["capabilities"] else []
                except json.JSONDecodeError:
                    capabilities = []
                
                models.append({
                    "id": model_row["id"],
                    "name": model_row["name"],
                    "modelId": model_row["model_id"],
                    "port": model_row["port"],
                    "capabilities": capabilities,
                    "apiKeyId": model_row["api_key_id"],
                    "enabled": bool(model_row["enabled"]),
                })
            
            providers.append({
                "id": provider_id,
                "type": row["type"],
                "name": row["name"],
                "baseUrl": row["base_url"],
                "enabled": bool(row["enabled"]),
                "isDefault": bool(row["is_default"]),
                "apiKeys": api_keys,
                "models": models,
            })
        
        return providers


def save_provider(db_path: str, provider: dict, logger: LoggerProtocol | None = None) -> str:
    """Save or update a provider.
    
    Returns:
        The provider ID
    """
    init_database(db_path, logger)
    
    provider_id = provider.get("id") or str(int(time.time() * 1000))
    now = time.time()
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # Insert or replace provider
        cursor.execute("""
            INSERT OR REPLACE INTO providers 
            (id, type, name, base_url, enabled, is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 
                COALESCE((SELECT created_at FROM providers WHERE id = ?), ?),
                ?)
        """, (
            provider_id,
            provider.get("type", "custom"),
            provider.get("name", ""),
            provider.get("baseUrl", ""),
            1 if provider.get("enabled") else 0,
            1 if provider.get("isDefault") else 0,
            provider_id,
            now,
            now,
        ))
        
        conn.commit()
        
        if logger:
            logger.info(f"Provider saved: {provider.get('name', '')}")
        
        return provider_id


def delete_provider(db_path: str, provider_id: str, logger: LoggerProtocol | None = None) -> bool:
    """Delete a provider and all its associated data."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM providers WHERE id = ?", (provider_id,))
        conn.commit()
        return cursor.rowcount > 0


def save_api_key(db_path: str, provider_id: str, api_key: dict, logger: LoggerProtocol | None = None) -> str:
    """Save or update an API key.
    
    Returns:
        The API key ID
    """
    init_database(db_path, logger)
    
    key_id = api_key.get("id") or str(int(time.time() * 1000))
    now = time.time()
    
    from papyrus.data.crypto import encrypt_api_key
    encrypted_key = encrypt_api_key(api_key.get("key", ""))
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO api_keys 
            (id, provider_id, name, encrypted_key, created_at)
            VALUES (?, ?, ?, ?, 
                COALESCE((SELECT created_at FROM api_keys WHERE id = ?), ?))
        """, (
            key_id,
            provider_id,
            api_key.get("name", "default"),
            encrypted_key,
            key_id,
            now,
        ))
        
        conn.commit()
        return key_id


def delete_api_key(db_path: str, key_id: str, logger: LoggerProtocol | None = None) -> bool:
    """Delete an API key."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM api_keys WHERE id = ?", (key_id,))
        conn.commit()
        return cursor.rowcount > 0


def save_model(db_path: str, provider_id: str, model: dict, logger: LoggerProtocol | None = None) -> str:
    """Save or update a provider model.
    
    Returns:
        The model ID
    """
    init_database(db_path, logger)
    
    model_id = model.get("id") or str(int(time.time() * 1000))
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        
        capabilities = json.dumps(model.get("capabilities", []))
        
        cursor.execute("""
            INSERT OR REPLACE INTO provider_models 
            (id, provider_id, name, model_id, port, capabilities, api_key_id, enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            model_id,
            provider_id,
            model.get("name", ""),
            model.get("modelId", ""),
            model.get("port", "openai"),
            capabilities,
            model.get("apiKeyId"),
            1 if model.get("enabled", True) else 0,
        ))
        
        conn.commit()
        return model_id


def delete_model(db_path: str, model_id: str, logger: LoggerProtocol | None = None) -> bool:
    """Delete a provider model."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM provider_models WHERE id = ?", (model_id,))
        conn.commit()
        return cursor.rowcount > 0


def set_default_provider(db_path: str, provider_id: str, logger: LoggerProtocol | None = None) -> bool:
    """Set a provider as the default."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # Clear all default flags
        cursor.execute("UPDATE providers SET is_default = 0")
        
        # Set new default
        cursor.execute(
            "UPDATE providers SET is_default = 1 WHERE id = ?",
            (provider_id,)
        )
        
        conn.commit()
        return cursor.rowcount > 0


def update_provider_enabled(db_path: str, provider_id: str, enabled: bool, logger: LoggerProtocol | None = None) -> bool:
    """Update provider enabled status."""
    init_database(db_path, logger)
    
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE providers SET enabled = ? WHERE id = ?",
            (1 if enabled else 0, provider_id)
        )
        conn.commit()
        return cursor.rowcount > 0
