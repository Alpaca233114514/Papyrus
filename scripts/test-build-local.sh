#!/bin/bash
# 本地构建测试脚本 - 模拟 CI 流程 (Linux/macOS 版本)

set -e  # 遇到错误立即退出

PLATFORM="${1:-linux}"
SKIP_PYTHON=false
SKIP_FRONTEND=false
CLEAN=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-python) SKIP_PYTHON=true ;;
        --skip-frontend) SKIP_FRONTEND=true ;;
        --clean) CLEAN=true ;;
        win|mac|linux|all) PLATFORM=$1 ;;
    esac
    shift
done

# 颜色输出
info() { echo -e "\033[36m[INFO] $1\033[0m"; }
ok() { echo -e "\033[32m[OK] $1\033[0m"; }
error() { echo -e "\033[31m[ERROR] $1\033[0m"; exit 1; }
warn() { echo -e "\033[33m[WARN] $1\033[0m"; }

# 步骤 1: 环境检查
info "Step 1: Environment Check"
echo "  OS: $(uname -s)"
echo "  Platform: $PLATFORM"

# 检查必需文件
REQUIRED_FILES=(
    "package.json"
    "electron/main.js"
    "PapyrusAPI.spec"
    "requirements.txt"
    "frontend/package.json"
    "frontend/vite.config.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        error "Missing required file: $file"
    fi
done
ok "All required files present"

# 步骤 2: 依赖检查
info "Step 2: Dependency Check"

# Node.js
if ! command -v node &> /dev/null; then
    error "Node.js not found. Please install Node.js 24+"
fi
ok "Node.js $(node --version)"

# Python
PYTHON_CMD=$(command -v python3 || command -v python || echo "")
if [[ -z "$PYTHON_CMD" ]]; then
    error "Python not found. Please install Python 3.14+"
fi
ok "Python $($PYTHON_CMD --version)"

# PyInstaller
if ! $PYTHON_CMD -c "import PyInstaller" 2>/dev/null; then
    warn "PyInstaller not installed. Installing..."
    $PYTHON_CMD -m pip install pyinstaller
fi
ok "PyInstaller available"

# Python 依赖
info "Checking Python dependencies..."
$PYTHON_CMD -c "
import sys
sys.path.insert(0, 'src')
required = ['fastapi', 'uvicorn', 'pydantic', 'requests', 'watchdog']
missing = [m for m in required if __import__('importlib').util.find_spec(m) is None]
if missing:
    print(f'Missing: {missing}')
    sys.exit(1)
print('All OK')
" || {
    warn "Installing Python dependencies..."
    $PYTHON_CMD -m pip install -r requirements.txt
}
ok "Python dependencies OK"

# Node 依赖
if [[ ! -d "node_modules" ]]; then
    warn "Node modules not found. Installing..."
    npm ci
fi
if [[ ! -d "frontend/node_modules" ]]; then
    warn "Frontend node modules not found. Installing..."
    (cd frontend && npm ci)
fi
ok "Node dependencies OK"

# 步骤 3: 清理
if [[ "$CLEAN" == true ]]; then
    info "Step 3: Cleaning old builds"
    rm -rf dist-electron dist-python frontend/dist build
    ok "Old builds cleaned"
fi

# 步骤 4: 构建前端
if [[ "$SKIP_FRONTEND" != true ]]; then
    info "Step 4: Building Frontend"
    
    cd frontend
    rm -rf dist
    npm run build
    
    if [[ ! -f "dist/index.html" ]]; then
        error "Frontend build output not found"
    fi
    
    cd ..
    ok "Frontend built successfully"
else
    warn "Skipping frontend build"
fi

# 步骤 5: 构建 Python
if [[ "$SKIP_PYTHON" != true ]]; then
    info "Step 5: Building Python Backend"
    
    rm -rf dist-python build
    $PYTHON_CMD -m PyInstaller PapyrusAPI.spec --clean
    
    if [[ ! -f "dist-python/Papyrus" ]]; then
        error "Python executable not found"
    fi
    
    SIZE=$(stat -f%z "dist-python/Papyrus" 2>/dev/null || stat -c%s "dist-python/Papyrus")
    SIZE_MB=$((SIZE / 1024 / 1024))
    info "Python executable size: ${SIZE_MB}MB"
    
    if [[ $SIZE_MB -lt 10 ]]; then
        error "Python executable suspiciously small"
    fi
    
    ok "Python backend built successfully"
else
    warn "Skipping Python build"
fi

# 步骤 6: 构建 Electron
info "Step 6: Building Electron App"

if [[ ! -d "dist-python" ]]; then
    error "dist-python not found"
fi

case $PLATFORM in
    win) EB_ARGS="--win" ;;
    mac) EB_ARGS="--mac" ;;
    linux) EB_ARGS="--linux" ;;
    all) EB_ARGS="--win --mac --linux" ;;
esac

npx electron-builder $EB_ARGS

info "Verifying build output..."
ls -lh dist-electron/

ok "Build completed successfully!"
info "Output: $(pwd)/dist-electron"
