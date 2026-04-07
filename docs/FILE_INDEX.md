# Papyrus 全文件索引

> 版本: v2.0.0-beta.1  
> 生成时间: 2026-03-31  
> 最后更新: 2026-03-31 12:30  
> 本索引包含项目中所有重要文件及其功能说明

---

## 📁 根目录文件

| 文件 | 说明 |
|------|------|
| `README.md` | 项目主文档，包含功能介绍、快速开始、快捷键等 |
| `README-DEV.md` | 开发者文档，包含开发环境配置 |
| `CHANGELOG.md` | 版本更新日志 |
| `LICENSE` | MIT 开源许可证 |
| `package.json` | Node.js 项目配置，定义脚本和 Electron 构建设置 |
| `pyproject.toml` | Python 项目配置，包含依赖和 mypy 配置 |
| `requirements.txt` | Python 依赖列表 |
| `PapyrusAPI.spec` | PyInstaller API 服务打包配置 |
| `.electron-builder.config.js` | Electron Builder 配置 |
| `electron-builder.json` | Electron Builder 额外配置 |
| `ELECTRON.md` | Electron 相关文档 |
| `RELEASE_NOTES.md` | 发布说明 |
| `SECURITY_AUDIT_REPORT.md` | 安全审计报告 |
| `run.pyw` | 应用启动入口 |

---

## 🐍 Python 后端 (`src/`)

### 核心模块 (`src/papyrus/`)

| 文件 | 说明 |
|------|------|
| `papyrus/__init__.py` | 包初始化 |
| `papyrus/app.py` | 应用入口 |
| `papyrus/paths.py` | 路径常量定义 |
| `papyrus/resources.py` | 资源路径处理 |

#### 核心逻辑 (`src/papyrus/core/`)

| 文件 | 说明 |
|------|------|
| `core/__init__.py` | 包初始化 |
| `core/cards.py` | 卡片 CRUD 操作（UI 无关），支持线程安全 |

#### 数据存储 (`src/papyrus/data/`)

| 文件 | 说明 |
|------|------|
| `data/__init__.py` | 包初始化 |
| `data/storage.py` | 卡片数据 JSON 存取 |
| `data/notes_storage.py` | 笔记数据存取 |
| `data/database.py` | SQLite 数据库操作 |
| `data/progress.py` | 学习进度数据管理 |
| `data/relations.py` | 卡片关联关系管理 |

#### 算法实现 (`src/papyrus/logic/`)

| 文件 | 说明 |
|------|------|
| `logic/__init__.py` | 包初始化 |
| `logic/sm2.py` | SM-2 间隔重复算法实现 |

#### 第三方集成 (`src/papyrus/integrations/`)

| 文件 | 说明 |
|------|------|
| `integrations/__init__.py` | 包初始化 |
| `integrations/obsidian.py` | Obsidian Vault 导入支持 |
| `integrations/ai.py` | AI 功能集成 |
| `integrations/mcp.py` | MCP 协议集成 |
| `integrations/logging.py` | 日志集成 |
| `integrations/file_watcher.py` | 文件监控 |

### API 服务 (`src/papyrus_api/`)

| 文件 | 说明 |
|------|------|
| `papyrus_api/main.py` | FastAPI 主应用，包含所有路由注册 |
| `papyrus_api/deps.py` | 依赖注入和配置管理 |

#### API 路由 (`src/papyrus_api/routers/`)

| 文件 | 说明 | 路由前缀 |
|------|------|----------|
| `routers/__init__.py` | 路由导出 | - |
| `routers/cards.py` | 卡片管理 API | `/cards` |
| `routers/review.py` | 复习流程 API | `/review` |
| `routers/notes.py` | 笔记管理 API | `/notes` |
| `routers/vault.py` | Vault 管理 API | `/vault` |
| `routers/search.py` | 搜索功能 API | `/search` |
| `routers/ai.py` | AI 功能 API | `/ai` |
| `routers/data.py` | 数据导入导出 API | `/data` |
| `routers/relations.py` | 卡片关联 API | `/relations` |
| `routers/progress.py` | 学习进度 API | `/progress` |
| `routers/logs.py` | 日志查看 API | `/logs` |
| `routers/update.py` | 更新检查 API | `/update` |
| `routers/markdown.py` | Markdown 处理 API | `/markdown` |
| `routers/providers.py` | AI 提供商 API | `/providers` |
| `routers/mcp.py` | MCP 服务 API | `/mcp` |

