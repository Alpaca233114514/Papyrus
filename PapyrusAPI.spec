# -*- mode: python ; coding: utf-8 -*-
"""精简版 PyInstaller 配置 - 仅包含 API 必需模块"""
import sys

block_cipher = None

a = Analysis(
    ['src/Papyrus.py'],
    pathex=['src'],
    binaries=[],
    datas=[
        ('src/papyrus', 'papyrus'),
        ('src/papyrus_api', 'papyrus_api'),
        ('src/ai', 'ai'),
        ('src/mcp', 'mcp'),
        ('src/logger.py', '.'),
    ],
    hiddenimports=[
        # 核心模块
        'papyrus.core.cards',
        'papyrus.data.database',
        'papyrus.data.notes_storage',
        'papyrus.data.storage',
        'papyrus.data.relations',
        'papyrus.data.progress',
        'papyrus.paths',
        'papyrus.resources',
        # API
        'papyrus_api.main',
        'papyrus_api.deps',
        # 路由
        'papyrus_api.routers.cards',
        'papyrus_api.routers.review',
        'papyrus_api.routers.notes',
        'papyrus_api.routers.vault',
        'papyrus_api.routers.search',
        'papyrus_api.routers.ai',
        'papyrus_api.routers.data',
        'papyrus_api.routers.relations',
        'papyrus_api.routers.progress',
        'papyrus_api.routers.logs',
        'papyrus_api.routers.update',
        'papyrus_api.routers.markdown',
        'papyrus_api.routers.mcp',
        # AI 模块
        'ai.config',
        'ai.provider',
        'ai.tools',
        'ai.tool_manager',
        # MCP
        'mcp.server',
        'mcp.vault_tools',
        # 依赖
        'uvicorn',
        'fastapi',
        'pydantic',
        'starlette',
        'requests',
        'watchdog',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
        'PIL',
        'pytest',
        'mypy',
        'pyinstaller',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='Papyrus',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # 开启控制台以便调试
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['assets/icon.ico'] if sys.platform == 'win32' else None,
)
