#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""FastAPI API 单元测试"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# 添加 src 到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

# Mock MCP 服务器和相关依赖
sys.modules['mcp'] = MagicMock()
sys.modules['mcp.server'] = MagicMock()
sys.modules['mcp.vault_tools'] = MagicMock()

from fastapi.testclient import TestClient


def create_test_client():
    """创建测试客户端， mocking 掉 MCP 服务器"""
    with patch('papyrus_api.main.MCPServer') as mock_mcp:
        mock_instance = MagicMock()
        mock_mcp.return_value = mock_instance
        
        from papyrus_api.main import app
        return TestClient(app), mock_instance


class TestHealthEndpoint(unittest.TestCase):
    """测试健康检查端点"""
    
    def test_health_check(self):
        """健康检查应该返回 ok"""
        client, _ = create_test_client()
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})


class TestCardsAPI(unittest.TestCase):
    """测试卡片 API"""
    
    @patch('papyrus_api.routers.cards.card_core.list_cards')
    def test_list_cards(self, mock_list_cards: MagicMock):
        """获取卡片列表"""
        mock_list_cards.return_value = [
            {"id": "1", "q": "Q1", "a": "A1", "next_review": 0, "interval": 0}
        ]
        
        client, _ = create_test_client()
        response = client.get("/api/cards")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["count"], 1)
        self.assertEqual(len(data["cards"]), 1)

    @patch('papyrus_api.routers.cards.card_core.create_card')
    def test_create_card(self, mock_create_card: MagicMock):
        """创建新卡片"""
        mock_create_card.return_value = {
            "id": "2", "q": "New Q", "a": "New A", "next_review": 0, "interval": 0
        }
        
        client, _ = create_test_client()
        response = client.post("/api/cards", json={"q": "New Q", "a": "New A"})
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["card"]["q"], "New Q")

    @patch('papyrus_api.routers.cards.card_core.delete_card')
    def test_delete_card(self, mock_delete_card: MagicMock):
        """删除卡片"""
        mock_delete_card.return_value = True
        
        client, _ = create_test_client()
        response = client.delete("/api/cards/123")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])

    @patch('papyrus_api.routers.cards.card_core.delete_card')
    def test_delete_card_not_found(self, mock_delete_card: MagicMock):
        """删除不存在的卡片"""
        mock_delete_card.return_value = False
        
        client, _ = create_test_client()
        response = client.delete("/api/cards/999")
        
        self.assertEqual(response.status_code, 404)

    @patch('papyrus_api.routers.cards.card_core.import_from_txt')
    def test_import_txt(self, mock_import: MagicMock):
        """导入文本卡片"""
        mock_import.return_value = 2
        
        client, _ = create_test_client()
        response = client.post("/api/cards/import/txt", json={
            "content": "Q1 === A1\n\nQ2 === A2"
        })
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["count"], 2)


class TestReviewAPI(unittest.TestCase):
    """测试复习 API"""
    
    @patch('papyrus_api.routers.review.card_core.get_next_due')
    def test_get_next_due(self, mock_get_next_due: MagicMock):
        """获取下一张待复习卡片"""
        mock_get_next_due.return_value = {
            "card": {"id": "1", "q": "Q1", "a": "A1"},
            "due_count": 1,
            "total_count": 10
        }
        
        client, _ = create_test_client()
        response = client.get("/api/review/next")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["due_count"], 1)

    @patch('papyrus_api.routers.review.card_core.get_next_due')
    @patch('papyrus_api.routers.review.card_core.list_cards')
    def test_get_next_due_empty(self, mock_list_cards: MagicMock, mock_get_next_due: MagicMock):
        """没有待复习卡片时"""
        mock_get_next_due.return_value = None
        mock_list_cards.return_value = []
        
        client, _ = create_test_client()
        response = client.get("/api/review/next")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIsNone(data["card"])

    @patch('papyrus_api.routers.review.card_core.rate_card')
    @patch('papyrus_api.routers.review.card_core.get_next_due')
    def test_rate_card(self, mock_get_next: MagicMock, mock_rate_card: MagicMock):
        """评分卡片"""
        mock_rate_card.return_value = {
            "card": {"id": "1", "q": "Q1", "a": "A1"},
            "interval_days": 1.0,
            "ef": 2.5
        }
        mock_get_next.return_value = None
        
        client, _ = create_test_client()
        response = client.post("/api/review/123/rate", json={"grade": 3})
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["ef"], 2.5)