### AI 模块 (`src/ai/`)

| 文件 | 说明 |
|------|------|
| `ai/__init__.py` | 包初始化 |
| `ai/config.py` | AI 配置管理（API Key、模型选择等） |
| `ai/provider.py` | AI 提供商接口（OpenAI、Anthropic、Ollama） |
| `ai/tools.py` | AI 工具调用定义 |
| `ai/tool_manager.py` | 工具调用管理器（审批流程） |
| `ai/sidebar_v3.py` | AI 侧边栏 UI（遗留） |

### MCP 服务 (`src/mcp/`)

| 文件 | 说明 |
|------|------|
| `mcp/__init__.py` | 包初始化 |
| `mcp/server.py` | MCP 服务器实现 |
| `mcp/vault_tools.py` | Vault 工具集 |

### 日志与工具 (`src/`)

| 文件 | 说明 |
|------|------|
| `logger.py` | 日志模块 |
| `Papyrus.py` | 兼容入口 |
| `Papyrus.pyw` | 兼容入口（无控制台） |

---

## ⚛️ React 前端 (`frontend/`)

### 配置与入口

| 文件 | 说明 |
|------|------|
| `package.json` | 前端依赖配置 |
| `vite.config.js` | Vite 构建配置 |
| `tsconfig.json` | TypeScript 配置 |
| `index.html` | HTML 入口 |

### 源码 (`frontend/src/`)

| 文件 | 说明 |
|------|------|
| `main.tsx` | 应用入口 |
| `App.tsx` | 根组件，页面路由管理 |
| `api.ts` | API 接口封装 |

#### 样式文件

| 文件 | 说明 |
|------|------|
| `theme.css` | 主题变量定义 |
| `tailwind.css` | Tailwind CSS 导入 |
| `a11y.css` | 无障碍全局样式 |

#### 公共组件 (`frontend/src/components/`)

| 文件 | 说明 |
|------|------|
| `SceneryBackground.tsx` | 窗景背景组件 |
| `SmartTextArea.tsx` | 智能文本输入区 |
| `ChatHistory.tsx` | 聊天历史组件 |
| `ChatHistory.css` | 聊天历史样式 |
| `ReasoningChain.tsx` | 推理链展示组件 |
| `ReasoningChain.css` | 推理链样式 |
| `ToolCallCard.tsx` | 工具调用卡片 |
| `ToolCallCard.css` | 工具卡片样式 |
| `TailwindExample.tsx` | Tailwind 示例组件 |

#### 自定义 Hooks (`frontend/src/hooks/`)

| 文件 | 说明 |
|------|------|
| `useScenery.ts` | 窗景背景 Hook |
| `useSceneryColor.ts` | 窗景颜色 Hook |
| `useShortcuts.ts` | 快捷键 Hook |
| `useCompletion.ts` | 自动补全 Hook |
| `useWebSocket.ts` | WebSocket Hook |

#### 图标组件 (`frontend/src/icons/`)

| 文件 | 说明 |
|------|------|
| `IconAccessibility.tsx` | 无障碍图标 |
| `IconAgentMode.tsx` | Agent 模式图标 |
| `IconCharts.tsx` | 图表图标 |
| `IconScroll.tsx` | 卷轴图标 |
| `svgs/accessibility.svg` | 无障碍图标 SVG 源文件 |

#### 页面组件

**开始页面 (`frontend/src/StartPage/`)**

| 文件 | 说明 |
|------|------|
| `StartPage.tsx` | 开始页面主组件 |
| `RecentNotes.tsx` | 最近笔记组件 |
| `RecentScrolls.tsx` | 最近卷轴组件 |
| `ReviewQueue.tsx` | 复习队列组件 |
| `LatticeOverlay.tsx` | 网格覆盖层 |
| `sceneryContent.ts` | 窗景内容数据 |
| `sceneryData.ts` | 窗景配置数据 |
| `solarTerms.ts` | 二十四节气数据 |

**卷轴页面 (`frontend/src/ScrollPage/`)**

| 文件 | 说明 |
|------|------|
| `ScrollPage.tsx` | 卷轴复习页面 |
| `FlashcardStudy.tsx` | 闪卡学习组件 |

