"""笔记关联功能的数据库模型和存储层.

设计思路:
1. 使用单独的 note_relations 表存储笔记之间的关联关系
2. 支持双向关联 - 关联是可编辑的,可以添加描述
3. 关联类型: reference(引用), related(相关), child(子主题), parent(父主题)
4. 同时维护 outgoing_links (从内容解析的[[链接]])和 relations (手动添加的关联)
"""

from __future__ import annotations

import json
import sqlite3
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol


class LoggerProtocol(Protocol):
    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...
    def warning(self, message: str) -> None: ...


class RelationType(str, Enum):
    """关联类型枚举."""
    REFERENCE = "reference"      # 引用 - 当前笔记引用目标笔记
    RELATED = "related"          # 相关 - 两者相关但不分方向
    CHILD = "child"              # 子主题 - 当前笔记是目标的子主题
    PARENT = "parent"            # 父主题 - 当前笔记是目标的父主题
    SEQUENCE = "sequence"        # 顺序 - 当前笔记在目标之后
    PARALLEL = "parallel"        # 并行 - 两者并行


@dataclass
class NoteRelation:
    """笔记关联数据模型."""
    id: str                      # 关联ID (uuid)
    source_id: str               # 源笔记ID
    target_id: str               # 目标笔记ID
    relation_type: RelationType  # 关联类型
    description: str = ""        # 关联描述/备注
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "relation_type": self.relation_type.value,
            "description": self.description,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@dataclass
class RelatedNote:
    """关联笔记的展示模型(包含笔记基本信息+关联信息)."""
    note_id: str
    title: str
    folder: str
    preview: str
    relation_id: str
    relation_type: str
    description: str
    is_outgoing: bool  # True=当前笔记指向它, False=它指向当前笔记
    created_at: float


def init_relations_table(db_path: str, logger: LoggerProtocol | None = None) -> None:
    """初始化关联表."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # 笔记关联表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS note_relations (
                id TEXT PRIMARY KEY,
                source_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                relation_type TEXT NOT NULL DEFAULT 'reference',
                description TEXT DEFAULT '',
                created_at REAL DEFAULT 0.0,
                updated_at REAL DEFAULT 0.0,
                UNIQUE(source_id, target_id, relation_type)
            )
        """)
        
        # 索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_relations_source 
            ON note_relations(source_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_relations_target 
            ON note_relations(target_id)
        """)
        
        conn.commit()
    
    if logger:
        logger.info("关联表初始化完成")


def create_relation(
    db_path: str,
    source_id: str,
    target_id: str,
    relation_type: RelationType = RelationType.REFERENCE,
    description: str = "",
    relation_id: str | None = None,
    logger: LoggerProtocol | None = None,
) -> NoteRelation | None:
    """创建笔记关联.
    
    如果关联已存在,返回None.
    """
    init_relations_table(db_path, logger)
    
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            
            now = time.time()
            rel_id = relation_id or str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO note_relations 
                (id, source_id, target_id, relation_type, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                rel_id, source_id, target_id, 
                relation_type.value, description, now, now
            ))
            conn.commit()
            
            return NoteRelation(
                id=rel_id,
                source_id=source_id,
                target_id=target_id,
                relation_type=relation_type,
                description=description,
                created_at=now,
                updated_at=now,
            )
    except sqlite3.IntegrityError:
        # 关联已存在
        return None


def delete_relation(
    db_path: str, 
    relation_id: str,
    logger: LoggerProtocol | None = None,
) -> bool:
    """删除关联."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM note_relations WHERE id = ?", (relation_id,))
        conn.commit()
        return cursor.rowcount > 0


