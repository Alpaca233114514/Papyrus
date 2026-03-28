"""MCP 本地服务器 - 通过 HTTP 暴露卡片工具接口和Vault工具接口"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Protocol, TypedDict, cast

class LoggerProtocol(Protocol):
    def info(self, message: str) -> None: ...


class ToolResult(TypedDict, total=False):
    success: bool
    error: str
    message: str
    count: int
    tool: str
    params: dict[str, object]
    tools: list[str]
    status: str
    categories: dict[str, list[str]]


class CallRequest(TypedDict):
    tool: str
    params: dict[str, object]


class CardToolsProtocol(Protocol):
    def execute_tool(self, tool_name: str, params: dict[str, object]) -> ToolResult: ...


class VaultToolsProtocol(Protocol):
    def execute_tool(self, tool_name: str, params: dict[str, object]) -> dict[str, object]: ...


class _ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True
    mcp_logger: LoggerProtocol | None
    mcp_card_tools: CardToolsProtocol | None
    mcp_vault_tools: VaultToolsProtocol | None


class _MCPHandler(BaseHTTPRequestHandler):
    """处理 MCP JSON-RPC 风格的请求"""

    @property
    def _typed_server(self) -> _ReusableHTTPServer:
        return cast(_ReusableHTTPServer, self.server)

    def log_message(self, format: str, *args: object) -> None:
        """覆盖默认日志，转发到 PapyrusLogger"""
        logger = self._typed_server.mcp_logger
        if logger is not None:
            logger.info(f"MCP: {format % args}")

    def _send_json(self, data: ToolResult, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _read_json_body(self) -> object:
        length_header = self.headers.get("Content-Length", "0")
        length = int(length_header)
        raw_body = self.rfile.read(length)
        return json.loads(raw_body.decode("utf-8"))

    def _normalize_call_request(self, raw: object) -> CallRequest | None:
        if not isinstance(raw, dict):
            return None

        tool_name = raw.get("tool")
        params = raw.get("params")
        if not isinstance(tool_name, str) or not tool_name:
            return None
        if params is None:
            params = {}
        if not isinstance(params, dict):
            return None

        return {
            "tool": tool_name,
            "params": {str(key): value for key, value in params.items()},
        }

    def do_OPTIONS(self) -> None:
        """处理 CORS 预检"""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json({"status": "ok"})
        elif self.path == "/tools":
            card_tools = [
                "search_cards",
                "get_card_stats",
                "create_card",
                "update_card",
                "delete_card",
            ]
            vault_tools = [
                "vault_index",
                "vault_read",
                "vault_watch",
                "vault_emergency_sample",
            ]
            self._send_json(
                {
                    "tools": card_tools + vault_tools,
                    "categories": {
                        "cards": card_tools,
                        "vault": vault_tools,
                    }
                }
            )
        else:
            self._send_json({"error": "未知路径"}, 404)

    def do_POST(self) -> None:
        if self.path != "/call":
            self._send_json({"error": "未知路径"}, 404)
            return

        card_tools = self._typed_server.mcp_card_tools
        vault_tools = self._typed_server.mcp_vault_tools
        
        # 检查至少有一个工具集可用
        if card_tools is None and vault_tools is None:
            self._send_json({"error": "工具未初始化"}, 503)
            return

        try:
            body_obj = self._read_json_body()
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            self._send_json({"error": "请求体不是合法 JSON"}, 400)
            return

        if not isinstance(body_obj, dict):
            self._send_json({"error": "请求体必须是对象"}, 400)
            return

        request = self._normalize_call_request(body_obj)
        if request is None:
            tool_value = body_obj.get("tool")
            params_value = body_obj.get("params")
            if not isinstance(tool_value, str) or not tool_value:
                self._send_json({"error": "缺少 tool 字段"}, 400)
                return
            if params_value is not None and not isinstance(params_value, dict):
                self._send_json({"error": "params 必须是对象"}, 400)
                return
            self._send_json({"error": "请求体格式无效"}, 400)
            return

        tool_name = request["tool"]
        params = request["params"]
        
        # 判断工具类型并路由
        vault_tool_names = {"vault_index", "vault_read", "vault_watch", "vault_emergency_sample"}
        
        if tool_name in vault_tool_names:
            if vault_tools is None:
                self._send_json({"error": "Vault工具未初始化"}, 503)
                return
            result = vault_tools.execute_tool(tool_name, params)
        else:
            if card_tools is None:
                self._send_json({"error": "Card工具未初始化"}, 503)
                return
            result = card_tools.execute_tool(tool_name, params)
        
        self._send_json(cast(ToolResult, result))


class MCPServer:
    """可在后台线程运行的轻量 MCP 服务器"""

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 9100,
        logger: LoggerProtocol | None = None,
        card_tools: CardToolsProtocol | None = None,
        vault_tools: VaultToolsProtocol | None = None,
    ) -> None:
        self.host = host
        self.port = port
        self.logger = logger
        self.card_tools = card_tools
        self.vault_tools = vault_tools
        self._httpd: _ReusableHTTPServer | None = None
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        """在守护线程中启动 HTTP 服务器"""
        if self._httpd is not None:
            return

        self._httpd = _ReusableHTTPServer((self.host, self.port), _MCPHandler)
        self._httpd.mcp_logger = self.logger
        self._httpd.mcp_card_tools = self.card_tools
        self._httpd.mcp_vault_tools = self.vault_tools

        self._thread = threading.Thread(target=self._httpd.serve_forever, daemon=True)
        self._thread.start()

        if self.logger is not None:
            self.logger.info(f"MCP 服务器已启动: http://{self.host}:{self.port}")

    def stop(self) -> None:
        """关闭服务器"""
        if self._httpd is None:
            return

        try:
            self._httpd.shutdown()
            self._httpd.server_close()
        finally:
            self._httpd = None

        if self._thread is not None:
            self._thread.join(timeout=2)
            self._thread = None

        if self.logger is not None:
            self.logger.info("MCP 服务器已停止")