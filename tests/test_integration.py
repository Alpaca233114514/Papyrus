"""Papyrus 集成测试

覆盖多个模块之间的真实交互，不再逐个 mock，而是让组件协同工作：
1. CardTools ↔ 数据层：完整的卡片生命周期（创建→搜索→更新→删除→统计）
2. MCP Server ↔ CardTools：通过 HTTP 请求调用卡片工具
3. AIConfig ↔ AIManager：配置加载、提供商切换
4. Logger：操作过程中事件日志的正确记录
"""

import os
import sys
import json
import time
import unittest
import tempfile
import shutil
from unittest.mock import MagicMock, patch
from urllib.request import urlopen, Request

# 添加 src 到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))


# ---------------------------------------------------------------------------
# 辅助：模拟 PapyrusApp，只保留 CardTools 真正依赖的属性
# ---------------------------------------------------------------------------
class _IntegrationApp:
    """比单元测试中的 FakeApp 更完整：带真实文件 I/O 和 Logger"""

    def __init__(self, data_file, logger=None):
        self.cards = []
        self.data_file = data_file
        self.logger = logger

    def save_data(self):
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(self.cards, f, ensure_ascii=False, indent=2)

    def load_data(self):
        if os.path.exists(self.data_file):
            with open(self.data_file, "r", encoding="utf-8") as f:
                self.cards = json.load(f)

    def get_due_cards(self):
        now = time.time()
        return [c for c in self.cards if c.get("next_review", 0) <= now]

    def next_card(self):
        pass  # 无 GUI，空实现即可


# ---------------------------------------------------------------------------
# 1. CardTools 完整生命周期（真实文件读写）
# ---------------------------------------------------------------------------
class TestCardLifecycleIntegration(unittest.TestCase):
    """测试 CardTools 在真实文件系统上的完整 CRUD 流程"""

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.data_file = os.path.join(self.tmp_dir, "cards.json")
        self.app = _IntegrationApp(self.data_file)

        from ai.tools import CardTools
        self.tools = CardTools(self.app)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_full_crud_cycle(self):
        """创建 → 搜索 → 更新 → 统计 → 删除，全程数据落盘"""

        # ---- 创建两张卡片 ----
        r1 = self.tools.create_card("什么是 Python？", "一种编程语言", tags=["编程"])
        r2 = self.tools.create_card("什么是 HTTP？", "超文本传输协议", tags=["网络"])
        self.assertTrue(r1["success"])
        self.assertTrue(r2["success"])
        self.assertEqual(len(self.app.cards), 2)

        # 验证数据已写入磁盘
        with open(self.data_file, "r", encoding="utf-8") as f:
            persisted = json.load(f)
        self.assertEqual(len(persisted), 2)
        self.assertEqual(persisted[0]["q"], "什么是 Python？")

        # ---- 搜索 ----
        sr = self.tools.search_cards("python")
        self.assertEqual(sr["count"], 1)
        self.assertEqual(sr["results"][0]["index"], 0)

        sr_empty = self.tools.search_cards("Java")
        self.assertEqual(sr_empty["count"], 0)

        # ---- 更新 ----
        ur = self.tools.update_card(0, answer="一种高级编程语言")
        self.assertTrue(ur["success"])
        self.assertEqual(self.app.cards[0]["a"], "一种高级编程语言")

        # 磁盘也同步更新
        with open(self.data_file, "r", encoding="utf-8") as f:
            persisted = json.load(f)
        self.assertEqual(persisted[0]["a"], "一种高级编程语言")

        # ---- 统计 ----
        stats = self.tools.get_card_stats()
        self.assertTrue(stats["success"])
        self.assertEqual(stats["stats"]["total_cards"], 2)
        self.assertEqual(stats["stats"]["due_cards"], 2)  # next_review=0 → 全部到期

        # ---- 删除 ----
        dr = self.tools.delete_card(0)
        self.assertTrue(dr["success"])
        self.assertEqual(len(self.app.cards), 1)
        self.assertEqual(self.app.cards[0]["q"], "什么是 HTTP？")

        # 磁盘验证
        with open(self.data_file, "r", encoding="utf-8") as f:
            persisted = json.load(f)
        self.assertEqual(len(persisted), 1)

    def test_execute_tool_dispatches_correctly(self):
        """通过 execute_tool 统一入口调用各工具"""
        r = self.tools.execute_tool("create_card", {
            "question": "Q1", "answer": "A1",
        })
        self.assertTrue(r["success"])

        r = self.tools.execute_tool("search_cards", {"keyword": "Q1"})
        self.assertTrue(r["success"])
        self.assertEqual(r["count"], 1)

        r = self.tools.execute_tool("get_card_stats", {})
        self.assertEqual(r["stats"]["total_cards"], 1)

        r = self.tools.execute_tool("delete_card", {"card_index": 0})
        self.assertTrue(r["success"])
        self.assertEqual(len(self.app.cards), 0)

    def test_reload_data_after_restart(self):
        """模拟重启：创建卡片 → 新建 App 实例重新加载"""
        self.tools.create_card("持久化测试", "应该还在")

        # 模拟重启
        app2 = _IntegrationApp(self.data_file)
        app2.load_data()
        self.assertEqual(len(app2.cards), 1)
        self.assertEqual(app2.cards[0]["q"], "持久化测试")


