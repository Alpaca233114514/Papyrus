# Papyrus AI 功能说明

## 功能特性

### 1. SM-2 算法
- 已替换原有的简单间隔算法
- 自动适配旧数据，无需迁移
- 根据答题表现动态调整复习间隔

### 2. AI 侧边栏

#### 支持的 AI 提供商
- **OpenAI**: GPT-4, GPT-3.5-turbo
- **Anthropic**: Claude-3 系列
- **Ollama**: 本地模型（llama2, mistral, qwen 等）
- **自定义**: 任何兼容 OpenAI API 的服务

---

## 快速开始

### 1. 获取程序

前往 [Releases](https://github.com/Alpaca233114514/Papyrus/releases) 页面，下载最新版本。

### 2. 运行说明

1. 解压下载的 `.zip` 文件到任意文件夹
2. 双击 `Papyrus.exe` 即可启动

> **注意**: 请勿将 `.exe` 单独移动到其他地方运行，否则程序将无法加载图标或读取之前的复习进度（仅限 v1.0.0 版本）。

### 3. AI 功能使用

#### 配置 API

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

#### 模式配置

**Agent 模式**
AI 将使用工具调用进行卡片的添加、编辑、删除等操作

**Chat 模式**
仅保留聊天功能

#### 参数调整

在设置中可以调整：
- **Temperature**: 控制创造性（0-2，越高越随机）
- **Max Tokens**: 最大回复长度

---

## 配置文件

AI 配置保存在 `data/ai_config.json`，包含：
- API 密钥
- 模型选择
- 参数设置

---

## 注意事项

1. **API 费用**: OpenAI 和 Anthropic 按使用量收费，建议设置预算
2. **本地模型**: Ollama 完全免费，但需要较好的硬件
3. **网络**: 云端 API 需要稳定的网络连接
4. **隐私**: 本地模型数据不会上传，云端 API 会发送问题内容

---

## 故障排除

### AI 功能不可用
- 检查是否安装了 `requests` 库
- 查看控制台错误信息

### API 调用失败
- 检查 API Key 是否正确
- 检查网络连接
- 确认 API 额度是否充足

### Ollama 连接失败
- 确认 Ollama 服务是否运行
- 检查端口是否为 11434
- 尝试: `ollama serve`

---

## 架构说明

```
src/
├── Papyrus.pyw          # 兼容入口（推荐运行：python src/Papyrus.pyw）
├── Papyrus.py           # 兼容入口（旧导入支持）
├── papyrus/             # 新版主程序包（模块化实现）
│   └── integrations/
│       └── ai.py        # AI 集成
└── ai/                  # AI 模块
    ├── __init__.py      # 模块初始化
    ├── config.py        # 配置管理
    ├── provider.py      # AI 提供商接口
    ├── sidebar_v3.py    # UI 界面
    └── tools.py         # 工具调用
```

---

## 后续开发建议

1. **Function Calling**: 让 AI 直接操作卡片数据
2. **RAG 集成**: 接入知识库增强回答质量
3. **语音功能**: TTS 朗读和 STT 输入
4. **统计分析**: AI 分析学习数据并给出建议

---

## 版本

- AI 模块: v1.0.0
- SM-2 算法: 已集成
