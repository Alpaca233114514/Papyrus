"""MCP Vault 工具 - 双层架构实现

第一层：vault_index - 返回"地图"（元数据+大纲+链接关系，不含正文）
第二层：vault_read - 返回"内容"（按需加载：摘要/全文/段落）
应急层：vault_emergency_sample - 数据库损坏时直接扫文件
"""

from __future__ import annotations

import hashlib
import json
import os
import random
import re
import sqlite3
import time
from dataclasses import dataclass

from typing import Protocol, TypedDict, cast


class LoggerProtocol(Protocol):
    def info(self, message: str) -> None: ...
    def warning(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...


class HeadingInfo(TypedDict):
    level: int
    text: str
    anchor: str


class NoteIndex(TypedDict):
    """笔记骨架索引 - vault_index返回的结构"""
    id: str
    title: str
    hash: str
    tags: list[str]
    headings: list[HeadingInfo]
    outgoing_links: list[str]
    incoming_count: int
    word_count: int
    modified_time: int


class NoteContent(TypedDict):
    """笔记内容 - vault_read返回的结构"""
    id: str
    title: str
    format: str
    content: str
    summary: str
    links_preview: list[dict[str, str]]


class ChangeInfo(TypedDict):
    """变更信息"""
    id: str
    new_hash: str
    modified_time: int


class WatchResult(TypedDict):
    """vault_watch返回的结构"""
    changed: list[ChangeInfo]
    deleted: list[str]
    server_time: int


class VaultIndexResult(TypedDict):
    """vault_index返回结果"""
    success: bool
    notes: list[NoteIndex]
    total: int
    cursor: str | None
    error: str | None


class VaultReadResult(TypedDict):
    """vault_read返回结果"""
    success: bool
    notes: list[NoteContent]
    error: str | None


class VaultWatchResult(TypedDict):
    """vault_watch返回结果"""
    success: bool
    data: WatchResult | None
    error: str | None


class VaultEmergencyResult(TypedDict):
    """vault_emergency_sample返回结果"""
    success: bool
    emergency_mode: bool
    notes: list[dict[str, object]]
    warning: str
    error: str | None


@dataclass
class VaultConfig:
    """Vault配置"""
    db_path: str
    notes_dir: str | None = None  # Markdown文件目录（应急模式使用）
    logger: LoggerProtocol | None = None


def _compute_hash(content: str) -> str:
    """计算内容MD5前8位"""
    return hashlib.md5(content.encode("utf-8")).hexdigest()[:8]


def _extract_headings(content: str) -> list[HeadingInfo]:
    """提取H1-H3标题"""
    headings: list[HeadingInfo] = []
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


def _extract_block(content: str, block_ref: str) -> str:
    """提取特定块内容（Heading或block-id）"""
    lines = content.split("\n")
    
    # 如果是 ^block-id 格式
    if block_ref.startswith("^"):
        block_id = block_ref[1:]
        for i, line in enumerate(lines):
            if f"^{block_id}" in line or line.endswith(f" ^{block_id}"):
                # 找到块，返回到下一个空行或同级/上级标题
                result = [line.replace(f" ^{block_id}", "").replace(f"^{block_id}", "")]
                for j in range(i + 1, len(lines)):
                    next_line = lines[j]
                    if next_line.startswith("#") or not next_line.strip():
                        break
                    result.append(next_line)
                return "\n".join(result).strip()
        return ""
    
    # 如果是 Heading 格式
    heading_pattern = re.escape(block_ref)
    for i, line in enumerate(lines):
        # 匹配 ## Heading 或 ## Heading {#anchor}
        if re.match(rf"^#{{1,6}}\s+{heading_pattern}(\s+{{.*?}})?\s*$", line, re.IGNORECASE):
            result = [line]
            current_level = len(line) - len(line.lstrip("#"))
            for j in range(i + 1, len(lines)):
                next_line = lines[j]
                # 遇到同级或更高级标题停止
                if next_line.startswith("#"):
                    next_level = len(next_line) - len(next_line.lstrip("#"))
                    if next_level <= current_level:
                        break
                result.append(next_line)
            return "\n".join(result).strip()
    
    return ""


def _get_summary(content: str, max_length: int = 300) -> str:
    """生成内容摘要"""
    # 移除markdown标记
    text = re.sub(r"[#*`\_\[\]\(\)\{\}]", "", content)
    text = re.sub(r"\!\[.*?\]\(.*?\)", "[图片]", text)
    text = re.sub(r"\[\[([^\]|]+)(?:\|[^\]]*)?\]\]", r"\1", text)
    text = text.strip()
    if len(text) <= max_length:
        return text
    return text[:max_length] + "..."


class VaultTools:
    """Vault双层架构工具集"""

    def __init__(self, config: VaultConfig) -> None:
        self.config = config
        self._db_available = True

    def _log(self, message: str, level: str = "info") -> None:
        """安全地记录日志"""
        if self.config.logger:
            if level == "error":
                self.config.logger.error(message)
            elif level == "warning":
                self.config.logger.warning(message)
            else:
                self.config.logger.info(message)

    def _get_connection(self) -> sqlite3.Connection | None:
        """获取数据库连接"""
        try:
            conn = sqlite3.connect(self.config.db_path, timeout=5.0)
            conn.row_factory = sqlite3.Row
            return conn
        except sqlite3.Error as e:
            self._log(f"数据库连接失败: {e}", "error")
            self._db_available = False
            return None

    def _ensure_schema(self, conn: sqlite3.Connection) -> bool:
        """确保数据库schema是最新的"""
        try:
            cursor = conn.cursor()
            # 检查新字段是否存在
            cursor.execute("PRAGMA table_info(notes)")
            columns = {row["name"] for row in cursor.fetchall()}
            
            required = {"hash", "headings", "outgoing_links", "incoming_count"}
            missing = required - columns
            
            if missing:
                self._log(f"数据库缺少字段: {missing}, 需要迁移", "warning")
                # 添加缺失的列
                for col in missing:
                    if col == "incoming_count":
                        cursor.execute(f"ALTER TABLE notes ADD COLUMN {col} INTEGER DEFAULT 0")
                    else:
                        cursor.execute(f"ALTER TABLE notes ADD COLUMN {col} TEXT DEFAULT ''")
                conn.commit()
                self._log("数据库schema已更新")
            return True
        except sqlite3.Error as e:
            self._log(f"Schema检查失败: {e}", "error")
            return False

    def _recompute_links(self, conn: sqlite3.Connection) -> None:
        """重新计算所有笔记的入链计数"""
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id, content FROM notes")
            rows = cursor.fetchall()
            
            # 构建链接映射
            outgoing_map: dict[str, list[str]] = {}
            all_ids = set()
            
            for row in rows:
                note_id = row["id"]
                all_ids.add(note_id)
                content = row["content"] or ""
                links = _extract_outgoing_links(content)
                outgoing_map[note_id] = links
            
            # 计算入链数
            incoming_count: dict[str, int] = {note_id: 0 for note_id in all_ids}
            for note_id, links in outgoing_map.items():
                for link in links:
                    if link in incoming_count:
                        incoming_count[link] += 1
            
            # 更新数据库
            for note_id, count in incoming_count.items():
                cursor.execute(
                    "UPDATE notes SET incoming_count = ? WHERE id = ?",
                    (count, note_id)
                )
            
            # 同时更新出链
            for note_id, links in outgoing_map.items():
                cursor.execute(
                    "UPDATE notes SET outgoing_links = ? WHERE id = ?",
                    (json.dumps(links, ensure_ascii=False), note_id)
                )
            
            conn.commit()
            self._log(f"已重新计算 {len(incoming_count)} 条笔记的链接关系")
        except sqlite3.Error as e:
            self._log(f"链接计算失败: {e}", "error")

    def update_note_metadata(self, note_id: str, content: str) -> dict[str, object]:
        """更新笔记的元数据（hash, headings, outgoing_links）"""
        return {
            "hash": _compute_hash(content),
            "headings": _extract_headings(content),
            "outgoing_links": _extract_outgoing_links(content),
        }

    def vault_index(
        self,
        filter_tags: list[str] | None = None,
        query: str | None = None,
        limit: int = 50,
        cursor: str | None = None,
    ) -> VaultIndexResult:
        """
        第一层：获取Vault骨架索引
        
        返回笔记的元数据、大纲和链接关系，不含正文
        """
        conn = self._get_connection()
        if not conn:
            return {
                "success": False,
                "notes": [],
                "total": 0,
                "cursor": None,
                "error": "数据库连接失败",
            }
        
        try:
            self._ensure_schema(conn)
            
            db_cursor = conn.cursor()
            
            # 构建查询
            where_clauses = []
            params = []
            
            if filter_tags:
                # 标签过滤 - 使用JSON包含查询
                tag_conditions = []
                for tag in filter_tags:
                    tag_conditions.append("tags LIKE ?")
                    params.append(f'%"{tag}"%')
                if tag_conditions:
                    where_clauses.append("(" + " OR ".join(tag_conditions) + ")")
            
            if query:
                # 标题模糊搜索
                where_clauses.append("(title LIKE ? OR id LIKE ?)")
                params.extend([f"%{query}%", f"%{query}%"])
            
            # 分页游标（基于modified_time）
            if cursor:
                try:
                    cursor_time = int(cursor)
                    where_clauses.append("updated_at < ?")
                    params.append(cursor_time)
                except ValueError:
                    pass
            
            where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            # 限制数量
            params.append(limit)
            
            sql = f"""
                SELECT id, title, hash, tags, headings, outgoing_links, 
                incoming_count, word_count, updated_at
                FROM notes
                {where_sql}
                ORDER BY updated_at DESC
                LIMIT ?
            """
            
            db_cursor.execute(sql, params)
            rows = db_cursor.fetchall()
            
            notes: list[NoteIndex] = []
            for row in rows:
                try:
                    tags = json.loads(row["tags"]) if row["tags"] else []
                    headings = json.loads(row["headings"]) if row["headings"] else []
                    outgoing = json.loads(row["outgoing_links"]) if row["outgoing_links"] else []
                except json.JSONDecodeError:
                    tags, headings, outgoing = [], [], []
                
                notes.append({
                    "id": row["id"],
                    "title": row["title"] or row["id"],
                    "hash": row["hash"] or "",
                    "tags": tags,
                    "headings": headings,
                    "outgoing_links": outgoing,
                    "incoming_count": row["incoming_count"] or 0,
                    "word_count": row["word_count"] or 0,
                    "modified_time": int(row["updated_at"] or 0),
                })
            
            # 生成下一页游标
            next_cursor = None
            if notes and len(rows) == limit:
                next_cursor = str(notes[-1]["modified_time"])
            
            # 获取总数
            count_sql = f"SELECT COUNT(*) FROM notes {where_sql.replace('LIMIT ?', '')}"
            db_cursor.execute(count_sql, params[:-1] if params else [])
            total = db_cursor.fetchone()[0]
            
            conn.close()
            
            return {
                "success": True,
                "notes": notes,
                "total": total,
                "cursor": next_cursor,
                "error": None,
            }
            
        except sqlite3.Error as e:
            conn.close()
            self._log(f"vault_index错误: {e}", "error")
            return {
                "success": False,
                "notes": [],
                "total": 0,
                "cursor": None,
                "error": f"数据库错误: {e}",
            }

    def vault_read(
        self,
        ids: list[str],
        format: str = "summary",
        block_ref: str | None = None,
        include_links: bool = False,
    ) -> VaultReadResult:
        """
        第二层：读取笔记正文
        
        format: "summary" | "full" | "block"
        """
        if not ids:
            return {"success": False, "notes": [], "error": "未指定笔记ID"}
        
        if len(ids) > 3:
            return {"success": False, "notes": [], "error": "单次最多读取3篇笔记"}
        
        conn = self._get_connection()
        if not conn:
            return {"success": False, "notes": [], "error": "数据库连接失败"}
        
        try:
            db_cursor = conn.cursor()
            
            # 批量查询
            placeholders = ",".join(["?"] * len(ids))
            db_cursor.execute(f"""
                SELECT id, title, content, outgoing_links, updated_at
                FROM notes WHERE id IN ({placeholders})
            """, ids)
            
            rows = {row["id"]: row for row in db_cursor.fetchall()}
            
            notes: list[NoteContent] = []
            
            for note_id in ids:
                if note_id not in rows:
                    continue
                
                row = rows[note_id]
                content = row["content"] or ""
                
                # 根据format处理内容
                if format == "block" and block_ref:
                    display_content = _extract_block(content, block_ref)
                elif format == "summary":
                    display_content = _get_summary(content)
                else:  # full
                    display_content = content
                
                # 获取链接预览
                links_preview = []
                if include_links:
                    try:
                        outgoing = json.loads(row["outgoing_links"]) if row["outgoing_links"] else []
                    except json.JSONDecodeError:
                        outgoing = []
                    
                    # 查询链接笔记的摘要
                    if outgoing:
                        link_placeholders = ",".join(["?"] * len(outgoing))
                        db_cursor.execute(f"""
                            SELECT id, title, preview FROM notes 
                            WHERE id IN ({link_placeholders})
                        """, outgoing)
                        link_rows = {r["id"]: r for r in db_cursor.fetchall()}
                        
                        for link_id in outgoing[:5]:  # 最多5个链接预览
                            if link_id in link_rows:
                                links_preview.append({
                                    "id": link_id,
                                    "title": link_rows[link_id]["title"] or link_id,
                                    "preview": link_rows[link_id]["preview"] or "",
                                })
                
                notes.append({
                    "id": note_id,
                    "title": row["title"] or note_id,
                    "format": format,
                    "content": display_content,
                    "summary": _get_summary(content),
                    "links_preview": links_preview,
                })
            
            conn.close()
            
            return {
                "success": True,
                "notes": notes,
                "error": None,
            }
            
        except sqlite3.Error as e:
            conn.close()
            self._log(f"vault_read错误: {e}", "error")
            return {
                "success": False,
                "notes": [],
                "error": f"数据库错误: {e}",
            }

    def vault_watch(self, since: int) -> VaultWatchResult:
        """
        增量同步：返回自since时间戳以来的变更
        """
        conn = self._get_connection()
        if not conn:
            return {
                "success": False,
                "data": None,
                "error": "数据库连接失败",
            }
        
        try:
            db_cursor = conn.cursor()
            
            # 获取变更的笔记
            db_cursor.execute("""
                SELECT id, hash, updated_at FROM notes
                WHERE updated_at > ?
                ORDER BY updated_at DESC
            """, (since,))
            
            changed: list[ChangeInfo] = [
                {
                    "id": row["id"],
                    "new_hash": row["hash"] or "",
                    "modified_time": int(row["updated_at"] or 0),
                }
                for row in db_cursor.fetchall()
            ]
            
            conn.close()
            
            watch_result: WatchResult = {
                "changed": changed,
                "deleted": [],  # 需要客户端比对
                "server_time": int(time.time()),
            }
            return {
                "success": True,
                "data": watch_result,
                "error": None,
            }
            
        except sqlite3.Error as e:
            conn.close()
            self._log(f"vault_watch错误: {e}", "error")
            return {
                "success": False,
                "data": None,
                "error": f"数据库错误: {e}",
            }

    def vault_emergency_sample(
        self,
        sample_size: int = 5,
        content_limit: int = 500,
    ) -> VaultEmergencyResult:
        """
        应急层：数据库失效时直接扫描文件系统
        """
        sample_size = min(sample_size, 20)  # 硬上限20
        
        # 尝试从数据库目录找markdown文件
        notes_dirs = []
        if self.config.notes_dir and os.path.isdir(self.config.notes_dir):
            notes_dirs.append(self.config.notes_dir)
        
        # 尝试默认数据目录
        data_dir = os.path.dirname(self.config.db_path)
        vault_dir = os.path.join(data_dir, "vault")
        if os.path.isdir(vault_dir):
            notes_dirs.append(vault_dir)
        
        md_files = []
        for directory in notes_dirs:
            for root, _, files in os.walk(directory):
                for filename in files:
                    if filename.endswith(".md"):
                        md_files.append(os.path.join(root, filename))
        
        if not md_files:
            return {
                "success": False,
                "emergency_mode": True,
                "notes": [],
                "warning": "未找到任何Markdown文件",
                "error": "应急模式：无可用笔记源",
            }
        
        # 随机采样
        sample = random.sample(md_files, min(sample_size, len(md_files)))
        
        notes = []
        for filepath in sample:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # 提取标题（第一行#开头）
                title = os.path.basename(filepath)[:-3]  # 移除.md
                for line in content.split("\n")[:5]:
                    if line.startswith("# "):
                        title = line[2:].strip()
                        break
                
                # 截取内容
                display_content = content[:content_limit]
                if len(content) > content_limit:
                    display_content += "..."
                
                notes.append({
                    "id": os.path.basename(filepath)[:-3],
                    "title": title,
                    "preview": display_content,
                    "path": filepath,
                })
            except Exception as e:
                self._log(f"读取文件失败 {filepath}: {e}", "error")
        
        return {
            "success": True,
            "emergency_mode": True,
            "notes": notes,
            "warning": "当前为应急模式，建议检查数据库连接",
            "error": None,
        }

    def execute_tool(self, tool_name: str, params: dict[str, object]) -> dict[str, object]:
        """统一工具执行入口"""
        self._log(f"执行工具: {tool_name}, 参数: {params}")
        
        try:
            if tool_name == "vault_index":
                return cast(dict[str, object], self.vault_index(
                    filter_tags=cast(list[str] | None, params.get("filter_tags")),
                    query=cast(str | None, params.get("query")),
                    limit=cast(int, params.get("limit", 50)),
                    cursor=cast(str | None, params.get("cursor")),
                ))
            elif tool_name == "vault_read":
                return cast(dict[str, object], self.vault_read(
                    ids=cast(list[str], params.get("ids", [])),
                    format=cast(str, params.get("format", "summary")),
                    block_ref=cast(str | None, params.get("block_ref")),
                    include_links=cast(bool, params.get("include_links", False)),
                ))
            elif tool_name == "vault_watch":
                return cast(dict[str, object], self.vault_watch(
                    since=cast(int, params.get("since", 0)),
                ))
            elif tool_name == "vault_emergency_sample":
                return cast(dict[str, object], self.vault_emergency_sample(
                    sample_size=cast(int, params.get("sample_size", 5)),
                    content_limit=cast(int, params.get("content_limit", 500)),
                ))
            else:
                return {"success": False, "error": f"未知工具: {tool_name}"}
        except Exception as e:
            self._log(f"工具执行异常: {e}", "error")
            return {"success": False, "error": f"执行异常: {e}"}


def create_vault_tools(db_path: str, logger: LoggerProtocol | None = None) -> VaultTools:
    """工厂函数：创建VaultTools实例"""
    config = VaultConfig(db_path=db_path, logger=logger)
    return VaultTools(config)