# ---------------------------------------------------------------------------
# 2. MCP Server ↔ CardTools（真实 HTTP 请求）
# ---------------------------------------------------------------------------
class TestMCPServerIntegration(unittest.TestCase):
    """启动真实 MCP HTTP 服务器，通过 HTTP 调用 CardTools"""

    @classmethod
    def setUpClass(cls):
        cls.tmp_dir = tempfile.mkdtemp()
        cls.data_file = os.path.join(cls.tmp_dir, "cards.json")
        cls.app = _IntegrationApp(cls.data_file)

        from ai.tools import CardTools
        cls.card_tools = CardTools(cls.app)

        from mcp.server import MCPServer
        cls.port = 19876  # 用一个不常见的端口避免冲突
        cls.server = MCPServer(
            host="127.0.0.1",
            port=cls.port,
            logger=None,
            card_tools=cls.card_tools,
        )
        cls.server.start()
        time.sleep(0.3)  # 等待服务器就绪

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()
        shutil.rmtree(cls.tmp_dir, ignore_errors=True)

    def _request(self, method, path, body=None):
        url = f"http://127.0.0.1:{self.port}{path}"
        data = json.dumps(body).encode("utf-8") if body else None
        req = Request(url, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        with urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))

    def test_health_check(self):
        status, body = self._request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")

    def test_list_tools(self):
        status, body = self._request("GET", "/tools")
        self.assertEqual(status, 200)
        self.assertIn("create_card", body["tools"])
        self.assertIn("search_cards", body["tools"])

    def test_create_and_search_via_http(self):
        """通过 HTTP 创建卡片，再通过 HTTP 搜索"""
        # 创建
        status, body = self._request("POST", "/call", {
            "tool": "create_card",
            "params": {"question": "MCP测试题", "answer": "MCP测试答案", "tags": ["mcp"]},
        })
        self.assertEqual(status, 200)
        self.assertTrue(body["success"])

        # 搜索
        status, body = self._request("POST", "/call", {
            "tool": "search_cards",
            "params": {"keyword": "MCP"},
        })
        self.assertEqual(status, 200)
        self.assertGreaterEqual(body["count"], 1)

    def test_unknown_tool_returns_error(self):
        status, body = self._request("POST", "/call", {
            "tool": "no_such_tool",
            "params": {},
        })
        self.assertEqual(status, 200)  # MCP 层返回 200，业务层标记 success=False
        self.assertFalse(body["success"])
        self.assertIn("未知工具", body["error"])

    def test_invalid_json_body(self):
        """发送非法 JSON 应返回 400"""
        url = f"http://127.0.0.1:{self.port}/call"
        req = Request(url, data=b"not json", method="POST")
        req.add_header("Content-Type", "application/json")
        try:
            with urlopen(req, timeout=5) as resp:
                status = resp.status
                body = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            # urllib 对 4xx 会抛异常
            status = e.code if hasattr(e, "code") else None
            body = json.loads(e.read().decode("utf-8")) if hasattr(e, "read") else {}
        self.assertEqual(status, 400)
        self.assertIn("error", body)


