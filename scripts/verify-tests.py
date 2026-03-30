#!/usr/bin/env python3
"""
测试准确性验证脚本
运行关键测试并验证其结果，确保测试本身的正确性
"""

import sys
import subprocess
import json
from pathlib import Path


def run_tests(test_path: str, timeout: int = 120) -> dict:
    """运行 pytest 并返回结果"""
    cmd = [
        sys.executable, "-m", "pytest",
        test_path,
        "-v",
        "--tb=short",
        "--json-report" if "pytest-json-report" in get_installed_packages() else "",
    ]
    cmd = [c for c in cmd if c]  # Remove empty strings
    
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=str(Path(__file__).parent.parent)
    )
    
    return {
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def get_installed_packages() -> set:
    """获取已安装的包列表"""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "list"],
            capture_output=True,
            text=True
        )
        return {line.split()[0].lower() for line in result.stdout.splitlines()[2:]}
    except:
        return set()


def verify_test_categories():
    """验证各个测试类别的准确性"""
    print("=" * 60)
    print("测试准确性验证")
    print("=" * 60)
    
    test_categories = [
        {
            "name": "API 模型测试",
            "path": "tests/test_api_simple.py",
            "description": "验证 Pydantic 模型和数据验证",
            "critical": True,
        },
        {
            "name": "AI 工具测试",
            "path": "tests/test_ai.py",
            "description": "验证 AI 卡片工具功能",
            "critical": True,
        },
        {
            "name": "MCP Vault 测试",
            "path": "tests/test_mcp_vault.py",
            "description": "验证 Vault 工具函数",
            "critical": True,
        },
        {
            "name": "集成测试",
            "path": "tests/test_integration.py",
            "description": "验证端到端流程",
            "critical": True,
        },
        {
            "name": "API 端点测试",
            "path": "tests/test_api.py::TestHealthEndpoint",
            "description": "验证健康检查端点",
            "critical": False,
            "timeout": 30,
        },
    ]
    
    results = []
    all_critical_passed = True
    
    for category in test_categories:
        print(f"\n📋 {category['name']}")
        print(f"   {category['description']}")
        print(f"   路径: {category['path']}")
        
        timeout = category.get('timeout', 120)
        result = run_tests(category['path'], timeout)
        
        if result['returncode'] == 0:
            print(f"   ✅ 通过")
            results.append({**category, "status": "passed"})
        else:
            print(f"   ❌ 失败")
            if category.get('critical'):
                all_critical_passed = False
            results.append({**category, "status": "failed"})
            
            # 打印错误摘要
            if "passed" in result['stdout']:
                lines = result['stdout'].split('\n')
                for line in lines:
                    if 'FAILED' in line or 'ERROR' in line:
                        print(f"      {line.strip()}")
    
    # 验证关键不变量
    print("\n" + "=" * 60)
    print("关键不变量验证")
    print("=" * 60)
    
    invariants = [
        verify_import_structure,
        verify_electron_paths,
        verify_pyinstaller_output,
    ]
    
    for invariant in invariants:
        name = invariant.__name__.replace('_', ' ').title()
        print(f"\n🔍 {name}...", end=' ')
        try:
            if invariant():
                print("✅ 通过")
            else:
                print("❌ 失败")
                all_critical_passed = False
        except Exception as e:
            print(f"❌ 错误: {e}")
            all_critical_passed = False
    
    # 总结
    print("\n" + "=" * 60)
    print("验证总结")
    print("=" * 60)
    
    passed = sum(1 for r in results if r['status'] == 'passed')
    total = len(results)
    
    print(f"测试类别: {passed}/{total} 通过")
    
    if all_critical_passed:
        print("✅ 所有关键验证通过")
        return 0
    else:
        print("❌ 关键验证失败")
        return 1


def verify_import_structure() -> bool:
    """验证导入结构正确"""
    try:
        # 验证核心模块可以导入
        from papyrus_api.main import app
        from papyrus.app import run_app
        from ai.tool_manager import ToolManager
        return True
    except ImportError as e:
        print(f"\n   导入失败: {e}")
        return False


def verify_electron_paths() -> bool:
    """验证 Electron 路径配置正确"""
    main_js = Path(__file__).parent.parent / "electron" / "main.js"
    if not main_js.exists():
        return False
    
    content = main_js.read_text()
    
    # 检查关键路径配置
    checks = [
        "process.resourcesPath" in content,
        "'python'" in content or '"python"' in content,  # Python 目录
        "Papyrus.exe" in content or "Papyrus" in content,  # 可执行文件名
    ]
    
    return all(checks)


def verify_pyinstaller_output() -> bool:
    """验证 PyInstaller 配置正确"""
    spec_file = Path(__file__).parent.parent / "PapyrusAPI.spec"
    if not spec_file.exists():
        return False
    
    content = spec_file.read_text()
    
    # 检查关键配置
    checks = [
        "Analysis" in content,
        "EXE(" in content,
        "console=True" in content,  # 需要控制台输出用于调试
    ]
    
    return all(checks)


if __name__ == "__main__":
    sys.exit(verify_test_categories())
