# Papyrus 项目结构说明

## 项目概览

Papyrus 是一个现代化的桌面学习应用，采用 **Python FastAPI 后端 + React TypeScript 前端** 架构。

---

## 目录结构

```text
Papyrus/
├── src/                           # Python 后端源码
│   ├── Papyrus.py                 # 兼容入口（shim）
│   ├── Papyrus.pyw                # 兼容入口（无控制台）
│   │
│   ├── papyrus/                   # 主程序包
│   │   ├── app.py                 # 应用入口，启动 FastAPI
│   │   ├── paths.py               # 路径常量
│   │   ├── resources.py           # 资源路径处理
│   │   ├── core/                  # 核心逻辑
│   │   │   ├── __init__.py
│   │   │   └── cards.py           # 卡片操作（UI-agnostic）
│   │   ├── data/                  # 数据存储
│   │   │   ├── __init__.py
│   │   │   ├── storage.py         # 卡片数据存取
│   │   │   └── notes_storage.py   # 笔记数据存取
│   │   ├── logic/                 # 算法实现
│   │   │   ├── __init__.py
│   │   │   └── sm2.py             # SM-2 间隔重复算法
│   │   ├── ui/                    # UI 组件（遗留）
│   │   │   ├── __init__.py
│   │   │   ├── ai_placeholder.py
│   │   │   └── main_ui.py
│   │   └── integrations/          # 第三方集成
│   │       ├── __init__.py
│   │       ├── ai.py              # AI 集成
│   │       ├── logging.py         # 日志集成
│   │       ├── mcp.py             # MCP 集成
│   │       └── obsidian.py        # Obsidian Vault 导入
│   │
│   ├── papyrus_api/               # FastAPI 后端
│   │   ├── __init__.py
│   │   └── main.py                # FastAPI 应用主文件
│   │
│   ├── ai/                        # AI 功能模块
│   │   ├── __init__.py
│   │   ├── config.py              # AI 配置管理
│   │   ├── provider.py            # AI 提供商接口
│   │   ├── sidebar_v3.py          # AI 侧边栏 UI（遗留）
│   │   └── tools.py               # AI 工具调用
│   │
│   ├── mcp/                       # MCP 服务
│   │   ├── __init__.py
│   │   └── server.py
│   │
│   └── logger.py                  # 日志模块
│
├── frontend/                      # React + TypeScript 前端
│   ├── package.json
│   ├── vite.config.js
│   ├── tsconfig.json
│   ├── index.html
│   │
│   └── src/
│       ├── main.tsx               # 应用入口
│       ├── App.tsx                # 根组件
│       ├── api.ts                 # API 接口
│       ├── a11y.css               # ✅ 无障碍全局样式
│       │
│       ├── components/            # 公共组件
│       │   └── SceneryBackground.tsx
│       │
│       ├── icons/                 # 图标组件
│       │   ├── IconAccessibility.tsx    # ✅ 无障碍图标
│       │   ├── IconAgentMode.tsx
│       │   ├── IconCharts.tsx
│       │   ├── IconScroll.tsx
│       │   └── svgs/              # SVG 源文件
│       │       └── accessibility.svg    # ✅ 无障碍图标源文件
│       │
│       ├── hooks/                 # 自定义 Hooks
│       │   └── useScenery.ts
│       │
│       ├── StartPage/             # 开始页面
│       │   ├── StartPage.tsx
│       │   ├── RecentNotes.tsx
│       │   ├── RecentScrolls.tsx
│       │   ├── ReviewQueue.tsx
│       │   └── StartPage.css
│       │
│       ├── ScrollPage/            # 卷轴页面
│       │   ├── ScrollPage.tsx
│       │   ├── FlashcardStudy.tsx
│       │   └── ScrollPage.css
│       │
│       ├── NotesPage/             # 笔记页面
│       │   ├── NotesPage.tsx
│       │   ├── components/
│       │   ├── views/
│       │   └── NotesPage.css
│       │
│       ├── SettingsPage/          # 设置页面
│       │   ├── SettingsPage.tsx   # ✅ 包含无障碍设置
│       │   └── SettingsPage.css
│       │
│       ├── ChartsPage/            # 统计页面
│       │   └── ChartsPage.tsx
│       │
│       ├── FilesPage/             # 文件页面
│       │   └── FilesPage.tsx
│       │
│       ├── ExtensionsPage/        # 扩展页面
│       │   └── ExtensionsPage.tsx
│       │
│       ├── Sidebar.tsx            # 侧边栏
│       ├── Sidebar.css
│       ├── TitleBar.tsx           # 标题栏
│       ├── TitleBar.css
│       ├── SearchBox.tsx          # 搜索组件
│       ├── ChatPanel.tsx          # 聊天面板
│       ├── ChatPanel.css
│       └── StatusBar.tsx          # 状态栏
│
├── docs/                          # 文档
│   ├── README.md                  # 文档导航
│   ├── PROJECT_STRUCTURE.md       # 本文件
│   ├── AI_README.md               # AI 功能说明
│   ├── AI_TOOLS_DEMO.md           # AI 工具演示
│   ├── API.md                     # API 文档
│   │
│   └── guides/                    # 使用指南
│       ├── QUICKSTART.md          # 快速启动
│       ├── VERSION.md             # 版本信息
│       ├── CHANGELOG.md           # 更新日志
│       ├── ENVIRONMENT_REQUIREMENTS.md  # 环境要求
│       ├── ACCESSIBILITY_GUIDE.md # ✅ 无障碍开发指南
│       ├── A11Y_IMPLEMENTATION.md # ✅ 无障碍实施记录
│       ├── A11Y_SETTINGS.md       # ✅ 无障碍设置说明
│       ├── UI_TOKENS.md           # UI 设计变量
│       ├── INPUT_FEATURES.md      # 输入功能说明
│       ├── SCENERY_DESIGN_GUIDE.md # 窗景设计指南
│       ├── API_FASTAPI.md         # FastAPI 说明
│       └── COMPLETION_DEMO.md     # 补全演示
│
├── data/                          # 用户数据（不进 Git）
│   ├── Papyrusdata.json           # 卡片数据
│   ├── ai_config.json             # AI 配置
│   └── notes.json                 # 笔记数据
│
├── backup/                        # 用户备份（不进 Git）
│
├── assets/                        # 资源文件
│   └── icon.ico                   # 应用图标
│
├── tests/                         # 测试代码
│
├── tools/                         # 工具脚本
│
├── logs/                          # 日志文件
│
├── run.pyw                        # 启动器
├── PapyrusAPI.spec                # PyInstaller 配置
├── requirements.txt               # Python 依赖
└── pyproject.toml                 # Python 项目配置
```

