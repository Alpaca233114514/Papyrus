#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""简单的 API 单元测试（无需 httpx）"""

import sys
import os
import unittest

# 添加 src 到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))


class TestImports(unittest.TestCase):
    """测试基础导入"""
    
    def test_main_app(self):
        """主应用导入"""
        from papyrus_api.main import app
        self.assertIsNotNone(app)
        
        # 验证路由
        from fastapi.routing import APIRoute
        routes = [r for r in app.routes if isinstance(r, APIRoute)]
        self.assertEqual(len(routes), 33)
    
    def test_deps(self):
        """依赖模块导入"""
        from papyrus_api.deps import (
            get_ai_config,
            get_vault_tools,
        )
        self.assertIsNotNone(get_ai_config)
        self.assertIsNotNone(get_vault_tools)
    
    def test_all_routers(self):
        """所有路由模块导入"""
        from papyrus_api.routers import (
            cards_router,
            review_router,
            notes_router,
            vault_router,
            search_router,
            ai_router,
            data_router,
            relations_router,
        )
        routers = [
            cards_router, review_router, notes_router, vault_router,
            search_router, ai_router, data_router, relations_router
        ]
        for router in routers:
            self.assertIsNotNone(router)


class TestCardsModels(unittest.TestCase):
    """测试卡片模型"""
    
    def test_create_card_in(self):
        """创建卡片输入模型"""
        from papyrus_api.routers.cards import CreateCardIn
        
        # 使用 q/a
        data = CreateCardIn(q="Question", a="Answer")
        self.assertEqual(data.q, "Question")
        self.assertEqual(data.a, "Answer")
        
        # 使用 question/answer
        data2 = CreateCardIn(question="Q2", answer="A2")
        self.assertEqual(data2.question, "Q2")
        self.assertEqual(data2.answer, "A2")

    def test_cards_list_response(self):
        """卡片列表响应模型"""
        from papyrus_api.routers.cards import CardsListResponse
        
        response = CardsListResponse(
            success=True,
            cards=[{"id": "1", "q": "Q1", "a": "A1"}],
            count=1
        )
        self.assertTrue(response.success)
        self.assertEqual(response.count, 1)


class TestReviewModels(unittest.TestCase):
    """测试复习模型"""
    
    def test_rate_card_in(self):
        """评分输入模型"""
        from papyrus_api.routers.review import RateCardIn
        
        data = RateCardIn(grade=3)
        self.assertEqual(data.grade, 3)
        
        # 验证等级限制
        with self.assertRaises(Exception):
            RateCardIn(grade=5)  # type: ignore[arg-type]  # 只允许 1,2,3

    def test_next_due_response(self):
        """下一张卡片响应模型"""
        from papyrus_api.routers.review import NextDueResponse
        
        response = NextDueResponse(
            success=True,
            card={"id": "1", "q": "Q1", "a": "A1"},
            due_count=5,
            total_count=10
        )
        self.assertTrue(response.success)
        self.assertEqual(response.due_count, 5)


class TestNotesModels(unittest.TestCase):
    """测试笔记模型"""
    
    def test_create_note_in(self):
        """创建笔记输入模型"""
        from papyrus_api.routers.notes import CreateNoteIn
        
        data = CreateNoteIn(title="Test Note")
        self.assertEqual(data.title, "Test Note")
        self.assertEqual(data.folder, "默认")  # 默认值
        self.assertEqual(data.tags, [])  # 默认值

    def test_note_dict(self):
        """笔记字典模型"""
        from papyrus_api.routers.notes import NoteDict
        
        note = NoteDict(
            id="1",
            title="Test",
            folder="dev",
            content="Content",
            preview="Prev",
            tags=["tag1"],
            created_at=0,
            updated_at=0,
            word_count=10
        )
        self.assertEqual(note.title, "Test")


class TestAIModels(unittest.TestCase):
    """测试 AI 模型"""
    
    def test_ai_config_model(self):
        """AI 配置模型"""
        from papyrus_api.routers.ai import AIConfigModel, ProviderConfigModel, ParametersConfigModel, FeaturesConfigModel
        
        config = AIConfigModel(
            current_provider="openai",
            current_model="gpt-3.5-turbo",
            providers={
                "openai": ProviderConfigModel(api_key="sk-xxx", models=["gpt-3.5"])
            },
            parameters=ParametersConfigModel(),
            features=FeaturesConfigModel()
        )
        self.assertEqual(config.current_provider, "openai")

    def test_test_connection_response(self):
        """连接测试响应模型"""
        from papyrus_api.routers.ai import TestConnectionResponse
        
        response = TestConnectionResponse(success=True, message="Connected")
        self.assertTrue(response.success)
        self.assertEqual(response.message, "Connected")


class TestDataModels(unittest.TestCase):
    """测试数据管理模型"""
    
    def test_import_data_response(self):
        """导入数据响应模型"""
        from papyrus_api.routers.data import ImportDataResponse
        
        response = ImportDataResponse(success=True, imported=10)
        self.assertTrue(response.success)
        self.assertEqual(response.imported, 10)


class TestVaultModels(unittest.TestCase):
    """测试 Vault 模型"""
    
    def test_vault_index_in(self):
        """Vault 索引输入"""
        from papyrus_api.routers.vault import VaultIndexIn
        
        data = VaultIndexIn(limit=100)
        self.assertEqual(data.limit, 100)


class TestSearchModels(unittest.TestCase):
    """测试搜索模型"""
    
    def test_search_result_item(self):
        """搜索结果项"""
        from papyrus_api.routers.search import SearchResultItem
        
        item = SearchResultItem(
            id="1",
            type="note",
            title="Test",
            preview="Prev",
            matched_field="title"
        )
        self.assertEqual(item.type, "note")


class TestRelationsModels(unittest.TestCase):
    """测试关联模型"""
    
    def test_create_relation_in(self):
        """创建关联输入"""
        from papyrus_api.routers.relations import CreateRelationIn
        
        data = CreateRelationIn(target_id="2", relation_type="reference")
        self.assertEqual(data.target_id, "2")
        self.assertEqual(data.relation_type, "reference")


class TestDepsFunctions(unittest.TestCase):
    """测试依赖工具函数"""
    
    def test_pick_card_text(self):
        """选择卡片文本"""
        from papyrus_api.deps import pick_card_text
        
        # 第一个非空值
        result = pick_card_text(None, "", "  ", "Hello", "World")
        self.assertEqual(result, "Hello")
        
        # 全部为空
        result = pick_card_text(None, "", "  ")
        self.assertEqual(result, "")
        
        # 单值
        result = pick_card_text("Test")
        self.assertEqual(result, "Test")


if __name__ == "__main__":
    unittest.main(verbosity=2)
