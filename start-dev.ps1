# Papyrus 开发环境启动脚本
# 同时启动 TypeScript 后端和 Vite 前端

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host "启动 Papyrus 开发环境..." -ForegroundColor Cyan
Write-Host ""

# 检查 Node 依赖
Write-Host "检查 Node 依赖..." -ForegroundColor Yellow

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "  正在安装前端依赖..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "  正在安装后端依赖..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

Write-Host ""
Write-Host "依赖检查完成" -ForegroundColor Green
Write-Host "启动服务..." -ForegroundColor Cyan
Write-Host ""

# 使用根目录 npm run dev 同时启动前后端
npm run dev
