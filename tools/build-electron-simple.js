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
      execSync('npm install electron-packager@17.1.2 --save-dev', { stdio: 'inherit' });
      return true;
    } catch (e) {
      console.error('Failed to install electron-packager:', e.message);
      return false;
    }
  }
}

// 构建应用
function build(target) {
  const version = getVersion();
  const packager = require('electron-packager');
  
  const options = {
    dir: '.',
    name: 'Papyrus Desktop',
    appVersion: version,
    overwrite: true,
    asar: true,
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

  switch (target) {
    case 'win':
    case 'windows':
      options.platform = 'win32';
      options.arch = 'x64';
      options.icon = 'assets/icon.ico';
      break;
    case 'mac':
    case 'macos':
      options.platform = 'darwin';
      options.arch = 'x64';
      options.icon = 'assets/icon.icns';
      break;
    case 'linux':
      options.platform = 'linux';
      options.arch = 'x64';
      options.icon = 'assets/icon.png';
      break;
    default:
      options.platform = process.platform;
      options.arch = process.arch;
  }

  console.log(`Building for ${options.platform} ${options.arch}...`);
  
  return packager(options).then(paths => {
    console.log('Build completed:');
    paths.forEach(p => console.log('  -', p));
    return paths;
  });
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'current';

  console.log('\n========================================');
  console.log('  Papyrus Electron Simple Build Script');
  console.log('========================================\n');

  if (!fs.existsSync('frontend/dist')) {
    console.log('Building frontend first...');
    execSync('cd frontend && npm run build', { stdio: 'inherit' });
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
