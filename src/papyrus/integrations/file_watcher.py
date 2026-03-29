"""文件系统监听器 - 基于 watchdog。

监听笔记数据库和文件变化，通过回调通知变更事件。
支持 WebSocket 推送实时更新到前端。
"""

from __future__ import annotations

import os
import threading
import time
from typing import Protocol

# watchdog 未提供类型存根，需要忽略类型检查
from watchdog.observers import Observer  # type: ignore[import-untyped]
from watchdog.events import FileSystemEventHandler, FileModifiedEvent, FileCreatedEvent, FileDeletedEvent  # type: ignore[import-untyped]

from papyrus.paths import DATABASE_FILE, DATA_DIR


class ChangeCallback(Protocol):
    """变更回调函数协议"""
    def __call__(self, event_type: str, file_path: str) -> None: ...


class DatabaseChangeHandler(FileSystemEventHandler):  # type: ignore[misc]
    """数据库文件变更处理器"""
    
    def __init__(self, callback: ChangeCallback | None = None) -> None:
        self.callback = callback
        self._last_modified: dict[str, float] = {}
        self._debounce_seconds = 0.5  # 防抖时间
        
    def on_modified(self, event: FileModifiedEvent) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        
        # 处理 src_path 可能是 bytes 的情况
        src_path = event.src_path
        if isinstance(src_path, bytes):
            src_path = src_path.decode('utf-8')
        
        # 只监听数据库文件
        if not src_path.endswith(('.db', '.sqlite', '.sqlite3')):
            return
            
        # 防抖处理
        now = time.time()
        last = self._last_modified.get(src_path, 0)
        if now - last < self._debounce_seconds:
            return
        self._last_modified[src_path] = now
        
        if self.callback:
            self.callback("modified", src_path)
    
    def on_created(self, event: FileCreatedEvent) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        if self.callback:
            src_path = event.src_path
            if isinstance(src_path, bytes):
                src_path = src_path.decode('utf-8')
            self.callback("created", src_path)
    
    def on_deleted(self, event: FileDeletedEvent) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        if self.callback:
            src_path = event.src_path
            if isinstance(src_path, bytes):
                src_path = src_path.decode('utf-8')
            self.callback("deleted", src_path)


class FileWatcher:
    """文件系统监听器。
    
    基于 watchdog 监听文件变化，支持防抖和批量通知。
    
    Example:
        >>> def on_change(event_type: str, path: str) -> None:
        ...     print(f"文件{event_type}: {path}")
        >>> 
        >>> watcher = FileWatcher()
        >>> watcher.start(on_change)
        >>> # ... 运行中 ...
        >>> watcher.stop()
    """
    
    def __init__(self, watch_path: str | None = None) -> None:
        """初始化监听器。
        
        Args:
            watch_path: 监听路径，默认使用数据目录
        """
        self.watch_path = watch_path or os.path.dirname(DATABASE_FILE) or DATA_DIR
        self._observer: Observer | None = None
        self._callback: ChangeCallback | None = None
        self._lock = threading.Lock()
        self._running = False
        
    def start(self, callback: ChangeCallback) -> None:
        """启动监听。
        
        Args:
            callback: 变更回调函数
        """
        with self._lock:
            if self._running:
                return
                
            self._callback = callback
            
            # 确保目录存在
            os.makedirs(self.watch_path, exist_ok=True)
            
            handler = DatabaseChangeHandler(callback)
            observer = Observer()
            observer.schedule(handler, self.watch_path, recursive=True)
            observer.start()
            self._observer = observer
            self._running = True
            
    def stop(self) -> None:
        """停止监听"""
        with self._lock:
            if not self._running:
                return
                
            if self._observer is not None:
                self._observer.stop()
                self._observer.join(timeout=2)
            self._running = False
            self._observer = None
            
    def is_running(self) -> bool:
        """检查是否正在运行"""
        with self._lock:
            return self._running


# 全局监听器实例
_global_watcher: FileWatcher | None = None


def get_watcher(watch_path: str | None = None) -> FileWatcher:
    """获取全局监听器实例（单例）"""
    global _global_watcher
    if _global_watcher is None:
        _global_watcher = FileWatcher(watch_path)
    return _global_watcher


def start_file_watching(callback: ChangeCallback, watch_path: str | None = None) -> FileWatcher:
    """便捷函数：启动文件监听。
    
    Args:
        callback: 变更回调
        watch_path: 监听路径
        
    Returns:
        FileWatcher 实例
    """
    watcher = get_watcher(watch_path)
    watcher.start(callback)
    return watcher


def stop_file_watching() -> None:
    """便捷函数：停止文件监听"""
    global _global_watcher
    if _global_watcher:
        _global_watcher.stop()
        _global_watcher = None
