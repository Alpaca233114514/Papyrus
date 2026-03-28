# Papyrus 开发环境启动脚本
# 同时启动 Python 后端和 Vite 前端

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host "🚀 启动 Papyrus 开发环境..." -ForegroundColor Cyan
Write-Host ""

# 检查 Python 依赖
Write-Host "📦 检查 Python 依赖..." -ForegroundColor Yellow
try {
    python -c "import fastapi" 2>$null
} catch {
    Write-Host "⚠️  正在安装 Python 依赖..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# 检查 Node 依赖
Write-Host "📦 检查 Node 依赖..." -ForegroundColor Yellow
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "⚠️  正在安装 Node 依赖..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host ""
Write-Host "✅ 依赖检查完成" -ForegroundColor Green
Write-Host "🎯 启动服务..." -ForegroundColor Cyan
Write-Host ""

# 启动服务
Set-Location frontend

# 使用 launcher.js 启动
node launcher.js
