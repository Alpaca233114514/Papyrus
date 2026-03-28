"""工具调用管理器 - 管理待审批的工具调用。

提供工具调用的审批队列管理，支持自动执行和人工审批两种模式。
"""

from __future__ import annotations

import time
import uuid
from enum import Enum
from typing import Any, TypedDict


class ToolCallStatus(str, Enum):
    """工具调用状态枚举。"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTING = "executing"
    SUCCESS = "success"
    FAILED = "failed"


class ToolCallConfig(TypedDict):
    """工具调用配置。"""
    mode: str  # "auto" 或 "manual"
    auto_execute_tools: list[str]  # 自动执行的工具列表


class ToolCallRecord(TypedDict):
    """工具调用记录。"""
    call_id: str
    tool_name: str
    params: dict[str, Any]
    status: str
    result: dict[str, Any] | None
    created_at: float
    executed_at: float | None
    error: str | None


class ToolExecutionResult(TypedDict):
    """工具执行结果。"""
    success: bool
    result: dict[str, Any] | None
    error: str | None


class ToolManager:
    """工具调用管理器。
    
    管理待审批的工具调用队列，支持自动执行和人工审批模式。
    """
    
    def __init__(self) -> None:
        """初始化工具管理器。"""
        self._pending_calls: dict[str, ToolCallRecord] = {}
        self._all_calls: dict[str, ToolCallRecord] = {}
        self._config: ToolCallConfig = {
            "mode": "manual",  # 默认为人工审批模式
            "auto_execute_tools": ["search_cards", "get_card_stats"],  # 默认自动执行只读工具
        }
    
    def get_config(self) -> ToolCallConfig:
        """获取当前配置。
        
        Returns:
            当前工具调用配置
        """
        return self._config.copy()
    
    def set_config(self, config: ToolCallConfig) -> None:
        """设置配置。
        
        Args:
            config: 新的配置
        """
        self._config = config.copy()
    
    def update_config(self, **kwargs: Any) -> None:
        """更新配置项。
        
        Args:
            **kwargs: 要更新的配置项
        """
        for key, value in kwargs.items():
            if key in self._config:
                self._config[key] = value  # type: ignore[literal-required]
    
    def should_auto_execute(self, tool_name: str) -> bool:
        """检查是否应该自动执行指定工具。
        
        Args:
            tool_name: 工具名称
            
        Returns:
            是否应该自动执行
        """
        if self._config["mode"] == "auto":
            return True
        return tool_name in self._config.get("auto_execute_tools", [])
    
    def create_pending_call(
        self,
        tool_name: str,
        params: dict[str, Any],
    ) -> str:
        """创建待审批的工具调用。
        
        Args:
            tool_name: 工具名称
            params: 工具参数
            
        Returns:
            工具调用ID
        """
        call_id = f"tc_{uuid.uuid4().hex[:16]}"
        record: ToolCallRecord = {
            "call_id": call_id,
            "tool_name": tool_name,
            "params": params,
            "status": ToolCallStatus.PENDING,
            "result": None,
            "created_at": time.time(),
            "executed_at": None,
            "error": None,
        }
        self._pending_calls[call_id] = record
        self._all_calls[call_id] = record
        return call_id
    
    def get_pending_calls(self) -> list[ToolCallRecord]:
        """获取所有待审批的工具调用。
        
        Returns:
            待审批的工具调用列表
        """
        return [
            call.copy() for call in self._pending_calls.values()
            if call["status"] == ToolCallStatus.PENDING
        ]
    
    def get_call(self, call_id: str) -> ToolCallRecord | None:
        """获取指定工具调用记录。
        
        Args:
            call_id: 工具调用ID
            
        Returns:
            工具调用记录，如果不存在则返回None
        """
        record = self._all_calls.get(call_id)
        if record:
            return record.copy()
        return None
    
    def approve_call(self, call_id: str) -> ToolCallRecord | None:
        """批准工具调用。
        
        将工具调用状态从 pending 改为 approved。
        
        Args:
            call_id: 工具调用ID
            
        Returns:
            更新后的工具调用记录，如果不存在则返回None
        """
        record = self._pending_calls.get(call_id)
        if not record:
            return None
        
        if record["status"] != ToolCallStatus.PENDING:
            return None
        
        record["status"] = ToolCallStatus.APPROVED
        return record.copy()
    
    def reject_call(self, call_id: str, reason: str | None = None) -> ToolCallRecord | None:
        """拒绝工具调用。
        
        Args:
            call_id: 工具调用ID
            reason: 拒绝原因
            
        Returns:
            更新后的工具调用记录，如果不存在则返回None
        """
        record = self._pending_calls.get(call_id)
        if not record:
            return None
        
        if record["status"] != ToolCallStatus.PENDING:
            return None
        
        record["status"] = ToolCallStatus.REJECTED
        record["error"] = reason or "用户拒绝执行"
        # 从待审批队列中移除
        del self._pending_calls[call_id]
        return record.copy()
    
    def mark_executing(self, call_id: str) -> ToolCallRecord | None:
        """标记工具调用为执行中。
        
        Args:
            call_id: 工具调用ID
            
        Returns:
            更新后的工具调用记录，如果不存在则返回None
        """
        record = self._all_calls.get(call_id)
        if not record:
            return None
        
        record["status"] = ToolCallStatus.EXECUTING
        return record.copy()
    
    def complete_call(
        self,
        call_id: str,
        result: dict[str, Any],
    ) -> ToolCallRecord | None:
        """完成工具调用。
        
        Args:
            call_id: 工具调用ID
            result: 执行结果
            
        Returns:
            更新后的工具调用记录，如果不存在则返回None
        """
        record = self._pending_calls.pop(call_id, None)
        if not record:
            record = self._all_calls.get(call_id)
        
        if not record:
            return None
        
        record["status"] = ToolCallStatus.SUCCESS
        record["result"] = result
        record["executed_at"] = time.time()
        return record.copy()
    
    def fail_call(
        self,
        call_id: str,
        error: str,
    ) -> ToolCallRecord | None:
        """标记工具调用失败。
        
        Args:
            call_id: 工具调用ID
            error: 错误信息
            
        Returns:
            更新后的工具调用记录，如果不存在则返回None
        """
        record = self._pending_calls.pop(call_id, None)
        if not record:
            record = self._all_calls.get(call_id)
        
        if not record:
            return None
        
        record["status"] = ToolCallStatus.FAILED
        record["error"] = error
        record["executed_at"] = time.time()
        return record.copy()
    
    def get_all_calls(
        self,
        limit: int = 100,
        status: str | None = None,
    ) -> list[ToolCallRecord]:
        """获取所有工具调用记录。
        
        Args:
            limit: 返回的最大记录数
            status: 按状态过滤
            
        Returns:
            工具调用记录列表
        """
        calls = list(self._all_calls.values())
        
        if status:
            calls = [c for c in calls if c["status"] == status]
        
        # 按创建时间倒序
        calls.sort(key=lambda x: x["created_at"], reverse=True)
        
        return [call.copy() for call in calls[:limit]]
    
    def clear_history(self, keep_pending: bool = True) -> int:
        """清理历史记录。
        
        Args:
            keep_pending: 是否保留待审批的调用
            
        Returns:
            清理的记录数
        """
        if keep_pending:
            # 保留待审批的调用
            pending_ids = set(self._pending_calls.keys())
            cleared = len(self._all_calls) - len(pending_ids)
            self._all_calls = {
                k: v for k, v in self._all_calls.items()
                if k in pending_ids
            }
        else:
            cleared = len(self._all_calls)
            self._all_calls.clear()
            self._pending_calls.clear()
        
        return cleared


# 全局工具管理器实例
_tool_manager: ToolManager | None = None


def get_tool_manager() -> ToolManager:
    """获取全局工具管理器实例。
    
    Returns:
        工具管理器实例
    """
    global _tool_manager
    if _tool_manager is None:
        _tool_manager = ToolManager()
    return _tool_manager


