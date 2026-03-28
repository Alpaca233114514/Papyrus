"""测试MCP Vault工具"""

from __future__ import annotations

import json
import os
import sqlite3
import tempfile
import unittest

# 添加src到路径
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from mcp.vault_tools import (
    VaultTools,
    VaultConfig,
    _compute_hash,
    _extract_headings,
    _extract_outgoing_links,
    _extract_block,
    _get_summary,
)
from papyrus.data.database import init_database


class TestVaultTools(unittest.TestCase):
    """测试Vault工具集"""
    
    def setUp(self):
        """创建临时数据库"""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test.db")
        
        # 使用sqlite3直接创建数据库
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 创建notes表（包含新字段）
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
        conn.commit()
        conn.close()
        
        config = VaultConfig(db_path=self.db_path)
        self.vault = VaultTools(config)
        
        # 插入测试数据
        self._insert_test_notes()
    
    def tearDown(self):
        """清理临时文件"""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _insert_test_notes(self):
        """插入测试笔记"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        test_notes = [
            {
                "id": "note1",
                "title": "第一篇笔记",
                "content": "# 引言\n这是引言内容。\n\n## 方法\n使用方法说明。\n\n## 结论\n结论内容。\n\n链接到[[note2]]",
                "tags": json.dumps(["AI", "测试"]),
                "headings": json.dumps([
                    {"level": 1, "text": "引言", "anchor": "引言"},
                    {"level": 2, "text": "方法", "anchor": "方法"},
                    {"level": 2, "text": "结论", "anchor": "结论"},
                ]),
                "outgoing_links": json.dumps(["note2"]),
                "incoming_count": 1,
                "word_count": 20,
                "updated_at": 1712345678,
            },
            {
                "id": "note2",
                "title": "第二篇笔记",
                "content": "# 概述\n这是第二篇笔记。\n\n链接到[[note1]]和[[note3]]",
                "tags": json.dumps(["测试"]),
                "headings": json.dumps([
                    {"level": 1, "text": "概述", "anchor": "概述"},
                ]),
                "outgoing_links": json.dumps(["note1", "note3"]),
                "incoming_count": 1,
                "word_count": 15,
                "updated_at": 1712345600,
            },
            {
                "id": "note3",
                "title": "第三篇笔记",
                "content": "# 独立笔记\n这是独立的笔记，没有链接。",
                "tags": json.dumps(["其他"]),
                "headings": json.dumps([
                    {"level": 1, "text": "独立笔记", "anchor": "独立笔记"},
                ]),
                "outgoing_links": json.dumps([]),
                "incoming_count": 1,
                "word_count": 10,
                "updated_at": 1712345500,
            },
        ]
        
        for note in test_notes:
            note["hash"] = _compute_hash(note["content"])
            cursor.execute("""
                INSERT INTO notes (id, title, content, tags, headings, outgoing_links, 
                    incoming_count, word_count, updated_at, hash, folder, preview, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', 0)
            """, (
                note["id"], note["title"], note["content"], note["tags"],
                note["headings"], note["outgoing_links"], note["incoming_count"],
                note["word_count"], note["updated_at"], note["hash"]
            ))
        
        conn.commit()
        conn.close()
    
    def test_compute_hash(self):
        """测试hash计算"""
        content = "测试内容"
        hash1 = _compute_hash(content)
        hash2 = _compute_hash(content)
        self.assertEqual(hash1, hash2)
        self.assertEqual(len(hash1), 8)
    
    def test_extract_headings(self):
        """测试标题提取"""
        content = "# H1标题\n内容\n## H2标题\n更多内容\n### H3标题\n#### H4标题"
        headings = _extract_headings(content)
        self.assertEqual(len(headings), 3)  # 只提取H1-H3
        self.assertEqual(headings[0]["level"], 1)
        self.assertEqual(headings[0]["text"], "H1标题")
        self.assertEqual(headings[1]["level"], 2)
        self.assertEqual(headings[1]["text"], "H2标题")
    
    def test_extract_outgoing_links(self):
        """测试出链提取"""
        content = "链接到[[Note1]]和[[Note2|显示文本]]以及[[Note3#Heading]]"
        links = _extract_outgoing_links(content)
        self.assertEqual(len(links), 3)
        self.assertIn("Note1", links)
        self.assertIn("Note2", links)
        self.assertIn("Note3", links)  # #Heading后缀应该被移除
    
    def test_extract_block(self):
        """测试块提取"""
        content = "# 标题1\n内容1\n\n## 子标题\n子内容\n\n# 标题2\n内容2"
        block = _extract_block(content, "子标题")
        self.assertIn("## 子标题", block)
        self.assertIn("子内容", block)
        self.assertNotIn("标题2", block)
    
    def test_get_summary(self):
        """测试摘要生成"""
        content = "# 标题\n这是正文内容，" * 50
        summary = _get_summary(content, 50)
        self.assertLessEqual(len(summary), 53)  # 50 + "..."
        self.assertNotIn("#", summary)
    
    def test_vault_index_basic(self):
        """测试vault_index基本功能"""
        result = self.vault.vault_index()
        self.assertTrue(result["success"])
        self.assertEqual(result["total"], 3)
        self.assertEqual(len(result["notes"]), 3)
        
        # 验证返回的字段
        note = result["notes"][0]
        self.assertIn("id", note)
        self.assertIn("title", note)
        self.assertIn("hash", note)
        self.assertIn("tags", note)
        self.assertIn("headings", note)
        self.assertIn("outgoing_links", note)
        self.assertIn("incoming_count", note)
        self.assertIn("word_count", note)
        self.assertIn("modified_time", note)
        
        # 验证不含正文
        self.assertNotIn("content", note)
    
    def test_vault_index_filter_tags(self):
        """测试vault_index标签过滤"""
        result = self.vault.vault_index(filter_tags=["AI"])
        self.assertTrue(result["success"])
        self.assertEqual(result["total"], 1)
        self.assertEqual(result["notes"][0]["id"], "note1")
    
    def test_vault_index_query(self):
        """测试vault_index搜索"""
        result = self.vault.vault_index(query="第二篇")
        self.assertTrue(result["success"])
        self.assertEqual(result["total"], 1)
        self.assertEqual(result["notes"][0]["id"], "note2")
    
    def test_vault_index_limit(self):
        """测试vault_index限制数量"""
        result = self.vault.vault_index(limit=2)
        self.assertTrue(result["success"])
        self.assertEqual(len(result["notes"]), 2)
        self.assertIsNotNone(result["cursor"])  # 应该有下一页
    
    def test_vault_read_summary(self):
        """测试vault_read摘要模式"""
        result = self.vault.vault_read(ids=["note1"], format="summary")
        self.assertTrue(result["success"])
        self.assertEqual(len(result["notes"]), 1)
        
        note = result["notes"][0]
        self.assertEqual(note["format"], "summary")
        self.assertLess(len(note["content"]), len("# 引言\n这是引言内容。\n\n## 方法\n使用方法说明。\n\n## 结论\n结论内容。\n\n链接到[[note2]]"))
    
    def test_vault_read_full(self):
        """测试vault_read全文模式"""
        result = self.vault.vault_read(ids=["note1"], format="full")
        self.assertTrue(result["success"])
        
        note = result["notes"][0]
        self.assertEqual(note["format"], "full")
        self.assertIn("# 引言", note["content"])
    
    def test_vault_read_block(self):
        """测试vault_read块模式"""
        result = self.vault.vault_read(ids=["note1"], format="block", block_ref="方法")
        self.assertTrue(result["success"])
        
        note = result["notes"][0]
        self.assertEqual(note["format"], "block")
        self.assertIn("## 方法", note["content"])
        self.assertIn("使用方法说明", note["content"])
    
    def test_vault_read_multiple(self):
        """测试vault_read批量读取"""
        result = self.vault.vault_read(ids=["note1", "note2"])
        self.assertTrue(result["success"])
        self.assertEqual(len(result["notes"]), 2)
    
    def test_vault_read_too_many(self):
        """测试vault_read超过限制"""
        result = self.vault.vault_read(ids=["note1", "note2", "note3", "note4"])
        self.assertFalse(result["success"])
        self.assertIn("最多", result["error"])
    
    def test_vault_read_include_links(self):
        """测试vault_read包含链接预览"""
        result = self.vault.vault_read(ids=["note1"], include_links=True)
        self.assertTrue(result["success"])
        
        note = result["notes"][0]
        self.assertGreater(len(note["links_preview"]), 0)
        self.assertEqual(note["links_preview"][0]["id"], "note2")
    
    def test_vault_watch(self):
        """测试vault_watch"""
        result = self.vault.vault_watch(since=1712345600)
        self.assertTrue(result["success"])
        
        data = result["data"]
        self.assertIn("changed", data)
        self.assertIn("deleted", data)
        self.assertIn("server_time", data)
        
        # note1的updated_at > since
        changed_ids = [c["id"] for c in data["changed"]]
        self.assertIn("note1", changed_ids)
    
    def test_vault_emergency_sample(self):
        """测试vault_emergency_sample"""
        # 创建临时markdown文件
        md_dir = os.path.join(self.temp_dir, "vault")
        os.makedirs(md_dir, exist_ok=True)
        
        with open(os.path.join(md_dir, "test.md"), "w", encoding="utf-8") as f:
            f.write("# 测试笔记\n这是测试内容。")
        
        self.vault.config.notes_dir = md_dir
        result = self.vault.vault_emergency_sample(sample_size=5)
        self.assertTrue(result["success"])
        self.assertTrue(result["emergency_mode"])
        self.assertIn("warning", result)
        self.assertGreaterEqual(len(result["notes"]), 1)  # 可能有其他.md文件
        # 找到我们的测试笔记
        test_note = next((n for n in result["notes"] if n["title"] == "测试笔记"), None)
        self.assertIsNotNone(test_note)


if __name__ == "__main__":
    unittest.main()
