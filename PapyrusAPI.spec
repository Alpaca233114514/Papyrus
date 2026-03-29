# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for Papyrus FastAPI Backend (One Directory Mode)

This spec file is used to build the Python backend as a standalone directory
for use with the Electron frontend. One-dir mode is used to avoid antivirus
false positives that often occur with single-file executables.

Usage:
    pyinstaller PapyrusAPI.spec --clean

Output:
    dist-python/Papyrus/Papyrus.exe (Windows)
    dist-python/Papyrus/Papyrus (macOS/Linux)
"""
import sys
import os

block_cipher = None

# Get the project root directory
# When running pyinstaller from project root, use current working directory
project_root = os.getcwd()

# Prepare datas - only include directories that exist
datas = [
    ('assets', 'assets'),
]

# Include data directory if it exists (for CI environments)
if os.path.exists('data'):
    datas.append(('data', 'data'))

# Analysis configuration
a = Analysis(
    ['src/papyrus_api/main.py'],  # Entry point for the API server
    pathex=[
        project_root,
        os.path.join(project_root, 'src'),
    ],
    binaries=[],
    datas=datas,
    hiddenimports=[
        # FastAPI and related
        'fastapi',
        'fastapi.middleware.cors',
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        # Starlette
        'starlette',
        'starlette.middleware',
        'starlette.middleware.cors',
        # Pydantic
        'pydantic',
        'pydantic_core',
        # Python standard library modules that might be missed
        'json',
        'pathlib',
        'typing',
        'contextlib',
        'asyncio',
        'logging',
        'sqlite3',
        # Third-party dependencies
        'watchdog',
        'watchdog.observers',
        'watchdog.events',
        # Project modules - ai
        'ai',
        'ai.config',
        'ai.provider',
        'ai.sidebar_v3',
        'ai.tool_manager',
        'ai.tools',
        # Project modules - logger
        'logger',
        # Project modules - mcp
        'mcp',
        'mcp.server',
        'mcp.vault_tools',
        # Project modules - papyrus
        'papyrus',
        'papyrus.app',
        'papyrus.core',
        'papyrus.core.cards',
        'papyrus.data',
        'papyrus.data.database',
        'papyrus.data.notes_storage',
        'papyrus.data.progress',
        'papyrus.data.relations',
        'papyrus.data.storage',
        'papyrus.integrations',
        'papyrus.integrations.ai',
        'papyrus.integrations.file_watcher',
        'papyrus.integrations.logging',
        'papyrus.integrations.mcp',
        'papyrus.integrations.obsidian',
        'papyrus.logic',
        'papyrus.logic.sm2',
        'papyrus.paths',
        'papyrus.resources',
        # Project modules - papyrus_api
        'papyrus_api',
        'papyrus_api.deps',
        'papyrus_api.routers',
        'papyrus_api.routers.ai',
        'papyrus_api.routers.cards',
        'papyrus_api.routers.data',
        'papyrus_api.routers.logs',
        'papyrus_api.routers.notes',
        'papyrus_api.routers.progress',
        'papyrus_api.routers.relations',
        'papyrus_api.routers.review',
        'papyrus_api.routers.search',
        'papyrus_api.routers.vault',
        'papyrus_api.routers.update',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude unnecessary modules to reduce size
        'matplotlib',
        'numpy',
        'pandas',
        'tkinter',
        'PyQt5',
        'PyQt6',
        'PySide2',
        'PySide6',
        'wx',
        'scipy',
        'sklearn',
        'PIL',
        'Pillow',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
    optimize=1,
)

# Create the executable (One Directory Mode - with COLLECT)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Papyrus',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    console=False,  # No console window in production
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['assets/icon.ico'] if sys.platform == 'win32' else 'assets/icon.icns' if sys.platform == 'darwin' else 'assets/icon.png',
)

# Collect all files into a directory
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='Papyrus',
)