**笔记页面 (`frontend/src/NotesPage/`)**

| 文件 | 说明 |
|------|------|
| `NotesPage.tsx` | 笔记页面主组件 |
| `types.ts` | 类型定义 |
| `constants.ts` | 常量定义 |
| `useNotes.ts` | 笔记数据 Hook |

笔记页面组件 (`frontend/src/NotesPage/components/`)

| 文件 | 说明 |
|------|------|
| `index.ts` | 组件导出 |
| `AddCard.tsx` | 添加卡片组件 |
| `FileTree.tsx` | 文件树组件 |
| `FolderTab.tsx` | 文件夹标签 |
| `NoteCard.tsx` | 笔记卡片组件 |
| `StatsBar.tsx` | 统计栏组件 |

笔记关联组件 (`frontend/src/NotesPage/components/Relations/`)

| 文件 | 说明 |
|------|------|
| `index.ts` | 组件导出 |
| `RelationGraph.tsx` | 关联图谱组件 |
| `RelationsPanel.tsx` | 关联面板组件 |
| `types.ts` | 类型定义 |

笔记页面视图 (`frontend/src/NotesPage/views/`)

| 文件 | 说明 |
|------|------|
| `NoteListView.tsx` | 笔记列表视图 |
| `NoteDetailView.tsx` | 笔记详情视图 |

**统计页面 (`frontend/src/ChartsPage/`)**

| 文件 | 说明 |
|------|------|
| `ChartsPage.tsx` | 统计图表页面 |

**文件页面 (`frontend/src/FilesPage/`)**

| 文件 | 说明 |
|------|------|
| `FilesPage.tsx` | 文件管理页面 |
| `FileIcon.tsx` | 文件图标组件 |
| `ZipIcon.tsx` | ZIP 图标组件 |

**扩展页面 (`frontend/src/ExtensionsPage/`)**

| 文件 | 说明 |
|------|------|
| `ExtensionsPage.tsx` | 扩展管理页面 |

**设置页面 (`frontend/src/SettingsPage/`)**

| 文件 | 说明 |
|------|------|
| `SettingsPage.tsx` | 设置页面主组件 |
| `SettingsPage.css` | 设置页面样式 |
| `README.md` | 设置页面开发文档 |

设置页面组件 (`frontend/src/SettingsPage/components/`)

| 文件 | 说明 |
|------|------|
| `index.ts` | 组件导出 |
| `SettingsSidebar.tsx` | 设置侧边栏 |

设置页面视图 (`frontend/src/SettingsPage/views/`)

| 文件 | 说明 |
|------|------|
| `index.ts` | 视图导出 |
| `GeneralView.tsx` | 常规设置 |
| `AppearanceView.tsx` | 外观设置 |
| `AccessibilityView.tsx` | 无障碍设置 |
| `ChatView.tsx` | 聊天设置 |
| `DataView.tsx` | 数据管理 |
| `McpView.tsx` | MCP 设置 |
| `ShortcutsView.tsx` | 快捷键设置 |
| `AboutView.tsx` | 关于页面 |

设置页面 Hooks (`frontend/src/SettingsPage/hooks/`)

| 文件 | 说明 |
|------|------|
| `useSettings.ts` | 设置数据 Hook |

#### 布局组件

| 文件 | 说明 |
|------|------|
| `Sidebar.tsx` | 侧边导航栏 |
| `Sidebar.css` | 侧边栏样式 |
| `TitleBar.tsx` | 顶部标题栏 |
| `TitleBar.css` | 标题栏样式 |
| `StatusBar.tsx` | 底部状态栏 |
| `StatusBar.css` | 状态栏样式 |
| `SearchBox.tsx` | 全局搜索组件 |
| `ChatPanel.tsx` | AI 聊天面板 |
| `ChatPanel.css` | 聊天面板样式 |

#### 类型定义 (`frontend/src/types/`)

| 文件 | 说明 |
|------|------|
| `electron.d.ts` | Electron API 类型声明 |

---

## 📚 文档 (`docs/`)

### 主文档

| 文件 | 说明 |
|------|------|
| `README.md` | 文档导航 |
| `PROJECT_STRUCTURE.md` | 项目结构说明 |
| `API.md` | API 接口文档 |
| `AI_README.md` | AI 功能说明 |
| `AI_TOOLS_DEMO.md` | AI 工具演示 |
| `EXTENSIONS.md` | 扩展开发指南 |
| `COMPLETION_DEMO.md` | 补全功能演示 |
| `sqlite_migration.md` | SQLite 迁移文档 |
| `tool_call_approval.md` | 工具调用审批流程 |

