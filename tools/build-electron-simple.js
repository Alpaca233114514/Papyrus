#!/usr/bin/env node
/**
 * 简化的 Electron 打包脚本
 * 使用 electron-packager 进行跨平台打包
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 读取版本号
function getVersion() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return pkg.version;
}

// 检查并安装 electron-packager
function ensurePackager() {
  try {
    require.resolve('electron-packager');
    return true;
  } catch {
    console.log('Installing electron-packager...');
    try {
      execSync('npm install electron-packager@17.1.2 --save-dev', { stdio: 'inherit', cwd: __dirname + '/..' });
      return true;
    } catch (e) {
      console.error('Failed to install electron-packager:', e.message);
      return false;
    }
  }
}

// 终止所有 Papyrus 进程
function killPapyrusProcesses() {
  console.log('Killing existing Papyrus processes...');
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM "Papyrus Desktop.exe" 2>NUL', { stdio: 'ignore' });
    } else {
      execSync('pkill -f "Papyrus Desktop" 2>/dev/null', { stdio: 'ignore' });
    }
    // 等待进程终止
    execSync(process.platform === 'win32' ? 'timeout /t 2 /nobreak >NUL 2>&1' : 'sleep 2', { stdio: 'ignore' });
    console.log('Papyrus processes terminated.');
  } catch (e) {
    // 如果没有进程，忽略错误
    console.log('No Papyrus processes found.');
  }
}

// 删除目录（递归）
function deleteDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      deleteDirectory(entryPath);
    } else {
      fs.unlinkSync(entryPath);
    }
  }
  
  fs.rmdirSync(dirPath);
}

// 删除旧的构建目录
function cleanupBuildDir(buildDir) {
  console.log(`Cleaning up ${buildDir}...`);
  if (fs.existsSync(buildDir)) {
    try {
      // 首先尝试使用 fs 删除
      deleteDirectory(buildDir);
      console.log('Build directory cleaned.');
    } catch (e) {
      console.warn(`Warning: Failed to clean build directory with fs: ${e.message}`);
      // 如果失败，尝试使用命令行工具删除
      try {
        console.log('Trying to delete with command line...');
        if (process.platform === 'win32') {
          // 使用 rmdir 强制删除目录
          execSync(`rmdir /S /Q "${buildDir}"`, { stdio: 'ignore' });
        } else {
          // 使用 rm -rf 删除目录
          execSync(`rm -rf "${buildDir}"`, { stdio: 'ignore' });
        }
        console.log('Build directory cleaned with command line.');
      } catch (e2) {
        console.warn(`Warning: Failed to clean build directory with command line: ${e2.message}`);
        console.log('Continuing with build...');
      }
    }
  } else {
    console.log('Build directory does not exist, skipping cleanup.');
  }
}

// 复制目录
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 构建应用
async function build(target) {
  const version = getVersion();
  const packager = require('electron-packager');
  
  const options = {
    dir: '.',
    name: 'Papyrus Desktop',
    appVersion: version,
    overwrite: true,
    asar: {
      unpackDir: 'frontend/dist/scenery'
    },
    ignore: [
      /node_modules\/(?!electron)/,
      /src/,
      /frontend\/src/,
      /tools/,
      /scripts/,
      /tests/,
      /docs/,
      /\.git/,
      /\.vscode/,
      /logs/,
      /backup/,
      /data/,
      /build/
    ],
    out: 'dist-electron'
  };

  let iconPath = null;
  
  switch (target) {
    case 'win':
    case 'windows':
      options.platform = 'win32';
      options.arch = 'x64';
      iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
      break;
    case 'mac':
    case 'macos':
      options.platform = 'darwin';
      options.arch = 'x64';
      iconPath = path.join(__dirname, '..', 'assets', 'icon.icns');
      break;
    case 'linux':
      options.platform = 'linux';
      options.arch = 'x64';
      iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
      break;
    default:
      options.platform = process.platform;
      options.arch = process.arch;
      // 根据当前平台设置图标
      if (options.platform === 'win32') {
        iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
      } else if (options.platform === 'darwin') {
        iconPath = path.join(__dirname, '..', 'assets', 'icon.icns');
      } else {
        iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
      }
  }
  
  // 验证图标文件存在
  if (iconPath && fs.existsSync(iconPath)) {
    options.icon = iconPath;
    console.log(`Using icon: ${iconPath}`);
  } else {
    console.warn(`Warning: Icon file not found at ${iconPath}`);
  }

  console.log(`Building for ${options.platform} ${options.arch}...`);
  
  const paths = await packager(options);
  
  console.log('Build completed:');
  paths.forEach(p => console.log('  -', p));
  
  const resourcesPath = path.join(paths[0], 'resources');
  
  // 将 frontend/dist 目录复制到 app 目录
  const frontendSrc = path.join(__dirname, '..', 'frontend', 'dist');
  const frontendDest = path.join(resourcesPath, 'app', 'frontend', 'dist');
  
  console.log(`\nCopying frontend/dist to ${frontendDest}...`);
  copyDirectory(frontendSrc, frontendDest);
  console.log('Frontend copied successfully!');
  
  // 将整个 backend 目录复制到正确的位置（包括 node_modules）
  const backendSrc = path.join(__dirname, '..', 'backend');
  const backendDest = path.join(resourcesPath, 'backend');
  
  console.log(`\nCopying backend to ${backendDest}...`);
  copyDirectory(backendSrc, backendDest);
  console.log('Backend copied successfully!');
  
  // 将 assets 目录复制到 resources 目录（用于系统托盘图标）
  const assetsSrc = path.join(__dirname, '..', 'assets');
  const assetsDest = path.join(resourcesPath, 'assets');
  
  console.log(`\nCopying assets to ${assetsDest}...`);
  copyDirectory(assetsSrc, assetsDest);
  console.log('Assets copied successfully!');
  
  // Windows 平台：使用 rcedit 手动设置可执行文件图标
  if (options.platform === 'win32' && iconPath && fs.existsSync(iconPath)) {
    const exePath = path.join(paths[0], `${options.name}.exe`);
    console.log(`\nSetting icon for ${exePath}...`);
    try {
      const rcedit = require('rcedit');
      await rcedit(exePath, {
        'set-icon': iconPath
      });
      console.log('Icon set successfully!');
    } catch (err) {
      console.error('Failed to set icon:', err.message);
    }
  }
  
  return paths;
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'current';

  console.log('\n========================================');
  console.log('  Papyrus Electron Simple Build Script');
  console.log('========================================\n');

  // 终止现有进程
  killPapyrusProcesses();

  // 清理旧的构建目录
  cleanupBuildDir('dist-electron');

  if (!fs.existsSync('frontend/dist')) {
    console.log('Building frontend first...');
    execSync('cd frontend && npm run build', { stdio: 'inherit' });
  }

  if (!fs.existsSync('backend/dist')) {
    console.log('Building backend first...');
    execSync('cd backend && npm run build', { stdio: 'inherit' });
  }

  if (!ensurePackager()) {
    process.exit(1);
  }

  try {
    switch (command) {
      case 'win':
      case 'windows':
        await build('win');
        break;
      case 'mac':
      case 'macos':
        await build('mac');
        break;
      case 'linux':
        await build('linux');
        break;
      case 'all':
        console.log('Building for all platforms...\n');
        await build('win');
        await build('mac');
        await build('linux');
        break;
      default:
        await build(process.platform);
    }
    console.log('\n✅ Build completed successfully!');
  } catch (err) {
    console.error('\n❌ Build failed:', err.message);
    process.exit(1);
  }
}

main();
