@echo off
chcp 65001 >nul
echo 🚀 启动 Papyrus 开发环境...
echo.

cd /d "%~dp0"

echo 📦 检查依赖...

:: 检查 Python 依赖
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo ⚠️  正在安装 Python 依赖...
    pip install -r requirements.txt
)

:: 检查 Node 依赖
if not exist "frontend\node_modules" (
    echo ⚠️  正在安装 Node 依赖...
    cd frontend
    call npm install
    cd ..
)

echo.
echo ✅ 依赖检查完成
echo 🎯 启动服务...
echo.

:: 使用 concurrently 同时启动前后端
cd frontend
npx concurrently "python -m uvicorn src.papyrus_api.main:app --port 8000" "npx vite --port 5173" --names "后端,前端" --prefix-colors "cyan,magenta"

pause
