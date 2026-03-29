#!/usr/bin/env python3
"""
Papyrus 扩展示例 - Python 版本

这是一个完整的扩展示例，展示了如何使用 Papyrus MCP API。
可以在此基础上开发自己的扩展功能。
"""

import requests
import sys
from datetime import datetime
from typing import List, Dict, Optional


class PapyrusClient:
    """Papyrus API 客户端"""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
    
    def check_connection(self) -> bool:
        """检查 Papyrus 是否运行"""
        try:
            r = requests.get(f"{self.api_url}/health", timeout=5)
            return r.status_code == 200 and r.json().get("status") == "ok"
        except requests.exceptions.ConnectionError:
            return False
    
    def list_notes(self) -> List[Dict]:
        """获取所有笔记列表"""
        r = requests.get(f"{self.api_url}/mcp/notes")
        r.raise_for_status()
        return r.json()["notes"]
    
    def get_note(self, note_id: str) -> Dict:
        """获取单篇笔记"""
        r = requests.get(f"{self.api_url}/mcp/notes/{note_id}")
        r.raise_for_status()
        return r.json()
    
    def create_note(self, title: str, content: str, tags: List[str] = None) -> str:
        """
        创建新笔记
        
        Args:
            title: 笔记标题
            content: Markdown 内容
            tags: 标签列表
            
        Returns:
            新笔记的 ID
        """
        data = {
            "title": title,
            "content": content,
            "tags": tags or []
        }
        r = requests.post(f"{self.api_url}/mcp/notes", json=data)
        r.raise_for_status()
        result = r.json()
        return result["id"]
    
    def update_note(self, note_id: str, **kwargs) -> bool:
        """更新笔记"""
        r = requests.patch(f"{self.api_url}/mcp/notes/{note_id}", json=kwargs)
        r.raise_for_status()
        return r.json()["success"]
    
    def search_notes(self, query: str, limit: int = 10) -> List[Dict]:
        """
        搜索笔记
        
        Args:
            query: 搜索关键词
            limit: 最大返回数量
            
        Returns:
            搜索结果列表
        """
        data = {
            "query": query,
            "search_content": True,
            "limit": limit
        }
        r = requests.post(f"{self.api_url}/mcp/notes/search", json=data)
        r.raise_for_status()
        return r.json()["results"]
    
    def render_markdown(self, content: str) -> str:
        """将 Markdown 渲染为 HTML"""
        r = requests.post(
            f"{self.api_url}/markdown/render",
            json={"content": content}
        )
        r.raise_for_status()
        return r.json()["html"]


class DailyNoteExtension:
    """
    每日笔记扩展示例
    
    自动创建今天的日记笔记，如果不存在的话。
    """
    
    EXTENSION_TAG = "daily-note"
    
    def __init__(self, client: PapyrusClient):
        self.client = client
    
    def run(self):
        """运行扩展"""
        print("🔍 检查今日日记...")
        
        today = datetime.now().strftime("%Y-%m-%d")
        title = f"日记: {today}"
        
        # 搜索是否已有今日日记
        results = self.client.search_notes(title, limit=5)
        existing = [r for r in results if self.EXTENSION_TAG in r.get("tags", [])]
        
        if existing:
            print(f"✅ 今日日记已存在: {existing[0]['id']}")
            return existing[0]["id"]
        
        # 创建新日记
        template = f"""# {today} 日记

## 今日计划
- [ ] 

## 今日记录

## 待办事项

## 笔记

---
创建于 {datetime.now().strftime("%H:%M")}
"""
        
        note_id = self.client.create_note(
            title=title,
            content=template,
            tags=[self.EXTENSION_TAG, "diary", today]
        )
        
        print(f"✅ 已创建今日日记: {note_id}")
        return note_id


class QuickClipperExtension:
    """
    快速剪藏扩展示例
    
    模拟从其他来源快速保存内容到 Papyrus。
    """
    
    EXTENSION_TAG = "quick-clipper"
    
    def __init__(self, client: PapyrusClient):
        self.client = client
    
    def clip(self, source: str, content: str, summary: str = ""):
        """
        剪藏内容
        
        Args:
            source: 来源标识（如 "clipboard", "web", "email"）
            content: 剪藏内容
            summary: 摘要/标题
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        
        if not summary:
            summary = f"剪藏 from {source}"
        
        note_content = f"""# {summary}

**来源:** {source}  
**时间:** {timestamp}

---

{content}
"""
        
        note_id = self.client.create_note(
            title=summary,
            content=note_content,
            tags=[self.EXTENSION_TAG, source, "clipped"]
        )
        
        print(f"✅ 已剪藏到笔记: {note_id}")
        return note_id


def main():
    """主程序"""
    print("🚀 Papyrus 扩展示例")
    print("=" * 40)
    
    # 初始化客户端
    client = PapyrusClient()
    
    # 检查连接
    print("\n📡 检查 Papyrus 连接...")
    if not client.check_connection():
        print("❌ 错误: 无法连接到 Papyrus")
        print("请确保 Papyrus 应用正在运行。")
        sys.exit(1)
    
    print("✅ 已连接到 Papyrus")
    
    # 演示 1: 获取笔记列表
    print("\n📝 获取笔记列表...")
    notes = client.list_notes()
    print(f"   共有 {len(notes)} 篇笔记")
    for note in notes[:3]:  # 只显示前 3 篇
        print(f"   - {note['title']} ({note['word_count']} 字)")
    
    # 演示 2: 每日笔记扩展
    print("\n📅 运行每日笔记扩展...")
    daily_ext = DailyNoteExtension(client)
    daily_ext.run()
    
    # 演示 3: 快速剪藏扩展
    print("\n✂️ 运行快速剪藏扩展...")
    clipper = QuickClipperExtension(client)
    clipper.clip(
        source="clipboard",
        content="这是从剪贴板保存的内容示例。\n\n可以包含多行文本。",
        summary="剪贴板内容 " + datetime.now().strftime("%H:%M")
    )
    
    # 演示 4: 搜索功能
    print("\n🔍 搜索笔记...")
    results = client.search_notes("剪藏", limit=5)
    print(f"   找到 {len(results)} 个结果")
    for result in results:
        print(f"   - {result['title']}")
    
    # 演示 5: Markdown 渲染
    print("\n🎨 渲染 Markdown...")
    html = client.render_markdown("# Hello\n\n**Bold** and *italic*")
    print(f"   渲染结果长度: {len(html)} 字符")
    
    print("\n✅ 所有演示完成!")


if __name__ == "__main__":
    main()