def update_relation(
    db_path: str,
    relation_id: str,
    relation_type: RelationType | None = None,
    description: str | None = None,
    logger: LoggerProtocol | None = None,
) -> NoteRelation | None:
    """更新关联."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # 获取现有记录
        cursor.execute(
            "SELECT * FROM note_relations WHERE id = ?", 
            (relation_id,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        
        # 更新字段
        updates = ["updated_at = ?"]
        params = [time.time()]
        
        if relation_type is not None:
            updates.append("relation_type = ?")
            params.append(relation_type.value)
        if description is not None:
            updates.append("description = ?")
            params.append(description)
        
        params.append(relation_id)
        
        cursor.execute(f"""
            UPDATE note_relations 
            SET {', '.join(updates)}
            WHERE id = ?
        """, params)
        conn.commit()
        
        # 返回更新后的记录
        cursor.execute(
            "SELECT * FROM note_relations WHERE id = ?", 
            (relation_id,)
        )
        row = cursor.fetchone()
        
        return NoteRelation(
            id=row[0],
            source_id=row[1],
            target_id=row[2],
            relation_type=RelationType(row[3]),
            description=row[4],
            created_at=row[5],
            updated_at=row[6],
        )


def get_note_relations(
    db_path: str,
    note_id: str,
    logger: LoggerProtocol | None = None,
) -> tuple[list[RelatedNote], list[RelatedNote]]:
    """获取笔记的出链和入链.
    
    Returns:
        (outgoing_list, incoming_list)
        outgoing_list: 当前笔记指向的其他笔记
        incoming_list: 指向当前笔记的其他笔记
    """
    init_relations_table(db_path, logger)
    
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 出链: source_id = note_id
        cursor.execute("""
            SELECT 
                r.id as relation_id,
                r.target_id as note_id,
                r.relation_type,
                r.description,
                r.created_at,
                n.title,
                n.folder,
                n.preview
            FROM note_relations r
            JOIN notes n ON r.target_id = n.id
            WHERE r.source_id = ?
            ORDER BY r.created_at DESC
        """, (note_id,))
        
        outgoing = [
            RelatedNote(
                note_id=row["note_id"],
                title=row["title"],
                folder=row["folder"],
                preview=row["preview"],
                relation_id=row["relation_id"],
                relation_type=row["relation_type"],
                description=row["description"],
                is_outgoing=True,
                created_at=row["created_at"],
            )
            for row in cursor.fetchall()
        ]
        
        # 入链: target_id = note_id
        cursor.execute("""
            SELECT 
                r.id as relation_id,
                r.source_id as note_id,
                r.relation_type,
                r.description,
                r.created_at,
                n.title,
                n.folder,
                n.preview
            FROM note_relations r
            JOIN notes n ON r.source_id = n.id
            WHERE r.target_id = ?
            ORDER BY r.created_at DESC
        """, (note_id,))
        
        incoming = [
            RelatedNote(
                note_id=row["note_id"],
                title=row["title"],
                folder=row["folder"],
                preview=row["preview"],
                relation_id=row["relation_id"],
                relation_type=row["relation_type"],
                description=row["description"],
                is_outgoing=False,
                created_at=row["created_at"],
            )
            for row in cursor.fetchall()
        ]
        
        return outgoing, incoming


def get_relation_graph(
    db_path: str,
    center_note_id: str,
    depth: int = 1,
    logger: LoggerProtocol | None = None,
) -> dict:
    """获取关联图谱数据.
    
    Args:
        center_note_id: 中心笔记ID
        depth: 关联深度 (1=直接关联, 2=关联的关联)
    
    Returns:
        {
            "nodes": [{"id": str, "title": str, "folder": str, "is_center": bool}],
            "links": [{"source": str, "target": str, "type": str}]
        }
    """
    init_relations_table(db_path, logger)
    
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        nodes = {}
        links = []
        visited = set()
        
        def fetch_neighbors(note_id: str, current_depth: int) -> None:
            if current_depth > depth or note_id in visited:
                return
            visited.add(note_id)
            
            # 获取笔记信息
            cursor.execute(
                "SELECT id, title, folder FROM notes WHERE id = ?", 
                (note_id,)
            )
            row = cursor.fetchone()
            if not row:
                return
            
            nodes[note_id] = {
                "id": note_id,
                "title": row["title"],
                "folder": row["folder"],
                "is_center": note_id == center_note_id,
            }
            
            if current_depth >= depth:
                return
            
            # 出链
            cursor.execute("""
                SELECT target_id, relation_type 
                FROM note_relations 
                WHERE source_id = ?
            """, (note_id,))
            for row in cursor.fetchall():
                target_id = row["target_id"]
                links.append({
                    "source": note_id,
                    "target": target_id,
                    "type": row["relation_type"],
                })
                fetch_neighbors(target_id, current_depth + 1)
            
            # 入链
            cursor.execute("""
                SELECT source_id, relation_type 
                FROM note_relations 
                WHERE target_id = ?
            """, (note_id,))
            for row in cursor.fetchall():
                source_id = row["source_id"]
                links.append({
                    "source": source_id,
                    "target": note_id,
                    "type": row["relation_type"],
                })
                fetch_neighbors(source_id, current_depth + 1)
        
        fetch_neighbors(center_note_id, 0)
        
        return {
            "nodes": list(nodes.values()),
            "links": links,
        }


def search_notes_for_relation(
    db_path: str,
    query: str,
    exclude_note_id: str | None = None,
    limit: int = 10,
) -> list[dict]:
    """搜索可关联的笔记.
    
    用于添加关联时的搜索选择.
    """
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        sql = """
            SELECT id, title, folder, preview 
            FROM notes 
            WHERE (title LIKE ? OR preview LIKE ?)
        """
        params = [f"%{query}%", f"%{query}%"]
        
        if exclude_note_id:
            sql += " AND id != ?"
            params.append(exclude_note_id)
        
        sql += " ORDER BY updated_at DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(sql, params)
        
        return [
            {
                "id": row["id"],
                "title": row["title"],
                "folder": row["folder"],
                "preview": row["preview"],
            }
            for row in cursor.fetchall()
        ]