# ---------------------------------------------------------------------------
# 3. AIConfig ↔ AIManager 集成
# ---------------------------------------------------------------------------
class TestAIConfigManagerIntegration(unittest.TestCase):
    """测试配置加载 → AIManager 初始化 → 提供商切换的完整链路"""

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_default_config_creates_file(self):
        """首次初始化应生成默认配置文件"""
        from ai.config import AIConfig
        config = AIConfig(self.tmp_dir)

        config_path = os.path.join(self.tmp_dir, "ai_config.json")
        self.assertTrue(os.path.exists(config_path))
        self.assertEqual(config.config["current_provider"], "openai")
        self.assertEqual(config.config["current_model"], "gpt-3.5-turbo")

    def test_config_persistence_and_reload(self):
        """修改配置 → 保存 → 重新加载，验证持久化"""
        from ai.config import AIConfig

        config1 = AIConfig(self.tmp_dir)
        config1.config["current_model"] = "gpt-4"
        config1.save_config()

        config2 = AIConfig(self.tmp_dir)
        self.assertEqual(config2.config["current_model"], "gpt-4")

    def test_manager_uses_correct_provider(self):
        """AIManager 应根据配置选择正确的 Provider 类型"""
        from ai.config import AIConfig
        from ai.provider import AIManager, OpenAIProvider, OllamaProvider

        config = AIConfig(self.tmp_dir)

        # OpenAI
        config.config["current_provider"] = "openai"
        manager = AIManager(config)
        self.assertIsInstance(manager.get_provider(), OpenAIProvider)

        # Ollama
        config.config["current_provider"] = "ollama"
        self.assertIsInstance(manager.get_provider(), OllamaProvider)

    def test_conversation_history_management(self):
        """对话历史的追加与清空"""
        from ai.config import AIConfig
        from ai.provider import AIManager

        config = AIConfig(self.tmp_dir)
        manager = AIManager(config)

        # mock 掉真实 HTTP 调用
        with patch.object(manager, "get_provider") as mock_gp:
            fake_provider = MagicMock()
            fake_provider.chat.return_value = "AI回复"
            mock_gp.return_value = fake_provider

            manager.chat("你好")
            manager.chat("第二句")

        self.assertEqual(len(manager.conversation_history), 4)  # 2轮 × 2条
        self.assertEqual(manager.conversation_history[0]["content"], "你好")
        self.assertEqual(manager.conversation_history[1]["content"], "AI回复")

        manager.clear_history()
        self.assertEqual(len(manager.conversation_history), 0)

    def test_validate_config_rejects_non_ascii_key(self):
        """包含中文的 API Key 应被拒绝"""
        from ai.config import AIConfig

        config = AIConfig(self.tmp_dir)
        config.config["providers"]["openai"]["api_key"] = "sk-含中文key"

        with self.assertRaises(ValueError):
            config.validate_config()