### 使用指南 (`docs/guides/`)

| 文件 | 说明 |
|------|------|
| `QUICKSTART.md` | 快速启动指南 |
| `VERSION.md` | 版本信息 |
| `CHANGELOG.md` | 更新日志格式 |
| `ENVIRONMENT_REQUIREMENTS.md` | 环境要求 |
| `RELEASE.md` | 发布流程 |
| `ARTIFACTS.md` | 构建产物说明 |

#### 无障碍文档

| 文件 | 说明 |
|------|------|
| `ACCESSIBILITY_GUIDE.md` | 无障碍开发指南 |
| `A11Y_IMPLEMENTATION.md` | 无障碍实施记录 |
| `A11Y_SETTINGS.md` | 无障碍设置说明 |

#### 功能文档

| 文件 | 说明 |
|------|------|
| `UI_TOKENS.md` | UI 设计变量 |
| `INPUT_FEATURES.md` | 输入功能说明 |
| `SCENERY_DESIGN_GUIDE.md` | 窗景设计指南 |
| `API_FASTAPI.md` | FastAPI 开发说明 |

---

## 🧪 测试 (`tests/`)

| 文件 | 说明 |
|------|------|
| `test_papyrus.py` | 核心功能测试 |
| `test_api.py` | API 测试 |
| `test_api_simple.py` | 简单 API 测试（待合并） |
| `test_ai.py` | AI 功能测试 |
| `test_sidebar_v3.py` | 侧边栏测试 |
| `test_integration.py` | 集成测试 |
| `test_mcp_vault.py` | MCP Vault 测试 |

---

## 🔧 脚本 (`scripts/`)

| 文件 | 说明 |
|------|------|
| `build-electron.js` | Electron 构建脚本 |
| `extract-changelog.js` | 更新日志提取脚本 |
| `download-artifacts.js` | 构建产物下载脚本 |
| `download-artifacts.bat` | 构建产物下载 (Windows) |
| `download-artifacts.sh` | 构建产物下载 (Unix) |
| `get-changelog.bat` | 获取更新日志 (Windows) |
| `get-changelog.sh` | 获取更新日志 (Unix) |
| `test-build-local.ps1` | 本地构建测试 (PowerShell) |
| `test-build-local.sh` | 本地构建测试 (Shell) |

---

## 🖥️ Electron (`electron/`)

| 文件 | 说明 |
|------|------|
| `main.js` | Electron 主进程 |
| `preload.js` | 预加载脚本 |

---

## 📂 数据目录

| 目录 | 说明 |
|------|------|
| `data/` | 用户数据存储（不进 Git） |
| `backup/` | 自动备份目录 |
| `logs/` | 日志文件目录 |

---

## 🎨 资源 (`assets/`)

| 文件 | 说明 |
|------|------|
| `icon.ico` | Windows 应用图标 |
| `icon.icns` | macOS 应用图标 |
| `icon.png` | Linux 应用图标 |

---

## ⚙️ 构建配置 (`build/`)

| 文件 | 说明 |
|------|------|
| `installer.nsh` | NSIS 安装脚本 |
| `root-ca.cer` | 根证书 |

---

## 📋 文件统计

| 类别 | 数量 |
|------|------|
| Python 源码文件 | ~40 |
| TypeScript/TSX 文件 | ~60 |
| CSS 样式文件 | ~15 |
| 测试文件 | 7 |
| 文档文件 | 25 |
| 脚本文件 | 9 |

---

## 📄 相关文档

| 文档 | 说明 |
|------|------|
| `docs/PRD.md` | 产品需求文档（本索引的补充） |
| `docs/PROJECT_STRUCTURE.md` | 项目架构详细说明 |
| `docs/API.md` | API 接口文档 |

## 🔍 关键入口点

| 用途 | 入口文件 |
|------|----------|
| 桌面应用启动 | `run.pyw` |
| Python 后端服务 | `src/papyrus_api/main.py` |
| 前端开发 | `frontend/src/main.tsx` |
| Electron 主进程 | `electron/main.js` |
| 测试运行 | `tests/test_*.py` |
