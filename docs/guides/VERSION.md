# Papyrus 版本信息

## 当前版本：v1.2.1-beta

### 🎉 主要更新

#### 1. SM-2 科学记忆算法
- 替换原有简单算法，采用经过验证的 SM-2 间隔重复算法
- 根据答题质量动态调整复习间隔
- 每张卡片独立的难度系数 (Easiness Factor)
- 完全向后兼容旧数据

#### 2. AI 智能助手
- **深色主题**：现代化的对话界面
- **纯对话模式**：自然语言交互，无需记忆命令
- **上下文感知**：AI 自动知道你在学习哪张卡片
- **多轮对话**：保留历史记忆，支持追问

#### 3. 多模型支持
- **OpenAI**：GPT-4, GPT-3.5-turbo 等
- **Anthropic**：Claude 3 Opus, Sonnet 等
- **Ollama**：本地运行，完全免费
- **自定义**：支持任何兼容 OpenAI API 的服务

#### 4. 完整的模型管理
- GUI 界面添加/编辑/删除模型
- 从 API 自动刷新模型列表
- 多提供商快速切换
- 参数精细调整（Temperature, Max Tokens）

#### 5. AI 工具调用
- 创建/更新/删除卡片
- 搜索知识库
- 学习统计分析
- 操作审批机制，确保数据安全

#### 6. 隐私保护
- API Key 在设置界面中隐藏显示（●●●）
- 数据本地存储，不上传云端
- 支持本地模型（Ollama），数据不出本地

### 📦 安装说明

#### 基础功能（无需额外依赖）
- SM-2 算法
- 卡片学习
- 数据管理

#### AI 功能（需要安装依赖）
```bash
pip install requests
```

### 🚀 快速开始

#### 1. 启动程序
```bash
python src/Papyrus.pyw
```

#### 2. 配置 AI（可选）
1. 点击右侧 AI 助手的 "⚙" 按钮
2. 在 "API配置" 标签页输入 API Key
3. 在 "模型管理" 标签页选择模型
4. 保存设置

#### 3. 使用 AI 对话
直接在输入框输入问题：
- "帮我解释这道题"
- "创建一张关于递归的卡片"
- "搜索所有 Python 相关的题"

### 📊 数据格式变更

新版本卡片数据新增字段（向后兼容）：
```json
{
  "q": "题目",
  "a": "答案",
  "next_review": 0,
  "interval": 0,
  "ef": 2.5,           // 新增：难度系数
  "repetitions": 0     // 新增：连续正确次数
}
```

旧数据会自动适配，无需手动迁移。

### 🔧 技术架构

```
Papyrus/
├── src/
│   ├── Papyrus.pyw          # 主程序（集成 SM-2 + AI）
│   └── ai/                  # AI 模块
│       ├── config.py        # 配置管理
│       ├── provider.py      # AI 提供商接口
│       ├── sidebar_v3.py    # AI 侧边栏 UI
│       └── tools.py         # 工具调用系统
├── data/
│   ├── Papyrusdata.json     # 学习数据
│   └── ai_config.json       # AI 配置
├── backup/                  # 自动备份
├── requirements.txt         # Python 依赖
├── CHANGELOG.md            # 详细更新日志
└── README.md               # 项目说明
```

### 🐛 已知问题

1. **Windows 控制台编码警告**
   - 不影响使用
   - 已在代码中处理

2. **Ollama 刷新功能**
   - 待完善
   - 可手动添加模型名称

### 🔮 未来计划

- [ ] 语音输入/输出（TTS/STT）
- [ ] 图片识别（拍照题目）
- [ ] 知识图谱可视化
- [ ] 学习进度统计面板
- [ ] 社区卡片分享
- [ ] 移动端支持

### 📝 更新日志

详细的版本历史请查看 [CHANGELOG.md](CHANGELOG.md)

### 💬 反馈与支持

- 问题反馈：[GitHub Issues](https://github.com/Alpaca233114514/Papyrus/issues)
- 功能建议：欢迎提交 Pull Request

### 📄 开源协议

MIT License

---

**Papyrus v1.2.0-beta** - 让学习更智能，让记忆更科学。