# ---------------------------------------------------------------------------
# 4. Logger 事件记录集成
# ---------------------------------------------------------------------------
class TestLoggerIntegration(unittest.TestCase):
    """CardTools 操作时 Logger 应正确记录结构化事件"""

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.data_file = os.path.join(self.tmp_dir, "cards.json")

        from logger import PapyrusLogger
        self.logger = PapyrusLogger(self.tmp_dir)

        self.app = _IntegrationApp(self.data_file, logger=self.logger)

        from ai.tools import CardTools
        self.tools = CardTools(self.app)

    def tearDown(self):
        # 关闭 logger 的所有 handler，避免 PermissionError
        for handler in self.logger.logger.handlers[:]:
            handler.close()
            self.logger.logger.removeHandler(handler)
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _read_events(self):
        events_file = os.path.join(self.tmp_dir, "events.log")
        if not os.path.exists(events_file):
            return []
        with open(events_file, "r", encoding="utf-8") as f:
            return [json.loads(line) for line in f if line.strip()]

    def test_create_card_logs_event(self):
        self.tools.execute_tool("create_card", {
            "question": "日志测试", "answer": "答案",
        })

        events = self._read_events()
        event_types = [e["event"] for e in events]
        self.assertIn("tool.execute_start", event_types)
        self.assertIn("tool.execute_ok", event_types)
        self.assertIn("tool.create_card", event_types)

    def test_unknown_tool_logs_warning(self):
        self.tools.execute_tool("fake_tool", {})

        events = self._read_events()
        warning_events = [e for e in events if e["level"] == "WARNING"]
        self.assertTrue(len(warning_events) > 0)
        self.assertEqual(warning_events[0]["event"], "tool.unknown")

    def test_activity_log_written(self):
        """Logger.log_activity 应写入 activity.log"""
        self.logger.log_activity("test_action", {"key": "value"})

        activity_file = os.path.join(self.tmp_dir, "activity.log")
        self.assertTrue(os.path.exists(activity_file))
        with open(activity_file, "r", encoding="utf-8") as f:
            entries = [json.loads(line) for line in f if line.strip()]
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["type"], "test_action")


# ---------------------------------------------------------------------------
# 5. 端到端：MCP + CardTools + 数据持久化 + 重新加载
# ---------------------------------------------------------------------------
class TestEndToEndFlow(unittest.TestCase):
    """模拟完整使用场景：通过 MCP 创建卡片 → 磁盘持久化 → 重启后数据仍在"""

    @classmethod
    def setUpClass(cls):
        cls.tmp_dir = tempfile.mkdtemp()
        cls.data_file = os.path.join(cls.tmp_dir, "cards.json")
        cls.app = _IntegrationApp(cls.data_file)

        from ai.tools import CardTools
        cls.card_tools = CardTools(cls.app)

        from mcp.server import MCPServer
        cls.port = 19877
        cls.server = MCPServer(
            host="127.0.0.1",
            port=cls.port,
            card_tools=cls.card_tools,
        )
        cls.server.start()
        time.sleep(0.3)

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()
        shutil.rmtree(cls.tmp_dir, ignore_errors=True)

    def _post(self, tool, params):
        url = f"http://127.0.0.1:{self.port}/call"
        data = json.dumps({"tool": tool, "params": params}).encode("utf-8")
        req = Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
        with urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def test_e2e_create_persist_reload(self):
        """MCP 创建 → 磁盘验证 → 模拟重启加载"""
        # 通过 MCP 创建
        r = self._post("create_card", {
            "question": "端到端测试", "answer": "成功",
        })
        self.assertTrue(r["success"])

        # 磁盘验证
        with open(self.data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertTrue(any(c["q"] == "端到端测试" for c in data))

        # 模拟重启
        app2 = _IntegrationApp(self.data_file)
        app2.load_data()
        self.assertTrue(any(c["q"] == "端到端测试" for c in app2.cards))

    def test_e2e_stats_reflect_changes(self):
        """创建+删除后统计数据应实时反映"""
        before = self._post("get_card_stats", {})
        count_before = before["stats"]["total_cards"]

        self._post("create_card", {"question": "临时卡片", "answer": "待删除"})
        after_create = self._post("get_card_stats", {})
        self.assertEqual(after_create["stats"]["total_cards"], count_before + 1)

        # 找到刚创建的卡片索引并删除
        sr = self._post("search_cards", {"keyword": "临时卡片"})
        idx = sr["results"][0]["index"]
        self._post("delete_card", {"card_index": idx})

        after_delete = self._post("get_card_stats", {})
        self.assertEqual(after_delete["stats"]["total_cards"], count_before)


if __name__ == "__main__":
    unittest.main()