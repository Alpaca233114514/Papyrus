# 📜 Papyrus (莎草纸)

![Minecraft Paper](https://img.shields.io/badge/Icon-Minecraft_Paper-green)
![Python](https://img.shields.io/badge/Python-3.14-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![License](https://img.shields.io/badge/License-MIT-yellow)
![AI-Assisted](https://img.shields.io/badge/Dev-AI--Assisted-blueviolet)
![Accessibility](https://img.shields.io/badge/a11y-WCAG%202.1%20AAA-green)

**Papyrus** 是一款专注于高强度模型记忆的极简、高效、全键盘驱动的 AI Agent 驱动暗记（SRS）复习引擎。

> "大道至简。"

---

## ✨ 核心特性

- 🚀 **极简交互**：全流程键盘驱动，无需触碰鼠标，助你进入深度复习的"心流"状态。
- 🧠 **智能调度**：内置基于 SM-2 间隔重复算法，根据掌握程度自动安排下一次复习时间。
- 🤖 **AI 助手**：支持 OpenAI、Anthropic、Ollama 等多种 AI 提供商，智能辅助学习。
- 📝 **笔记系统**：支持 Obsidian Vault 导入，统一学习资料管理。
- ♿ **无障碍支持**：达到 WCAG 2.1 AAA 级标准，支持屏幕阅读器和键盘导航。
- 🌐 **现代架构**：Python FastAPI 后端 + React TypeScript 前端。
- 📦 **轻量便携**：数据本地化存储，隐私安全。

---

## ⌨️ 快捷键 (心流模式)

| 按键 | 动作 | 效果 |
| :--- | :--- | :--- |
| **Space (空格)** | **揭晓答案** | 展开卷轴，查看"卷尾"内容 |
| **1** | **忘记** | 标记为不熟悉，短期内高频重现 |
| **2** | **模糊** | 标记为不确定，稍后再次复习 |
| **3** | **秒杀** | 记忆极其稳固，复习间隔线性翻倍 |
| **Tab** | **导航** | 在可交互元素间切换焦点 |
| **Ctrl + K** | **搜索** | 打开全局搜索 |

---

## 🚀 快速开始

### 环境要求

- **Python**: 3.14+
- **Node.js**: 24.14+ (前端开发)
- **npm**: 11.9+

### 安装依赖

```bash
# Python 依赖
pip install -r requirements.txt

# 前端依赖
cd frontend
npm install
```

### 启动应用

**方式 1：同时启动前后端（推荐开发）**

```bash
# 终端 1：启动后端
python -m uvicorn src.papyrus_api.main:app --reload --host 127.0.0.1 --port 8000

# 终端 2：启动前端
cd frontend
npm run dev
```

**方式 2：通过主入口启动**

```bash
python src/Papyrus.pyw
```

访问 http://localhost:5173 查看应用。

---

## 📥 批量导入格式

准备一个 `UTF-8` 编码的 `.txt` 文件，格式如下：

```text
模型场景或问题 A === 核心扳机或答案 A

模型场景或问题 B === 核心扳机或答案 B
```

*提示：每组卡片通过 `===` 分隔，组与组之间建议空一行以保持清晰。*

---

## 🤖 AI 功能配置

### 1. 配置 API

点击侧边栏的 "⚙️ 设置" 按钮，输入你的 API Key：

- **OpenAI**: 在 https://platform.openai.com/api-keys 获取
- **Anthropic**: 在 https://console.anthropic.com/ 获取
- **Ollama**: 本地运行，无需 API Key
  ```bash
  # 安装 Ollama
  # 下载: https://ollama.ai
  
  # 拉取模型
  ollama pull llama2
  ```

### 2. 模式配置

#### Agent 模式
AI 将使用工具调用进行卡片的添加、编辑、删除等操作

#### Chat 模式
仅保留聊天功能

### 3. 参数调整

在设置中可以调整：
- **Temperature**: 控制创造性（0-2，越高越随机）
- **Max Tokens**: 最大回复长度

---

## ♿ 无障碍功能

Papyrus 致力于让所有用户都能轻松使用：

- **键盘导航**：完整的 Tab 键导航支持
- **屏幕阅读器**：优化的 ARIA 标签和朗读体验
- **高对比度**：AAA 级颜色对比度标准
- **减少动画**：为敏感用户提供舒适体验

访问 **设置 → 无障碍** 启用相关功能。

---

## 🛠️ 技术架构

```
Papyrus/
├── src/
│   ├── papyrus/           # Python 后端核心
│   │   ├── core/          # 卡片和复习逻辑 (SM-2)
│   │   ├── data/          # 数据存储
│   │   ├── logic/         # 算法实现
│   │   └── integrations/  # 第三方集成 (Obsidian)
│   ├── papyrus_api/       # FastAPI 后端服务
│   ├── ai/                # AI 功能模块
│   └── mcp/               # MCP 服务
├── frontend/              # React + TypeScript 前端
│   ├── src/
│   │   ├── StartPage/     # 开始页面
│   │   ├── ScrollPage/    # 卷轴复习页面
│   │   ├── NotesPage/     # 笔记页面
│   │   ├── SettingsPage/  # 设置页面
│   │   └── ...
├── data/                  # 用户数据（不进 Git）
├── backup/                # 自动备份
└── docs/                  # 项目文档
```

### 技术栈

- **后端**: Python 3.14, FastAPI, Uvicorn
- **前端**: React 19, TypeScript, Arco Design, Vite
- **算法**: SM-2 间隔重复
- **存储**: JSON 文件

---

## 🔧 开发说明

### 后端开发

```bash
# 启动开发服务器
python -m uvicorn src.papyrus_api.main:app --reload --host 127.0.0.1 --port 8000

# API 文档
http://127.0.0.1:8000/docs
```

### 前端开发

```bash
cd frontend
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run typecheck # 类型检查
```

### 运行测试

```bash
python -m pytest tests/
```

---

## 📁 配置文件

- **AI 配置**: `data/ai_config.json` - API 密钥和模型设置
- **学习数据**: `data/Papyrusdata.json` - 卡片和复习记录
- **笔记数据**: `data/notes.json` - 笔记内容

---

## ⚠️ 注意事项

1. **API 费用**: OpenAI 和 Anthropic 按使用量收费，建议设置预算
2. **本地模型**: Ollama 完全免费，但需要较好的硬件
3. **网络**: 云端 API 需要稳定的网络连接
4. **隐私**: 本地模型数据不会上传，云端 API 会发送问题内容
5. **并发**: 当前使用文件存储，不建议多进程同时写入

---

## 📚 文档导航

### 用户指南
- [快速启动指南](docs/guides/QUICKSTART.md) - 5分钟上手
- [无障碍设置](docs/guides/A11Y_SETTINGS.md) - 辅助功能说明
- [版本信息](docs/guides/VERSION.md) - 当前版本和更新内容
- [更新日志](docs/guides/CHANGELOG.md) - 完整的版本历史

### 开发指南
- [项目结构](docs/PROJECT_STRUCTURE.md) - 代码组织说明
- [环境要求](docs/guides/ENVIRONMENT_REQUIREMENTS.md) - 开发环境配置
- [无障碍开发指南](docs/guides/ACCESSIBILITY_GUIDE.md) - a11y 开发规范
- [UI 设计变量](docs/guides/UI_TOKENS.md) - 前端样式规范
- [API 文档](docs/API.md) - REST API 参考

### AI 功能
- [AI 功能说明](docs/AI_README.md) - AI 助手使用指南
- [AI 工具演示](docs/AI_TOOLS_DEMO.md) - 实际使用案例

---

## 💡 开发者说

其实这个作品的诞生过程没有那么理想和伟大。

为什么要做这个呢？有一天我在搞 AI 学习，下了个 Anki 准备背记知识点，下完发现这玩意要检查更新，更新要连服务器，我死活连不上。

这时候发现 Gemini 在旁边呢，让它给我写一个吧，然后写了写调了调，就拿去用了。

其实我本来没想发这个东西的，为啥还是发了呢？

昨天我用上好久没上的号给女朋友点 star，github 把我识别成机器人，把我的活动下了。我火大啊，我自己用 AI，我自己又不是 AI，为了证明我不是 AI，刚好手里有这个，就改了改放上来了。

小故事讲完了，今天都初六了，过会都天亮了。苦逼学生，哎，只能在这发发牢骚。

我很喜欢一句话：知识使人自由(Veritas vos liberabit)，与各位大佬共勉，这是我的第一个开源项目，望大佬们多多海涵。

就当是拜个晚年吧。
**祝你在新的一年，手持知识之利刃，刺破黑夜之墟，直捣黎明之境。**

---

## 📄 开源协议

MIT License

---

**Papyrus** - 让学习更智能，让记忆更科学。
