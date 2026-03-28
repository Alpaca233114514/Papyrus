"""MCP Vault双层架构演示脚本

演示如何使用新的Vault MCP工具：
1. vault_index - 获取笔记骨架索引
2. vault_read - 按需加载内容
3. vault_watch - 增量同步
4. vault_emergency_sample - 应急层

使用方式:
    python tools/vault_mcp_demo.py

环境要求:
    - Python 3.10+
    - 项目依赖已安装
"""

from __future__ import annotations

import json
import os
import sys

# 添加src到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from mcp.vault_tools import create_vault_tools
from papyrus.paths import DATABASE_FILE


def print_json(data: dict, title: str = "") -> None:
    """漂亮地打印JSON数据"""
    if title:
        print(f"\n{'='*60}")
        print(f"  {title}")
        print(f"{'='*60}")
    print(json.dumps(data, ensure_ascii=False, indent=2))


def demo_vault_index(vault) -> None:
    """演示vault_index工具"""
    print("\n" + "="*60)
    print("  Demo 1: vault_index - 获取Vault骨架索引")
    print("  用途: AI先看"地图"，知道有哪些笔记，不加载正文")
    print("="*60)
    
    # 基本查询
    print("\n[1.1] 获取所有笔记索引（默认50条）:")
    result = vault.vault_index(limit=10)
    if result["success"]:
        print(f"  找到 {result['total']} 条笔记")
        for note in result["notes"][:3]:  # 只显示前3条
            print(f"  - {note['id']}: {note['title']}")
            print(f"    标签: {note['tags']}, 字数: {note['word_count']}")
            print(f"    大纲: {[h['text'] for h in note['headings']]}")
            print(f"    出链: {note['outgoing_links']}")
            print(f"    入链数: {note['incoming_count']}")
    else:
        print(f"  错误: {result['error']}")
    
    # 标签过滤
    print("\n[1.2] 按标签过滤 (filter_tags=['AI']):")
    result = vault.vault_index(filter_tags=["AI"], limit=5)
    if result["success"]:
        print(f"  找到 {result['total']} 条带'AI'标签的笔记")
    
    # 标题搜索
    print("\n[1.3] 标题搜索 (query='算法'):")
    result = vault.vault_index(query="算法", limit=5)
    if result["success"]:
        print(f"  找到 {result['total']} 条匹配笔记")


def demo_vault_read(vault) -> None:
    """演示vault_read工具"""
    print("\n" + "="*60)
    print("  Demo 2: vault_read - 按需加载内容")
    print("  用途: AI根据索引选择要深入阅读的笔记")
    print("="*60)
    
    # 先获取一些笔记ID
    index_result = vault.vault_index(limit=5)
    if not index_result["success"] or not index_result["notes"]:
        print("  没有可读取的笔记")
        return
    
    note_ids = [n["id"] for n in index_result["notes"][:2]]
    print(f"\n  选择的笔记ID: {note_ids}")
    
    # 摘要模式
    print("\n[2.1] 摘要模式 (format='summary'):")
    result = vault.vault_read(ids=note_ids[:1], format="summary")
    if result["success"]:
        note = result["notes"][0]
        print(f"  笔记: {note['title']}")
        print(f"  摘要: {note['content'][:100]}...")
    
    # 全文模式
    print("\n[2.2] 全文模式 (format='full'):")
    result = vault.vault_read(ids=note_ids[:1], format="full")
    if result["success"]:
        note = result["notes"][0]
        print(f"  笔记: {note['title']}")
        print(f"  内容长度: {len(note['content'])} 字符")
    
    # 块模式（需要笔记有标题结构）
    print("\n[2.3] 块模式 (format='block', block_ref='方法'):")
    result = vault.vault_read(
        ids=note_ids[:1], 
        format="block", 
        block_ref="方法"
    )
    if result["success"] and result["notes"]:
        note = result["notes"][0]
        print(f"  笔记: {note['title']}")
        print(f"  块内容: {note['content'][:150]}...")
    
    # 带链接预览
    print("\n[2.4] 带链接预览 (include_links=True):")
    result = vault.vault_read(ids=note_ids[:1], include_links=True)
    if result["success"]:
        note = result["notes"][0]
        print(f"  笔记: {note['title']}")
        print(f"  链接预览数量: {len(note['links_preview'])}")
        for link in note["links_preview"]:
            print(f"    - {link['id']}: {link['preview'][:50]}...")


def demo_vault_watch(vault) -> None:
    """演示vault_watch工具"""
    print("\n" + "="*60)
    print("  Demo 3: vault_watch - 增量同步")
    print("  用途: 长会话中检查笔记是否被修改")
    print("="*60)
    
    import time
    
    # 模拟获取上次同步时间
    since = int(time.time()) - 86400  # 24小时前
    
    print(f"\n[3.1] 检查自 {since} 以来的变更:")
    result = vault.vault_watch(since=since)
    if result["success"]:
        data = result["data"]
        print(f"  服务器时间: {data['server_time']}")
        print(f"  变更笔记数: {len(data['changed'])}")
        for change in data["changed"][:3]:  # 只显示前3条
            print(f"    - {change['id']}: hash={change['new_hash']}")
    else:
        print(f"  错误: {result['error']}")


def demo_vault_emergency(vault) -> None:
    """演示vault_emergency_sample工具"""
    print("\n" + "="*60)
    print("  Demo 4: vault_emergency_sample - 应急层")
    print("  用途: 数据库损坏时直接扫描文件系统")
    print("="*60)
    
    print("\n[4.1] 应急采样 (sample_size=3):")
    result = vault.vault_emergency_sample(sample_size=3)
    
    print(f"  成功: {result['success']}")
    print(f"  应急模式: {result['emergency_mode']}")
    print(f"  警告: {result.get('warning', '无')}")
    print(f"  采样笔记数: {len(result['notes'])}")
    
    for note in result["notes"][:2]:  # 只显示前2条
        print(f"    - {note['id']}: {note['title']}")
        print(f"      预览: {note['preview'][:80]}...")


def main() -> None:
    """主函数"""
    print("="*60)
    print("  MCP Vault 双层架构演示")
    print("="*60)
    print(f"\n数据库路径: {DATABASE_FILE}")
    
    # 检查数据库是否存在
    if not os.path.exists(DATABASE_FILE):
        print(f"\n警告: 数据库文件不存在，某些演示可能无法正常工作")
        print(f"请先运行应用创建数据库")
    
    # 创建Vault工具实例
    vault = create_vault_tools(DATABASE_FILE)
    
    try:
        # 运行各个演示
        demo_vault_index(vault)
        demo_vault_read(vault)
        demo_vault_watch(vault)
        demo_vault_emergency(vault)
        
        print("\n" + "="*60)
        print("  演示完成!")
        print("="*60)
        
    except Exception as e:
        print(f"\n演示出错: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