class TestSearchAPI(unittest.TestCase):
    """测试搜索 API"""
    
    @patch('papyrus_api.routers.search.load_notes')
    @patch('papyrus_api.routers.search.card_core.list_cards')
    def test_search_empty(self, mock_list_cards: MagicMock, mock_load_notes: MagicMock):
        """空搜索返回空结果"""
        mock_load_notes.return_value = []
        mock_list_cards.return_value = []
        
        client, _ = create_test_client()
        response = client.get("/api/search?query=")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["total"], 0)

    @patch('papyrus_api.routers.search.load_notes')
    @patch('papyrus_api.routers.search.card_core.list_cards')
    def test_search_notes(self, mock_list_cards: MagicMock, mock_load_notes: MagicMock):
        """搜索笔记"""
        from papyrus.data.notes_storage import Note
        
        mock_load_notes.return_value = [
            Note(
                id="1",
                title="Python Guide",
                folder="dev",
                content="Python is great",
                preview="Python is great",
                tags=["python"],
                created_at=0,
                updated_at=100
            )
        ]
        mock_list_cards.return_value = []
        
        client, _ = create_test_client()
        response = client.get("/api/search?query=python")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["results"][0]["type"], "note")


class TestAIConfigAPI(unittest.TestCase):
    """测试 AI 配置 API"""
    
    @patch('papyrus_api.routers.ai.get_ai_config')
    def test_get_ai_config(self, mock_get_config: MagicMock):
        """获取 AI 配置"""
        mock_config = MagicMock()
        mock_config.config = {
            "current_provider": "openai",
            "current_model": "gpt-3.5-turbo",
            "providers": {
                "openai": {"api_key": "sk-xxx", "base_url": "", "models": ["gpt-3.5"]}
            },
            "parameters": {"temperature": 0.7, "top_p": 0.9, "max_tokens": 2000, 
                          "presence_penalty": 0.0, "frequency_penalty": 0.0},
            "features": {"auto_hint": False, "auto_explain": False, "context_length": 10}
        }
        mock_get_config.return_value = mock_config
        
        client, _ = create_test_client()
        response = client.get("/api/config/ai")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["config"]["current_provider"], "openai")

    @patch('papyrus_api.routers.ai.get_ai_config')
    def test_test_connection_no_key(self, mock_get_config: MagicMock):
        """测试连接 - 无 API Key"""
        mock_config = MagicMock()
        mock_config.config = {
            "current_provider": "openai",
        }
        mock_config.get_provider_config.return_value = {"api_key": ""}
        mock_get_config.return_value = mock_config
        
        client, _ = create_test_client()
        response = client.post("/api/config/ai/test")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertIn("API Key", data["message"])


class TestDataAPI(unittest.TestCase):
    """测试数据管理 API"""
    
    @patch('papyrus_api.routers.data.card_core.create_card')
    @patch('papyrus_api.routers.data.create_note')
    @patch('papyrus_api.routers.data.load_notes')
    def test_import_data(self, mock_load_notes: MagicMock, mock_create_note: MagicMock, mock_create_card: MagicMock):
        """导入数据"""
        mock_load_notes.return_value = []
        
        client, _ = create_test_client()
        response = client.post("/api/import", json={
            "cards": [
                {"q": "Q1", "a": "A1"},
                {"q": "Q2", "a": "A2"}
            ],
            "notes": [
                {"title": "Note 1", "content": "Content 1"}
            ]
        })
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        # 1 note imported (cards are also imported now)
        self.assertEqual(data["imported"], 3)  # 2 cards + 1 note


if __name__ == "__main__":
    unittest.main()
