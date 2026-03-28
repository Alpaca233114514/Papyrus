# Papyrus 开发环境启动指南

## 🚀 快速启动（推荐）

### 方式一：使用 launcher（最方便）

```bash
cd frontend
npm install    # 首次运行需要安装依赖
npm run dev    # 一键启动前后端
```

这会同时启动：
- 后端: http://127.0.0.1:8000
- 前端: http://localhost:5173

按 `Ctrl+C` 可以同时关闭两个服务。

---

### 方式二：使用批处理脚本（Windows）

双击运行项目根目录下的：
```
start-dev.bat
```

---

### 方式三：使用 PowerShell

```powershell
.\start-dev.ps1
```

---

## 🔧 手动启动（开发调试）

如果你需要分别调试前后端：

**终端 1 - 后端：**
```bash
python -m uvicorn src.papyrus_api.main:app --reload --port 8000
```

**终端 2 - 前端：**
```bash
cd frontend
npm run dev:frontend
```

---

## 📦 首次运行准备

### 1. 安装 Python 依赖

```bash
pip install -r requirements.txt
```

### 2. 安装 Node.js 依赖

```bash
cd frontend
npm install
```

---

## 🎯 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端（推荐） |
| `npm run dev:frontend` | 只启动前端 |
| `npm run build` | 构建生产版本 |
| `npm run typecheck` | TypeScript 类型检查 |

---

## 🔍 故障排除

### 问题：后端启动失败

**解决：**
```bash
# 检查 Python 是否安装
python --version

# 重新安装依赖
pip install -r requirements.txt
```

### 问题：前端启动失败

**解决：**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 问题：端口被占用

**解决：**
```bash
# 查找占用 8000 端口的进程
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# 或者修改端口启动
python -m uvicorn src.papyrus_api.main:app --port 8080
```

---

## 📝 技术栈

- **前端**: React 19 + TypeScript + Vite + Arco Design + Tailwind CSS
- **后端**: Python + FastAPI + SQLite
- **通信**: REST API (端口 8000)

---

## 🎨 Tailwind CSS 使用

项目中已集成 Tailwind CSS，所有类名带 `tw-` 前缀：

```tsx
<div className="tw-flex tw-gap-4 tw-p-4 tw-bg-arco-bg-2">
  <span className="tw-text-primary">主色文字</span>
</div>
```

颜色与 Arco Design 主题同步，自动适配深色/浅色模式。
