#!/usr/bin/env pwsh
<#
.SYNOPSIS
    本地构建测试脚本 - 模拟 CI 流程
.DESCRIPTION
    在本地模拟 GitHub Actions 的构建流程，提前发现问题
#>

param(
    [ValidateSet("win", "mac", "linux", "all")]
    [string]$Platform = "win",
    [switch]$SkipPython,
    [switch]$SkipFrontend,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

# 颜色输出
function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

# 检查命令是否存在
function Test-Command($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

# 步骤 1: 环境检查
Write-Info "Step 1: Environment Check"
Write-Host "  OS: $([System.Environment]::OSVersion.Platform)"
Write-Host "  PowerShell: $($PSVersionTable.PSVersion)"

# 检查必需文件
$requiredFiles = @(
    "package.json",
    "electron/main.js",
    "PapyrusAPI.spec",
    "requirements.txt",
    "frontend/package.json",
    "frontend/vite.config.js"
)

$missing = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missing += $file
    }
}

if ($missing.Count -gt 0) {
    Write-Error "Missing required files: $($missing -join ', ')"
    exit 1
}
Write-Ok "All required files present"

# 步骤 2: 检查依赖
Write-Info "Step 2: Dependency Check"

# Node.js
if (-not (Test-Command "node")) {
    Write-Error "Node.js not found. Please install Node.js 24+"
    exit 1
}
$nodeVersion = (node --version)
Write-Ok "Node.js $nodeVersion"

# Python
$pythonCmd = if (Test-Command "python") { "python" } elseif (Test-Command "python3") { "python3" } else { $null }
if (-not $pythonCmd) {
    Write-Error "Python not found. Please install Python 3.14+"
    exit 1
}
$pyVersion = & $pythonCmd --version
Write-Ok "Python $pyVersion"

# PyInstaller
& $pythonCmd -c "import PyInstaller" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Warn "PyInstaller not installed. Installing..."
    & $pythonCmd -m pip install pyinstaller
}
Write-Ok "PyInstaller available"

# Python 依赖检查
Write-Info "Checking Python dependencies..."
& $pythonCmd -c "
import sys
sys.path.insert(0, 'src')
required = ['fastapi', 'uvicorn', 'pydantic', 'requests', 'watchdog']
missing = []
for m in required:
    try:
        __import__(m)
    except ImportError:
        missing.append(m)
if missing:
    print(f'Missing: {missing}')
    sys.exit(1)
print('All dependencies OK')
" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Warn "Installing Python dependencies..."
    & $pythonCmd -m pip install -r requirements.txt
}
Write-Ok "Python dependencies OK"

# Node 依赖检查
if (-not (Test-Path "node_modules")) {
    Write-Warn "Node modules not found. Installing..."
    npm ci
}
if (-not (Test-Path "frontend/node_modules")) {
    Write-Warn "Frontend node modules not found. Installing..."
    Push-Location frontend
    npm ci
    Pop-Location
}
Write-Ok "Node dependencies OK"

# 步骤 3: 清理旧构建
if ($Clean) {
    Write-Info "Step 3: Cleaning old builds"
    Remove-Item -Recurse -Force "dist-electron" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "dist-python" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "frontend/dist" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue
    Write-Ok "Old builds cleaned"
}

# 步骤 4: 构建前端
if (-not $SkipFrontend) {
    Write-Info "Step 4: Building Frontend"
    
    Push-Location frontend
    
    # 清理
    Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
    
    # 构建
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend build failed"
        exit 1
    }
    
    # 验证
    if (-not (Test-Path "dist/index.html")) {
        Write-Error "Frontend build output not found"
        exit 1
    }
    
    Pop-Location
    Write-Ok "Frontend built successfully"
} else {
    Write-Warn "Skipping frontend build"
}

# 步骤 5: 构建 Python
if (-not $SkipPython) {
    Write-Info "Step 5: Building Python Backend"
    
    # 清理
    Remove-Item -Recurse -Force "dist-python" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue
    
    # 构建
    & $pythonCmd -m PyInstaller PapyrusAPI.spec --clean
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Python build failed"
        exit 1
    }
    
    # 验证
    $exeName = if ($Platform -eq "win") { "Papyrus.exe" } else { "Papyrus" }
    $exePath = "dist-python/$exeName"
    
    if (-not (Test-Path $exePath)) {
        Write-Error "Python executable not found: $exePath"
        Write-Info "Contents of dist-python:"
        Get-ChildItem "dist-python" | ForEach-Object { Write-Host "  $_" }
        exit 1
    }
    
    # 大小检查
    $size = (Get-Item $exePath).Length / 1MB
    Write-Info "Python executable size: $([math]::Round($size, 2)) MB"
    
    if ($size -lt 10) {
        Write-Error "Python executable suspiciously small"
        exit 1
    }
    
    Write-Ok "Python backend built successfully"
} else {
    Write-Warn "Skipping Python build"
}

# 步骤 6: 构建 Electron
Write-Info "Step 6: Building Electron App"

if (-not (Test-Path "dist-python")) {
    Write-Error "dist-python not found. Cannot build Electron without Python backend"
    exit 1
}

# 确定 electron-builder 参数
$ebPlatform = switch ($Platform) {
    "win" { "--win" }
    "mac" { "--mac" }
    "linux" { "--linux" }
    "all" { "--win --mac --linux" }
}

npx electron-builder $ebPlatform.Split(" ")

if ($LASTEXITCODE -ne 0) {
    Write-Error "Electron build failed"
    exit 1
}

# 验证输出
Write-Info "Verifying build output..."
if (-not (Test-Path "dist-electron")) {
    Write-Error "dist-electron not found"
    exit 1
}

Get-ChildItem "dist-electron" | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  $($_.Name) ($size MB)"
}

Write-Ok "Build completed successfully!"
Write-Info "Output location: $(Resolve-Path dist-electron)"
