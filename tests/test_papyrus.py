#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Papyrus 主程序单元测试"""

import sys
import os
import json
import time
import unittest
from unittest.mock import patch

# 添加 src 到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

# 在导入主模块前，mock 掉 tkinter 和可选依赖，避免测试时弹出 GUI
import tkinter as tk


class TestResourcePath(unittest.TestCase):
    """测试 resource_path 工具函数"""

    def test_dev_environment(self):
        from Papyrus import resource_path, ASSETS_DIR

        result = resource_path("icon.ico")
        self.assertEqual(result, os.path.join(ASSETS_DIR, "icon.ico"))

    def test_packaged_environment(self):
        """模拟 PyInstaller 打包环境"""
        import Papyrus

        fake_meipass = "/tmp/fake_meipass"
        with patch.object(sys, "_MEIPASS", fake_meipass, create=True):
            result = Papyrus.resource_path("icon.ico")
            self.assertEqual(result, os.path.join(fake_meipass, "assets", "icon.ico"))


class TestPapyrusApp(unittest.TestCase):
    """PapyrusApp 核心逻辑测试"""

    @classmethod
    def setUpClass(cls):
        """创建一个隐藏的 Tk root，供所有测试共用"""
        cls.root = tk.Tk()
        cls.root.withdraw()

    @classmethod
    def tearDownClass(cls):
        cls.root.destroy()

    def setUp(self):
        """每个测试前创建一个干净的 App 实例，mock 掉文件 I/O 和 AI/MCP"""
        from Papyrus import PapyrusApp

        with patch.object(PapyrusApp, "load_data"), \
             patch.object(PapyrusApp, "setup_ai"), \
             patch.object(PapyrusApp, "setup_mcp"), \
             patch.object(PapyrusApp, "setup_logger"), \
             patch.object(PapyrusApp, "next_card"):
            self.app = PapyrusApp(self.root)

        # 手动初始化被 mock 跳过的属性
        self.app.cards = []
        self.app.logger = None
        self.app.mcp_server = None

    def tearDown(self):
        """清理每个测试创建的子窗口"""
        for widget in self.root.winfo_children():
            try:
                widget.destroy()
            except tk.TclError:
                pass

    # ---------- load_data ----------
    def test_load_data_valid_json(self):
        """正常加载 JSON 数据"""
        fake_cards = [{"q": "Q1", "a": "A1", "next_review": 0, "interval": 0}]
        mock_open = unittest.mock.mock_open(read_data=json.dumps(fake_cards))

        with patch("os.path.exists", return_value=True), \
             patch("builtins.open", mock_open):
            from Papyrus import PapyrusApp
            PapyrusApp.load_data(self.app)

        self.assertEqual(len(self.app.cards), 1)
        self.assertEqual(self.app.cards[0]["q"], "Q1")

    def test_load_data_invalid_json(self):
        """JSON 损坏时应清空卡片列表"""
        mock_open = unittest.mock.mock_open(read_data="{invalid json")

        with patch("os.path.exists", return_value=True), \
             patch("builtins.open", mock_open):
            from Papyrus import PapyrusApp
            PapyrusApp.load_data(self.app)

        self.assertEqual(self.app.cards, [])

    def test_load_data_file_not_exist(self):
        """数据文件不存在时卡片列表保持不变"""
        self.app.cards = [{"q": "old", "a": "data"}]

        with patch("os.path.exists", return_value=False):
            from Papyrus import PapyrusApp
            PapyrusApp.load_data(self.app)

        # 文件不存在时 load_data 不会修改 cards
        self.assertEqual(len(self.app.cards), 1)

    # ---------- save_data ----------
    def test_save_data_writes_json(self):
        """保存数据应写入正确的 JSON"""
        self.app.cards = [{"q": "Q1", "a": "A1"}]
        self.app.last_backup_time = time.time()  # 跳过自动备份

        mock_open = unittest.mock.mock_open()
        with patch("builtins.open", mock_open):
            self.app.save_data()

        mock_open.assert_called_once()
        written = "".join(
            call.args[0] for call in mock_open().write.call_args_list
        )
        data = json.loads(written)
        self.assertEqual(data[0]["q"], "Q1")

    # ---------- get_due_cards ----------
    def test_get_due_cards_returns_overdue(self):
        """到期卡片应被返回"""
        self.app.cards = [
            {"q": "Q1", "a": "A1", "next_review": 0},
            {"q": "Q2", "a": "A2", "next_review": time.time() + 99999},
        ]
        due = self.app.get_due_cards()
        self.assertEqual(len(due), 1)
        self.assertEqual(due[0]["q"], "Q1")

    def test_get_due_cards_empty(self):
        """没有到期卡片时返回空列表"""
        self.app.cards = [
            {"q": "Q1", "a": "A1", "next_review": time.time() + 99999},
        ]
        self.assertEqual(self.app.get_due_cards(), [])

    # ---------- SM-2 rate_card ----------
    def _make_card(self, ef=2.5, repetitions=0, interval=0, next_review=0):
        return {
            "q": "Q", "a": "A",
            "ef": ef,
            "repetitions": repetitions,
            "interval": interval,
            "next_review": next_review,
        }

    def test_rate_card_forget(self):
        """评分1（忘记）应重置 repetitions，间隔回到1天"""
        card = self._make_card(ef=2.5, repetitions=3, interval=86400 * 10)
        self.app.cards = [card]
        self.app.current_card_index = 0
        self.app.is_showing_answer = True
        self.app.answer_shown_time = 0  # 跳过防抖

        with patch.object(self.app, "save_data"), \
             patch.object(self.app, "next_card"):
            self.app.rate_card(1)

        self.assertEqual(card["repetitions"], 0)
        self.assertAlmostEqual(card["interval"], 86400, delta=1)

    def test_rate_card_fuzzy(self):
        """评分2（模糊）首次应设置间隔为1天"""
        card = self._make_card()
        self.app.cards = [card]
        self.app.current_card_index = 0
        self.app.is_showing_answer = True
        self.app.answer_shown_time = 0

        with patch.object(self.app, "save_data"), \
             patch.object(self.app, "next_card"):
            self.app.rate_card(2)

        self.assertEqual(card["repetitions"], 1)
        self.assertAlmostEqual(card["interval"], 86400, delta=1)

    def test_rate_card_perfect(self):
        """评分3（秒杀）首次应设置间隔为1天"""
        card = self._make_card()
        self.app.cards = [card]
        self.app.current_card_index = 0
        self.app.is_showing_answer = True
        self.app.answer_shown_time = 0

        with patch.object(self.app, "save_data"), \
             patch.object(self.app, "next_card"):
            self.app.rate_card(3)

        self.assertEqual(card["repetitions"], 1)
        self.assertAlmostEqual(card["interval"], 86400, delta=1)
        self.assertGreaterEqual(card["ef"], 1.3)

    def test_rate_card_second_repetition(self):
        """第二次正确回答间隔应为6天"""
        card = self._make_card(repetitions=1, interval=86400)
        self.app.cards = [card]
        self.app.current_card_index = 0
        self.app.is_showing_answer = True
        self.app.answer_shown_time = 0

        with patch.object(self.app, "save_data"), \
             patch.object(self.app, "next_card"):
            self.app.rate_card(3)

        self.assertEqual(card["repetitions"], 2)
        self.assertAlmostEqual(card["interval"], 86400 * 6, delta=1)

    def test_rate_card_ef_minimum(self):
        """EF 值不应低于 1.3"""
        card = self._make_card(ef=1.3)
        self.app.cards = [card]
        self.app.current_card_index = 0
        self.app.is_showing_answer = True
        self.app.answer_shown_time = 0

        with patch.object(self.app, "save_data"), \
             patch.object(self.app, "next_card"):
            self.app.rate_card(1)

        self.assertGreaterEqual(card["ef"], 1.3)

    def test_rate_card_no_card_selected(self):
        """没有选中卡片时 rate_card 应直接返回"""
        self.app.current_card_index = -1
        # 不应抛出异常
        self.app.rate_card(1)

    # ---------- get_current_card_context ----------
    def test_get_context_no_card(self):
        """没有选中卡片时返回 None"""
        self.app.current_card_index = -1
        self.assertIsNone(self.app.get_current_card_context())

    def test_get_context_with_card(self):
        """有选中卡片时返回正确上下文"""
        self.app.cards = [{"q": "问题", "a": "答案"}]
        self.app.current_card_index = 0
        self.app.is_showing_answer = False

        ctx = self.app.get_current_card_context()
        self.assertEqual(ctx["q"], "问题")
        self.assertEqual(ctx["a"], "答案")
        self.assertFalse(ctx["is_showing_answer"])

    # ---------- update_status ----------
    def test_update_status(self):
        """状态栏应显示正确的数字"""
        self.app.cards = [{"q": "Q1"}, {"q": "Q2"}, {"q": "Q3"}]
        self.app.update_status(2)
        self.assertIn("2", self.app.status_var.get())
        self.assertIn("3", self.app.status_var.get())

    # ---------- import_from_txt 解析逻辑 ----------
    def test_import_txt_parsing(self):
        """验证 TXT 导入的解析逻辑"""
        content = "题目1===答案1\n\n题目2===答案2\n\n无效行"
        self.app.cards = []

        count = 0
        for block in content.split("\n\n"):
            if "===" in block:
                parts = block.split("===", 1)
                if len(parts) >= 2:
                    q = parts[0].strip()
                    a = parts[1].strip()
                    if q and a:
                        self.app.cards.append(
                            {"q": q, "a": a, "next_review": 0, "interval": 0}
                        )
                        count += 1

        self.assertEqual(count, 2)
        self.assertEqual(self.app.cards[0]["q"], "题目1")
        self.assertEqual(self.app.cards[1]["a"], "答案2")


if __name__ == "__main__":
    unittest.main()