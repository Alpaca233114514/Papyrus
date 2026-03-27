# Papyrus 版本信息

## 当前版本：v1.2.2

### 🎉 主要更新

#### v1.2.2 更新内容
- **修复 API Key 编码错误**：解决 'latin-1' codec 无法编码中文字符的问题
- **配置验证机制**：在保存前检查 API Key 和 Base URL，阻止包含非法字符的配置
- **三层防护**：配置验证层、UI 提示层、请求兜底层
- **改进错误提示**：明确指出哪个提供商的哪个字段包含非法字符

#### v1.2.1-beta+macOS.arm64 更新内容
- **修复构建工作流**：解决跨平台路径问题
- **优化打包配置**：支持 Windows 和 macOS 自动构建
- **改进 CI/CD**：自动化发布流程

#### v1.2.1-beta 更新内容
- **修复 AI 设置保存问题**：切换提供商时自动验证并调整模型兼容性
- **改进错误提示**：保存失败时显示具体原因
- **增强稳定性**：防止提供商和模型不匹配导致的问题

---

## 📦 安装说明

### 环境要求

| 组件 | 版本 |
|------|------|
| Python | 3.14+ |
| Node.js | 24.14+ (前端开发) |
| npm | 11.9+ |

### 基础功能（无需额外依赖）
- SM-2 算法
- 卡片学习
- 数据管理

### AI 功能（需要安装依赖）
```bash
pip install -r requirements.txt
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# Python 依赖
pip install -r requirements.txt

# 前端依赖（如需开发前端）
cd frontend
npm install
```

### 2. 启动程序

**开发模式（推荐）**
```bash
# 终端 1：启动后端
python -m uvicorn src.papyrus_api.main:app --reload --host 127.0.0.1 --port 8000

# 终端 2：启动前端
cd frontend
npm run dev
```

访问 http://localhost:5173 查看应用。

**或通过主入口启动**
```bash
python src/Papyrus.pyw
```

### 3. 配置 AI（可选）
1. 访问设置页面
2. 在 "API配置" 标签页输入 API Key
3. 在 "模型管理" 标签页选择模型
4. 保存设置

### 4. 使用 AI 对话
直接在输入框输入问题：
- "帮我解释这道题"
- "创建一张关于递归的卡片"
- "搜索所有 Python 相关的题"

---

## 📊 数据格式

### 卡片数据
```json
{
  "id": "uuid-string",
  "q": "题目",
  "a": "答案",
  "next_review": 1234567890,
  "interval": 0,
  "ef": 2.5,
  "repetitions": 0
}
```

### 笔记数据
```json
{
  "id": "uuid-string",
  "title": "笔记标题",
  "folder": "文件夹",
  "content": "笔记内容",
  "tags": ["tag1", "tag2"],
  "created_at": 1234567890,
  "updated_at": 1234567890
}
```

---

## 🔧 技术架构

```
Papyrus/
├── src/
│   ├── papyrus/             # 主程序包
│   │   ├── core/            # 核心逻辑
│   │   │   ├── cards.py     # 卡片操作
│   │   │   └── ...
│   │   ├── data/            # 数据存储
│   │   ├── logic/           # 算法
│   │   │   └── sm2.py       # SM-2 算法
│   │   └── integrations/    # 第三方集成
│   ├── papyrus_api/         # FastAPI 后端
│   │   └── main.py
│   └── ai/                  # AI 模块
│       ├── config.py        # 配置管理
│       ├── provider.py      # AI 提供商接口
│       ├── sidebar_v3.py    # AI 侧边栏 UI
│       └── tools.py         # 工具调用系统
├── frontend/                # React + TypeScript 前端
│   ├── src/
│   │   ├── StartPage/       # 开始页面
│   │   ├── ScrollPage/      # 卷轴复习
│   │   ├── NotesPage/       # 笔记管理
│   │   ├── SettingsPage/    # 设置（含无障碍）
│   │   └── ...
│   └── package.json
├── data/
│   ├── Papyrusdata.json     # 学习数据
│   └── ai_config.json       # AI 配置
└── backup/                  # 自动备份
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.14, FastAPI, Uvicorn |
| 前端 | React 19, TypeScript, Arco Design, Vite |
| 算法 | SM-2 间隔重复 |
| 存储 | JSON 文件 |

---

## 🌐 API 服务

### 启动 FastAPI
```bash
python -m uvicorn src.papyrus_api.main:app --reload --host 127.0.0.1 --port 8000
```

### 端点
- Health: http://127.0.0.1:8000/api/health
- Docs: http://127.0.0.1:8000/docs

---

## ⚠️ 已知问题

1. **Windows 控制台编码警告**
   - 不影响使用
   - 已在代码中处理

2. **Ollama 刷新功能**
   - 待完善
   - 可手动添加模型名称

---

## 🔮 未来计划

- [ ] 语音输入/输出（TTS/STT）
- [ ] 图片识别（拍照题目）
- [ ] 知识图谱可视化
- [ ] 学习进度统计面板
- [ ] 社区卡片分享
- [ ] 移动端支持
- [ ] 多用户协作

---

## 📝 更新日志

详细的版本历史请查看 [CHANGELOG.md](CHANGELOG.md)

---

## 💬 反馈与支持

- 问题反馈：[GitHub Issues](https://github.com/Alpaca233114514/Papyrus/issues)
- 功能建议：欢迎提交 Pull Request

---

## 📄 开源协议

MIT License

---

**Papyrus v1.2.2** - 让学习更智能，让记忆更科学。
