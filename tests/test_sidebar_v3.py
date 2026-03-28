"""AISidebar 单元测试

覆盖点：
- 初始化/模式切换
- send_message 的主要分支（空消息、processing、启动线程）
- Agent 模式下解析工具调用并执行（当前版本工具调用会立即落盘，不需要审批）

注意：为避免 tkinter / 线程导致测试不稳定，这里对 tkinter 组件与线程做了 mock。
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch


# 添加 src 到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))


class _FakeBooleanVar:
    """替代 tk.BooleanVar，不依赖 Tk root"""

    def __init__(self, value=False, **_kw): # pyright: ignore[reportMissingParameterType]
        self._val = bool(value)

    def get(self):
        return self._val

    def set(self, value): # type: ignore
        self._val = bool(value)


class _ImmediateThread:
    """替代 threading.Thread：start() 时同步执行 target，便于断言"""

    def __init__(self, target=None, daemon=None):
        self._target = target
        self.daemon = daemon

    def start(self):
        if self._target:
            self._target()


def _make_ai_manager(chat_response="这是AI的回复"):
    mgr = MagicMock()
    mgr.config.config = {
        "current_provider": "openai",
        "current_model": "gpt-3.5-turbo",
        "providers": {
            "openai": {
                "api_key": "sk-test",
                "base_url": "https://api.openai.com/v1",
                "models": ["gpt-3.5-turbo", "gpt-4"],
            }
        },
        "parameters": {"temperature": 0.7, "max_tokens": 2000},
    }
    mgr.chat.return_value = chat_response
    mgr.clear_history = MagicMock()
    return mgr


def _make_sidebar(*, ai_manager=None, card_tools=None, logger=None):
    """构造 AISidebar 实例，跳过所有 tkinter GUI"""

    if ai_manager is None:
        ai_manager = _make_ai_manager()

    parent = MagicMock()
    parent.after = MagicMock(side_effect=lambda _ms, cb: cb())  # 立即执行回调

    with patch("ai.sidebar_v3.AISidebar.create_widgets"), patch("ai.sidebar_v3.tk.Frame"), patch(
        "ai.sidebar_v3.tk.BooleanVar", _FakeBooleanVar
    ):
        from ai.sidebar_v3 import AISidebar

        sidebar = AISidebar(parent, ai_manager, MagicMock(return_value=None), card_tools=card_tools, logger=logger)

    # 补上 send_message 所需的属性
    sidebar.chat_input = MagicMock()
    sidebar.status_label = MagicMock()
    sidebar.add_message = MagicMock()

    # set_mode / update_model_display 相关
    sidebar.agent_btn = MagicMock()
    sidebar.chat_btn = MagicMock()
    sidebar.model_label = MagicMock()
    sidebar.model_var = MagicMock()
    sidebar.model_menu = MagicMock()  # type: ignore[assignment]
    sidebar.model_menu.__getitem__ = MagicMock(return_value=MagicMock())  # 支持 sidebar.model_menu["menu"]

    sidebar._placeholder_active = False
    return sidebar


class TestAISidebarInit(unittest.TestCase):
    def test_initial_state(self):
        sidebar = _make_sidebar()
        self.assertFalse(sidebar.is_processing)
        self.assertTrue(sidebar.agent_mode.get())


class TestModeSwitch(unittest.TestCase):
    def test_set_mode_to_chat(self):
        sidebar = _make_sidebar()
        sidebar.set_mode(False)
        self.assertFalse(sidebar.agent_mode.get())
        sidebar.chat_btn.config.assert_called()

    def test_set_mode_to_agent(self):
        sidebar = _make_sidebar()
        sidebar.set_mode(False)
        sidebar.set_mode(True)
        self.assertTrue(sidebar.agent_mode.get())
        sidebar.agent_btn.config.assert_called()


class TestSessionActions(unittest.TestCase):
    @patch("ai.sidebar_v3.simpledialog.askstring")
    def test_rename_current_chat_calls_manager(self, mock_askstring):
        sidebar = _make_sidebar()
        sidebar.ai_manager.get_active_session_id = MagicMock(return_value="sid1")
        sidebar.ai_manager.get_active_session_title = MagicMock(return_value="旧名称")
        sidebar.ai_manager.rename_session = MagicMock()
        sidebar.refresh_session_menu = MagicMock()
        sidebar.add_message = MagicMock()
        mock_askstring.return_value = "新名称"

        sidebar.rename_current_chat()

        sidebar.ai_manager.rename_session.assert_called_once_with("sid1", "新名称")
        sidebar.refresh_session_menu.assert_called_once_with(select_active=True)


class TestSendMessage(unittest.TestCase):
    def test_skip_when_placeholder_active(self):
        sidebar = _make_sidebar()
        sidebar._placeholder_active = True
        sidebar.send_message()
        sidebar.ai_manager.chat.assert_not_called()

    def test_skip_when_empty_message(self):
        sidebar = _make_sidebar()
        sidebar.chat_input.get.return_value = "   \n"
        sidebar.send_message()
        sidebar.ai_manager.chat.assert_not_called()

    def test_skip_when_already_processing(self):
        sidebar = _make_sidebar()
        sidebar.is_processing = True
        sidebar.chat_input.get.return_value = "你好"
        sidebar.send_message()
        sidebar.ai_manager.chat.assert_not_called()

    @patch("threading.Thread")
    def test_valid_message_starts_thread(self, MockThread):
        sidebar = _make_sidebar()
        sidebar.chat_input.get.return_value = "帮我复习"

        sidebar.send_message()

        self.assertTrue(sidebar.is_processing)
        sidebar.add_message.assert_called_once_with("user", "帮我复习")
        MockThread.assert_called_once()
        MockThread.return_value.start.assert_called_once()

    def test_agent_mode_executes_tool_call(self):
        # AI 回复包含一个工具调用 JSON block
        response = (
            "好的，我来创建卡片\n"
            "```json\n"
            "{\"tool\": \"create_card\", \"params\": {\"question\": \"Q\", \"answer\": \"A\"}}\n"
            "```\n"
        )
        ai_manager = _make_ai_manager(chat_response=response)

        card_tools = MagicMock()
        card_tools.get_tools_definition.return_value = "(tools)"
        card_tools.parse_tool_call.return_value = {
            "tool": "create_card",
            "params": {"question": "Q", "answer": "A"},
        }
        card_tools.execute_tool.return_value = {"success": True}

        sidebar = _make_sidebar(ai_manager=ai_manager, card_tools=card_tools)
        sidebar.chat_input.get.return_value = "请帮我创建卡片"

        with patch("threading.Thread", _ImmediateThread):
            sidebar.send_message()

        # chat 被调用
        ai_manager.chat.assert_called_once()
        # 工具解析+执行被调用
        card_tools.parse_tool_call.assert_called_once()
        card_tools.execute_tool.assert_called_once_with(
            "create_card", {"question": "Q", "answer": "A"}
        )


class TestOnEnter(unittest.TestCase):
    def test_enter_without_shift_returns_break(self):
        sidebar = _make_sidebar()
        sidebar.send_message = MagicMock()
        event = MagicMock(state=0)

        result = sidebar.on_enter(event)

        self.assertEqual(result, "break")
        sidebar.send_message.assert_called_once()

    def test_enter_with_shift_does_nothing(self):
        sidebar = _make_sidebar()
        sidebar.send_message = MagicMock()
        event = MagicMock(state=0x1)

        result = sidebar.on_enter(event)

        self.assertIsNone(result)
        sidebar.send_message.assert_not_called()


class TestOnModelChange(unittest.TestCase):
    def test_model_change_updates_config(self):
        sidebar = _make_sidebar()
        mgr = sidebar.ai_manager

        sidebar.on_model_change("gpt-4")

        self.assertEqual(mgr.config.config["current_model"], "gpt-4")
        mgr.config.save_config.assert_called_once()


class TestUpdateModelDisplay(unittest.TestCase):
    def test_update_model_display_autofix_model(self):
        ai_manager = _make_ai_manager()
        # 故意塞一个不存在的 current_model，期望自动切到 providers 的第一个
        ai_manager.config.config["current_model"] = "not-exists"

        sidebar = _make_sidebar(ai_manager=ai_manager)
        sidebar.update_model_display()

        self.assertEqual(ai_manager.config.config["current_model"], "gpt-3.5-turbo")
        ai_manager.config.save_config.assert_called()


if __name__ == "__main__":
    unittest.main()