---

## 前端架构

### 技术栈
- **框架**: React 19 + TypeScript
- **UI 库**: Arco Design
- **构建工具**: Vite
- **样式**: CSS + CSS 变量

### 无障碍（a11y）文件

| 文件 | 说明 |
|------|------|
| `frontend/src/a11y.css` | 全局无障碍样式，包含焦点样式、Skip Link、减少动画等 |
| `frontend/src/icons/IconAccessibility.tsx` | 无障碍图标组件 |
| `frontend/src/icons/svgs/accessibility.svg` | 无障碍图标 SVG 源文件 |
| `docs/guides/ACCESSIBILITY_GUIDE.md` | 无障碍开发指南 |
| `docs/guides/A11Y_IMPLEMENTATION.md` | 无障碍改进实施记录 |
| `docs/guides/A11Y_SETTINGS.md` | 无障碍设置使用说明 |

### 核心组件

| 组件 | 功能 |
|------|------|
| `App.tsx` | 应用根组件，管理页面路由 |
| `Sidebar.tsx` | 侧边导航栏 |
| `TitleBar.tsx` | 顶部标题栏 |
| `SearchBox.tsx` | 全局搜索 |
| `ChatPanel.tsx` | AI 聊天面板 |
| `SettingsPage.tsx` | 设置页面（含无障碍设置） |
| `StartPage.tsx` | 开始页面（今日概览） |
| `ScrollPage.tsx` | 卷轴复习页面 |
| `NotesPage.tsx` | 笔记管理页面 |

---

## 后端架构

### 技术栈
- **框架**: FastAPI
- **服务器**: Uvicorn
- **存储**: JSON 文件
- **算法**: SM-2 间隔重复

### 核心模块

| 模块 | 功能 |
|------|------|
| `papyrus.core.cards` | 卡片 CRUD 操作 |
| `papyrus.logic.sm2` | SM-2 算法实现 |
| `papyrus.data.storage` | 数据持久化 |
| `papyrus.integrations.obsidian` | Obsidian 导入 |
| `ai.config` | AI 配置管理 |
| `ai.provider` | AI 提供商接口 |

### API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/cards` | GET/POST | 卡片列表/创建 |
| `/api/cards/{id}` | DELETE | 删除卡片 |
| `/api/review/next` | GET | 获取下一张待复习卡片 |
| `/api/review/{id}/rate` | POST | 评分卡片 |
| `/api/notes` | GET/POST | 笔记列表/创建 |
| `/api/notes/{id}` | GET/PATCH/DELETE | 笔记操作 |
| `/api/notes/import/obsidian` | POST | 从 Obsidian 导入 |

---

## 文档导航

### 用户指南
- [快速启动](guides/QUICKSTART.md)
- [无障碍设置](guides/A11Y_SETTINGS.md)
- [版本信息](guides/VERSION.md)
- [更新日志](guides/CHANGELOG.md)

### 开发指南
- [环境要求](guides/ENVIRONMENT_REQUIREMENTS.md)
- [UI 设计变量](guides/UI_TOKENS.md)
- [无障碍开发指南](guides/ACCESSIBILITY_GUIDE.md)
- [API 文档](API.md)

### AI 功能
- [AI 功能说明](AI_README.md)
- [AI 工具演示](AI_TOOLS_DEMO.md)

---

## 如何运行

### 开发模式

**启动后端**
```bash
python -m uvicorn src.papyrus_api.main:app --reload --host 127.0.0.1 --port 8000
```

**启动前端**
```bash
cd frontend
npm run dev
```

访问 http://localhost:5173

### 构建生产版本

**构建前端**
```bash
cd frontend
npm run build
```

**打包完整应用**
```bash
pyinstaller PapyrusAPI.spec
```

---

## 最近更新

### 2026-03-26 无障碍改进
- ✅ 新增全局无障碍样式 (`a11y.css`)
- ✅ 新增无障碍设置面板
- ✅ 完善 ARIA 属性支持
- ✅ 优化键盘导航
- ✅ 达到 WCAG 2.1 AAA 级对比度标准

### 2026-03 架构升级
- ✅ FastAPI 后端
- ✅ React 19 前端
- ✅ 全新 UI 设计
- ✅ Obsidian 导入支持
